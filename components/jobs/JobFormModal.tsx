"use client";

import { useEffect, useMemo, useState } from "react";
import { FolderPlus } from "lucide-react";
import type { Job, JobDraft, JobStatus } from "@/lib/types";
import { JOB_STATUSES } from "@/lib/types";
import { defaultJobDraft } from "@/lib/factories";
import { dateInputToISO, isoToDateInput } from "@/lib/utils";
import { useData } from "@/providers/data-context";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import {
  Field,
  FormActions,
  Input,
  Select,
  Textarea,
  Badge,
} from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { JOB_STATUS_LABELS } from "@/lib/constants";
import { toneForScore } from "@/components/ui/Progress";
import { MATCH_VERDICT_LABELS } from "@/lib/constants";

export function JobFormModal({
  open,
  onClose,
  job,
}: {
  open: boolean;
  onClose: () => void;
  job?: Job | null;
}) {
  const { api, db } = useData();
  const { toast } = useToast();
  const [draft, setDraft] = useState<JobDraft>(() => defaultJobDraft());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(defaultJobDraft(job ? { ...job } : {}));
    setError("");
  }, [open, job]);

  const set = <K extends keyof JobDraft>(key: K, value: JobDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const save = () => {
    if (!draft.company.trim() || !draft.position.trim()) {
      setError("公司和岗位名称是必填项。");
      return;
    }
    setSaving(true);
    setError("");
    // 模拟一次异步保存，让按钮出现 loading 状态
    window.setTimeout(() => {
      if (job) {
        api.updateJob(job.id, draft);
        toast("岗位已更新。");
      } else {
        api.addJob(draft);
        toast("岗位已保存到 Job Library。");
      }
      setSaving(false);
      onClose();
    }, 260);
  };

  const match = db.jobs.find((j) => j.id === job?.id);
  const analysis = match?.matchAnalysis ?? null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={job ? "编辑岗位" : "新增岗位"}
      description="岗位投递记录；复杂 JD 分析请使用 AI JD Match 页面。"
      footer={
        <FormActions>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="accent" icon={<FolderPlus size={15} />} loading={saving} onClick={save}>
            保存岗位
          </Button>
        </FormActions>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="公司" required>
          <Input
            value={draft.company}
            onChange={(e) => set("company", e.target.value)}
            placeholder="如：字节跳动"
          />
        </Field>
        <Field label="岗位名称" required>
          <Input
            value={draft.position}
            onChange={(e) => set("position", e.target.value)}
            placeholder="如：商业化广告运营"
          />
        </Field>
        <Field label="来源">
          <Input value={draft.source} onChange={(e) => set("source", e.target.value)} placeholder="BOSS直聘 / 官网 / 内推" />
        </Field>
        <Field label="地点">
          <Input value={draft.location} onChange={(e) => set("location", e.target.value)} placeholder="如：上海" />
        </Field>
        <Field label="薪资范围">
          <Input value={draft.salary} onChange={(e) => set("salary", e.target.value)} placeholder="如：25-40K·16薪" />
        </Field>
        <Field label="岗位链接">
          <Input value={draft.url} onChange={(e) => set("url", e.target.value)} placeholder="https://…" />
        </Field>
        <Field label="当前状态">
          <Select value={draft.status} onChange={(e) => set("status", e.target.value as JobStatus)}>
            {JOB_STATUSES.map((s) => (
              <option key={s} value={s}>
                {JOB_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="投递日期" hint="留空表示尚未投递">
          <Input
            type="date"
            value={draft.appliedAt ? isoToDateInput(draft.appliedAt) : ""}
            onChange={(e) => set("appliedAt", e.target.value ? dateInputToISO(e.target.value) : "")}
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="JD 原文" hint="粘贴完整 JD，便于后续 AI 匹配">
          <Textarea
            rows={6}
            className="font-mono text-[12.5px] leading-5"
            value={draft.jd}
            onChange={(e) => set("jd", e.target.value)}
            placeholder={"岗位职责…\n任职要求…"}
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="备注">
          <Textarea rows={2} value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="记录投递进展、联系人等" />
        </Field>
      </div>

      {analysis ? (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-violet-line bg-violet-soft/60 px-3 py-2.5">
          <span
            className="tnum font-mono text-base font-bold"
            style={{ color: toneForScore(analysis.score) }}
          >
            {analysis.score}
          </span>
          <div className="min-w-0 text-[13px] leading-5 text-inkSoft">
            <span className="font-medium">{MATCH_VERDICT_LABELS[analysis.verdict]}</span>
            {analysis.summary ? ` · ${analysis.summary}` : ""}
          </div>
          <Badge tone="muted" className="ml-auto shrink-0">
            已保存匹配报告
          </Badge>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg border border-red-line bg-red-soft px-3 py-2 text-[13px] text-red">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
