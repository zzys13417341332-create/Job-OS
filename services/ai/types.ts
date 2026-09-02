// =============================================================
// AI 服务契约：Mock 与真实 AI 共用同一套输入输出结构。
// 未来接入 LLM / STT 时，只需要替换 provider，页面无需改动。
// =============================================================

import type {
  EvidenceRef,
  FollowUpQuestion,
  InterviewQuestion,
  Interview,
  JobMatchAnalysis,
  Knowledge,
  Project,
  ResumeProfile,
} from "@/lib/types";

export interface AIJobMatchInput {
  company: string;
  position: string;
  jd: string;
  resume: ResumeProfile;
  projects: Project[];
  knowledge: Knowledge[];
}

export interface AIJobMatchOutput extends JobMatchAnalysis {}

export interface AIFollowUpInput {
  project: Project;
}

export interface AIFollowUpOutput {
  version: "mock" | "ai";
  questions: FollowUpQuestion[];
  notes: string[];
}

export interface PredictionProjectHit {
  projectId: string;
  score: number;
  reasons: string[];
  focus: string[];
}

export interface AIPredictionInput {
  company: string;
  position: string;
  jd: string;
  resume: ResumeProfile;
  projects: Project[];
  knowledge: Knowledge[];
}

export interface AIPredictionOutput {
  version: "mock" | "ai";
  summary: string;
  topProjects: PredictionProjectHit[];
  questions: InterviewQuestion[];
  checklist: string[];
  evidence: EvidenceRef[];
}

export interface AIReviewInput {
  interview: Pick<Interview, "company" | "position" | "round" | "transcript">;
  resume: ResumeProfile;
  projects: Project[];
  knowledge: Knowledge[];
}

/** InterviewAnalysis 与 gap 输出（见 lib/types.ts） */
export type { InterviewAnalysis } from "@/lib/types";

export interface AIProvider {
  readonly mode: "mock" | "server";
  analyzeJobMatch(input: AIJobMatchInput): Promise<AIJobMatchOutput>;
  generateFollowUps(input: AIFollowUpInput): Promise<AIFollowUpOutput>;
  predictInterview(input: AIPredictionInput): Promise<AIPredictionOutput>;
  reviewInterview(input: AIReviewInput): Promise<import("@/lib/types").InterviewAnalysis>;
}
