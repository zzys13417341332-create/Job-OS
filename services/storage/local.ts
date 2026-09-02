import type { DB } from "@/lib/types";
import { SCHEMA_VERSION } from "@/lib/types";
import { emptyDB } from "@/lib/factories";

const DB_KEY = "job-os.db.v1";

/**
 * 本地数据库存储（localStorage）。
 * 接口保持稳定，未来替换为 API / PostgreSQL 时只改这一层。
 */
export interface DBStorage {
  load(): DB;
  save(db: DB): void;
  clear(): void;
}

export class LocalDBStorage implements DBStorage {
  load(): DB {
    try {
      const raw = window.localStorage.getItem(DB_KEY);
      if (!raw) return emptyDB();
      const parsed = JSON.parse(raw) as Partial<DB>;
      if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) {
        // schema 版本不匹配时回到空库，避免旧结构崩溃
        return emptyDB();
      }
      return normalizeDB(parsed);
    } catch {
      return emptyDB();
    }
  }

  save(db: DB): void {
    try {
      window.localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (err) {
      // 隐私模式 / 容量超限时静默降级：内存中的 db 仍然可用，仅无法跨刷新保存
      console.warn("[Job OS] 本地保存失败（容量或隐私模式）：", err);
    }
  }

  clear(): void {
    try {
      window.localStorage.removeItem(DB_KEY);
    } catch {
      /* ignore */
    }
  }
}

/** 校验并修复可能不完整的数据，确保任何页面都不会因 undefined 崩溃 */
function normalizeDB(input: Partial<DB>): DB {
  const base = emptyDB();
  return {
    schemaVersion: SCHEMA_VERSION,
    resume: { ...base.resume, ...(input.resume ?? {}) },
    projects: Array.isArray(input.projects) ? input.projects : base.projects,
    jobs: Array.isArray(input.jobs) ? input.jobs : base.jobs,
    interviews: Array.isArray(input.interviews) ? input.interviews : base.interviews,
    knowledge: Array.isArray(input.knowledge) ? input.knowledge : base.knowledge,
    todos: Array.isArray(input.todos) ? input.todos : base.todos,
    selfIntroductions: Array.isArray(input.selfIntroductions)
      ? input.selfIntroductions
      : base.selfIntroductions,
    settings: { ...base.settings, ...(input.settings ?? {}) },
    meta: { ...base.meta, ...(input.meta ?? {}) },
  };
}
