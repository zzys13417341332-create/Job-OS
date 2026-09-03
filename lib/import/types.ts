import type { KnowledgeCategory, ProjectType } from "@/lib/types";

/** 批量导入的目标模块 */
export type ImportTarget = "knowledge" | "project";

/** 内容来源 */
export type ImportSourceKind = "paste" | "file" | "feishu";

export interface KnowledgeImportItem {
  key: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  importance: 1 | 2 | 3 | 4 | 5;
  tags: string[];
}

export interface ProjectImportItem {
  key: string;
  name: string;
  company: string;
  type: ProjectType;
  /** 标签化字段未命中时，正文整体放入 background，方便导入后继续补全 BGAR */
  background: string;
  actions: string[];
  result: string;
  data: string;
  challenges: string;
  skills: string[];
  tools: string[];
  tags: string[];
}

export interface ParseResult<T> {
  items: T[];
  /** 因内容过短等原因被跳过的段落数 */
  skipped: number;
  /** 没有识别到任何标题/段落结构，是否把全文作为单条处理 */
  singleFallback: boolean;
}

export interface SplitSection {
  title: string;
  body: string;
}
