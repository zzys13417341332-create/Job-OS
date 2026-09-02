"use client";

import { useEffect, useState } from "react";
import { BookPlus, Save } from "lucide-react";
import type { Knowledge, KnowledgeCategory } from "@/lib/types";
import { KNOWLEDGE_CATEGORIES } from "@/lib/types";
import { IMPORTANCE_LABELS, KNOWLEDGE_CATEGORY_LABELS } from "@/lib/constants";
import { defaultKnowledgeDraft } from "@/lib/factories";
import { useData } from "@/providers/data-context";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Field, FormActions, FormNote, Input, Select, Textarea } from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { TagsEditor } from "@/components/ui/TagsEditor";
import { KB_FOLDERS, folderOfCategory } from "./kbFolders";

export function KnowledgeFormModal({
  open,
  onClose,
  item,
  preset,
}: {
  open: boolean;
  onClose: () => void;
  item?: Knowledge | null;
  preset?: Partial<Knowledge> | null;
}) {
  const { db, api } = useData();
  const { toast } = useToast();
  const [form, setForm] = useState(() => defaultKnowledgeDraft());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      defaultKnowledgeDraft(
        item ? { ...item } : preset ? { ...defaultKnowledgeDraft(), ...preset } : {}
      )
    );
    setError("");
  }, [open, item, preset]);

  const set = <K extends keyof ReturnType<typeof defaultKnowledgeDraft>>(
    key: K,
    value: ReturnType<typeof defaultKnowledgeDraft>[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleProject = (id: string) => {
    const list = form.relatedProjectIds as string[];
    set("relatedProjectIds", list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const save = () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError("标题与内容不能为空。");
      return;
    }
    setSaving(true);
    window.setTimeout(() => {
      if (item) {
        api.updateKnowledge(item.id, form);
        toast("知识卡片已更新。");
      } else {
        api.addKnowledge(form);
        toast("知识卡片已保存。");
      }
      setSaving(false);
      onClose();
    }, 200);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={item ? "编辑知识卡片" : "新建知识卡片"}
      footer={
        <FormActions>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="accent" icon={<Save size={14} />} loading={saving} onClick={save}>
            保存卡片
          </Button>
        </FormActions>
      }
    >
      <div className="space-y-3">
        <Field label="标题" required>
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="如：字节商业化产品体系速览" />
        </Field>
        <Field label="内容" required hint="支持换行分段；建议用自己的话写，可引用数据/案例">
          <Textarea rows={8} value={form.content} onChange={(e) => set("content", e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="分类">
            <Select
              value={folderOfCategory(form.category).key}
              onChange={(e) => {
                const folder = KB_FOLDERS.find((f) => f.key === e.target.value);
                if (folder) set("category", folder.defaultCategory);
              }}
            >
              {KB_FOLDERS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="重要程度">
            <Select value={form.importance} onChange={(e) => set("importance", Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {IMPORTANCE_LABELS[n]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="来源">
            <Select value={form.source} onChange={(e) => set("source", e.target.value as Knowledge["source"])}>
              <option value="manual">手动输入</option>
              <option value="paste">粘贴文本</option>
              <option value="file">文件上传</option>
              <option value="url">URL 导入</option>
              <option value="interview_review">面试复盘沉淀</option>
            </Select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="来源 URL">
            <Input value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="标签">
            <TagsEditor value={form.tags} onChange={(v) => set("tags", v)} placeholder="输入后回车" />
          </Field>
          <Field label="关联公司">
            <Input value={form.relatedCompany} onChange={(e) => set("relatedCompany", e.target.value)} placeholder="如：字节跳动" />
          </Field>
          <Field label="关联岗位">
            <Input value={form.relatedRole} onChange={(e) => set("relatedRole", e.target.value)} placeholder="如：商业化运营" />
          </Field>
        </div>
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-inkSoft">关联项目</p>
          {db.projects.length === 0 ? (
            <p className="text-xs text-faint">暂无项目可关联。</p>
          ) : (
            <div className="grid max-h-36 gap-1 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-2">
              {db.projects.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-[13px] hover:bg-canvas">
                  <input type="checkbox" checked={(form.relatedProjectIds as string[]).includes(p.id)} onChange={() => toggleProject(p.id)} className="h-3.5 w-3.5 accent-violet" />
                  <span className="truncate text-inkSoft">{p.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        {error ? <FormNote tone="error">{error}</FormNote> : null}
      </div>
    </Modal>
  );
}
