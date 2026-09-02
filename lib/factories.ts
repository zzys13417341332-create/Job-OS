import type {
  DB,
  EducationItem,
  ExperienceItem,
  Interview,
  InterviewRound,
  Job,
  JobDraft,
  JobStatus,
  Knowledge,
  Project,
  ProjectDraft,
  ResumeProfile,
  ResumeSkill,
  SelfIntroduction,
  Settings,
  Todo,
  TodoDraft,
  TranscriptSegment,
} from "./types";
import { SCHEMA_VERSION } from "./types";
import { nowISO, todayDateInput, uid } from "./utils";

export type { DB, JobDraft, ProjectDraft, TodoDraft };

export function emptyResume(): ResumeProfile {
  return {
    name: "",
    headline: "",
    city: "",
    email: "",
    phone: "",
    portfolioUrl: "",
    summary: "",
    education: [],
    experiences: [],
    skills: [],
    targetRoles: [],
    targetIndustries: [],
    targetCompanies: [],
  };
}

export function emptySettings(): Settings {
  return { dailyApplyTarget: 3 };
}

export function emptyDB(): DB {
  return {
    schemaVersion: SCHEMA_VERSION,
    resume: emptyResume(),
    projects: [],
    jobs: [],
    interviews: [],
    knowledge: [],
    todos: [],
    selfIntroductions: [],
    settings: emptySettings(),
    meta: { demoLoadedAt: "" },
  };
}

export function newEducation(): EducationItem {
  return {
    id: uid("edu"),
    school: "",
    major: "",
    degree: "",
    start: "",
    end: "",
    note: "",
  };
}

export function newExperience(): ExperienceItem {
  return {
    id: uid("exp"),
    company: "",
    role: "",
    start: "",
    end: "",
    summary: "",
    highlights: [],
  };
}

export function newSkill(): ResumeSkill {
  return { id: uid("skill"), name: "", level: "熟悉", category: "通用" };
}

export function defaultJobDraft(partial: Partial<JobDraft> = {}): JobDraft {
  const now = nowISO();
  return {
    company: "",
    position: "",
    jd: "",
    source: "",
    location: "",
    salary: "",
    url: "",
    status: "to_apply",
    appliedAt: "",
    matchScore: null,
    matchAnalysis: null,
    interviewDate: "",
    notes: "",
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function defaultProjectDraft(partial: Partial<ProjectDraft> = {}): ProjectDraft {
  const now = nowISO();
  return {
    name: "",
    company: "",
    type: "work",
    startDate: "",
    endDate: "",
    background: "",
    goal: "",
    responsibility: "",
    actions: [],
    result: "",
    data: "",
    challenges: "",
    decisions: "",
    reflection: "",
    skills: [],
    tools: [],
    tags: [],
    interviewQuestions: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function defaultTodoDraft(partial: Partial<TodoDraft> = {}): TodoDraft {
  const now = nowISO();
  return {
    title: "",
    description: "",
    priority: "medium",
    deadline: "",
    completed: false,
    completedAt: "",
    source: "manual",
    relatedJobId: "",
    relatedInterviewId: "",
    gapType: null,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function defaultKnowledgeDraft(
  partial: Partial<Omit<Knowledge, "id" | "createdAt" | "updatedAt">> = {}
): Omit<Knowledge, "id"> {
  const now = nowISO();
  return {
    title: "",
    content: "",
    category: "other",
    tags: [],
    source: "manual",
    sourceUrl: "",
    relatedCompany: "",
    relatedRole: "",
    relatedProjectIds: [],
    importance: 3,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function defaultIntroDraft(
  partial: Partial<Omit<SelfIntroduction, "id" | "createdAt" | "updatedAt">> = {}
): Omit<SelfIntroduction, "id"> {
  const now = nowISO();
  return {
    title: "",
    role: "",
    scene: "",
    version: "90s",
    content: "",
    highlights: [],
    projectIds: [],
    lastUsedAt: "",
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function newTranscriptSegment(
  text = "",
  role: TranscriptSegment["role"] = "unknown",
  speakerLabel = ""
): TranscriptSegment {
  return { id: uid("seg"), startSec: null, endSec: null, speakerLabel, role, text };
}

export function defaultInterviewDraft(
  partial: Partial<Omit<Interview, "id" | "createdAt" | "updatedAt">> = {}
): Omit<Interview, "id"> {
  const now = nowISO();
  return {
    company: "",
    position: "",
    round: "interview_1",
    date: `${todayDateInput()}T00:00:00.000Z`,
    interviewer: "",
    notes: "",
    audio: null,
    transcriptStatus: "none",
    transcriptMode: "none",
    transcript: [],
    analysis: null,
    todoIds: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export const STATUS_ORDER: JobStatus[] = [
  "to_apply",
  "applied",
  "written_test",
  "interview_1",
  "interview_2",
  "interview_final",
  "offer",
];

export function createEntity<T extends { id: string; createdAt: string; updatedAt: string }>(
  draft: Omit<T, "id" | "createdAt" | "updatedAt">
): T {
  const now = nowISO();
  return { ...draft, id: uid("entity"), createdAt: now, updatedAt: now } as T;
}

export function markUpdated<T extends { updatedAt: string }>(entity: T): T {
  return { ...entity, updatedAt: nowISO() };
}

export type { InterviewRound, Job };
