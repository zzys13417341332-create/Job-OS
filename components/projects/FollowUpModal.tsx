"use client";

import { useEffect, useState } from "react";
import { AlertCircle, FolderOpen, Save, Sparkles } from "lucide-react";
import type { FollowUpQuestion, Project } from "@/lib/types";
import { FOLLOW_UP_CATEGORY_LABELS } from "@/lib/constants";
import { useData } from "@/providers/data-context";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Badge, FormNote, type Tone } from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Loading";
import { createAIProvider, type AIProvider } from "@/services/ai/provider";

const CATEGORY_TONE: Record<string, Tone> = {
  basic: "muted",
  detail: "blue",
  data: "green",
  decision: "violet",
  challenge: "amber",
  counterfactual: "blue",
  pressure: "red",
};

export function FollowUpModal({
  project,
  onClose,
}: {
  project: Project | null;
  onClose: () => void;
}) {
  const { api } = useData();
  const { toast } = useToast();
  const [ai] = useState<AIProvider>(() => createAIProvider());
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<FollowUpQuestion[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (project) {
      setQuestions(project.interviewQuestions ?? []);
      setNotes([]);
      setSaved(true);
    }
  }, [project]);

  if (!project) return null;

  const generate = async () => {
    setRunning(true);
    setError("");
    try {
      const out = await ai.generateFollowUps({ project });
      setQuestions(out.questions);
      setNotes(out.notes);
      setSaved(false);
      toast("已生成预测追问（Mock AI）", "info");
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败，请重试。");
    } finally {
      setRunning(false);
    }
  };

  const save = () => {
    api.updateProject(project.id, { interviewQuestions: questions });
    setSaved(true);
    toast("追问已保存到项目记录，面试前可随时回看。");
  };

  const groups = FOLLOW_UP_CATEGORY_LABELS;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`AI 预测面试追问 · ${project.name}`}
      description="问题只根据项目里真实存在的内容生成；缺失的字段会用提示告诉你先补什么。"
      footer={
        <div className="flex items-center gap-2">
          <span className="mr-auto text-xs text-faint">
            {questions.length ? `${questions.length} 个问题` : ""}
            {saved ? " · 已保存" : ""}
          </span>
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
          <Button variant="soft" icon={<Save size={14} />} disabled={questions.length === 0} onClick={save}>
            保存追问到项目
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="accent" loading={running} icon={<Sparkles size={14} />} onClick={generate}>
            {questions.length ? "重新生成" : "生成预测追问"}
          </Button>
          {saved && questions.length ? (
            <Badge tone="green">当前展示的是已保存内容</Badge>
          ) : null}
        </div>

        {error ? <FormNote tone="error">{error}</FormNote> : null}

        {running ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted">
            <Spinner size={20} className="text-violet" />
            <p className="text-[13px]">正在阅读项目字段并生成追问…</p>
          </div>
        ) : notes.length ? (
          <div className="rounded-lg border border-amber-line bg-amber-soft/60 p-3 text-[13px] leading-5 text-amber">
            {notes.map((n, i) => (
              <p key={i} className="flex gap-1.5">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {n}
              </p>
            ))}
          </div>
        ) : null}

        {questions.length === 0 && !running ? (
          <div className="rounded-lg border border-dashed border-lineStrong px-4 py-8 text-center text-[13px] text-muted">
            点击「生成预测追问」，系统会按基础 / 细节 / 数据 / 决策 / 挑战 / 反事实 / 压力七类给出问题。
          </div>
        ) : (
          <ul className="space-y-2">
            {questions.map((item) => (
              <li key={item.id} className="rounded-lg border border-line bg-canvas/40 p-3">
                <div className="flex items-start gap-2.5">
                  <Badge tone={CATEGORY_TONE[item.category] ?? "muted"} className="mt-0.5 shrink-0">
                    {groups[item.category]}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-[13.5px] leading-5 text-ink">{item.question}</p>
                    {item.note ? <p className="mt-1 text-xs leading-5 text-faint">{item.note}</p> : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
