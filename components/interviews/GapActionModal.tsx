"use client";

import { useEffect, useState } from "react";
import { BookOpenText, Check, FolderPlus, ListChecks, Save } from "lucide-react";
import type { GapSuggestion, KnowledgeCategory, Project, ProjectTextField } from "@/lib/types";
import { KNOWLEDGE_CATEGORIES } from "@/lib/types";
import { KNOWLEDGE_CATEGORY_LABELS } from "@/lib/constants";
import { defaultKnowledgeDraft, defaultProjectDraft, defaultTodoDraft } from "@/lib/factories";
import { useData } from "@/providers/data-context";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import {
  Badge,
  Field,
  FormNote,
  Input,
  Select,
  Textarea,
} from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { TagsEditor } from "@/components/ui/TagsEditor";
import { GAP_TYPE_LABELS } from "@/lib/constants";

type ActionKind = "knowledge" | "project" | "todo";

export type { ActionKind as GapActionKind };

export function GapActionModal({
  gap,
  action,
  interview,
  onClose,
  onTodoAdded,
}: {
  gap: GapSuggestion | null;
  action: ActionKind | null;
  interview: { company: string; position: string; id: string };
  onClose: () => void;
  onTodoAdded?: (todoId: string) => void;
}) {
  const { db, api } = useData();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // knowledge
  const [knowTitle, setKnowTitle] = useState("");
  const [knowBody, setKnowBody] = useState("");
  const [knowCategory, setKnowCategory] = useState<KnowledgeCategory>("other");
  const [knowTags, setKnowTags] = useState<string[]>([]);
  const [knowImportance, setKnowImportance] = useState<1 | 2 | 3 | 4 | 5>(3);

  // project
  const [projectMode, setProjectMode] = useState<"existing" | "new">("existing");
  const [projectId, setProjectId] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [projectField, setProjectField] = useState<ProjectTextField>("challenges");
  const [projectBody, setProjectBody] = useState("");

  // todo
  const [todoTitle, setTodoTitle] = useState("");
  const [todoDesc, setTodoDesc] = useState("");

  useEffect(() => {
    if (!gap || !action) return;
    setError("");
    setKnowTitle(gap.suggestedTitle);
    setKnowBody(gap.suggestedBody);
    setKnowTags(gap.type === "knowledge" ? [interview.company].filter(Boolean) : []);
    setKnowCategory(
      interview.company && gap.type === "knowledge"
        ? "company"
        : gap.type === "project"
          ? "industry"
          : "other"
    );
    setProjectBody(gap.suggestedBody);
    setProjectField(
      gap.targetProjectField ?? (gap.type === "data" ? "data" : gap.type === "project" ? "challenges" : "reflection")
    );
    const prefill = gap.suggestedProjectId
      ? gap.suggestedProjectId
      : db.projects[0]?.id ?? "";
    setProjectId(prefill);
    setProjectMode(!prefill ? "new" : "existing");
    setNewProjectName(gap.suggestedTitle.replace(/^补充[:：]?/, "").slice(0, 24) || "面试复盘沉淀项目");
    setTodoTitle(gap.suggestedTodo);
    setTodoDesc(
      `${gap.reason}\n来自 ${interview.company || "面试"} ${interview.position} 的「${GAP_TYPE_LABELS[gap.type]}」建议。`
    );
  }, [gap, action, interview.company, interview.position, db.projects]);

  if (!gap || !action) return null;

  const saveKnowledge = () => {
    if (!knowTitle.trim() || !knowBody.trim()) {
      setError("标题与内容不能为空。");
      return;
    }
    setSaving(true);
    window.setTimeout(() => {
      const draft = defaultKnowledgeDraft({
        title: knowTitle.trim(),
        content: knowBody.trim(),
        category: knowCategory,
        tags: knowTags,
        source: "interview_review",
        relatedCompany: interview.company,
        relatedRole: interview.position,
        relatedProjectIds: [],
        importance: knowImportance,
      });
      api.addKnowledge(draft);
      setSaving(false);
      toast("已补充到 Knowledge Base。");
      onClose();
    }, 200);
  };

  const saveProject = () => {
    if (!projectBody.trim()) {
      setError("补充内容不能为空。");
      return;
    }
    if (projectMode === "new" && !newProjectName.trim()) {
      setError("请填写新项目名称。");
      return;
    }
    setSaving(true);
    window.setTimeout(() => {
      if (projectMode === "existing") {
        const target = db.projects.find((p) => p.id === projectId);
        if (!target) {
          setError("所选项目不存在，请重试。");
          setSaving(false);
          return;
        }
        const old = String(target[projectField] ?? "");
        const content = old.trim()
          ? `${old.trim()}\n\n【面试复盘补充】${projectBody.trim()}`
          : `【面试复盘补充】${projectBody.trim()}`;
        api.updateProject(target.id, { [projectField]: content } as Partial<Project>);
        toast(`已追加到「${target.name}」的${PROJECT_FIELD_LABELS[projectField]}。`);
      } else {
        const draft = defaultProjectDraft({
          name: newProjectName.trim(),
          type: "work",
          background: `由 ${interview.company || "面试"} 复盘沉淀`,
        });
        draft[projectField] = `【面试复盘补充】${projectBody.trim()}`;
        api.addProject(draft);
        toast("已新建项目并写入补充内容。");
      }
      setSaving(false);
      onClose();
    }, 200);
  };

  const saveTodo = () => {
    if (!todoTitle.trim()) return;
    setSaving(true);
    window.setTimeout(() => {
      const todo = api.addTodo(
        defaultTodoDraft({
          title: todoTitle.trim(),
          description: todoDesc.trim(),
          priority: gap.type === "expression" ? "high" : "medium",
          source: "interview_review",
          relatedInterviewId: interview.id,
          gapType: gap.type,
          deadline: "",
        })
      );
      onTodoAdded?.(todo.id);
      setSaving(false);
      toast("已加入 Todo（可在 Dashboard 查看与完成）。");
      onClose();
    }, 180);
  };

  const headerIcon =
    action === "knowledge" ? (
      <BookOpenText size={16} />
    ) : action === "project" ? (
      <FolderPlus size={16} />
    ) : (
      <ListChecks size={16} />
    );

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={
        <span className="flex items-center gap-2">
          {headerIcon}
          {action === "knowledge" ? "补充到知识库" : action === "project" ? "补充到项目库" : "加入 Todo"}
        </span>
      }
      description={
        <div className="space-y-1">
          <Badge tone={gap.type === "knowledge" ? "violet" : gap.type === "project" ? "blue" : gap.type === "data" ? "green" : "amber"}>
            {GAP_TYPE_LABELS[gap.type]}建议
          </Badge>
          <p className="text-xs text-muted">{gap.reason}</p>
        </div>
      }
      footer={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="accent"
            icon={<Save size={14} />}
            loading={saving}
            onClick={action === "knowledge" ? saveKnowledge : action === "project" ? saveProject : saveTodo}
          >
            确认沉淀
          </Button>
        </div>
      }
    >
      {error ? (
        <div className="mb-3">
          <FormNote tone="error">{error}</FormNote>
        </div>
      ) : null}

      {action === "knowledge" ? (
        <div className="space-y-3">
          <Field label="标题" required>
            <Input value={knowTitle} onChange={(e) => setKnowTitle(e.target.value)} />
          </Field>
          <Field label="分类">
            <Select value={knowCategory} onChange={(e) => setKnowCategory(e.target.value as KnowledgeCategory)}>
              {KNOWLEDGE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {KNOWLEDGE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="内容" required hint="已预填模板，请改写成自己的理解">
            <Textarea rows={7} value={knowBody} onChange={(e) => setKnowBody(e.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="关联公司">
              <Input value={interview.company} disabled />
            </Field>
            <Field label="重要程度">
              <Select
                value={knowImportance}
                onChange={(e) => setKnowImportance(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {"★".repeat(n)}{"★".repeat(5 - n) ? "".concat("☆".repeat(5 - n)) : ""} {n}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="标签">
            <TagsEditor value={knowTags} onChange={setKnowTags} placeholder="输入后回车" />
          </Field>
        </div>
      ) : null}

      {action === "project" ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setProjectMode("existing")}
              className={`flex-1 rounded-lg border px-3 py-2 text-[13px] font-medium ${
                projectMode === "existing" ? "border-violet bg-violet-soft text-violet-deep" : "border-line text-muted"
              }`}
            >
              补充到已有项目
            </button>
            <button
              onClick={() => setProjectMode("new")}
              className={`flex-1 rounded-lg border px-3 py-2 text-[13px] font-medium ${
                projectMode === "new" ? "border-violet bg-violet-soft text-violet-deep" : "border-line text-muted"
              }`}
            >
              新建项目
            </button>
          </div>

          {projectMode === "existing" ? (
            <>
              <Field label="选择项目">
                <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  {db.projects.length === 0 ? (
                    <option value="">项目库为空，请切换到「新建项目」</option>
                  ) : (
                    db.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))
                  )}
                </Select>
              </Field>
              <Field label={`写入字段：${PROJECT_FIELD_LABELS[projectField]}`} hint="确认前可修改内容">
                <Textarea rows={6} value={projectBody} onChange={(e) => setProjectBody(e.target.value)} />
              </Field>
            </>
          ) : (
            <>
              <Field label="新项目名称" required>
                <Input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} />
              </Field>
              <Field label={`写入字段：${PROJECT_FIELD_LABELS[projectField]}`}>
                <Textarea rows={6} value={projectBody} onChange={(e) => setProjectBody(e.target.value)} />
              </Field>
            </>
          )}
          <p className="text-[11px] leading-4 text-faint">
            沉淀后请到 Projects 页补全 BGAR 与数据字段，未来 JD 匹配才能引用它。
          </p>
        </div>
      ) : null}

      {action === "todo" ? (
        <div className="space-y-3">
          <Field label="Todo 标题">
            <Input value={todoTitle} onChange={(e) => setTodoTitle(e.target.value)} />
          </Field>
          <Field label="说明">
            <Textarea rows={5} value={todoDesc} onChange={(e) => setTodoDesc(e.target.value)} />
          </Field>
          <p className="flex items-center gap-1.5 text-[12px] text-muted">
            <Check size={13} className="text-green" />
            完成后可在 Dashboard 勾选；来源标记为「面试复盘」。
          </p>
        </div>
      ) : null}
    </Modal>
  );
}

export const PROJECT_FIELD_LABELS: Record<ProjectTextField, string> = {
  background: "背景",
  goal: "目标",
  responsibility: "职责",
  result: "结果",
  data: "数据成果",
  challenges: "难点",
  decisions: "关键决策",
  reflection: "复盘反思",
};
