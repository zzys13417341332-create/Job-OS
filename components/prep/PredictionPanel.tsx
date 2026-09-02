"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, ListChecks, Send, Sparkles } from "lucide-react";
import type { AIPredictionOutput } from "@/services/ai/types";
import { defaultTodoDraft } from "@/lib/factories";
import { useData } from "@/providers/data-context";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Badge, Field, FormNote, Input, Textarea } from "@/components/ui/Primitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Loading";
import { ScoreRing, toneForScore } from "@/components/ui/Progress";
import { createAIProvider, type AIProvider } from "@/services/ai/provider";
import { QUESTION_CATEGORY_LABELS } from "@/lib/constants";

export function PredictionPanel() {
  const { db, api, projectById } = useData();
  const { toast } = useToast();
  const [ai] = useState<AIProvider>(() => createAIProvider());
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [jd, setJd] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AIPredictionOutput | null>(null);

  const run = async () => {
    setError("");
    if (jd.trim().length < 60) {
      setError("请粘贴完整 JD（至少 60 字），预测才有意义。");
      return;
    }
    setRunning(true);
    setResult(null);
    try {
      const out = await ai.predictInterview({
        company: company.trim(),
        position: position.trim(),
        jd: jd.trim(),
        resume: db.resume,
        projects: db.projects,
        knowledge: db.knowledge,
      });
      setResult(out);
      toast("预测完成（Mock AI）", "info");
    } catch (err) {
      setError(err instanceof Error ? err.message : "预测失败，请重试。");
    } finally {
      setRunning(false);
    }
  };

  const addAllToTodo = () => {
    if (!result) return;
    result.checklist.forEach((item) => {
      api.addTodo(
        defaultTodoDraft({
          title: item,
          description: `来源：JD → Interview Prediction（${company || "未填写公司"} ${position || ""}）`,
          priority: "medium",
          source: "system",
          deadline: "",
        })
      );
    });
    toast(`已把 ${result.checklist.length} 条准备项加入 Todo。`);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-surface p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={16} className="text-violet" />
          <h2 className="text-[15px] font-semibold text-ink">输入 JD，预测面试</h2>
          <Badge tone="amber">Mock AI</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="公司">
            <Input value={company} onChange={(e) => setCompany(e.target.value)} />
          </Field>
          <Field label="岗位">
            <Input value={position} onChange={(e) => setPosition(e.target.value)} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="JD 原文">
            <Textarea rows={8} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="粘贴 JD…" />
          </Field>
        </div>
        {error ? (
          <div className="mt-3">
            <FormNote tone="error">{error}</FormNote>
          </div>
        ) : null}
        <div className="mt-4">
          <Button variant="accent" loading={running} icon={<Send size={14} />} onClick={run}>
            生成面试预测
          </Button>
        </div>
      </div>

      {running ? (
        <div className="flex min-h-[280px] items-center justify-center gap-3 rounded-xl border border-line bg-surface text-muted">
          <Spinner size={20} className="text-violet" />
          <p className="text-sm">正在匹配项目并生成问题清单…</p>
        </div>
      ) : result ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-violet-line bg-violet-soft/50 px-5 py-4 text-[13px] leading-6 text-violet-deep">
            {result.summary}
          </div>

          <div>
            <h3 className="mb-2.5 flex items-center gap-2 text-[14px] font-semibold text-ink">
              <CheckCircle2 size={15} className="text-violet" /> 最可能被问的项目
            </h3>
            {result.topProjects.length === 0 ? (
              <EmptyState compact title="没有高匹配项目" description="先把相关经历补进项目库，再回来生成预测。" />
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                {result.topProjects.map((hit) => {
                  const project = projectById.get(hit.projectId);
                  if (!project) return null;
                  return (
                    <div key={hit.projectId} className="rounded-xl border border-line bg-surface p-4">
                      <div className="flex items-center gap-2.5">
                        <ScoreRing score={hit.score} size={44} strokeWidth={4} />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-ink">{project.name}</p>
                          <p className="text-[11px] text-faint">匹配 {hit.score}%</p>
                        </div>
                      </div>
                      <ul className="mt-3 space-y-1">
                        {hit.focus.map((f, i) => (
                          <li key={i} className="flex gap-1.5 text-xs leading-5 text-muted">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2.5 text-[14px] font-semibold text-ink">预测问题（按类别）</h3>
            <div className="grid gap-2 md:grid-cols-2">
              {result.questions.map((q) => (
                <div key={q.id} className="rounded-lg border border-line bg-surface px-3.5 py-2.5">
                  <Badge tone="blue" className="mb-1.5">
                    {QUESTION_CATEGORY_LABELS[q.category] ?? "问题"}
                  </Badge>
                  <p className="text-[13px] leading-5 text-inkSoft">{q.question}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                <ListChecks size={15} className="text-violet" /> 面试准备清单
              </h3>
              <Button size="sm" variant="soft" onClick={addAllToTodo}>
                全部加入 Todo
              </Button>
            </div>
            <ul className="mt-3 space-y-2">
              {result.checklist.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px] leading-5 text-inkSoft">
                  <span className="tnum mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-line text-[11px] font-semibold text-muted">
                    {i + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            {result.evidence.length ? (
              <div className="mt-4 border-t border-line pt-3">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">依据</p>
                {result.evidence.map((ev, i) => {
                  const project = ev.id ? projectById.get(ev.id) : null;
                  return (
                    <p key={i} className="text-xs text-muted">
                      {project ? (
                        <Link href="/prep#projects" className="text-violet hover:underline">
                          {project.name}
                        </Link>
                      ) : (
                        ev.label
                      )}
                      {ev.quote ? <span className="text-faint"> · “{ev.quote}”</span> : null}
                    </p>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<ArrowRight size={26} />}
          title="预测结果会出现在这里"
          description="系统会把 JD 拆成核心能力，从项目库里挑出最可能被追问的项目，再生成问题与准备清单。"
        />
      )}
    </div>
  );
}
