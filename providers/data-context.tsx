"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  DB,
  Interview,
  Job,
  JobDraft,
  Knowledge,
  Project,
  ProjectDraft,
  ResumeProfile,
  SelfIntroduction,
  Settings,
  Todo,
  TodoDraft,
} from "@/lib/types";
import { SCHEMA_VERSION } from "@/lib/types";
import { emptyDB } from "@/lib/factories";
import { nowISO, uid } from "@/lib/utils";
import { LocalDBStorage } from "@/services/storage/local";
import { buildDemoDB } from "@/services/storage/seed";

// =============================================================
// 数据上下文：应用唯一的"写入口"。
// 组件只调用 api 方法，不直接操作 localStorage；
// 未来把 LocalDBStorage 换成 API 实现即可完成数据层迁移。
// =============================================================

export interface ImportResult {
  ok: boolean;
  message: string;
}

export interface DataApi {
  saveResume(patch: Partial<ResumeProfile>): void;

  addProject(draft: ProjectDraft): Project;
  updateProject(id: string, patch: Partial<Project>): void;
  deleteProject(id: string): void;

  addJob(draft: JobDraft): Job;
  updateJob(id: string, patch: Partial<Job>): void;
  deleteJob(id: string): void;

  addInterview(draft: Omit<Interview, "id" | "createdAt" | "updatedAt">): Interview;
  updateInterview(id: string, patch: Partial<Interview>): void;
  deleteInterview(id: string): void;

  addKnowledge(draft: Omit<Knowledge, "id" | "createdAt" | "updatedAt">): Knowledge;
  updateKnowledge(id: string, patch: Partial<Knowledge>): void;
  deleteKnowledge(id: string): void;

  addTodo(draft: TodoDraft): Todo;
  updateTodo(id: string, patch: Partial<Todo>): void;
  deleteTodo(id: string): void;
  toggleTodo(id: string): void;

  addIntro(draft: Omit<SelfIntroduction, "id" | "createdAt" | "updatedAt">): SelfIntroduction;
  updateIntro(id: string, patch: Partial<SelfIntroduction>): void;
  deleteIntro(id: string): void;

  updateSettings(patch: Partial<Settings>): void;

  loadDemo(): void;
  resetAll(): void;
  exportJSON(): string;
  importJSON(text: string): ImportResult;
}

interface DataContextValue {
  ready: boolean;
  db: DB;
  api: DataApi;
  projectById: Map<string, Project>;
  jobById: Map<string, Job>;
  interviewById: Map<string, Interview>;
  knowledgeById: Map<string, Knowledge>;
}

const DataContext = createContext<DataContextValue | null>(null);

function upsertOne<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx < 0) return [...list, item];
  const next = [...list];
  next[idx] = item;
  return next;
}

function patchOne<T extends { id: string; updatedAt: string }>(
  list: T[],
  id: string,
  patch: Partial<T>
): T[] {
  return list.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: nowISO() } : x));
}

function removeOne<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((x) => x.id !== id);
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const storageRef = useRef(new LocalDBStorage());
  const [db, setDb] = useState<DB>(() => emptyDB());
  const [ready, setReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 首次加载：从 localStorage 恢复（仅浏览器端执行）
  useEffect(() => {
    const saved = storageRef.current.load();
    // 预览模式：空库时通过 URL 参数 ?demo=1 自动载入虚构演示数据
    const wantsDemo =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("demo") === "1";
    const isEmpty =
      saved.projects.length === 0 &&
      saved.jobs.length === 0 &&
      saved.interviews.length === 0 &&
      saved.knowledge.length === 0 &&
      saved.todos.length === 0 &&
      saved.selfIntroductions.length === 0;
    setDb(wantsDemo && isEmpty ? buildDemoDB() : saved);
    setReady(true);
  }, []);

  // 数据变化后防抖保存；卸载前立即落盘，避免丢失
  useEffect(() => {
    if (!ready) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => storageRef.current.save(db), 180);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [db, ready]);

  useEffect(() => {
    const flush = () => storageRef.current.save(db);
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, [db]);

  const createEntity = useCallback(
    <T extends { id: string; createdAt: string; updatedAt: string }>(
      draft: Omit<T, "id" | "createdAt" | "updatedAt">
    ): T => {
      const now = nowISO();
      return { ...draft, id: uid("ent"), createdAt: now, updatedAt: now } as T;
    },
    []
  );

  const api = useMemo<DataApi>(() => {
    return {
      saveResume(patch) {
        setDb((prev) => ({ ...prev, resume: { ...prev.resume, ...patch } }));
      },

      addProject(draft) {
        const entity = createEntity<Project>(draft);
        setDb((prev) => ({ ...prev, projects: upsertOne(prev.projects, entity) }));
        return entity;
      },
      updateProject(id, patch) {
        setDb((prev) => ({ ...prev, projects: patchOne(prev.projects, id, patch) }));
      },
      deleteProject(id) {
        setDb((prev) => ({ ...prev, projects: removeOne(prev.projects, id) }));
      },

      addJob(draft) {
        const entity = createEntity<Job>(draft);
        setDb((prev) => ({ ...prev, jobs: upsertOne(prev.jobs, entity) }));
        return entity;
      },
      updateJob(id, patch) {
        setDb((prev) => ({ ...prev, jobs: patchOne(prev.jobs, id, patch) }));
      },
      deleteJob(id) {
        setDb((prev) => ({ ...prev, jobs: removeOne(prev.jobs, id) }));
      },

      addInterview(draft) {
        const entity = createEntity<Interview>(draft);
        setDb((prev) => ({ ...prev, interviews: upsertOne(prev.interviews, entity) }));
        return entity;
      },
      updateInterview(id, patch) {
        setDb((prev) => ({ ...prev, interviews: patchOne(prev.interviews, id, patch) }));
      },
      deleteInterview(id) {
        setDb((prev) => ({ ...prev, interviews: removeOne(prev.interviews, id) }));
      },

      addKnowledge(draft) {
        const entity = createEntity<Knowledge>(draft);
        setDb((prev) => ({ ...prev, knowledge: upsertOne(prev.knowledge, entity) }));
        return entity;
      },
      updateKnowledge(id, patch) {
        setDb((prev) => ({ ...prev, knowledge: patchOne(prev.knowledge, id, patch) }));
      },
      deleteKnowledge(id) {
        setDb((prev) => ({ ...prev, knowledge: removeOne(prev.knowledge, id) }));
      },

      addTodo(draft) {
        const entity = createEntity<Todo>(draft);
        setDb((prev) => ({ ...prev, todos: upsertOne(prev.todos, entity) }));
        return entity;
      },
      updateTodo(id, patch) {
        setDb((prev) => ({ ...prev, todos: patchOne(prev.todos, id, patch) }));
      },
      deleteTodo(id) {
        setDb((prev) => ({ ...prev, todos: removeOne(prev.todos, id) }));
      },
      toggleTodo(id) {
        setDb((prev) => ({
          ...prev,
          todos: prev.todos.map((x) =>
            x.id === id
              ? {
                  ...x,
                  completed: !x.completed,
                  completedAt: !x.completed ? nowISO() : "",
                  updatedAt: nowISO(),
                }
              : x
          ),
        }));
      },

      addIntro(draft) {
        const entity = createEntity<SelfIntroduction>(draft);
        setDb((prev) => ({
          ...prev,
          selfIntroductions: upsertOne(prev.selfIntroductions, entity),
        }));
        return entity;
      },
      updateIntro(id, patch) {
        setDb((prev) => ({
          ...prev,
          selfIntroductions: patchOne(prev.selfIntroductions, id, patch),
        }));
      },
      deleteIntro(id) {
        setDb((prev) => ({
          ...prev,
          selfIntroductions: removeOne(prev.selfIntroductions, id),
        }));
      },

      updateSettings(patch) {
        setDb((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
      },

      loadDemo() {
        setDb(buildDemoDB());
      },

      resetAll() {
        storageRef.current.clear();
        setDb(emptyDB());
      },

      exportJSON() {
        return JSON.stringify(db, null, 2);
      },

      importJSON(text) {
        try {
          const parsed = JSON.parse(text) as Partial<DB>;
          if (!parsed || typeof parsed !== "object") {
            return { ok: false, message: "不是有效的 JSON 对象。" };
          }
          const base = emptyDB();
          const next: DB = {
            schemaVersion: SCHEMA_VERSION,
            resume: { ...base.resume, ...(parsed.resume ?? {}) },
            projects: Array.isArray(parsed.projects) ? parsed.projects : base.projects,
            jobs: Array.isArray(parsed.jobs) ? parsed.jobs : base.jobs,
            interviews: Array.isArray(parsed.interviews) ? parsed.interviews : base.interviews,
            knowledge: Array.isArray(parsed.knowledge) ? parsed.knowledge : base.knowledge,
            todos: Array.isArray(parsed.todos) ? parsed.todos : base.todos,
            selfIntroductions: Array.isArray(parsed.selfIntroductions)
              ? parsed.selfIntroductions
              : base.selfIntroductions,
            settings: { ...base.settings, ...(parsed.settings ?? {}) },
            meta: { ...base.meta, ...(parsed.meta ?? {}) },
          };
          setDb(next);
          return { ok: true, message: "导入成功。" };
        } catch {
          return { ok: false, message: "JSON 解析失败，请检查文件内容。" };
        }
      },
    };
  }, [createEntity, db]);

  const maps = useMemo(() => {
    const projectById = new Map<string, Project>();
    db.projects.forEach((p) => projectById.set(p.id, p));
    const jobById = new Map<string, Job>();
    db.jobs.forEach((j) => jobById.set(j.id, j));
    const interviewById = new Map<string, Interview>();
    db.interviews.forEach((i) => interviewById.set(i.id, i));
    const knowledgeById = new Map<string, Knowledge>();
    db.knowledge.forEach((k) => knowledgeById.set(k.id, k));
    return { projectById, jobById, interviewById, knowledgeById };
  }, [db]);

  const value = useMemo(
    () => ({ ready, db, api, ...maps }),
    [ready, db, api, maps]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData 必须在 DataProvider 内使用");
  return ctx;
}
