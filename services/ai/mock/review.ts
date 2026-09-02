// =============================================================
// Interview Review（Mock 核心）：转写文本 → 问题提取 → 回答分析
// → Gap 检测（Knowledge / Project / Expression / Data）。
// 所有 gap 结论都建立在项目库 / 知识库 / 回答文本的事实之上，
// 不虚构个人经历；无法判断时会给出"建议手动补充"的提示。
// =============================================================

import type {
  AnswerAspect,
  AnswerRating,
  EvidenceRef,
  GapSuggestion,
  GapType,
  InterviewAnalysis,
  InterviewQuestion,
  QuestionCategory,
  TranscriptSegment,
} from "@/lib/types";
import type { AIReviewInput } from "../types";
import { clamp, nowISO, round1, uid } from "@/lib/utils";
import { containsAny, excerpt, numberClues } from "./engine";
import { QUESTION_KEYWORDS } from "./engine";
import { projectSearchText, scoreProjects } from "./projectScoring";

interface QA {
  question: string;
  answer: string;
}

function classifyQuestion(text: string): QuestionCategory {
  const counts: Record<string, number> = {};
  for (const [cat, words] of Object.entries(QUESTION_KEYWORDS)) {
    counts[cat] = containsAny(text, words).length;
  }
  const priority = ["data", "project", "situational", "pressure", "motivation", "self_intro", "industry", "role"];
  for (const cat of priority) {
    if (counts[cat] > 0) return cat as QuestionCategory;
  }
  return "other";
}

/** 从转写片段中配对「问题 → 回答」 */
function extractQA(segments: TranscriptSegment[]): QA[] {
  const result: QA[] = [];
  let current: QA | null = null;

  for (const seg of segments) {
    const text = (seg.text || "").trim();
    if (!text) continue;
    const looksLikeQuestion = /[?？]\s*$/.test(text);
    const isInterviewer =
      seg.role === "interviewer" ||
      /面试官|interviewer|hr/i.test(seg.speakerLabel);
    const isQuestion = isInterviewer || (seg.role === "unknown" && looksLikeQuestion);

    if (isQuestion) {
      if (current) result.push(current);
      current = { question: text, answer: "" };
    } else if (current) {
      current.answer = current.answer ? `${current.answer}\n${text}` : text;
    } else {
      // 转写开头没有标注面试官：暂存为问题之前的上下文，避免直接丢数据
      current = { question: "", answer: text };
    }
  }
  if (current && current.question) result.push(current);

  // 说话人未标注时，转写可能无法配对：用问号启发式兜底
  const cleaned = result.filter((qa) => qa.question.length >= 2);
  if (cleaned.length === 0) {
    const first = segments.find((s) => s.text.trim());
    if (first) {
      const rest = segments
        .filter((s) => s.id !== first.id && s.text.trim())
        .map((s) => s.text.trim())
        .join("\n");
      cleaned.push({ question: first.text.trim(), answer: rest });
    }
  }
  return cleaned;
}

function aspect(label: string, score: number, comment: string): AnswerAspect {
  return { label, score: clamp(Math.round(score), 0, 100), comment };
}

function sentenceAvgLen(text: string): number {
  const parts = (text || "").split(/[。！？!?；;\n]/).filter((s) => s.trim().length > 0);
  if (parts.length === 0) return 0;
  const total = parts.reduce((acc, s) => acc + s.trim().length, 0);
  return total / parts.length;
}

/** 对单个回答生成分维度评价（每一档都附具体解释，而不是只给总分） */
function rateAnswer(qa: QA, roleSkillText: string): AnswerRating {
  const answer = qa.answer.trim();
  const len = answer.length;

  const completeness = clamp(34 + len * 0.55, 0, 98);
  const logicMarkers = containsAny(answer, [
    "首先", "其次", "最后", "因为", "所以", "为了", "一方面", "另一方面", "基于", "先", "然后", "拆成",
  ]).length;
  const logic = clamp(32 + logicMarkers * 14, 0, 98);
  const numbers = numberClues(answer).length;
  const data = clamp(24 + numbers * 16, 0, 98);
  const skillHits = containsAny(answer, roleSkillText.split(/[,，、\s]+/).filter(Boolean)).length;
  const relevance = clamp(30 + skillHits * 12, 0, 97);
  const avgLen = sentenceAvgLen(answer);
  const clarity = clamp(112 - avgLen * 3.2, 0, 98);

  const aspects: AnswerAspect[] = [
    aspect(
      "完整度",
      completeness,
      len === 0
        ? "未检测到回答内容，可能没录到或尚未作答。"
        : len < 40
          ? "回答过短，建议补全 Background → Goal → Action → Result。"
          : "回答篇幅足够，注意检查是否覆盖了问题核心。"
    ),
    aspect(
      "逻辑性",
      logic,
      logicMarkers === 0
        ? "没有使用因果/顺序连接词，听感可能是平铺直叙。"
        : `检测到 ${logicMarkers} 处逻辑连接词，结构基本成立。`
    ),
    aspect(
      "数据支撑",
      data,
      numbers === 0
        ? "回答里没有任何数字；效果类表述建议给出基线、结果与口径。"
        : `回答包含 ${numbers} 处数字线索，建议再补一句口径说明（怎么算的、统计周期）。`
    ),
    aspect(
      "岗位相关性",
      relevance,
      skillHits === 0
        ? "回答未命中简历技能词，面试官可能难以把你与该岗位方向关联起来。"
        : "回答命中了简历中的部分技能/岗位词，关联度较好。"
    ),
    aspect(
      "表达清晰度",
      clarity,
      avgLen > 35
        ? `单句偏长（平均约 ${Math.round(avgLen)} 字），口语中建议拆成短句。`
        : "单句长度适中，便于面试官跟上思路。"
    ),
  ];

  const overall = Math.round(
    completeness * 0.22 + logic * 0.24 + data * 0.24 + relevance * 0.16 + clarity * 0.14
  );
  const weakest = [...aspects].sort((a, b) => a.score - b.score)[0];
  const comment = `总体 ${overall} 分。最需要改进的是「${weakest.label}」：${weakest.comment}`;
  return { questionId: qa.question, overall, aspects, comment };
}

/**
 * 面试复盘核心（同步纯函数）。
 * 输入：面试转写 + 项目库 + 知识库 + 简历；输出：分析 + Gap 建议。
 */
export function reviewInterviewCore(input: AIReviewInput): InterviewAnalysis {
  const { interview, resume, projects, knowledge } = input;
  const segments = interview.transcript ?? [];
  const qas = extractQA(segments);
  const skillText = resume.skills.map((s) => s.name).join("，");
  const company = interview.company || "";

  const questions: InterviewQuestion[] = qas.map((qa) => {
    const cat = classifyQuestion(qa.question);
    const repeated = qas.filter(
      (x) =>
        x !== qa &&
        containsAny(x.question, qa.question.replace(/[?？]/g, "").split(/\s+/)).length > 0
    ).length;
    return {
      id: uid("iq"),
      category: cat,
      question: qa.question,
      answerText: qa.answer.trim(),
      followUpCount: Math.min(repeated, 4),
    };
  });

  const ratings: AnswerRating[] = qas.map((qa) => rateAnswer(qa, skillText));
  const overallAll =
    ratings.length === 0
      ? 0
      : Math.round(ratings.reduce((acc, r) => acc + r.overall, 0) / ratings.length);

  // ---------- Gap 检测 ----------
  const gaps: GapSuggestion[] = [];
  const gapSeen = new Set<string>();

  const knowledgeTexts = knowledge.map((k) => ({
    k,
    text: `${k.title} ${k.tags.join(" ")} ${k.relatedCompany} ${k.content}`,
  }));

  const pushGap = (gap: Omit<GapSuggestion, "id">) => {
    const key = `${gap.type}|${gap.question.slice(0, 24)}`;
    if (!gapSeen.has(key) && gaps.length < 12) {
      gapSeen.add(key);
      gaps.push({ ...gap, id: uid("gap") });
    }
  };

  for (const qa of qas) {
    const qtext = qa.question;
    const answer = qa.answer.trim();
    const cat = classifyQuestion(qtext);
    const questionWithCompany = `${company} ${qtext}`;
    const projectHits = scoreProjects(qtext, projects).filter((s) => s.score >= 26);
    const matched = projectHits[0];
    const answerNumbers = numberClues(answer).length;

    const knowledgeHits = knowledgeTexts
      .map(({ k, text }) => ({ k, score: overlapApprox(questionWithCompany, text) }))
      .filter((x) => x.score >= 24);

    if (!answer) {
      pushGap({
        type: "expression",
        question: qtext,
        reason: "该问题没有检测到你的回答，需要先把标准回答整理出来。",
        suggestedTitle: "补录回答：面试被问到而未作答的问题",
        suggestedBody: `问题：${qtext}\n\n待补充回答（建议 B-G-A-R 结构）：\n`,
        suggestedTodo: `整理「${excerpt(qtext, 28)}」的标准回答`,
        evidence: [],
      });
      continue;
    }

    if (matched) {
      const p = matched.project;
      const evidence: EvidenceRef[] = [
        {
          source: "Project",
          id: p.id,
          label: p.name,
          quote: excerpt(p.data || p.result || p.decisions || p.background, 100),
        },
      ];

      // 数据类问题：项目有数据但回答没有数字 → Data Gap
      if (cat === "data" && answerNumbers === 0) {
        pushGap({
          type: "data",
          question: qtext,
          reason: p.data.trim()
            ? `项目记录里已有数据成果，但回答没有给出任何数字。`
            : "这是数据类问题，但项目记录里还没有数据字段。",
          targetProjectField: p.data.trim() ? undefined : "data",
          suggestedProjectId: p.id,
          suggestedTitle: `补强「${p.name}」的数据口径`,
          suggestedBody: p.data.trim()
            ? `问题：${qtext}\n\n回答中应带出的数据：\n${p.data}\n\n请准备：基线 → 结果 → 计算口径 → 归因。`
            : `问题：${qtext}\n\n请补充该项目的核心数据成果（结果数字 + 基线 + 口径）：\n`,
          suggestedTodo: `准备「${p.name}」的数据口径：${excerpt(p.data || "基线/结果/计算方式", 40)}`,
          evidence,
        });
        continue;
      }

      // 决策类问题：项目缺决策记录 → Project Gap
      if ((cat === "project" || cat === "role" || cat === "pressure") && /为什么|选择|取舍|决策/.test(qtext) && !p.decisions.trim()) {
        pushGap({
          type: "project",
          question: qtext,
          reason: `面试官追问「${p.name}」的决策依据，但项目记录中没有 decisions 字段。`,
          targetProjectField: "decisions",
          suggestedProjectId: p.id,
          suggestedTitle: `补充「${p.name}」的关键决策`,
          suggestedBody: `问题：${qtext}\n\n补写当时的关键取舍（约束 → 选项 → 选择依据 → 验证方式）：\n`,
          suggestedTodo: `回填「${p.name}」决策记录：为什么这么做`,
          evidence,
        });
        continue;
      }

      if (/难点|挑战|卡|困难/.test(qtext) && !p.challenges.trim()) {
        pushGap({
          type: "project",
          question: qtext,
          reason: `面试官追问项目难点，但「${p.name}」缺少 challenges 记录。`,
          targetProjectField: "challenges",
          suggestedProjectId: p.id,
          suggestedTitle: `补充「${p.name}」的难点与突破`,
          suggestedBody: `问题：${qtext}\n\n请补写：最难的一环 → 卡点 → 如何突破 → 事后反思：\n`,
          suggestedTodo: `回填「${p.name}」难点：卡在哪里、怎么突破`,
          evidence,
        });
        continue;
      }

      // 回答太短 / 项目里已有信息没讲出来 → Expression Gap
      if (answer.length < 70) {
        const unused: string[] = [];
        if (p.data.trim() && answerNumbers === 0) unused.push(`数据成果（${excerpt(p.data, 42)}）`);
        if (p.decisions.trim() && !containsAny(answer, ["因为", "选择", "决定", "所以"]).length)
          unused.push("关键决策");
        if (p.challenges.trim() && !containsAny(answer, ["难点", "挑战", "卡"]).length) unused.push("难点与突破");
        pushGap({
          type: "expression",
          question: qtext,
          reason:
            unused.length > 0
              ? `项目库中「${p.name}」已有${unused.join("、")}，但回答没有讲出来。`
              : `回答偏短，项目里可引用的素材没有展开。`,
          suggestedTitle: `重点表达：「${p.name}」相关回答`,
          suggestedBody: `问题：${qtext}\n\n当前回答：\n${answer}\n\n建议补充（来自项目库，请用自己的话表达）：\n${unused.join("\n") || excerpt(p.result, 120)}`,
          suggestedTodo: `重点准备「${p.name}」：${excerpt(qtext, 22)}的回答结构`,
          evidence,
        });
        continue;
      }
    } else {
      // 没有命中项目：判断是项目记录缺失还是知识缺失
      const mentionsProject = /项目|做过|负责|案例/.test(qtext) && projects.length > 0;
      const companyRelated = company && qtext.includes(company);
      const knowledgeReady = knowledgeHits.length > 0;

      // 数据类问题且回答没有数字：即使没匹配到具体项目，
      // 只要项目库有可引用的数据成果，就给出 Data Gap（引导把口径讲出来）
      if (cat === "data" && answerNumbers === 0) {
        const withData = projects
          .filter((p) => p.data.trim())
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        if (withData.length > 0) {
          const p = withData[0];
          pushGap({
            type: "data",
            question: qtext,
            reason: `这是数据类问题，但你的回答没有给出任何数字。项目库中「${p.name}」有可引用的数据成果，面试时建议带出基线与口径。`,
            suggestedProjectId: p.id,
            suggestedTitle: `补强「${p.name}」的数据表述`,
            suggestedBody: `问题：${qtext}\n\n项目记录中的数据成果：\n${p.data}\n\n准备口径：基线 → 结果 → 怎么算的 → 归因验证。`,
            suggestedTodo: `准备「${p.name}」的数据口径：基线 / 结果 / 计算方式`,
            evidence: [
              {
                source: "Project",
                id: p.id,
                label: p.name,
                quote: excerpt(p.data, 90),
              },
            ],
          });
          continue;
        }
      }

      if (mentionsProject && projects.length > 0) {
        pushGap({
          type: "project",
          question: qtext,
          reason: "问题涉及具体经历/案例，但项目库中没有与之匹配的记录。",
          suggestedTitle: "补充项目记录（面试中被追问的主题）",
          suggestedBody: `问题：${qtext}\n\n请按 B-G-A-R 补充：项目背景 / 目标 / 我的职责与行动 / 结果与数据：\n`,
          suggestedTodo: `沉淀新项目记录：${excerpt(qtext, 26)}`,
          evidence: [],
        });
        continue;
      }
      if (!knowledgeReady || companyRelated || /行业|公司|平台|产品|体系|广告|投放/.test(qtext)) {
        const refs = knowledgeHits.slice(0, 2).map((x) => ({
          source: "Knowledge" as const,
          id: x.k.id,
          label: x.k.title,
          quote: excerpt(x.k.content, 60),
        }));
        if (knowledgeHits.length === 0) {
          pushGap({
            type: "knowledge",
            question: qtext,
            reason: `问题涉及的知识点（${excerpt(qtext, 34)}）在知识库中没有匹配条目。`,
            suggestedTitle: `补充知识：「${excerpt(qtext, 30)}」`,
            suggestedBody: `来自面试问题：${qtext}\n\n我的理解（先用自己的话写，再补充数据/案例）：\n\n· 核心概念\n· 行业或公司事实\n· 可引用的案例或数据`,
            suggestedTodo: `学习并沉淀：${excerpt(qtext, 30)}`,
            evidence: refs,
          });
        } else {
          pushGap({
            type: "expression",
            question: qtext,
            reason: "知识库中已有相关内容，但回答没有引用，面试官会以为你不了解。",
            suggestedTitle: "把已有知识讲出来",
            suggestedBody: `问题：${qtext}\n\n知识库已有条目「${knowledgeHits[0].k.title}」，建议把要点融入回答：\n${excerpt(knowledgeHits[0].k.content, 200)}`,
            suggestedTodo: `用知识库内容重答：${excerpt(qtext, 26)}`,
            evidence: refs,
          });
        }
        continue;
      }
    }
  }

  // 总结与改进建议（从分维度统计中生成，避免空泛打分）
  const improveAspectCounts = new Map<string, number>();
  ratings.forEach((r) => {
    const weakest = [...r.aspects].sort((a, b) => a.score - b.score)[0];
    improveAspectCounts.set(weakest.label, (improveAspectCounts.get(weakest.label) ?? 0) + 1);
  });
  const improvements = [...improveAspectCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, n]) => `${label}维度较弱（影响 ${n} 个回答）：请参考每条回答下的具体评语改进。`);
  if (gaps.length > 0) {
    const byType = new Map<GapType, number>();
    gaps.forEach((g) => byType.set(g.type, (byType.get(g.type) ?? 0) + 1));
    improvements.push(
      `本次共发现 ${gaps.length} 处缺口（${[...byType.entries()]
        .map(([t, n]) => `${typeCN(t)} ${n}`)
        .join("、")}），沉淀到知识库/项目库后会自动反哺下一次匹配。`
    );
  }

  const strengths: string[] = [];
  ratings.forEach((r) => {
    const strongest = [...r.aspects].sort((a, b) => b.score - a.score)[0];
    if (strongest.score >= 72) {
      const label = `「${excerpt(r.questionId.replace(/\n/g, " "), 24)}」的${strongest.label}表现较好`;
      if (!strengths.includes(label)) strengths.push(label);
    }
  });

  const summary =
    ratings.length === 0
      ? "暂无可分析的回答：请先上传/粘贴转写内容。"
      : `共提取 ${questions.length} 个问题，平均得分 ${overallAll} 分。回答整体${overallAll >= 70 ? "比较扎实" : overallAll >= 55 ? "有基础但不够聚焦" : "还需要系统性打磨"}，详见各问题评语与缺口建议。`;

  return {
    version: "mock",
    summary,
    questions,
    ratings,
    strengths: strengths.slice(0, 4),
    improvements: improvements.slice(0, 5),
    gaps,
    generatedAt: nowISO(),
  };
}

function overlapApprox(a: string, b: string): number {
  // 简化近似：长文本关键词覆盖数（knowledge 通常较长）
  const setA = new Set(a.split(/[^\u4e00-\u9fa5a-zA-Z0-9]+/).filter((s) => s.length >= 2));
  let hit = 0;
  for (const token of setA) {
    if (b.includes(token)) hit++;
  }
  return Math.round((hit / Math.max(1, setA.size)) * 100);
}

function typeCN(type: GapSuggestion["type"]): string {
  const map: Record<string, string> = {
    knowledge: "知识缺口",
    project: "项目缺口",
    expression: "表达缺口",
    data: "数据缺口",
  };
  return map[type];
}

export function countGaps(gaps: GapSuggestion[]): Record<GapSuggestion["type"], number> {
  const out: Record<GapSuggestion["type"], number> = {
    knowledge: 0,
    project: 0,
    expression: 0,
    data: 0,
  };
  gaps.forEach((g) => {
    out[g.type] += 1;
  });
  return out;
}
