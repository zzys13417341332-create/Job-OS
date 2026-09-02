import type {
  FollowUpCategory,
  FollowUpQuestion,
  InterviewQuestion,
  QuestionCategory,
} from "@/lib/types";
import type { AIPredictionInput, AIPredictionOutput } from "../types";
import { uid } from "@/lib/utils";
import { excerpt } from "./engine";
import { scoreProjects } from "./projectScoring";
import { generateFollowUpsCore } from "./followUps";

/**
 * JD → Interview Prediction（Mock 核心）。
 * 流程：解析 JD → 匹配项目 → 生成预测问题与准备清单。
 */
export function predictInterviewCore(input: AIPredictionInput): AIPredictionOutput {
  const { company, position, jd, resume, projects } = input;
  const scored = scoreProjects(jd, projects);
  const top = scored.filter((s) => s.score >= 35).slice(0, 3);
  const evidence = top.slice(0, 3).map((s) => ({
    source: "Project" as const,
    id: s.project.id,
    label: s.project.name,
    quote: excerpt(s.project.data || s.project.result || s.project.background, 90),
  }));

  const topProjects = top.map((s) => {
    const focus: string[] = [];
    const p = s.project;
    focus.push("项目背景与目标（为什么做、要解决什么问题）");
    focus.push("我的具体职责与关键行动");
    if (p.data.trim()) focus.push(`数据口径：${excerpt(p.data, 70)}`);
    if (p.decisions.trim()) focus.push(`核心决策：${excerpt(p.decisions, 70)}`);
    if (p.challenges.trim()) focus.push(`难点：${excerpt(p.challenges, 70)}`);
    if (p.reflection.trim()) focus.push(`复盘：${excerpt(p.reflection, 70)}`);
    return {
      projectId: p.id,
      score: s.score,
      reasons: s.matched.length ? s.matched.slice(0, 4) : ["主题相关度计算"],
      focus,
    };
  });

  const questions: InterviewQuestion[] = [];
  const qSeen = new Set<string>();
  const push = (category: QuestionCategory, text: string, note?: string) => {
    if (!qSeen.has(text)) {
      qSeen.add(text);
      questions.push({ id: uid("prq"), category, question: text, answerText: "", followUpCount: 0, note });
    }
  };

  push(
    "self_intro",
    "请先做一个 1 分钟自我介绍，重点突出你与这个岗位方向相关的经历。",
    "先立锚点，再带 1-2 个数字"
  );
  push(
    "motivation",
    `为什么选择「${company || "我们公司"}」的${position || "这个岗位"}？你了解我们什么？`,
    "提前查公司业务与近期动态"
  );

  top.forEach((s) => {
    const project = s.project;
    push(
      "project",
      `介绍一个你主导的与岗位最相关的项目：「${project.name}」的背景、目标与你在其中的角色。`,
      "按 B-G-A-R 展开"
    );
    const follow = generateFollowUpsCore(project);
    follow.questions.slice(0, 2).forEach((fq) => {
      push(mapFollowUpCategory(fq.category), fq.question, fq.note);
    });
  });

  if (/数据|增长|投放|ROI|留存|转化/.test(jd)) {
    push("data", "你通常用什么指标衡量业务健康度？举一个你用数据发现并解决问题的例子。");
  }
  if (/竞争|行业|赛道|市场/.test(jd)) {
    push("industry", "你怎么看当前这个行业/赛道的竞争格局？我们的机会和风险在哪里？");
  }
  push("situational", "如果入职后前三个月只能做三件事，你会做哪三件？理由是什么？");

  const checklist: string[] = [];
  if (resume.name && resume.headline) {
    checklist.push(`简历定位核对：确认「${resume.headline}」能自然衔接自我介绍。`);
  } else {
    checklist.push("先补全 Resume Profile（定位/目标岗位），否则自我介绍没有锚点。");
  }
  if (topProjects[0]) {
    checklist.push(`重点准备匹配度最高的项目：按 B-G-A-R 结构口头演练 2 遍，并准备数据口径。`);
  }
  if (input.knowledge.length === 0) {
    checklist.push("知识库为空：至少补充 1 条公司知识 + 1 条岗位知识再面试。");
  }
  checklist.push("准备 2 个反问面试官的问题（体现对业务的理解）。");

  const summary =
    top.length === 0
      ? "根据当前 JD 与项目库，未找到高匹配项目。建议先到项目库补充与该方向相关的经历，再来生成预测。"
      : `预测将围绕 ${top.map((s) => `「${s.project.name}」`).join("、")} 展开，请优先演练这些项目的决策与数据口径。`;

  return {
    version: "mock",
    summary,
    topProjects,
    questions: questions.slice(0, 12),
    checklist: checklist.slice(0, 6),
    evidence,
  };
}

/** 项目追问分类 → 面试问题分类 */
function mapFollowUpCategory(cat: FollowUpCategory): QuestionCategory {
  switch (cat) {
    case "basic":
      return "project";
    case "detail":
      return "project";
    case "data":
      return "data";
    case "decision":
      return "project";
    case "challenge":
      return "project";
    case "counterfactual":
      return "situational";
    case "pressure":
      return "pressure";
  }
}
