"use client";

import { useEffect, useState } from "react";
import { Mic2, Save } from "lucide-react";
import type { Interview, InterviewRound } from "@/lib/types";
import { INTERVIEW_ROUNDS } from "@/lib/types";
import { INTERVIEW_ROUND_LABELS } from "@/lib/constants";
import { defaultInterviewDraft } from "@/lib/factories";
import { isoToDateTimeLocal, nowISO } from "@/lib/utils";
import { useData } from "@/providers/data-context";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Field, FormActions, FormNote, Input, Select, Textarea } from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";

export function InterviewFormModal({
  open,
  onClose,
  item,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  item?: Interview | null;
  onCreated?: (interview: Interview) => void;
}) {
  const { api } = useData();
  const { toast } = useToast();
  const [form, setForm] = useState(() => defaultInterviewDraft());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(defaultInterviewDraft(item ? { ...item } : {}));
    setError("");
  }, [open, item]);

  const set = <K extends keyof ReturnType<typeof defaultInterviewDraft>>(
    key: K,
    value: ReturnType<typeof defaultInterviewDraft>[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = () => {
    if (!form.company.trim() || !form.position.trim()) {
      setError("公司和岗位必填。");
      return;
    }
    setSaving(true);
    window.setTimeout(() => {
      if (item) {
        api.updateInterview(item.id, form);
        toast("面试记录已更新。");
        onClose();
      } else {
        const entity = api.addInterview(form);
        toast("面试记录已创建。");
        onClose();
        onCreated?.(entity);
      }
      setSaving(false);
    }, 220);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={item ? "编辑面试记录" : "新建面试记录"}
      description="面试时间建议精确填写，便于 Dashboard 与复盘提醒。"
      footer={
        <FormActions>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="accent" icon={<Save size={14} />} loading={saving} onClick={save}>
            保存
          </Button>
        </FormActions>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="公司" required>
          <Input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="如：字节跳动" />
        </Field>
        <Field label="岗位" required>
          <Input value={form.position} onChange={(e) => set("position", e.target.value)} placeholder="如：商业化运营" />
        </Field>
        <Field label="轮次">
          <Select value={form.round} onChange={(e) => set("round", e.target.value as InterviewRound)}>
            {INTERVIEW_ROUNDS.map((r) => (
              <option key={r} value={r}>
                {INTERVIEW_ROUND_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="面试日期">
          <Input
            type="datetime-local"
            value={isoToDateTimeLocal(form.date)}
            onChange={(e) => set("date", e.target.value ? new Date(e.target.value).toISOString() : nowISO())}
          />
        </Field>
        <Field label="面试官">
          <Input value={form.interviewer} onChange={(e) => set("interviewer", e.target.value)} />
        </Field>
        <Field label="当前有无录音文件" hint="之后可在详情页上传">
          <Input disabled value={form.audio ? form.audio.name : "暂无"} className="text-muted" />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="备注">
          <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="记录反馈节奏、约面时间等" />
        </Field>
      </div>
      {error ? <div className="mt-3"><FormNote tone="error">{error}</FormNote></div> : null}
    </Modal>
  );
}
