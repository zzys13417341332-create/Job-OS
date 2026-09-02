// =============================================================
// Mock AI 文本引擎：关键词/片段重叠 + 启发式打分。
// 仅供 MVP 演示"流程成立"，不代替语义理解；
// 所有结论都只会引用本地真实存在的资料，绝不编造个人经历。
// =============================================================

import { clamp, seededRandom, sleep } from "@/lib/utils";

export function norm(s: string): string {
  return (s || "").toLowerCase().trim();
}

const STOP_CHARS = /[，。；、！？：""''（）()《》【】\s,.;:!?\-—_/\\|]/g;

function latinTokens(text: string): string[] {
  const matches = norm(text).match(/[a-z0-9][a-z0-9.+#-]*/g) ?? [];
  return matches.filter((t) => t.length >= 2);
}

function chineseBigrams(text: string): string[] {
  const chars = (text || "").replace(/[^\u4e00-\u9fa5]/g, "");
  if (chars.length === 1) return [chars];
  const out: string[] = [];
  for (let i = 0; i < chars.length - 1; i++) {
    out.push(chars.slice(i, i + 2));
  }
  return out;
}

/** 中英混合分词：英文单词 + 中文二元组 */
export function tokenize(text: string): Set<string> {
  const cleaned = (text || "").replace(STOP_CHARS, " ");
  return new Set([...latinTokens(cleaned), ...chineseBigrams(cleaned)]);
}

/** Jaccard 相似度（两个文本间） */
export function tokenOverlap(a: string, b: string): number {
  const sa = tokenize(a);
  const sb = tokenize(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const t of sa) {
    if (sb.has(t)) inter++;
  }
  return inter / Math.sqrt(sa.size * sb.size);
}

/** 返回文本 a 中能命中 b 关键词的术语列表（用于解释依据） */
export function matchedTerms(a: string, b: string, minScore = 0.32): string[] {
  const ta = tokenize(a);
  const tb = tokenize(b);
  const hits = new Set<string>();
  for (const t of tb) {
    if (ta.has(t)) hits.add(t);
  }
  const out = [...hits];
  // 中文二元组相邻合并，让"广 告"变成"广告"这类展示更好看
  const merged = out.filter((t, i) => {
    if (t.length !== 2 || !/[\u4e00-\u9fa5]{2}/.test(t)) return true;
    const next = out[i + 1];
    return !(next && next.length === 2 && !/[\u4e00-\u9fa5]{2}/.test(next));
  });
  return merged.slice(0, 12);
}

export function matchedScore(a: string, b: string): number {
  return clamp(Math.round(tokenOverlap(a, b) * 1000), 0, 100);
}

export function containsAny(text: string, terms: string[]): string[] {
  const t = norm(text);
  return terms.filter((term) => t.includes(norm(term)));
}

export function excerpt(text: string, max = 120): string {
  const s = (text || "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** 从文本中提取数字与单位线索，如 5%、120 万、3000 元 */
export function numberClues(text: string): string[] {
  const matches =
    (text || "").match(
      /(\d+(?:\.\d+)?)\s*(%|％|万|亿|千|元|块|人|次|单|倍|天|周|月|年|分钟)?/g
    ) ?? [];
  return matches.map((m) => m.trim()).slice(0, 8);
}

/** 用确定性的随机种子从数组取 n 个（保持 Mock 结果稳定） */
export function pickBySeed<T>(seed: string, arr: T[], n: number): T[] {
  const rand = seededRandom(seed || `${arr.length}-${Date.now()}`);
  const copy = [...arr];
  const out: T[] = [];
  while (copy.length > 0 && out.length < n) {
    const idx = Math.floor(rand() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

export function joinText(parts: Array<string | undefined>, sep = " "): string {
  return parts.filter(Boolean).join(sep);
}

/** 模拟网络延迟，让加载状态真实可见；开发时可改为 0 */
export async function simulateLatency(min = 550, max = 1250): Promise<void> {
  const ms = min + Math.random() * (max - min);
  await sleep(ms);
}

export const QUESTION_KEYWORDS: Record<string, string[]> = {
  data: [
    "数据",
    "指标",
    "提升",
    "下降",
    "增长",
    "结果",
    "效果",
    "转化",
    "成本",
    "留存",
    "DAU",
    "DNU",
    "ROI",
    "LTV",
    "归因",
    "漏斗",
    "占比",
    "怎么算",
    "口径",
    "复盘",
  ],
  project: ["项目", "做过", "负责", "参与", "案例", "经历", "怎么做的", "具体做", "推进"],
  motivation: [
    "为什么选择",
    "为什么投",
    "为什么来",
    "离职",
    "职业规划",
    "动机",
    "期待",
    "了解我们",
  ],
  self_intro: ["自我介绍", "介绍自己", "简单介绍", "讲讲自己", "你的背景"],
  industry: ["行业", "赛道", "市场", "趋势", "商业模式", "怎么看", "竞争"],
  situational: ["如果", "假如", "假设", "场景", "怎么办", "同时", "优先级", "冲突", "紧急", "会怎么"],
  pressure: ["压力", "质疑", "否定", "挫折", "失败", "批评", "加班", "背锅"],
  role: ["岗位", "职位", "职责", "方法论", "如何做好", "怎么做", "工作内容"],
};
