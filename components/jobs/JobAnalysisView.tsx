"use client";

import Link from "next/link";
import { AlertTriangle, Check, Database, Quote, Sparkles } from "lucide-react";
import type { JobMatchAnalysis, Project } from "@/lib/types";
import { MATCH_VERDICT_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { Badge, Panel, type Tone } from "@/components/ui/Primitives";
import { MiniBar, ScoreRing } from "@/components/ui/Progress";

const VERDICT_TONE: Record<string, Tone> = {
  strong: "green",
  consider: "violet",
  wait: "blue",
  skip: "amber",
};

export function JobAnalysisView({
  analysis,
  projectMap,
  compact = false,
}: {
  analysis: JobMatchAnalysis;
  projectMap: Map<string, Project>;
  compact?: boolean;
}) {
  const projects = (analysis.recommendedProjectIds ?? [])
    .map((id) => projectMap.get(id))
    .filter((p): p is Project => Boolean(p));

  return (
    <Panel className="animate-fade-in overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-canvas/40 px-5 py-3">
        <div className="flex items-center gap-2 text-[13px] font-medium text-inkSoft">
          <Sparkles size={14} className="text-violet" />
          AI 匹配报告
          <Badge tone="amber" className="normal-case">Mock</Badge>
        </div>
        <span className="text-[11px] text-faint">
          生成于 {formatDateTime(analysis.generatedAt)}
        </span>
      </div>

      <div className="grid gap-6 px-5 py-5 md:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <ScoreRing score={analysis.score} size={112} strokeWidth={8} />
          <Badge tone={VERDICT_TONE[analysis.verdict] ?? "muted"}>
            {MATCH_VERDICT_LABELS[analysis.verdict] ?? analysis.verdict}
          </Badge>
        </div>
        <div>
          <p className="text-[13px] leading-6 text-inkSoft">{analysis.summary}</p>
          {!compact ? (
            <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {analysis.breakdown.map((b) => (
                <MiniBar key={b.key} label={b.label} value={b.score} note={b.note} />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 border-t border-line px-5 py-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-green-deep">
            <Check size={14} /> 优势
          </h3>
          <ul className="space-y-2">
            {analysis.strengths.length === 0 ? (
              <li className="text-[13px] text-muted">暂无充分依据。</li>
            ) : (
              analysis.strengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-5 text-inkSoft">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-green" />
                  {s}
                </li>
              ))
            )}
          </ul>
        </div>
        <div>
          <h3 className="mb-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-amber">
            <AlertTriangle size={14} /> 短板与风险
          </h3>
          <ul className="space-y-2">
            {analysis.weaknesses.length === 0 ? (
              <li className="text-[13px] text-muted">未发现明显短板。</li>
            ) : (
              analysis.weaknesses.map((w, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-5 text-inkSoft">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber" />
                  {w}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-line px-5 py-5">
        <h3 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-ink">
          <Database size={14} className="text-violet" /> 推荐项目（来自你的项目库）
        </h3>
        {projects.length === 0 ? (
          <p className="text-[13px] text-muted">没有可推荐的项目——请先在项目库沉淀经历。</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href="/prep#projects"
                className="group rounded-lg border border-line bg-canvas/50 p-3 transition-colors hover:border-violet-line hover:bg-violet-soft/50"
              >
                <p className="text-[13px] font-semibold text-ink group-hover:text-violet-deep">
                  {p.name}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                  {p.data || p.result || p.background || "（补充字段后可生成依据）"}
                </p>
                {p.skills.slice(0, 3).map((s) => (
                  <span key={s} className="mr-1.5 mt-2 inline-block rounded bg-violet-soft px-1.5 py-0.5 text-[10px] text-violet-deep">
                    {s}
                  </span>
                ))}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-5 border-t border-line px-5 py-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-[13px] font-semibold text-ink">知识准备建议</h3>
          <ul className="space-y-1.5">
            {analysis.knowledgeSuggestions.length === 0 ? (
              <li className="text-[13px] text-muted">暂无建议。</li>
            ) : (
              analysis.knowledgeSuggestions.map((k, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-5 text-inkSoft">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet" />
                  {k}
                </li>
              ))
            )}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-ink">
            <Quote size={13} /> 依据来源
          </h3>
          <ul className="space-y-1.5">
            {analysis.evidence.length === 0 ? (
              <li className="text-[13px] text-muted">资料不足，暂无依据。</li>
            ) : (
              analysis.evidence.map((ev, i) => (
                <li key={i} className="flex items-start gap-2 text-xs leading-5 text-muted">
                  <Badge tone="blue">{ev.source}</Badge>
                  <span>
                    <span className="font-medium text-inkSoft">{ev.label}</span>
                    {ev.quote ? <span className="block text-faint">“{ev.quote}”</span> : null}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </Panel>
  );
}
