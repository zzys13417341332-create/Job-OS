"use client";

import { useMemo, useState } from "react";
import { FolderKanban, FolderPlus, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import type { Project } from "@/lib/types";
import { PROJECT_TYPE_LABELS } from "@/lib/constants";
import { useData } from "@/providers/data-context";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "./PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge, Input, Panel } from "@/components/ui/Primitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/Progress";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";
import { FollowUpModal } from "@/components/projects/FollowUpModal";

const REQUIRED_FIELDS: Array<{ key: keyof Project; label: string }> = [
  { key: "background", label: "背景" },
  { key: "goal", label: "目标" },
  { key: "responsibility", label: "职责" },
  { key: "result", label: "结果" },
  { key: "data", label: "数据" },
  { key: "decisions", label: "决策" },
  { key: "challenges", label: "难点" },
  { key: "reflection", label: "反思" },
];

function isEmpty(v: unknown): boolean {
  if (Array.isArray(v)) return v.length === 0;
  return !String(v ?? "").trim();
}

export function ProjectsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { db, api } = useData();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Project | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [followProject, setFollowProject] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? db.projects.filter((p) =>
          [p.name, p.company, p.tags.join(" "), p.skills.join(" ")].join(" ").toLowerCase().includes(q)
        )
      : db.projects;
    return [...base].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [db.projects, query]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (p: Project) => {
    setEditing(p);
    setFormOpen(true);
  };

  return (
    <div>
      {!embedded ? (
        <PageHeader
          title="Project Library · 项目库"
          description="每个项目按 B-G-A-R 结构化保存，并支撑 JD 匹配、面试追问与复盘缺口检测。"
          actions={
            <Button variant="accent" icon={<FolderPlus size={15} />} onClick={openNew}>
              新增项目
            </Button>
          }
        />
      ) : (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-muted">
            项目是面试的弹药库：BGAR 越完整，AI 追问与 JD 匹配越有依据。
          </p>
          <Button size="sm" variant="accent" icon={<FolderPlus size={14} />} onClick={openNew}>
            新增项目
          </Button>
        </div>
      )}

      <div className="mb-4 max-w-sm">
        <Input placeholder="搜索项目 / 公司 / 标签 / 技能" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={30} />}
          title="还没有项目记录"
          description="项目库是 Job OS 最重要的资产：JD 匹配与面试复盘都依赖它。建议每个项目都补全数据与决策字段。"
          action={
            <Button variant="accent" onClick={openNew}>
              创建第一个项目
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {list.map((p) => {
            const filled = REQUIRED_FIELDS.filter((f) => !isEmpty(p[f.key])).length;
            const pct = Math.round((filled / REQUIRED_FIELDS.length) * 100);
            return (
              <Panel key={p.id} className="flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <button onClick={() => openEdit(p)} className="block text-left">
                      <p className="text-[15px] font-semibold leading-6 text-ink hover:text-violet-deep">{p.name}</p>
                    </button>
                    <p className="mt-0.5 text-xs text-faint">
                      {p.company || "个人项目"} · {PROJECT_TYPE_LABELS[p.type]}
                      {p.startDate ? ` · ${p.startDate}${p.endDate ? ` ~ ${p.endDate}` : ""}` : ""}
                    </p>
                  </div>
                  <Badge tone={pct >= 85 ? "green" : pct >= 55 ? "blue" : "amber"}>
                    {pct}% 完整
                  </Badge>
                </div>

                <p className="mt-3 line-clamp-3 text-[13px] leading-5 text-muted">
                  {p.result || p.data || p.background || "还没有内容——点编辑补全 BGAR。"}
                </p>

                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[10px] text-faint">
                    <span>字段覆盖</span>
                    <span>
                      {filled}/{REQUIRED_FIELDS.length} · BGAR
                    </span>
                  </div>
                  <ProgressBar value={pct} />
                </div>

                {p.tags.length ? (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {p.tags.slice(0, 5).map((tag) => (
                      <span key={tag} className="rounded bg-line/60 px-1.5 py-0.5 text-[10px] text-muted">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex items-center gap-1 border-t border-line pt-3">
                  <Button size="xs" variant="soft" icon={<Sparkles size={12} />} onClick={() => setFollowProject(p)}>
                    AI 追问
                  </Button>
                  <Button size="xs" variant="ghost" icon={<Pencil size={12} />} onClick={() => openEdit(p)}>
                    编辑
                  </Button>
                  <button
                    onClick={() => setDeleting(p)}
                    className="ml-auto rounded-md p-1.5 text-faint hover:bg-red-soft hover:text-red"
                    title="删除项目"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      <ProjectFormModal open={formOpen} onClose={() => setFormOpen(false)} project={editing} />
      {followProject ? <FollowUpModal project={followProject} onClose={() => setFollowProject(null)} /> : null}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          api.deleteProject(deleting.id);
          toast("项目已删除。岗位匹配报告与知识关联将忽略该项目。");
          setDeleting(null);
        }}
        title="删除这个项目？"
        description={
          deleting ? <>将删除「{deleting.name}」的全部结构化内容与已保存追问。该操作不可恢复。</> : null
        }
        confirmText="删除"
      />
    </div>
  );
}
