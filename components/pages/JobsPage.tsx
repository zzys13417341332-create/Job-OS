"use client";

import { useMemo, useState } from "react";
import { Briefcase, Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { Job, JobStatus } from "@/lib/types";
import { JOB_STATUSES } from "@/lib/types";
import { JOB_STATUS_LABELS } from "@/lib/constants";
import { formatDate, isToday } from "@/lib/utils";
import { useData } from "@/providers/data-context";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "./PageHeader";
import { Button } from "@/components/ui/Button";
import {
  Badge,
  Input,
  Panel,
  Select,
  type Tone,
} from "@/components/ui/Primitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/Modal";
import { JobFormModal } from "@/components/jobs/JobFormModal";
import { JobStatusSelect } from "@/components/jobs/jobStatus";
import { toneForScore } from "@/components/ui/Progress";
import { JOB_STATUS_TONES } from "@/lib/constants";

const FILTERS = ["all", "active", "not_applied", "finished"] as const;
type FilterKey = (typeof FILTERS)[number];

function filterLabel(k: FilterKey) {
  return k === "all"
    ? "全部"
    : k === "active"
      ? "进行中"
      : k === "not_applied"
        ? "待投递"
        : "Offer / 拒绝";
}

function isActiveStatus(s: JobStatus): boolean {
  return ["applied", "written_test", "interview_1", "interview_2", "interview_final"].includes(s);
}

export function JobsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { db, api } = useData();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [editing, setEditing] = useState<Job | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Job | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = db.jobs;
    if (q) {
      list = list.filter(
        (j) =>
          j.company.toLowerCase().includes(q) ||
          j.position.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q)
      );
    }
    if (filter === "active") list = list.filter((j) => isActiveStatus(j.status));
    else if (filter === "not_applied") list = list.filter((j) => j.status === "to_apply");
    else if (filter === "finished")
      list = list.filter((j) => j.status === "offer" || j.status === "rejected");
    return [...list].sort((a, b) => {
      const sa = a.matchScore ?? -1;
      const sb = b.matchScore ?? -1;
      return sb - sa;
    });
  }, [db.jobs, filter, query]);

  const counts = useMemo(
    () => ({
      all: db.jobs.length,
      active: db.jobs.filter((j) => isActiveStatus(j.status)).length,
      notApplied: db.jobs.filter((j) => j.status === "to_apply").length,
    }),
    [db.jobs]
  );

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (job: Job) => {
    setEditing(job);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    api.deleteJob(deleting.id);
    toast("岗位已删除。");
    setDeleting(null);
  };

  const updateStatus = (job: Job, status: JobStatus) => {
    const patch: Partial<Job> = { status };
    if (status === "applied" && !job.appliedAt) {
      patch.appliedAt = new Date().toISOString();
    }
    api.updateJob(job.id, patch);
    toast(`状态已更新为「${JOB_STATUS_LABELS[status]}」`);
  };

  return (
    <div>
      {!embedded ? (
        <PageHeader
          title="Job Library · 岗位库"
          description="所有岗位的统一入口：投递状态、匹配度与面试安排都从这里推进。"
          actions={
            <Button variant="accent" icon={<Plus size={15} />} onClick={openNew}>
              新增岗位
            </Button>
          }
        />
      ) : (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13px] text-muted">
              记录与管理全部岗位；今天投递的岗位会标出并计入上方目标。
            </p>
          </div>
          <Button size="sm" variant="accent" icon={<Plus size={14} />} onClick={openNew}>
            新增岗位
          </Button>
        </div>
      )}

      <div className="mb-4 grid grid-cols-3 gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl border px-4 py-3 text-left transition-colors ${
              filter === f
                ? "border-violet-line bg-violet-soft"
                : "border-line bg-surface hover:border-lineStrong"
            }`}
          >
            <p className="text-[11px] text-faint">{filterLabel(f)}</p>
            <p className={`tnum mt-0.5 font-mono text-xl font-semibold ${filter === f ? "text-violet-deep" : "text-ink"}`}>
              {f === "all" ? counts.all : f === "active" ? counts.active : counts.notApplied}
            </p>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <Input
            className="pl-9"
            placeholder="搜索公司 / 岗位 / 地点"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={filter} onChange={(e) => setFilter(e.target.value as FilterKey)} className="w-auto">
          {FILTERS.map((f) => (
            <option key={f} value={f}>
              {filterLabel(f)}
            </option>
          ))}
        </Select>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={30} />}
          title={db.jobs.length === 0 ? "岗位库还是空的" : "没有符合条件的岗位"}
          description={
            db.jobs.length === 0
              ? "先在「AI JD Match」里分析一个 JD，或直接手动新增岗位。"
              : "调整搜索关键词或筛选条件再试。"
          }
          action={
            db.jobs.length === 0 ? (
              <Button variant="accent" onClick={openNew}>
                手动新增岗位
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {/* 表头（桌面端） */}
          <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_88px_110px_120px] gap-4 px-5 text-[11px] font-semibold uppercase tracking-wider text-faint md:grid">
            <span>公司 / 岗位</span>
            <span>投递进度</span>
            <span>匹配度</span>
            <span>投递时间</span>
            <span className="text-right">操作</span>
          </div>
          {rows.map((job) => (
            <Panel key={job.id} className="group px-5 py-3.5 transition-colors hover:border-lineStrong">
              <div className="grid items-center gap-x-4 gap-y-2 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_88px_110px_120px]">
                <div className="min-w-0">
                  <button
                    onClick={() => openEdit(job)}
                    className="block w-full truncate text-left text-[14px] font-semibold text-ink hover:text-violet-deep"
                  >
                    {job.company}
                    <span className="font-normal text-muted"> · {job.position}</span>
                  </button>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-faint">
                    {job.location ? <span>{job.location}</span> : null}
                    {job.salary ? <span>{job.salary}</span> : null}
                    {isToday(job.appliedAt) ? (
                      <Badge tone="blue">今天投递</Badge>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <JobStatusSelect value={job.status} onChange={(s) => updateStatus(job, s)} />
                  {job.interviewDate && job.status !== "offer" && job.status !== "rejected" ? (
                    <Badge tone="violet" title="面试安排">
                      {formatDate(job.interviewDate)}
                    </Badge>
                  ) : null}
                </div>

                <div>
                  {job.matchScore != null ? (
                    <span
                      className="tnum inline-flex items-center gap-1 font-mono text-[15px] font-bold"
                      style={{ color: toneForScore(job.matchScore) }}
                    >
                      {job.matchScore}
                      <span className="text-[10px] font-normal text-faint">/100</span>
                    </span>
                  ) : (
                    <span className="text-xs text-faint">未分析</span>
                  )}
                </div>

                <span className="tnum text-xs text-muted">
                  {job.appliedAt ? formatDate(job.appliedAt) : "—"}
                </span>

                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => openEdit(job)}
                    className="rounded-md p-1.5 text-faint hover:bg-line/70 hover:text-inkSoft"
                    title="编辑"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleting(job)}
                    className="rounded-md p-1.5 text-faint hover:bg-red-soft hover:text-red"
                    title="删除"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {job.notes ? (
                <p className="mt-2 border-t border-line pt-2 text-xs leading-5 text-muted">{job.notes}</p>
              ) : null}
            </Panel>
          ))}
        </div>
      )}

      <JobFormModal open={formOpen} onClose={() => setFormOpen(false)} job={editing} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="删除这个岗位？"
        description={
          deleting ? (
            <>
              将删除 <b>{deleting.company} · {deleting.position}</b> 及其匹配报告。
              该操作不可恢复，删除前建议先导出数据。
            </>
          ) : null
        }
        confirmText="删除"
      />
    </div>
  );
}
