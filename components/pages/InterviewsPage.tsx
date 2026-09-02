"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AudioLines, FileAudio, Mic2, Pencil, Plus, Trash2 } from "lucide-react";
import type { Interview } from "@/lib/types";
import { INTERVIEW_ROUND_LABELS } from "@/lib/constants";
import { formatDateTime, isPast } from "@/lib/utils";
import { useData } from "@/providers/data-context";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "./PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge, Panel, type Tone } from "@/components/ui/Primitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/Modal";
import { InterviewFormModal } from "@/components/interviews/InterviewFormModal";

export function InterviewsPage() {
  const { db, api } = useData();
  const { toast } = useToast();
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Interview | null>(null);
  const [deleting, setDeleting] = useState<Interview | null>(null);

  const list = useMemo(
    () => [...db.interviews].sort((a, b) => b.date.localeCompare(a.date)),
    [db.interviews]
  );

  return (
    <div>
      <PageHeader
        eyebrow="AI 工作台"
        title="Interview Review · 面试复盘"
        description="上传录音 → 转写 → 提取问题 → 回答分析 → Gap 检测 → 一键沉淀到知识库 / 项目库 / Todo。"
        actions={
          <Button variant="accent" icon={<Plus size={15} />} onClick={() => setFormOpen(true)}>
            新建面试记录
          </Button>
        }
      />

      <div className="mb-5 grid gap-2 sm:grid-cols-3">
        <MiniStat label="总面试" value={list.length} />
        <MiniStat label="待复盘" value={list.filter((i) => !i.analysis).length} />
        <MiniStat label="已完成复盘" value={list.filter((i) => Boolean(i.analysis)).length} />
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<FileAudio size={30} />}
          title="还没有面试记录"
          description="每次面试结束后创建一条记录；有录音时上传（仅存本地），没有录音也可以用 Mock Transcript 体验完整复盘流程。"
          action={
            <Button variant="accent" onClick={() => setFormOpen(true)}>
              创建第一条面试记录
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {list.map((iv) => {
            const gapCount = iv.analysis?.gaps.length ?? 0;
            return (
              <Panel key={iv.id} className="px-5 py-4 transition-colors hover:border-lineStrong">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/interviews/${iv.id}`}
                      className="block truncate text-[14.5px] font-semibold text-ink hover:text-violet-deep"
                    >
                      {iv.company} · {iv.position}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-faint">
                      <Badge tone="blue">{INTERVIEW_ROUND_LABELS[iv.round]}</Badge>
                      <span>{formatDateTime(iv.date)}</span>
                      {iv.interviewer ? <span>· {iv.interviewer}</span> : null}
                    </div>
                  </div>
                  {iv.audio ? (
                    <Badge tone="muted">
                      <AudioLines size={11} /> 录音 {formatBytesText(iv.audio.size)}
                    </Badge>
                  ) : null}
                  {iv.transcript.length ? <Badge tone="green">{iv.transcript.length} 段</Badge> : null}
                  {iv.analysis ? (
                    <Badge tone="green">
                      {iv.analysis.gaps.length ? `复盘完成 · ${gapCount} 处缺口` : "复盘完成"}
                    </Badge>
                  ) : iv.transcript.length ? (
                    <Badge tone="amber">待复盘</Badge>
                  ) : (
                    <Badge tone="muted">待转写</Badge>
                  )}
                  {iv.date && !iv.analysis && isPast(iv.date) ? <Badge tone="red">已结束未复盘</Badge> : null}
                  <div className="flex items-center gap-1">
                    <Link href={`/interviews/${iv.id}`}>
                      <Button size="sm" variant="soft" icon={<Mic2 size={13} />}>
                        复盘
                      </Button>
                    </Link>
                    <button
                      onClick={() => {
                        setEditing(iv);
                        setFormOpen(true);
                      }}
                      className="rounded-md p-1.5 text-faint hover:bg-line/70 hover:text-inkSoft"
                      title="编辑"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleting(iv)}
                      className="rounded-md p-1.5 text-faint hover:bg-red-soft hover:text-red"
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      <InterviewFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        item={editing}
        onCreated={(iv) => router.push(`/interviews/${iv.id}`)}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          api.deleteInterview(deleting.id);
          toast("面试记录已删除。");
          setDeleting(null);
        }}
        title="删除这条面试记录？"
        description={
          deleting ? (
            <>
              将删除「{deleting.company} · {deleting.position}」的转写、复盘与缺口建议。
              本地保存的音频文件也会一并清理。
            </>
          ) : null
        }
      />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="text-[11px] text-faint">{label}</p>
      <p className="tnum mt-0.5 font-mono text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

function formatBytesText(n: number): string {
  if (!n) return "";
  const units = ["B", "KB", "MB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)}${units[i]}`;
}
