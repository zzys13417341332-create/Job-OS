"use client";

import { useEffect, useState } from "react";
import { FolderKanban, Save } from "lucide-react";
import type { Project, ProjectDraft, ProjectType } from "@/lib/types";
import { PROJECT_TYPES } from "@/lib/types";
import { PROJECT_TYPE_LABELS } from "@/lib/constants";
import { defaultProjectDraft } from "@/lib/factories";
import { joinLines, splitLines } from "@/lib/utils";
import { useData } from "@/providers/data-context";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import {
  Field,
  FormActions,
  FormNote,
  Input,
  Select,
  Textarea,
} from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { TagsEditor } from "@/components/ui/TagsEditor";

export function ProjectFormModal({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project?: Project | null;
}) {
  const { api } = useData();
  const { toast } = useToast();
  const [draft, setDraft] = useState<ProjectDraft>(() => defaultProjectDraft());
  const [actionsText, setActionsText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const d = defaultProjectDraft(project ? { ...project } : {});
    setDraft(d);
    setActionsText(joinLines(d.actions));
    setError("");
  }, [open, project]);

  const set = <K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const save = () => {
    if (!draft.name.trim()) {
      setError("项目名称必填（这是面试追问的锚点）。");
      return;
    }
    const normalized: ProjectDraft = { ...draft, actions: splitLines(actionsText) };
    setSaving(true);
    window.setTimeout(() => {
      if (project) {
        api.updateProject(project.id, normalized);
        toast("项目已更新。");
      } else {
        api.addProject(normalized);
        toast("项目已加入 Project Library。");
      }
      setSaving(false);
      onClose();
    }, 240);
  };

  const grid = "grid gap-3 sm:grid-cols-2";

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={project ? "编辑项目" : "新增项目"}
      description="按 Background → Goal → Action → Result 结构沉淀；越完整，AI 追问与匹配越有依据。"
      footer={
        <FormActions>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="accent" icon={<Save size={15} />} loading={saving} onClick={save}>
            保存项目
          </Button>
        </FormActions>
      }
    >
      <div className="space-y-6">
        <div className={grid}>
          <Field label="项目名称" required>
            <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="如：红果短剧投放增长优化" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="所属公司">
              <Input value={draft.company} onChange={(e) => set("company", e.target.value)} placeholder="个人项目可留空" />
            </Field>
            <Field label="类型">
              <Select
                value={draft.type}
                onChange={(e) => set("type", e.target.value as ProjectType)}
              >
                {PROJECT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {PROJECT_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="开始时间">
            <Input type="month" value={draft.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </Field>
          <Field label="结束时间">
            <Input type="month" value={draft.endDate} onChange={(e) => set("endDate", e.target.value)} />
          </Field>
        </div>

        <SectionTitle n="01" title="B · Background" desc="为什么做这个项目 / 背景矛盾" />
        <Textarea rows={3} value={draft.background} onChange={(e) => set("background", e.target.value)} placeholder="业务背景、团队处境、要解决的问题…" />

        <SectionTitle n="02" title="G · Goal" desc="目标与约束（可量化）" />
        <Textarea rows={2} value={draft.goal} onChange={(e) => set("goal", e.target.value)} placeholder="如：付费 ROI 从 0.92 提到 1.05" />

        <SectionTitle n="03" title="A · Action" desc="我的职责与关键行动（每行一条，区分“我做的 / 团队做的”）" />
        <Textarea rows={4} value={draft.responsibility} onChange={(e) => set("responsibility", e.target.value)} placeholder="你在项目中的具体职责…" />
        <Field label="关键行动">
          <Textarea rows={4} value={actionsText} onChange={(e) => setActionsText(e.target.value)} placeholder={"每行一条行动，例如：\n把人群拆成三层分别出价\n搭建素材 A/B 实验框架"} />
        </Field>

        <SectionTitle n="04" title="R · Result" desc="结果与数据成果（含口径）" />
        <Textarea rows={2} value={draft.result} onChange={(e) => set("result", e.target.value)} placeholder="最终结果…" />
        <Field label="数据成果" hint="数字 + 基线 + 口径，例如：ROI 0.92→1.06（周维度，自然+付费混合）">
          <Textarea rows={2} value={draft.data} onChange={(e) => set("data", e.target.value)} />
        </Field>

        <SectionTitle n="05" title="难点 / 决策 / 反思" desc="面试官追问的高频区域" />
        <Field label="项目难点（challenges）">
          <Textarea rows={2} value={draft.challenges} onChange={(e) => set("challenges", e.target.value)} />
        </Field>
        <Field label="关键决策（decisions）" hint="为什么选 A 不选 B、当时怎么权衡">
          <Textarea rows={2} value={draft.decisions} onChange={(e) => set("decisions", e.target.value)} />
        </Field>
        <Field label="复盘反思（reflection）">
          <Textarea rows={2} value={draft.reflection} onChange={(e) => set("reflection", e.target.value)} />
        </Field>

        <div className="grid gap-3 lg:grid-cols-3">
          <Field label="技能" hint="面试官会按技能词追问">
            <TagsEditor value={draft.skills} onChange={(v) => set("skills", v)} placeholder="输入后回车" />
          </Field>
          <Field label="工具">
            <TagsEditor value={draft.tools} onChange={(v) => set("tools", v)} placeholder="Excel / SQL / …" />
          </Field>
          <Field label="标签">
            <TagsEditor value={draft.tags} onChange={(v) => set("tags", v)} placeholder="短剧 / ROI / …" />
          </Field>
        </div>

        {error ? <FormNote tone="error">{error}</FormNote> : null}
      </div>
    </Modal>
  );
}

function SectionTitle({ n, title, desc }: { n: string; title: string; desc?: string }) {
  return (
    <div className="border-t border-line pt-4">
      <p className="flex items-baseline gap-2 text-[13px] font-semibold text-ink">
        <span className="font-mono text-[11px] text-faint">{n}</span>
        {title}
        {desc ? <span className="ml-1 text-xs font-normal text-faint">{desc}</span> : null}
      </p>
    </div>
  );
}
