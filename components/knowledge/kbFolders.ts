import type { KnowledgeCategory } from "@/lib/types";

/**
 * Knowledge Base 页面固定展示的 5 类知识（内部细分类映射到文件夹）。
 * 内部 taxonomy 保留，避免已有数据丢失；页面只展示这 5 个文件夹。
 */
export interface KBFolder {
  key: string;
  label: string;
  match: KnowledgeCategory[];
  /** 新建卡片时选择的默认细分类 */
  defaultCategory: KnowledgeCategory;
}

export const KB_FOLDERS: KBFolder[] = [
  { key: "company", label: "公司知识", match: ["company", "role"], defaultCategory: "company" },
  { key: "industry", label: "行业知识", match: ["industry"], defaultCategory: "industry" },
  { key: "platform", label: "平台知识", match: ["platform"], defaultCategory: "platform" },
  {
    key: "interview",
    label: "面试经验",
    match: ["interview_question", "interview_experience", "other"],
    defaultCategory: "interview_experience",
  },
  {
    key: "case",
    label: "案例",
    match: ["marketing_case", "game_design_case"],
    defaultCategory: "marketing_case",
  },
];

export function folderOfCategory(category: KnowledgeCategory): KBFolder {
  return KB_FOLDERS.find((f) => f.match.includes(category)) ?? KB_FOLDERS[0];
}
