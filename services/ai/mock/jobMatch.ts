import type {
  JobMatchAnalysis,
  MatchBreakdownItem,
  MatchVerdict,
  Project,
} from "@/lib/types";
import type { AIJobMatchInput, AIJobMatchOutput } from "../types";
import { KNOWLEDGE_CATEGORY_LABELS } from "@/lib/constants";
import {
  clamp,
  nowISO,
  round1,
} from "@/lib/utils";
import { joinText, matchedTerms, matchedScore, tokenize } from "./engine";
import { projectSearchText, scoreProjects, topProjects } from "./projectScoring";

export const MATCH_VERDICT_THRESHOLDS: { verdict: MatchVerdict; min: number }[] = [
  { verdict: "strong", min: 82 },
  { verdict: "consider", min: 68 },
  { verdict: "wait", min: 55 },
  { verdict: "skip", min: 0 },
];

export function verdictForScore(score: number): MatchVerdict {
  for (const t of MATCH_VERDICT_THRESHOLDS) {
    if (score >= t.min) return t.verdict;
  }
  return "skip";
}

/**
 * JD 匹配核心（同步、纯函数，便于 seed 复用与单测）。
 * 输入：JD + 简历 + 项目库 + 知识库；输出：结构化匹配报告。
 * 原则：推荐项目只来自项目库中真实存在的数据；无资料时明确提示补充。
 */
export function analyzeJobMatchCore(input: AIJobMatchInput): AIJobMatchOutput {
  const { company, position, jd, resume, projects, knowledge } = input;
  const jdText = joinText([position, jd, company], " ");
  const jdTokens = tokenize(jdText);

  // ---- 1. 经历匹配：简历中工作/项目经历与 JD 的重叠 ----
  const experienceText = joinText([
    resume.summary,
    resume.experiences
      .map((e) => joinText([e.company, e.role, e.summary, e.highlights.join(" ")]))
      .join(" "),
  ]);
  const experienceRaw = matchedScore(jdText, experienceText);
  const experience =
    resume.experiences.length === 0
      ? 18
      : clamp(Math.round(45 + experienceRaw * 1.35), 0, 98);

  // ---- 2. 技能匹配 ----
  const skillText = resume.skills.map((s) => `${s.name} ${s.category}`).join(" ");
  const matchedSkills = matchedTerms(skillText, jdText).slice(0, 8);
  const skills =
    resume.skills.length === 0
      ? 12
      : clamp(Math.round(35 + matchedSkills.length * 13), 0, 98);

  // ---- 3. 项目匹配 ----
  const scored = scoreProjects(jd, projects);
  const projectScore = scored.length
    ? Math.round(
        scored.slice(0, 3).reduce((acc, s, i) => acc + s.score * [0.62, 0.25, 0.13][i], 0)
      )
    : 0;
  const projectsScore = scored.length ? projectScore : 8;

  // ---- 4. 行业匹配 ----
  const industryText = joinText([
    resume.targetIndustries.join(" "),
    resume.targetCompanies.join(" "),
    resume.experiences.map((e) => e.company).join(" "),
  ]);
  const industryHit = matchedTerms(industryText, jdText).length;
  const industry = resume.targetIndustries.length
    ? clamp(Math.round(52 + industryHit * 9), 0, 96)
    : 30;

  // ---- 5. 岗位方向匹配 ----
  const roleText = joinText([
    resume.headline,
    resume.targetRoles.join(" "),
    resume.experiences.map((e) => e.role).join(" "),
  ]);
  const roleHit = matchedTerms(roleText, jdText);
  const role = resume.targetRoles.length
    ? clamp(Math.round(46 + roleHit.length * 11), 0, 97)
    : 22;

  const total = Math.round(
    projectsScore * 0.28 + skills * 0.24 + experience * 0.22 + role * 0.14 + industry * 0.12
  );

  const breakdown: MatchBreakdownItem[] = [
    {
      key: "projects",
      label: "项目匹配",
      score: projectsScore,
      note:
        scored.length === 0
          ? "项目库为空，无法评估项目层面的匹配。"
          : scored[0]
            ? `最匹配项目「${scored[0].project.name}」约 ${scored[0].score} 分`
            : "",
    },
    {
      key: "skills",
      label: "技能匹配",
      score: skills,
      note:
        matchedSkills.length === 0
          ? "未发现简历技能与 JD 的直接重叠，建议补充技能关键词。"
          : `命中：${matchedSkills.slice(0, 5).join("、")}`,
    },
    {
      key: "experience",
      label: "经历匹配",
      score: experience,
      note:
        experienceRaw < 0.12
          ? "简历经历描述与 JD 重叠偏低，可能需要针对该方向重写经历侧重点。"
          : "简历经历覆盖了 JD 的部分方向。",
    },
    {
      key: "role",
      label: "岗位方向",
      score: role,
      note:
        roleHit.length === 0
          ? "求职目标中没有与该岗位重叠的岗位方向。"
          : `命中方向：${roleHit.slice(0, 4).join("、")}`,
    },
    {
      key: "industry",
      label: "行业匹配",
      score: industry,
      note:
        industryHit === 0
          ? "目标行业/目标公司列表中未见与该公司或行业直接相关的条目。"
          : "目标行业与公司背景存在重叠。",
    },
  ];

  // ---- 优势 / 短板 / 依据 ----
  const strengths: string[] = [];
  if (matchedSkills.length) strengths.push(`技能覆盖：${matchedSkills.slice(0, 6).join("、")}。`);
  else if (resume.skills.length) strengths.push("简历技能列表已建立，建议按 JD 词频调整排序。");

  const top = topProjects(jd, projects, 3);
  if (top[0] && top[0].score >= 55) {
    strengths.push(
      `项目经验：${top.slice(0, 2).map((s) => `「${s.project.name}」（约 ${s.score} 分）`).join("、")} 与 JD 方向重合度较高。`
    );
  }
  if (experienceRaw > 0.12 && resume.experiences.length) {
    strengths.push("工作经历文字与该 JD 的术语重叠明显，可在简历中延续此写法。");
  }
  if (industryHit > 0) strengths.push("行业/公司目标列表包含该公司所在方向。");
  if (strengths.length === 0) strengths.push("当前资料较少，先补充简历、项目与技能后再评估优势。");

  const weaknesses: string[] = [];
  if (resume.name === "" && resume.headline === "") {
    weaknesses.push("Resume Profile 尚未填写，匹配仅基于少量字段，建议先补全。");
  }
  if (resume.experiences.length === 0) weaknesses.push("简历中没有工作/实习经历，经历维度按低分处理。");
  if (projects.length === 0) weaknesses.push("项目库为空，无法推荐可迁移的项目经验。");
  if (knowledge.length === 0) weaknesses.push("知识库为空：无法判断公司/行业知识准备度，面试前请先沉淀相关知识。");
  if (matchedSkills.length === 0 && skills < 60) {
    weaknesses.push("JD 中的核心技能词在简历技能表中缺少直接命中，投递前建议用相近表述补充。");
  }
  if (projects.length > 0 && top.length === 0) {
    weaknesses.push("项目库内容与 JD 主题重叠低，简历中的项目选择可能需要调整。");
  }

  // 知识库建议：按公司/平台/岗位类别，找出知识库未覆盖的薄弱点
  const knowledgeSuggestions: string[] = [];
  const knownCompanies = knowledge.filter((k) => k.relatedCompany).map((k) => k.relatedCompany);
  const companyHit = company && knownCompanies.some((c) => c.includes(company) || company.includes(c));
  if (company && !companyHit) {
    knowledgeSuggestions.push(`建议补充「${company}」公司知识：业务线、核心产品、商业模式、近一年动态。`);
  }
  const categoryHits = new Set(knowledge.map((k) => k.category));
  const missingCategory =
    !categoryHits.has("platform") && /广告|投放|巨量|流量|信息流/.test(jdText)
      ? "平台知识"
      : !categoryHits.has("role") && /运营|投放|策划|产品/.test(jdText)
        ? "岗位知识"
        : !categoryHits.has("industry") && /行业|市场|赛道/.test(jdText)
          ? "行业知识"
          : "";
  if (missingCategory) {
    knowledgeSuggestions.push(
      `建议补充${KNOWLEDGE_CATEGORY_LABELS[missingCategory as keyof typeof KNOWLEDGE_CATEGORY_LABELS] ?? missingCategory}条目，以应对「行业/岗位认知」类问题。`
    );
  }

  const evidence = [
    ...resume.experiences.slice(0, 2).map((e) => ({
      source: "Resume" as const,
      label: `${e.company} · ${e.role}`,
      quote: excerptText(e.summary || e.highlights.join("；"), 80),
    })),
    ...top.slice(0, 2).map((s) => ({
      source: "Project" as const,
      id: s.project.id,
      label: s.project.name,
      quote: excerptText(s.project.data || s.project.result, 80),
    })),
    ...knowledge.slice(0, 2).map((k) => ({
      source: "Knowledge" as const,
      id: k.id,
      label: k.title,
      quote: excerptText(k.content, 60),
    })),
  ];

  const summary =
    scored.length === 0 && projects.length === 0
      ? "项目库为空，本轮匹配以简历技能与经历为主，参考价值有限。"
      : top[0] && top[0].score >= 55
        ? `综合匹配度 ${total} 分。最相关的项目是「${top[0].project.name}」，建议围绕它的决策、数据与复盘来写针对该 JD 的经历表述。`
        : `综合匹配度 ${total} 分。与现有项目库的直接重叠不高，投递前需要先补充与该 JD 方向相关的项目/知识素材。`;

  const verdict = verdictForScore(total);
  const result: JobMatchAnalysis = {
    version: "mock",
    score: clamp(total, 0, 100),
    verdict,
    summary,
    breakdown,
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 6),
    recommendedProjectIds: top.map((s) => s.project.id).slice(0, 3),
    knowledgeSuggestions: knowledgeSuggestions.slice(0, 3),
    evidence: evidence.filter(Boolean).slice(0, 6) as JobMatchAnalysis["evidence"],
    generatedAt: nowISO(),
  };
  return result;
}

function excerptText(text: string, max: number): string {
  const s = (text || "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
