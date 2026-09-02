"use client";

import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import type { IntroVersion, SelfIntroduction } from "@/lib/types";
import { INTRO_VERSIONS } from "@/lib/types";
import { INTRO_VERSION_LABELS } from "@/lib/constants";
import { defaultIntroDraft } from "@/lib/factories";
import { useData } from "@/providers/data-context";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Field, FormActions, FormNote, Input, Select, Textarea } from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { TagsEditor } from "@/components/ui/TagsEditor";

export function SelfIntroFormModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: SelfIntroduction | null;
}) {
  const { db, api } = useData();
  const { toast } = useToast();
  const [form, setForm] = useState(() =>
    defaultIntroDraft({
      title: "",
      role: db.resume.targetRoles[0] ?? "",
      scene: "",
      version: "90s",
      content: "",
      highlights: [],
      projectIds: [],
      lastUsedAt: "",
    })
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      defaultIntroDraft(
        item
          ? { ...item }
          : {
              title: "",
              role: db.resume.targetRoles[0] ?? "",
              scene: "",
              version: "90s",
              content: "",
              highlights: [],
              projectIds: [],
              lastUsedAt: "",
            }
      )
    );
    setError("");
  }, [open, item, db.resume.targetRoles]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const wordCount = useMemo(() => form.content.replace(/\s/g, "").length, [form.content]);

  const save = () => {
    if (!form.title.trim()) {
      setError("请填写模板标题（如：商业化投放 90 秒）。");
      return;
    }
    setSaving(true);
    window.setTimeout(() => {
      if (item) {
        api.updateIntro(item.id, form);
        toast("模板已更新。");
      } else {
        api.addIntro(form);
        toast("模板已创建。");
      }
      setSaving(false);
      onClose();
    }, 200);
  };

  const toggleProject = (id: string) => {
    const has = form.projectIds.includes(id);
    set("projectIds", has ? form.projectIds.filter((x) => x !== id) : [...form.projectIds, id]);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={item ? "编辑自我介绍模板" : "新建自我介绍模板"}
      footer={
        <FormActions>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="accent" icon={<Save size={14} />} loading={saving} onClick={save}>
            保存模板
          </Button>
        </FormActions>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="模板标题" required>
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="如：商业化投放 90 秒" />
        </Field>
        <Field label="目标岗位 / 角色">
          <Input value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="如：商业化运营" />
        </Field>
        <Field label="使用场景">
          <Input value={form.scene} onChange={(e) => set("scene", e.target.value)} placeholder="如：字节一面开场" />
        </Field>
        <Field label="版本">
          <Select value={form.version} onChange={(e) => set("version", e.target.value as IntroVersion)}>
            {INTRO_VERSIONS.map((v) => (
              <option key={v} value={v}>
                {INTRO_VERSION_LABELS[v]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mt-4">
        <Field label="正文" hint={`约 ${wordCount} 字${wordCount > 0 ? `，按 4 字/秒约 ${Math.round(wordCount / 4)} 秒` : ""}`}>
          <Textarea rows={10} value={form.content} onChange={(e) => set("content", e.target.value)} placeholder={"面试官好，我叫…\n\n我的三段经历…\n数据结果…\n为什么适合这个岗位…"} />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="重点突出的能力 / 数据" hint="面试官时间紧，记住你的 1-2 个数字">
          <TagsEditor value={form.highlights} onChange={(v) => set("highlights", v)} placeholder="如：ROI 0.92→1.06" />
        </Field>
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-[13px] font-medium text-inkSoft">关联项目（用于 AI 追问时定位依据）</p>
        {db.projects.length === 0 ? (
          <p className="text-xs text-faint">项目库为空，先去 Projects 添加项目。</p>
        ) : (
          <div className="grid max-h-44 gap-1.5 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-2">
            {db.projects.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-canvas">
                <input type="checkbox" checked={form.projectIds.includes(p.id)} onChange={() => toggleProject(p.id)} className="h-3.5 w-3.5 accent-violet" />
                <span className="truncate text-inkSoft">{p.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {error ? <div className="mt-4"><FormNote tone="error">{error}</FormNote></div> : null}
    </Modal>
  );
}
