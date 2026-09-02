"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BookOpenText,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  Gauge,
  MessageSquareText,
  Plus,
  Sparkles,
} from "lucide-react";
import type { GapSuggestion, GapType, InterviewAnalysis } from "@/lib/types";
import {
  GAP_TYPE_DESCRIPTIONS,
  GAP_TYPE_LABELS,
  QUESTION_CATEGORY_LABELS,
} from "@/lib/constants";
import { cn, formatDateTime } from "@/lib/utils";
import { Badge, Panel, type Tone } from "@/components/ui/Primitives";
import { MiniBar } from "@/components/ui/Progress";

export type GapAction = "knowledge" | "project" | "todo";

export function InterviewAnalysisView({
  analysis,
  onGapAction,
}: {
  analysis: InterviewAnalysis;
  onGapAction: (gap: GapSuggestion, action: GapAction) => void;
}) {
  const [openQuestion, setOpenQuestion] = useState<string | null>(
    analysis.questions[0]?.id ?? null
  );
  const counts = useCounts(analysis);

  return (
    <div className="space-y-5">
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-canvas/40 px-5 py-3">
          <div className="flex items-center gap-2 text-[13px] font-medium text-inkSoft">
            <Sparkles size={14} className="text-violet" />
            AI 复盘报告
            <Badge tone="amber">Mock</Badge>
          </div>
          <span className="text-[11px] text-faint">生成于 {formatDateTime(analysis.generatedAt)}</span>
        </div>
        <div className="px-5 py-4 text-[13px] leading-6 text-inkSoft">{analysis.summary}</div>
        <div className="grid gap-3 border-t border-line px-5 py-4 sm:grid-cols-3">
          <MiniReportCard
            icon={<Gauge size={14} />}
            tone="blue"
            title="问题数"
            value={String(analysis.questions.length)}
          />
          <MiniReportCard
            icon={<CheckCircle2 size={14} />}
            tone="green"
            title="亮点"
            value={String(analysis.strengths.length)}
          />
          <MiniReportCard
            icon={<AlertTriangle size={14} />}
            tone="red"
            title="缺口"
            value={String(analysis.gaps.length)}
          />
        </div>
        {(analysis.strengths.length || analysis.improvements.length) ? (
          <div className="grid gap-4 border-t border-line px-5 py-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-[13px] font-semibold text-green-deep">做得好的地方</p>
              <ul className="space-y-1.5">
                {analysis.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2 text-[13px] leading-5 text-inkSoft">
                    <CheckCircle2 size={13} className="mt-1 shrink-0 text-green" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-semibold text-amber">需要改进</p>
              <ul className="space-y-1.5">
                {analysis.improvements.map((s, i) => (
                  <li key={i} className="flex gap-2 text-[13px] leading-5 text-inkSoft">
                    <AlertTriangle size={13} className="mt-1 shrink-0 text-amber" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </Panel>

      {/* 逐问题分析 */}
      <div>
        <h3 className="mb-3 text-[14px] font-semibold text-ink">逐问题回答分析</h3>
        <div className="space-y-3">
          {analysis.questions.map((q, qi) => {
            const rating = analysis.ratings.find((r) => r.questionId === q.question);
            const open = openQuestion === q.id;
            return (
              <Panel key={q.id} className="overflow-hidden">
                <button
                  onClick={() => setOpenQuestion(open ? null : q.id)}
                  className="flex w-full items-center gap-3 px-5 py-3.5 text-left"
                >
                  <span className="tnum shrink-0 font-mono text-xs text-faint">
                    {String(qi + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink">{q.question}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge tone="blue">{QUESTION_CATEGORY_LABELS[q.category]}</Badge>
                      {rating ? (
                        <span
                          className="tnum font-mono text-xs font-semibold"
                          style={{ color: rating.overall >= 70 ? "#279A6B" : rating.overall >= 50 ? "#6D5AE0" : "#CE4641" }}
                        >
                          {rating.overall} 分
                        </span>
                      ) : null}
                      {q.followUpCount > 0 ? <Badge tone="amber">追问 {q.followUpCount} 次</Badge> : null}
                    </div>
                  </div>
                  <span className={cn("text-xs text-faint transition-transform", open && "rotate-180")}>▾</span>
                </button>
                {open ? (
                  <div className="border-t border-line px-5 py-4">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-faint">我的回答</p>
                    <p className="whitespace-pre-line rounded-lg bg-canvas/60 px-3 py-2.5 text-[13px] leading-6 text-inkSoft">
                      {q.answerText || "（未检测到回答）"}
                    </p>
                    {rating ? (
                      <>
                        <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-faint">
                          分维度评价
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {rating.aspects.map((a) => (
                            <MiniBar key={a.label} label={a.label} value={a.score} />
                          ))}
                        </div>
                        <div className="mt-3 space-y-1">
                          {rating.aspects.map((a) => (
                            <p key={a.label} className="text-xs leading-5 text-muted">
                              <span className="font-medium text-inkSoft">{a.label}：</span>
                              {a.comment}
                            </p>
                          ))}
                        </div>
                        <p className="mt-3 rounded-lg border border-violet-line bg-violet-soft/60 px-3 py-2 text-[13px] leading-5 text-violet-deep">
                          {rating.comment}
                        </p>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </Panel>
            );
          })}
        </div>
      </div>

      {/* Gap 区域 */}
      <div>
        <h3 className="mb-1 text-[14px] font-semibold text-ink">Gap 分析 · 缺口沉淀</h3>
        <p className="mb-3 text-[12px] leading-5 text-faint">
          系统已对照项目库与知识库；每条缺口都给出依据，点击按钮才会写入，绝不自动修改你的资料。
        </p>
        {analysis.gaps.length === 0 ? (
          <Panel className="px-5 py-8 text-center text-[13px] text-muted">
            本次没有检测到明显缺口——继续保持，把回答里的数据口径和决策理由再打磨一下。
          </Panel>
        ) : (
          <div className="space-y-2.5">
            {analysis.gaps.map((gap) => {
              const meta = GAP_META[gap.type];
              return (
                <Panel key={gap.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        meta.bg
                      )}
                    >
                      {meta.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={meta.tone}>{GAP_TYPE_LABELS[gap.type]}</Badge>
                        <span className="text-[13px] font-semibold text-ink">{gap.suggestedTitle}</span>
                      </div>
                      <p className="mt-1.5 text-[13px] leading-5 text-inkSoft">{gap.reason}</p>
                      <p className="mt-1 text-xs leading-5 text-faint">
                        触发问题：{gap.question}
                        {gap.evidence.length
                          ? ` · 依据：${gap.evidence.map((e) => `${e.source}「${e.label}」`).join("、")}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                    {meta.actions.map((action) => (
                      <button
                        key={action.kind}
                        onClick={() => onGapAction(gap, action.kind)}
                        className={cn(
                          "focus-ring inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                          action.kind === "todo"
                            ? "border-lineStrong text-inkSoft hover:border-violet hover:text-violet-deep"
                            : "border-violet-line bg-violet-soft/60 text-violet-deep hover:bg-violet-line/60"
                        )}
                      >
                        <Plus size={12} />
                        {action.label}
                      </button>
                    ))}
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(counts) as GapType[]).map((type) => (
          <div
            key={type}
            className={cn(
              "rounded-lg border px-3 py-2.5",
              counts[type] > 0 ? GAP_META[type].border : "border-line"
            )}
          >
            <p className="flex items-center justify-between text-[11px] font-medium text-faint">
              {GAP_TYPE_LABELS[type]}
              <span className="tnum font-mono text-base font-bold text-ink">{counts[type]}</span>
            </p>
            <p className="mt-0.5 text-[11px] leading-4 text-faint">{GAP_TYPE_DESCRIPTIONS[type]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function useCounts(analysis: InterviewAnalysis) {
  const counts: Record<GapType, number> = { knowledge: 0, project: 0, expression: 0, data: 0 };
  analysis.gaps.forEach((g) => {
    counts[g.type] += 1;
  });
  return counts;
}

function MiniReportCard({
  icon,
  tone,
  title,
  value,
}: {
  icon: React.ReactNode;
  tone: Tone;
  title: string;
  value: string;
}) {
  const toneCls: Record<Tone, string> = {
    violet: "text-violet",
    blue: "text-blue",
    green: "text-green",
    amber: "text-amber",
    red: "text-red",
    muted: "text-muted",
  };
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line px-4 py-3">
      <span className={toneCls[tone]}>{icon}</span>
      <div>
        <p className="text-[11px] text-faint">{title}</p>
        <p className="tnum font-mono text-lg font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}

const GAP_META: Record<
  GapType,
  {
    icon: React.ReactNode;
    bg: string;
    border: string;
    tone: Tone;
    actions: Array<{ kind: GapAction; label: string }>;
  }
> = {
  knowledge: {
    icon: <BookOpenText size={15} />,
    bg: "bg-violet-soft text-violet-deep",
    border: "border-violet-line",
    tone: "violet",
    actions: [
      { kind: "knowledge", label: "补充到知识库" },
      { kind: "todo", label: "加入 Todo" },
    ],
  },
  project: {
    icon: <FolderKanban size={15} />,
    bg: "bg-blue-soft text-blue-deep",
    border: "border-blue-line",
    tone: "blue",
    actions: [
      { kind: "project", label: "补充到项目库" },
      { kind: "todo", label: "加入 Todo" },
    ],
  },
  expression: {
    icon: <MessageSquareText size={15} />,
    bg: "bg-amber-soft text-amber",
    border: "border-amber-line",
    tone: "amber",
    actions: [{ kind: "todo", label: "加入下次面试重点" }],
  },
  data: {
    icon: <ClipboardList size={15} />,
    bg: "bg-green-soft text-green-deep",
    border: "border-green-line",
    tone: "green",
    actions: [
      { kind: "project", label: "补充数据到项目库" },
      { kind: "todo", label: "加入 Todo" },
    ],
  },
};
