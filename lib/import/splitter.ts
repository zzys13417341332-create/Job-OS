// =============================================================
// 批量导入解析器（纯函数，无副作用）
// 输入任意文档/粘贴文本，按标题结构拆成多条知识或项目草稿。
// 分类/标签为启发式结果，导入前可在预览中修改。
// =============================================================

import type { KnowledgeCategory, ProjectType } from "@/lib/types";
import type {
  KnowledgeImportItem,
  ParseResult,
  ProjectImportItem,
  SplitSection,
} from "./types";

// ---------- 文本规范化 ----------

function normalizeText(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u200B/g, "")
    .split("\n")
    .map((line) => line.replace(/!\[[^\]]*\]\([^)]*\)/g, "").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripMarkdown(line: string): string {
  return line
    .replace(/^#{1,6}\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
}

function isBullet(line: string): boolean {
  return /^\s*(?:[-*•·▪◦]|\d{1,2}[.)、．])\s+/.test(line);
}

/** 判断一行是否为“章节标题”（markdown 标题 / 编号小节），返回标题文本或 null */
function headingTitle(line: string): string | null {
  const t = line.trim();
  if (!t) return null;
  if (/^#{1,6}\s+\S/.test(t)) {
    const title = stripMarkdown(t);
    return title && title.length <= 80 ? title : null;
  }
  const numbered = t.match(/^([0-9]{1,3}|[一二三四五六七八九十]{1,3})[、.．](\s*)(.+)$/);
  if (numbered) {
    const title = numbered[3].trim();
    // 编号行同时以句读结尾时大概率是正文枚举，不作为章节标题
    if (title.length >= 2 && title.length <= 40 && !/[。；；，,]$/.test(title)) return title;
  }
  return null;
}

/** 把整段文本拆成 {title, body} 小节 */
function splitIntoSections(raw: string): SplitSection[] {
  const lines = normalizeText(raw).split("\n");
  const sections: SplitSection[] = [];
  let currentTitle = "";
  let buffer: string[] = [];

  const flush = () => {
    const body = buffer.join("\n").trim();
    if (currentTitle || body) {
      sections.push({ title: currentTitle, body });
    }
    buffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const title = headingTitle(line);
    const isMarkdownHeading = /^#{1,6}\s/.test(trimmed);
    const isNumberedMarker = /^(?:[0-9]{1,3}|[一二三四五六七八九十]{1,3})[、.．]/.test(
      trimmed
    );
    // 编号小节只在上一行为空行时生效，避免把正文里的枚举误当成标题
    const canStartSection =
      isMarkdownHeading ||
      (isNumberedMarker && (i === 0 || lines[i - 1].trim() === ""));
    if (title && canStartSection) {
      flush();
      currentTitle = title;
      continue;
    }
    buffer.push(line);
  }
  flush();

  // 清理空内容小节
  return sections
    .map((s) => ({
      title: s.title.trim(),
      body: s.body.trim(),
    }))
    .filter((s) => s.title || s.body);
}

/** 无标题结构时的兜底：把全文作为一条，标题取首行 */
function fallbackSection(raw: string, defaultTitle: string): SplitSection {
  const text = normalizeText(raw);
  const firstLine = text.split("\n").find((l) => {
    const t = l.trim();
    return (
      t.length >= 2 &&
      t.length <= 40 &&
      !/^https?:\/\//i.test(t) &&
      !/^\d{4}[-/]\d{1,2}/.test(t)
    );
  });
  const title = firstLine?.trim() ?? defaultTitle;
  const rest = firstLine ? text.slice(text.indexOf(firstLine) + firstLine.length).trim() : text;
  return { title, body: rest || text };
}

function sectionText(s: SplitSection): string {
  return `${s.title}${s.title && s.body ? "\n" : ""}${s.body}`.trim();
}

// ---------- 关键词启发式 ----------

const CATEGORY_RULES: Array<{ category: KnowledgeCategory; keywords: string[] }> = [
  {
    category: "company",
    keywords: [
      "公司简介",
      "公司背景",
      "企业文化",
      "组织架构",
      "工商信息",
      "发展历程",
      "融资",
      "字节跳动",
      "腾讯",
      "阿里巴巴",
      "美团",
      "网易",
      "米哈游",
      "京东",
      "拼多多",
      "快手",
      "百度",
      "小红书",
      "哔哩哔哩",
      "华为",
      "小米",
      "莉莉丝",
      "叠纸",
      "三七互娱",
      "完美世界",
      "心动公司",
    ],
  },
  {
    category: "platform",
    keywords: [
      "平台",
      "抖音",
      "巨量引擎",
      "巨量广告",
      "巨量算数",
      "穿山甲",
      "微信",
      "公众号",
      "视频号",
      "知乎",
      "淘宝",
      "天猫",
      "亚马逊",
      "应用商店",
      "游戏平台",
      "Steam",
      "TapTap",
      "App Store",
    ],
  },
  {
    category: "industry",
    keywords: [
      "行业",
      "市场规模",
      "市场趋势",
      "赛道",
      "渗透率",
      "行业格局",
      "产业链",
      "用户规模",
      "增长率",
      "短剧行业",
      "休闲游戏市场",
      "出海市场",
    ],
  },
  {
    category: "marketing_case",
    keywords: [
      "营销",
      "广告",
      "投放",
      "素材",
      "campaign",
      "活动策划",
      "裂变",
      "私域",
      "直播带货",
      "增长案例",
      "ROI",
      "eCPM",
      "oCPM",
      "竞价",
      "获客",
      "买量",
      "种草",
      "品牌声量",
    ],
  },
  {
    category: "game_design_case",
    keywords: [
      "游戏",
      "玩法",
      "关卡",
      "数值设计",
      "抽卡",
      "养成",
      "战斗",
      "系统设计",
      "策划案",
      "核心循环",
      "合成玩法",
      "休闲游戏",
      "IAA",
      "IAP",
      "混合变现",
      "副本",
      "经济系统",
    ],
  },
  {
    category: "role",
    keywords: [
      "岗位",
      "职责",
      "能力模型",
      "胜任力",
      "岗位要求",
      "工作内容",
      "运营",
      "产品经理",
      "广告优化师",
      "游戏策划",
      "投放",
      "面试岗位",
      "晋升",
      "KPI",
    ],
  },
  {
    category: "interview_question",
    keywords: [
      "面试题",
      "面试问题",
      "考察点",
      "笔试题",
      "算法题",
      "反问",
      "问题清单",
      "必考题",
      "高频题",
    ],
  },
  {
    category: "interview_experience",
    keywords: [
      "面试经验",
      "复盘",
      "一面",
      "二面",
      "三面",
      "HR面",
      "面试官",
      "面试流程",
      "offer 面",
      "压力面",
    ],
  },
];

const TAG_DICTIONARY: Array<{ word: string; tag: string }> = [
  { word: "字节跳动", tag: "字节" },
  { word: "巨量引擎", tag: "巨量引擎" },
  { word: "巨量广告", tag: "巨量" },
  { word: "穿山甲", tag: "穿山甲" },
  { word: "抖音", tag: "抖音" },
  { word: "腾讯", tag: "腾讯" },
  { word: "小红书", tag: "小红书" },
  { word: "米哈游", tag: "米哈游" },
  { word: "休闲游戏", tag: "休闲游戏" },
  { word: "游戏", tag: "游戏" },
  { word: "短剧", tag: "短剧" },
  { word: "投放", tag: "广告投放" },
  { word: "素材", tag: "素材" },
  { word: "竞价", tag: "竞价广告" },
  { word: "eCPM", tag: "eCPM" },
  { word: "oCPM", tag: "oCPM" },
  { word: "ROI", tag: "ROI" },
  { word: "IAA", tag: "IAA" },
  { word: "IAP", tag: "IAP" },
  { word: "数据分析", tag: "数据分析" },
  { word: "面试", tag: "面试" },
  { word: "B-G-A-R", tag: "BGAR" },
];

const TOOL_WORDS = [
  "Excel",
  "SQL",
  "Python",
  "Tableau",
  "Power BI",
  "Figma",
  "Axure",
  "Notion",
  "飞书",
  "Office",
  "PPT",
  "Unity",
  "Unreal",
  "Cocos",
  "Photoshop",
  "剪映",
  "巨量引擎",
  "巨量广告",
  "穿山甲",
  "Google Analytics",
  "AppsFlyer",
];

function countMatches(text: string, keywords: string[]): number {
  let n = 0;
  for (const kw of keywords) {
    if (text.includes(kw)) n += 1;
  }
  return n;
}

export function inferKnowledgeCategory(text: string): KnowledgeCategory {
  let best: KnowledgeCategory = "other";
  let bestScore = 0;
  for (const rule of CATEGORY_RULES) {
    const score = countMatches(text, rule.keywords);
    if (score > bestScore) {
      best = rule.category;
      bestScore = score;
    }
  }
  return best;
}

function extractTags(text: string, limit = 6): string[] {
  const tags: string[] = [];
  for (const { word, tag } of TAG_DICTIONARY) {
    if (text.includes(word) && !tags.includes(tag)) tags.push(tag);
    if (tags.length >= limit) break;
  }
  return tags;
}

function inferImportance(text: string): 1 | 2 | 3 | 4 | 5 {
  if (/面试|必考|高频|追问|核心/.test(text)) return 5;
  if (/数据|指标|复盘|案例/.test(text)) return 4;
  return 3;
}

const COMPANIES = [
  "字节跳动",
  "腾讯",
  "阿里巴巴",
  "美团",
  "网易",
  "米哈游",
  "京东",
  "拼多多",
  "快手",
  "百度",
  "小红书",
  "哔哩哔哩",
  "B站",
  "华为",
  "小米",
  "莉莉丝",
  "叠纸",
  "三七互娱",
  "完美世界",
  "心动",
  "FunPlus",
  "悠星",
];

function detectCompany(title: string, body: string): string {
  const label = body.match(/^\s*(?:所属)?公司\s*[:：]\s*([^\n]{1,30})/);
  if (label) return label[1].trim();
  const text = `${title} ${body.slice(0, 200)}`;
  const hit = COMPANIES.find((c) => text.includes(c));
  return hit ?? "";
}

function detectProjectType(text: string): ProjectType {
  if (/竞赛|比赛|黑客松|hackathon|训练营|大赛/i.test(text)) return "competition";
  if (/个人项目|独立开发|开源|side[ -]?project|作品集|demo/i.test(text)) return "side_project";
  if (/游戏|玩法|关卡|数值设计|抽卡|养成|战斗系统|策划案|unity|ue5/i.test(text))
    return "game";
  return "work";
}

function extractTools(text: string): string[] {
  return TOOL_WORDS.filter((t) => text.includes(t)).slice(0, 6);
}

// ---------- 知识解析 ----------

export function parseKnowledgeText(
  raw: string,
  opts: { defaultTitle?: string; maxItems?: number } = {}
): ParseResult<KnowledgeImportItem> {
  const maxItems = opts.maxItems ?? 80;
  const defaultTitle = opts.defaultTitle?.trim() || "导入的知识内容";
  let sections = splitIntoSections(raw);
  let singleFallback = false;
  if (sections.length === 0) {
    sections = [fallbackSection(raw, defaultTitle)];
    singleFallback = true;
  }

  const items: KnowledgeImportItem[] = [];
  let skipped = 0;
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const full = sectionText(sec);
    const content = sec.body || sec.title;
    if (full.replace(/\s/g, "").length < 12) {
      skipped += 1;
      continue;
    }
    if (items.length >= maxItems) {
      skipped += sections.length - i;
      break;
    }
    const title = sec.title.trim() || full.split("\n")[0].trim().slice(0, 60) || defaultTitle;
    items.push({
      key: `know_${i}`,
      title: title.slice(0, 80),
      content: content.slice(0, 6000),
      category: inferKnowledgeCategory(full),
      importance: inferImportance(full),
      tags: extractTags(full),
    });
  }
  return { items, skipped, singleFallback };
}

// ---------- 项目解析 ----------

interface LabelRule {
  field: "background" | "goal" | "responsibility" | "result" | "data" | "challenges" | "decisions" | "reflection";
  labels: string[];
}

const LABEL_RULES: LabelRule[] = [
  { field: "background", labels: ["项目背景", "背景"] },
  { field: "goal", labels: ["项目目标", "目标"] },
  { field: "responsibility", labels: ["我的职责", "职责", "负责内容", "我做了什么", "行动", "主要工作"] },
  { field: "result", labels: ["项目结果", "最终结果", "结果", "成果"] },
  { field: "data", labels: ["核心数据", "数据表现", "数据", "关键指标", "指标"] },
  { field: "challenges", labels: ["难点", "挑战"] },
  { field: "decisions", labels: ["关键决策", "决策"] },
  { field: "reflection", labels: ["反思", "复盘", "经验总结", "总结"] },
];

const ALL_LABELS = LABEL_RULES.flatMap((r) => r.labels);

function labelOf(line: string): LabelRule["field"] | null {
  const t = line.trim();
  for (const rule of LABEL_RULES) {
    for (const label of rule.labels) {
      if (new RegExp(`^${label}\\s*[:：]`).test(t)) return rule.field;
      if (new RegExp(`^${label}$`).test(t)) return rule.field;
    }
  }
  return null;
}

function splitLabeledBody(body: string): {
  fields: Partial<Record<LabelRule["field"], string>>;
  intro: string;
} {
  const lines = body.split("\n");
  const fields: Partial<Record<LabelRule["field"], string>> = {};
  let current: LabelRule["field"] | "intro" = "intro";
  let intro: string[] = [];
  const buckets: Record<string, string[]> = {};

  const push = (target: string, line: string) => {
    if (!buckets[target]) buckets[target] = [];
    buckets[target].push(line);
  };

  for (const line of lines) {
    const found = labelOf(line);
    if (found) {
      current = found;
      const rest = line.trim().replace(/^[^:：]*[:：]\s*/, "");
      if (rest) push(found, rest);
      continue;
    }
    if (current === "intro") intro.push(line);
    else push(current, line);
  }

  for (const key of Object.keys(buckets)) {
    const typed = key as LabelRule["field"];
    fields[typed] = buckets[key].join("\n").trim();
  }
  return { fields, intro: intro.join("\n").trim() };
}

function bullets(lines: string[]): string[] {
  return lines
    .map((l) => l.replace(/^\s*[-*•·▪◦]\s+/, "").trim())
    .filter((l) => l && l.length >= 2);
}

export function parseProjectText(
  raw: string,
  opts: { defaultTitle?: string; maxItems?: number } = {}
): ParseResult<ProjectImportItem> {
  const maxItems = opts.maxItems ?? 50;
  const defaultTitle = opts.defaultTitle?.trim() || "未命名项目";
  let sections = splitIntoSections(raw);
  let singleFallback = false;
  if (sections.length === 0) {
    sections = [fallbackSection(raw, defaultTitle)];
    singleFallback = true;
  }

  const items: ProjectImportItem[] = [];
  let skipped = 0;
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const title = sec.title.trim() || sec.body.split("\n")[0]?.trim().slice(0, 40) || defaultTitle;
    const full = sectionText(sec);
    if (full.replace(/\s/g, "").length < 30) {
      skipped += 1;
      continue;
    }
    if (items.length >= maxItems) {
      skipped += sections.length - i;
      break;
    }

    const { fields, intro } = splitLabeledBody(sec.body);
    const responsibilityLines = fields.responsibility ? fields.responsibility.split("\n") : [];
    const actionLines = responsibilityLines.filter((l) => isBullet(l) || /^\s*[-*•·▪◦]\s+/.test(l));
    const responsibility = responsibilityLines
      .filter((l) => !/^\s*[-*•·▪◦]\s+/.test(l))
      .join("\n")
      .trim();

    const bodyText = [intro, ...Object.values(fields)].filter(Boolean).join("\n");
    const company = detectCompany(title, sec.body);
    const type = detectProjectType(`${title} ${sec.body}`);
    const tags = extractTags(full);
    const skills = tags.filter((t) => ["数据分析", "游戏", "广告投放"].includes(t));

    items.push({
      key: `proj_${i}`,
      name: title.slice(0, 80),
      company,
      type,
      background: fields.background || intro || bodyText,
      actions: bullets(actionLines),
      result: fields.result ?? "",
      data: fields.data ?? "",
      challenges: fields.challenges ?? "",
      skills,
      tools: extractTools(full),
      tags,
    });
  }
  return { items, skipped, singleFallback };
}

export { normalizeText, splitIntoSections };
