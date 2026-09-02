"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ClipboardPaste, Eraser, Save, Send, Sparkles } from "lucide-react";
import type { JobMatchAnalysis, JobStatus } from "@/lib/types";
import { defaultJobDraft } from "@/lib/factories";
import { nowISO } from "@/lib/utils";
import { useData } from "@/providers/data-context";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Field, FormNote, Input, Textarea, Badge } from "@/components/ui/Primitives";
import { JobAnalysisView } from "@/components/jobs/JobAnalysisView";
import { Spinner } from "@/components/ui/Loading";
import { createAIProvider, type AIProvider } from "@/services/ai/provider";

export function MatchWorkbench() {
  const { db, api, projectById } = useData();
  const { toast } = useToast();
  const [ai] = useState<AIProvider>(() => createAIProvider());

  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [jd, setJd] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<JobMatchAnalysis | null>(null);
  const [saved, setSaved] = useState(false);

  const run = async () => {
    setError("");
    if (!company.trim() && !position.trim()) {
      setError("请至少填写公司名称或岗位名称，方便匹配行业与岗位方向。");
      return;
    }
    if (jd.trim().length < 60) {
      setError("JD 内容太短，分析参考价值有限。请粘贴完整的岗位职责与任职要求。");
      return;
    }
    setRunning(true);
    setAnalysis(null);
    setSaved(false);
    try {
      const result = await ai.analyzeJobMatch({
        company: company.trim(),
        position: position.trim(),
        jd: jd.trim(),
        resume: db.resume,
        projects: db.projects,
        knowledge: db.knowledge,
      });
      setAnalysis(result);
      toast("匹配分析完成（Mock AI）", "info");
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败，请稍后重试。");
    } finally {
      setRunning(false);
    }
  };

  const save = (status: JobStatus, markApplied: boolean) => {
    if (!analysis) return;
    const draft = defaultJobDraft({
      company: company.trim() || "未命名公司",
      position: position.trim() || "未命名岗位",
      jd: jd.trim(),
      status,
      appliedAt: markApplied ? nowISO() : "",
      matchScore: analysis.score,
      matchAnalysis: analysis,
      source: "",
      location: "",
      salary: "",
      url: "",
      notes: "",
    });
    api.addJob(draft);
    setSaved(true);
    toast(markApplied ? "已保存并标记为「已投递」" : "已保存到 Job Library");
  };

  const reset = () => {
    setAnalysis(null);
    setSaved(false);
    setError("");
    setCompany("");
    setPosition("");
    setJd("");
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
      <div className="space-y-4 xl:sticky xl:top-0">
        <div className="rounded-xl border border-violet-line bg-violet-soft/70 px-4 py-3 text-[13px] leading-5 text-violet-deep">
          <p className="flex items-center gap-1.5 font-medium">
            <Sparkles size={13} />
            匹配原理
          </p>
          <p className="mt-1 opacity-80">
            系统会读取你的 Resume、Project Library 与 Knowledge Base，输出匹配度、推荐项目与短板。
            推荐只来自你真实保存的资料，资料不足时会明确提示。
          </p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardPaste size={16} className="text-violet" />
            <h2 className="text-[15px] font-semibold text-ink">粘贴 JD</h2>
            <Badge tone="amber">Mock AI</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <Field label="公司">
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="如：字节跳动" />
            </Field>
            <Field label="岗位">
              <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="如：商业化广告运营" />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="JD 原文" hint="建议完整粘贴岗位职责与要求">
              <Textarea
                rows={12}
                className="font-mono text-[12.5px] leading-5"
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder={"岗位职责：\n1. …\n2. …\n\n任职要求：\n- …"}
              />
            </Field>
          </div>

          {error ? <FormNote tone="error">{error}</FormNote> : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="accent" loading={running} icon={<Send size={15} />} onClick={run}>
              AI 分析岗位
            </Button>
            {(jd || company || position) ? (
              <Button variant="ghost" icon={<Eraser size={14} />} onClick={reset}>
                清空
              </Button>
            ) : null}
          </div>
        </div>

        {analysis && !saved ? (
          <div className="rounded-xl border border-green-line bg-green-soft/60 p-4">
            <p className="text-[13px] font-medium text-green-deep">分析完成，接下来？</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button variant="primary" icon={<Save size={14} />} onClick={() => save("to_apply", false)}>
                保存到岗位库（待投递）
              </Button>
              <Button variant="accent" icon={<Save size={14} />} onClick={() => save("applied", true)}>
                保存并标记已投递
              </Button>
            </div>
          </div>
        ) : null}

        {saved ? (
          <div className="rounded-xl border border-green-line bg-green-soft/70 p-4">
            <p className="text-[13px] font-medium text-green-deep">岗位已进入 Job Library。</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={reset}>
                继续分析下一个 JD
              </Button>
              <Link href="/#today">
                <Button size="sm" variant="outline" icon={<ArrowRight size={13} />}>
                  去今日投递查看
                </Button>
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      <div>
        {running ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-surface text-muted">
            <Spinner size={22} className="text-violet" />
            <p className="text-sm">正在对照你的简历 / 项目库 / 知识库分析…</p>
            <p className="text-xs text-faint">Mock 模式会模拟真实 AI 的等待过程</p>
          </div>
        ) : analysis ? (
          <JobAnalysisView analysis={analysis} projectMap={projectById} />
        ) : (
          <div className="flex min-h-[420px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-lineStrong bg-surface/60 px-8 text-center">
            <ClipboardPaste size={26} className="text-faint" />
            <p className="text-sm font-medium text-inkSoft">等待分析</p>
            <p className="max-w-sm text-[13px] leading-6 text-muted">
              左侧粘贴一个完整 JD 并点击「AI 分析岗位」，这里会展示综合匹配度、五维拆解、推荐项目与投递建议。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
