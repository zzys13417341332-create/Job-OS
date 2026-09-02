"use client";

import { useState } from "react";
import { Copy, FileText, Plus, Trash2 } from "lucide-react";
import type { SelfIntroduction } from "@/lib/types";
import { INTRO_VERSION_LABELS } from "@/lib/constants";
import { defaultIntroDraft } from "@/lib/factories";
import { nowISO } from "@/lib/utils";
import { useData } from "@/providers/data-context";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Badge, Input, Panel } from "@/components/ui/Primitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/Modal";
import { SelfIntroFormModal } from "./SelfIntroFormModal";

export function IntroManager() {
  const { db, api } = useData();
  const { toast } = useToast();
  const [editing, setEditing] = useState<SelfIntroduction | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<SelfIntroduction | null>(null);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const duplicate = (item: SelfIntroduction) => {
    const draft = defaultIntroDraft({
      title: `${item.title}（副本）`,
      role: item.role,
      scene: item.scene,
      version: item.version,
      content: item.content,
      highlights: item.highlights,
      projectIds: item.projectIds,
    });
    api.addIntro(draft);
    toast("已复制为新模板。");
  };

  const markUsed = (item: SelfIntroduction) => {
    api.updateIntro(item.id, { lastUsedAt: nowISO() });
    toast(`已记录「${item.title}」本次使用时间。`);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          为不同岗位维护独立版本（60 秒 / 90 秒 / 3 分钟），面试前按场景调用。
        </p>
        <Button size="sm" variant="accent" icon={<Plus size={14} />} onClick={openNew}>
          新建模板
        </Button>
      </div>

      {db.selfIntroductions.length === 0 ? (
        <EmptyState
          icon={<FileText size={28} />}
          title="还没有自我介绍模板"
          description="先为最常投的方向建一个：内容建议突出数据与可迁移能力，并按版本压缩。"
          action={
            <Button variant="accent" onClick={openNew}>
              创建第一份
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {db.selfIntroductions.map((item) => {
            const words = item.content.replace(/\s/g, "").length;
            const speed = Math.round(words / 4); // 中文口语约 4 字/秒
            return (
              <Panel key={item.id} className="p-5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-ink">{item.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge tone="violet">{item.role || "未指定岗位"}</Badge>
                      <Badge tone="blue">{INTRO_VERSION_LABELS[item.version]}</Badge>
                      <Badge tone="muted" title={`约 ${words} 字，按 4 字/秒估算`}>
                        约 {speed}s
                      </Badge>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditing(item)}
                    className="text-xs font-medium text-violet hover:text-violet-deep"
                  >
                    编辑
                  </button>
                </div>

                <div className="mt-3 rounded-lg bg-canvas/60 px-3.5 py-3">
                  <p className="line-clamp-4 whitespace-pre-line text-[13px] leading-6 text-inkSoft">
                    {item.content || "（正文为空）"}
                  </p>
                </div>

                {item.highlights.length ? (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {item.highlights.map((h) => (
                      <span key={h} className="rounded bg-violet-soft px-1.5 py-0.5 text-[10px] text-violet-deep">
                        {h}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
                  <Button size="xs" variant="soft" onClick={() => markUsed(item)}>
                    记录本次使用
                  </Button>
                  <Button size="xs" variant="ghost" icon={<Copy size={12} />} onClick={() => duplicate(item)}>
                    复制
                  </Button>
                  <button
                    onClick={() => setDeleting(item)}
                    className="ml-auto rounded-md p-1.5 text-faint hover:bg-red-soft hover:text-red"
                    aria-label="删除模板"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      <SelfIntroFormModal open={formOpen} onClose={() => setFormOpen(false)} item={editing} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            api.deleteIntro(deleting.id);
            toast("模板已删除。");
            setDeleting(null);
          }
        }}
        title="删除这个自我介绍模板？"
        description={deleting ? <>将删除「{deleting.title}」。已关联的岗位记录不受影响。</> : null}
      />
    </div>
  );
}
