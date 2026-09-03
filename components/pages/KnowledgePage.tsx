"use client";

import { useMemo, useState } from "react";
import { BookOpenText, BookPlus, Link2, Pencil, Search, Trash2, Upload } from "lucide-react";
import type { Knowledge, KnowledgeCategory } from "@/lib/types";
import { KNOWLEDGE_CATEGORIES } from "@/lib/types";
import {
  IMPORTANCE_LABELS,
  KNOWLEDGE_CATEGORY_LABELS,
} from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { useData } from "@/providers/data-context";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "./PageHeader";
import { Button } from "@/components/ui/Button";
import {
  Badge,
  Input,
  Panel,
  type Tone,
} from "@/components/ui/Primitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/Modal";
import { KnowledgeFormModal } from "@/components/knowledge/KnowledgeFormModal";
import { BulkImportModal } from "@/components/import/BulkImportModal";
import { cn } from "@/lib/utils";
import { KB_FOLDERS, folderOfCategory } from "@/components/knowledge/kbFolders";

const FOLDER_TONE: Record<string, Tone> = {
  company: "violet",
  industry: "blue",
  platform: "violet",
  interview: "green",
  case: "amber",
};

export function KnowledgePage() {
  const { db, api, projectById } = useData();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState<string>("all");
  const [editing, setEditing] = useState<Knowledge | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Knowledge | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.knowledge
      .filter((k) => {
        if (folder === "all") return true;
        const f = KB_FOLDERS.find((x) => x.key === folder);
        return f ? f.match.includes(k.category) : true;
      })
      .filter((k) =>
        q
          ? [k.title, k.content, k.tags.join(" "), k.relatedCompany, k.relatedRole]
              .join(" ")
              .toLowerCase()
              .includes(q)
          : true
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [db.knowledge, folder, query]);

  const folderCounts = useMemo(() => {
    const m = new Map<string, number>();
    db.knowledge.forEach((k) => {
      const f = folderOfCategory(k.category);
      m.set(f.key, (m.get(f.key) ?? 0) + 1);
    });
    return m;
  }, [db.knowledge]);

  return (
    <div>
      <PageHeader
        eyebrow="个人资产"
        title="Knowledge Base · 知识库"
        description="把分散在网页、飞书、Notion 里的行业/公司/岗位/案例知识沉淀成结构化卡片，反哺 JD 匹配与面试准备。"
        actions={
          <>
            <Button variant="outline" icon={<Upload size={15} />} onClick={() => setImportOpen(true)}>
              批量导入
            </Button>
            <Button variant="accent" icon={<BookPlus size={15} />} onClick={() => setFormOpen(true)}>
              新建知识卡片
            </Button>
          </>
        }
      />

      {/* 分类快速浏览 */}
      <div className="scrollbar-none mb-4 flex gap-1.5 overflow-x-auto pb-1">
        <FilterChip active={folder === "all"} onClick={() => setFolder("all")}>
          全部（{db.knowledge.length}）
        </FilterChip>
        {KB_FOLDERS.map((f) => (
          <FilterChip
            key={f.key}
            active={folder === f.key}
            onClick={() => setFolder(folder === f.key ? "all" : f.key)}
          >
            {f.label}（{folderCounts.get(f.key) ?? 0}）
          </FilterChip>
        ))}
      </div>

      <div className="mb-4 max-w-md">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <Input className="pl-9" placeholder="搜索标题 / 内容 / 标签 / 公司" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<BookOpenText size={28} />}
          title={db.knowledge.length === 0 ? "知识库还是空的" : "没有匹配的知识卡片"}
          description="建议先建设与你目标岗位最相关的两块：公司知识（如字节商业化）与案例库（如游戏策划案例）。"
          action={
            db.knowledge.length === 0 ? (
              <Button variant="accent" onClick={() => setFormOpen(true)}>
                添加第一条知识
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-2">
          {list.map((k) => (
            <Panel key={k.id} className="px-5 py-4">
              <div className="flex items-start gap-3">
                <button onClick={() => setEditing(k)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14.5px] font-semibold text-ink hover:text-violet-deep">{k.title}</p>
                    <Badge tone={FOLDER_TONE[folderOfCategory(k.category).key] ?? "muted"}>
                      {folderOfCategory(k.category).label}
                    </Badge>
                    <Badge tone={k.importance >= 4 ? "red" : k.importance === 3 ? "amber" : "muted"}>
                      {IMPORTANCE_LABELS[k.importance]}
                    </Badge>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[13px] leading-6 text-muted">{k.content}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-faint">
                    {k.tags.slice(0, 6).map((tag) => (
                      <span key={tag} className="rounded bg-line/60 px-1.5 py-0.5 text-[10px] text-muted">
                        #{tag}
                      </span>
                    ))}
                    {k.relatedCompany ? <span>公司：{k.relatedCompany}</span> : null}
                    {k.relatedRole ? <span>岗位：{k.relatedRole}</span> : null}
                    {k.sourceUrl ? (
                      <span className="inline-flex items-center gap-1">
                        <Link2 size={11} />
                        <a href={k.sourceUrl} target="_blank" rel="noreferrer" className="text-violet hover:underline">
                          来源
                        </a>
                      </span>
                    ) : null}
                    <span>更新于 {formatDate(k.updatedAt)}</span>
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => setEditing(k)}
                    className="rounded-md p-1.5 text-faint hover:bg-line/70 hover:text-inkSoft"
                    title="编辑"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleting(k)}
                    className="rounded-md p-1.5 text-faint hover:bg-red-soft hover:text-red"
                    title="删除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <KnowledgeFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        item={editing}
      />
      <BulkImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        target="knowledge"
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            api.deleteKnowledge(deleting.id);
            toast("知识卡片已删除。");
            setDeleting(null);
          }
        }}
        title="删除这条知识卡片？"
        description={deleting ? <>将删除「{deleting.title}」及其全部内容。</> : null}
      />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-violet bg-violet-soft text-violet-deep"
          : "border-line bg-surface text-muted hover:border-lineStrong hover:text-inkSoft"
      )}
    >
      {children}
    </button>
  );
}
