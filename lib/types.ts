// =============================================================
// Job OS 核心数据模型
// 所有页面共享同一套类型，数据访问层与 UI 完全解耦。
// 未来迁移到 PostgreSQL / Supabase 时，仅需替换 storage 层。
// =============================================================

export interface Timestamps {
  id: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

// ---------- 求职状态 ----------
export const JOB_STATUSES = [
  "to_apply",
  "applied",
  "written_test",
  "interview_1",
  "interview_2",
  "interview_final",
  "offer",
  "rejected",
  "paused",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

// ---------- 优先级 / 来源 ----------
export const PRIORITIES = ["low", "medium", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const TODO_SOURCES = [
  "manual",
  "job_match",
  "interview_review",
  "system",
] as const;
export type TodoSource = (typeof TODO_SOURCES)[number];

export const GAP_TYPES = ["knowledge", "project", "expression", "data"] as const;
export type GapType = (typeof GAP_TYPES)[number];

// ---------- 知识库 ----------
export const KNOWLEDGE_CATEGORIES = [
  "company",
  "industry",
  "platform",
  "role",
  "interview_question",
  "interview_experience",
  "marketing_case",
  "game_design_case",
  "other",
] as const;
export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number];

// ---------- 面试 ----------
export const INTERVIEW_ROUNDS = [
  "written_test",
  "phone",
  "hr",
  "interview_1",
  "interview_2",
  "interview_final",
  "other",
] as const;
export type InterviewRound = (typeof INTERVIEW_ROUNDS)[number];

export const SPEAKER_ROLES = ["interviewer", "candidate", "unknown"] as const;
export type SpeakerRole = (typeof SPEAKER_ROLES)[number];

export const QUESTION_CATEGORIES = [
  "self_intro",
  "motivation",
  "project",
  "industry",
  "role",
  "data",
  "situational",
  "pressure",
  "other",
] as const;
export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];

export const FOLLOW_UP_CATEGORIES = [
  "basic",
  "detail",
  "data",
  "decision",
  "challenge",
  "counterfactual",
  "pressure",
] as const;
export type FollowUpCategory = (typeof FOLLOW_UP_CATEGORIES)[number];

// ---------- 个人资料 ----------
export interface EducationItem {
  id: string;
  school: string;
  major: string;
  degree: string;
  start: string;
  end: string;
  note: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  start: string;
  end: string;
  summary: string;
  highlights: string[];
}

export interface ResumeSkill {
  id: string;
  name: string;
  level: "入门" | "熟悉" | "熟练" | "精通";
  category: string;
}

export interface ResumeProfile {
  /** 基本信息 */
  name: string;
  headline: string; // 一句话求职定位，如「游戏行业增长运营」
  city: string;
  email: string;
  phone: string;
  portfolioUrl: string;
  summary: string;
  /** 教育 / 经历 / 技能 */
  education: EducationItem[];
  experiences: ExperienceItem[];
  skills: ResumeSkill[];
  /** 求职目标 */
  targetRoles: string[];
  targetIndustries: string[];
  targetCompanies: string[];
}

// ---------- 项目库 ----------
export const PROJECT_TYPES = [
  "work",
  "side_project",
  "competition",
  "game",
  "other",
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export interface FollowUpQuestion {
  id: string;
  category: FollowUpCategory;
  question: string;
  note?: string; // 生成依据 / 提示
}

/** 可被 Gap 建议补充的项目文本字段 */
export type ProjectTextField =
  | "background"
  | "goal"
  | "responsibility"
  | "result"
  | "data"
  | "challenges"
  | "decisions"
  | "reflection";

export interface Project extends Timestamps {
  name: string;
  company: string;
  type: ProjectType;
  startDate: string;
  endDate: string;
  background: string;
  goal: string;
  responsibility: string;
  actions: string[];
  result: string;
  data: string;
  challenges: string;
  decisions: string;
  reflection: string;
  skills: string[];
  tools: string[];
  tags: string[];
  /** AI 预测面试追问（生成后保存在本地，供面试前复习） */
  interviewQuestions: FollowUpQuestion[];
}

export type ProjectDraft = Omit<Project, "id">;

// ---------- 岗位库 ----------
export interface MatchBreakdownItem {
  key: "experience" | "skills" | "projects" | "industry" | "role";
  label: string;
  score: number; // 0-100
  note: string;
}

export type MatchVerdict = "strong" | "consider" | "wait" | "skip";

export interface EvidenceRef {
  source: "Resume" | "Project" | "Knowledge" | "Interview" | "JD";
  id?: string;
  label: string;
  quote?: string;
}

/** JD Match 的结构化输出。真实 AI 接入后应保持相同结构。 */
export interface JobMatchAnalysis {
  version: "mock" | "ai";
  score: number; // 综合匹配度 0-100
  verdict: MatchVerdict;
  summary: string;
  breakdown: MatchBreakdownItem[];
  strengths: string[];
  weaknesses: string[];
  recommendedProjectIds: string[];
  knowledgeSuggestions: string[];
  evidence: EvidenceRef[];
  generatedAt: string;
}

export interface Job extends Timestamps {
  company: string;
  position: string;
  jd: string;
  source: string; // BOSS直聘 / 官网 / 内推 …
  location: string;
  salary: string;
  url: string;
  status: JobStatus;
  appliedAt: string; // ISO，为空表示未投递
  matchScore: number | null; // 冗余字段，方便列表直接展示
  matchAnalysis: JobMatchAnalysis | null;
  interviewDate: string; // ISO 或空
  notes: string;
}

export type JobDraft = Omit<Job, "id">;

// ---------- 面试库 ----------
export interface TranscriptSegment {
  id: string;
  startSec: number | null;
  endSec: number | null;
  speakerLabel: string; // 面试官 / 候选人 / Speaker 1 / Me
  role: SpeakerRole;
  text: string;
}

export interface InterviewQuestion {
  id: string;
  category: QuestionCategory;
  question: string;
  answerText: string;
  note?: string;
  /** 追问次数（同一问题反复追问说明表达不透彻） */
  followUpCount: number;
}

export interface AnswerAspect {
  label: string;
  score: number; // 0-100
  comment: string;
}

export interface AnswerRating {
  questionId: string;
  overall: number;
  aspects: AnswerAspect[];
  comment: string;
}

export interface GapSuggestion {
  id: string;
  type: GapType;
  question: string;
  reason: string;
  /** 目标项目字段（Project Gap / Data Gap 使用） */
  targetProjectField?: ProjectTextField;
  suggestedProjectId?: string;
  suggestedTitle: string;
  suggestedBody: string;
  suggestedTodo: string;
  evidence: EvidenceRef[];
}

export interface InterviewAnalysis {
  version: "mock" | "ai";
  summary: string;
  questions: InterviewQuestion[];
  ratings: AnswerRating[];
  strengths: string[];
  improvements: string[];
  gaps: GapSuggestion[];
  generatedAt: string;
}

export interface AudioMeta {
  name: string;
  size: number;
  type: string;
  /** IndexedDB 中音频 Blob 的 key（本地临时存储） */
  storedKey?: string;
}

export interface Interview extends Timestamps {
  company: string;
  position: string;
  round: InterviewRound;
  date: string;
  interviewer: string;
  notes: string;
  audio: AudioMeta | null;
  transcriptStatus: "none" | "saved" | "transcribing" | "transcribed";
  /** transcript 的来源：mock / pasted / manual / none */
  transcriptMode: "none" | "mock" | "pasted" | "manual";
  transcript: TranscriptSegment[];
  analysis: InterviewAnalysis | null;
  /** 由此面试产生的 Todo id（用于反查来源） */
  todoIds: string[];
}

// ---------- 知识库 ----------
export interface Knowledge extends Timestamps {
  title: string;
  content: string;
  category: KnowledgeCategory;
  tags: string[];
  source: "manual" | "paste" | "file" | "url" | "interview_review" | "demo";
  sourceUrl: string;
  relatedCompany: string;
  relatedRole: string;
  relatedProjectIds: string[];
  importance: 1 | 2 | 3 | 4 | 5;
}

// ---------- Todo ----------
export interface Todo extends Timestamps {
  title: string;
  description: string;
  priority: Priority;
  deadline: string; // ISO 或空
  completed: boolean;
  completedAt: string; // ISO 或空
  source: TodoSource;
  relatedJobId: string;
  relatedInterviewId: string;
  gapType: GapType | null;
}

export type TodoDraft = Omit<Todo, "id">;

// ---------- 自我介绍模板 ----------
export const INTRO_VERSIONS = ["60s", "90s", "180s", "custom"] as const;
export type IntroVersion = (typeof INTRO_VERSIONS)[number];

export interface SelfIntroduction extends Timestamps {
  title: string;
  role: string; // 目标岗位 / 场景
  scene: string; // 使用场景备注
  version: IntroVersion;
  content: string;
  highlights: string[];
  projectIds: string[];
  lastUsedAt: string;
}

// ---------- 设置 ----------
export interface Settings {
  /** 每日投递目标（理解为候选池/上限，鼓励高质量投递） */
  dailyApplyTarget: number;
}

/** 本地数据库整体结构（对应未来数据库 schema） */
export interface DB {
  schemaVersion: number;
  resume: ResumeProfile;
  projects: Project[];
  jobs: Job[];
  interviews: Interview[];
  knowledge: Knowledge[];
  todos: Todo[];
  selfIntroductions: SelfIntroduction[];
  settings: Settings;
  meta: {
    demoLoadedAt: string;
  };
}

export const SCHEMA_VERSION = 1;
