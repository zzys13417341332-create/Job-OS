import {
  type FollowUpCategory,
  type GapType,
  type InterviewRound,
  type JobStatus,
  type KnowledgeCategory,
  type Priority,
  type ProjectType,
  type QuestionCategory,
  type TodoSource,
  type IntroVersion,
} from "./types";

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  to_apply: "待投递",
  applied: "已投递",
  written_test: "笔试",
  interview_1: "一面",
  interview_2: "二面",
  interview_final: "终面",
  offer: "Offer",
  rejected: "拒绝",
  paused: "暂停",
};

export const JOB_STATUS_TONES: Record<JobStatus, string> = {
  to_apply: "muted",
  applied: "blue",
  written_test: "blue",
  interview_1: "violet",
  interview_2: "violet",
  interview_final: "violet",
  offer: "green",
  rejected: "red",
  paused: "amber",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

export const TODO_SOURCE_LABELS: Record<TodoSource, string> = {
  manual: "手动创建",
  job_match: "JD Match",
  interview_review: "面试复盘",
  system: "系统提醒",
};

export const KNOWLEDGE_CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  company: "公司知识",
  industry: "行业知识",
  platform: "平台知识",
  role: "岗位知识",
  interview_question: "面试题",
  interview_experience: "面试经验",
  marketing_case: "营销案例",
  game_design_case: "游戏策划案例",
  other: "其他",
};

export const KNOWLEDGE_CATEGORY_GROUPS: Record<string, string[]> = {
  "公司 · 商业化": ["company", "platform", "role"],
  行业与案例: ["industry", "marketing_case", "game_design_case"],
  面试沉淀: ["interview_question", "interview_experience"],
  其他: ["other"],
};

export const INTERVIEW_ROUND_LABELS: Record<InterviewRound, string> = {
  written_test: "笔试",
  phone: "电话面",
  hr: "HR 面",
  interview_1: "一面",
  interview_2: "二面",
  interview_final: "终面",
  other: "其他",
};

export const QUESTION_CATEGORY_LABELS: Record<QuestionCategory, string> = {
  self_intro: "自我介绍",
  motivation: "求职动机",
  project: "项目经历",
  industry: "行业知识",
  role: "岗位知识",
  data: "数据分析",
  situational: "情景题",
  pressure: "压力题",
  other: "其他",
};

export const FOLLOW_UP_CATEGORY_LABELS: Record<FollowUpCategory, string> = {
  basic: "基础问题",
  detail: "项目细节",
  data: "数据问题",
  decision: "决策问题",
  challenge: "挑战问题",
  counterfactual: "反事实问题",
  pressure: "压力面试",
};

export const GAP_TYPE_LABELS: Record<GapType, string> = {
  knowledge: "知识缺口",
  project: "项目缺口",
  expression: "表达缺口",
  data: "数据缺口",
};

export const GAP_TYPE_DESCRIPTIONS: Record<GapType, string> = {
  knowledge: "面试中涉及的领域知识，知识库中没有沉淀。",
  project: "项目记录本身缺少关键信息（决策原因、过程细节等）。",
  expression: "资料里已经有相关内容，但面试时没有表达出来。",
  data: "知道结果，但无法解释数据来源、计算口径与拆解方式。",
};

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  work: "工作项目",
  side_project: "个人项目",
  competition: "竞赛 / 训练营",
  game: "游戏 / 创意项目",
  other: "其他",
};

export const INTRO_VERSION_LABELS: Record<IntroVersion, string> = {
  "60s": "60 秒",
  "90s": "90 秒",
  "180s": "3 分钟",
  custom: "自定义",
};

export const IMPORTANCE_LABELS: Record<number, string> = {
  1: "★ 一般",
  2: "★★ 参考",
  3: "★★★ 重要",
  4: "★★★★ 高优",
  5: "★★★★★ 核心",
};

export const MATCH_VERDICT_LABELS: Record<string, string> = {
  strong: "值得投递",
  consider: "可以考虑",
  wait: "观望",
  skip: "暂不建议",
};
