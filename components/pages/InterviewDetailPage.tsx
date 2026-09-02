"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  AudioLines,
  ClipboardType,
  FileAudio,
  FileText,
  Pencil,
  Play,
  Plus,
  Save,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import type { GapAction } from "@/components/interviews/InterviewAnalysisView";
import type {
  GapSuggestion,
  Interview,
  SpeakerRole,
  TranscriptSegment,
} from "@/lib/types";
import { INTERVIEW_ROUND_LABELS } from "@/lib/constants";
import { formatBytes, formatDateTime, formatSeconds, uid } from "@/lib/utils";
import { useData } from "@/providers/data-context";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import {
  Badge,
  Field,
  FormNote,
  Input,
  Panel,
  Select,
  Textarea,
  type Tone,
} from "@/components/ui/Primitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/Modal";
import { PageHeader } from "./PageHeader";
import { Spinner } from "@/components/ui/Loading";
import { InterviewFormModal } from "@/components/interviews/InterviewFormModal";
import {
  InterviewAnalysisView,
} from "@/components/interviews/InterviewAnalysisView";
import { GapActionModal } from "@/components/interviews/GapActionModal";
import { audioStorage } from "@/services/storage";
import { createAIProvider, type AIProvider } from "@/services/ai/provider";
import { cn } from "@/lib/utils";

const AUDIO_EXTS = ["mp3", "mp4", "m4a", "wav", "webm", "aac", "ogg"];

export function InterviewDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { db, api, projectById, knowledgeById } = useData();
  const { toast } = useToast();
  const [ai] = useState<AIProvider>(() => createAIProvider());

  const interview = useMemo(() => db.interviews.find((i) => i.id === id), [db.interviews, id]);

  // 音频回放
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null;
    if (!interview?.audio?.storedKey) {
      setAudioUrl(null);
      return;
    }
    audioStorage.getAudio(interview.audio.storedKey).then((blob) => {
      if (blob) {
        url = URL.createObjectURL(blob);
        setAudioUrl(url);
      }
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [interview?.audio?.storedKey, interview?.audio?.name]);

  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "error">("idle");
  const [uploadPct, setUploadPct] = useState(0);
  const [reviewRunning, setReviewRunning] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [removeAudioConfirm, setRemoveAudioConfirm] = useState(false);
  const [gapAction, setGapAction] = useState<{ gap: GapSuggestion; action: GapAction } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!interview) {
    return (
      <div>
        <Link href="/interviews" className="mb-4 inline-flex items-center gap-1 text-sm text-violet hover:underline">
          <ArrowLeft size={14} /> 返回面试列表
        </Link>
        <EmptyState title="面试记录不存在" description="可能已被删除。" />
      </div>
    );
  }

  const patch = (p: Partial<Interview>) => api.updateInterview(interview.id, p);

  const uploadFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!AUDIO_EXTS.includes(ext)) {
      setUploadPhase("error");
      toast("不支持的格式，请使用 mp3 / m4a / wav / webm 等。", "error");
      return;
    }
    setUploadPhase("uploading");
    setUploadPct(0);
    // 模拟上传进度（本地临时存储，不离开浏览器）
    const timer = window.setInterval(async () => {
      setUploadPct((p) => {
        if (p >= 95) {
          window.clearInterval(timer);
          return 95;
        }
        return p + 8 + Math.random() * 12;
      });
    }, 180);
    window.setTimeout(async () => {
      try {
        const key = `interview-${interview.id}`;
        const res = await audioStorage.saveAudio(key, file);
        window.clearInterval(timer);
        setUploadPct(100);
        patch({
          audio: {
            name: file.name,
            size: file.size,
            type: file.type || "audio/*",
            storedKey: key,
          },
          transcriptStatus: "saved",
        });
        setUploadPhase("idle");
        toast(
          res.mode === "idb"
            ? "录音已保存到浏览器本地（IndexedDB）。"
            : "当前环境不支持 IndexedDB，录音仅本次会话可回放。",
          "info"
        );
      } catch {
        window.clearInterval(timer);
        setUploadPhase("error");
        toast("音频保存失败，请重试。", "error");
      }
    }, 900);
  };

  const insertDemoTranscript = () => {
    patch({
      transcript: buildDemoTranscript(interview.company, interview.position),
      transcriptStatus: "transcribed",
      transcriptMode: "mock",
      analysis: null,
    });
    toast("已插入 Mock 演示转写（内容为占位文本，请替换为真实转写）", "info");
  };

  const savePasted = () => {
    const segs = parseTranscriptText(pasteText);
    patch({
      transcript: segs,
      transcriptStatus: segs.length ? "transcribed" : interview.transcriptStatus,
      transcriptMode: segs.length ? "pasted" : interview.transcriptMode,
      analysis: null,
    });
    setPasteOpen(false);
    setPasteText("");
    toast(`已导入 ${segs.length} 段文本。`);
  };

  const updateSegment = (segId: string, p: Partial<TranscriptSegment>) => {
    patch({
      transcript: interview.transcript.map((s) => (s.id === segId ? { ...s, ...p } : s)),
    });
  };
  const removeSegment = (segId: string) => {
    patch({ transcript: interview.transcript.filter((s) => s.id !== segId) });
  };
  const addSegment = () => {
    patch({
      transcript: [
        ...interview.transcript,
        {
          id: uid("seg"),
          startSec: null,
          endSec: null,
          speakerLabel: "面试官",
          role: "interviewer",
          text: "",
        },
      ],
    });
  };

  const runReview = async () => {
    if (interview.transcript.length === 0) {
      toast("转写为空：先上传音频/粘贴文本，或使用 Mock Transcript。", "error");
      return;
    }
    setReviewRunning(true);
    setReviewError("");
    try {
      const analysis = await ai.reviewInterview({
        interview: {
          company: interview.company,
          position: interview.position,
          round: interview.round,
          transcript: interview.transcript,
        },
        resume: db.resume,
        projects: db.projects,
        knowledge: db.knowledge,
      });
      patch({ analysis });
      toast("复盘完成（Mock AI），缺口建议已按来源分组。");
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "复盘失败，请重试。");
    } finally {
      setReviewRunning(false);
    }
  };

  const onTodoAdded = (todoId: string) => {
    if (!interview.todoIds.includes(todoId)) {
      patch({ todoIds: [...interview.todoIds, todoId] });
    }
  };

  const removeAudio = () => {
    if (interview.audio?.storedKey) void audioStorage.deleteAudio(interview.audio.storedKey);
    patch({ audio: null });
    setAudioUrl(null);
    setRemoveAudioConfirm(false);
    toast("音频已从本地移除。");
  };

  const transcriptTone = interview.transcriptMode === "mock" ? "amber" : "blue";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            href="/interviews"
            className="mt-1 rounded-md p-1.5 text-faint hover:bg-line/70 hover:text-inkSoft"
            title="返回列表"
          >
            <ArrowLeft size={17} />
          </Link>
          <div>
            <p className="text-[12px] font-medium text-muted">{formatDateTime(interview.date)}</p>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight text-ink sm:text-2xl">
              {interview.company} · {interview.position}
            </h1>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge tone="blue">{INTERVIEW_ROUND_LABELS[interview.round]}</Badge>
              {interview.interviewer ? <Badge tone="muted">面试官：{interview.interviewer}</Badge> : null}
              {interview.analysis ? (
                <Badge tone="green">复盘完成 · {interview.analysis.gaps.length} 处缺口</Badge>
              ) : interview.transcript.length ? (
                <Badge tone="amber">待复盘</Badge>
              ) : (
                <Badge tone="muted">待转写</Badge>
              )}
            </div>
          </div>
        </div>
        <Button size="sm" variant="outline" icon={<Pencil size={13} />} onClick={() => setEditOpen(true)}>
          编辑资料
        </Button>
      </div>

      {interview.notes ? (
        <p className="rounded-xl border border-line bg-surface px-4 py-3 text-[13px] leading-6 text-inkSoft">
          {interview.notes}
        </p>
      ) : null}

      {/* ======== 音频区 ======== */}
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2">
            <AudioLines size={15} className="text-violet" />
            <h2 className="text-[15px] font-semibold text-ink">面试录音</h2>
            <Badge tone="muted">本地存储 · 不上传云端</Badge>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.mp4,.m4a,.wav,.webm,.aac,.ogg,audio/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile(f);
              e.target.value = "";
            }}
          />
          <div className="flex gap-2">
            {interview.audio ? (
              <Button size="xs" variant="ghost" icon={<Trash2 size={12} />} onClick={() => setRemoveAudioConfirm(true)}>
                移除录音
              </Button>
            ) : null}
            <Button size="sm" variant="soft" icon={<UploadCloud size={14} />} onClick={() => fileInputRef.current?.click()}>
              上传录音
            </Button>
          </div>
        </div>

        <div className="px-5 py-4">
          {uploadPhase === "uploading" ? (
            <div>
              <p className="mb-2 text-[13px] text-muted">上传中… {Math.min(100, Math.round(uploadPct))}%</p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-violet transition-all" style={{ width: `${uploadPct}%` }} />
              </div>
            </div>
          ) : uploadPhase === "error" ? (
            <FormNote tone="error">上传失败：请确认文件可读且格式受支持。</FormNote>
          ) : interview.audio ? (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-soft text-violet-deep">
                <FileAudio size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink">{interview.audio.name}</p>
                <p className="text-xs text-faint">{formatBytes(interview.audio.size)} · 仅保存在本机</p>
              </div>
              {audioUrl ? (
                <audio controls src={audioUrl} className="h-9 w-full max-w-md" />
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-faint">
                  <Spinner className="text-violet" size={12} /> 读取本地音频…
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-3 text-center">
              <UploadCloud size={26} className="text-faint" />
              <p className="text-[13px] text-muted">
                V1 阶段录音只做本地保存与回放；真实语音转写（Speech-to-Text）将在 Phase 2 接入。
              </p>
              <p className="text-xs text-faint">
                支持 mp3 / mp4 / m4a / wav / webm。没有录音也可以用 Mock Transcript 走通复盘流程。
              </p>
            </div>
          )}
        </div>
      </Panel>

      {/* ======== 转写区 ======== */}
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2">
            <ClipboardType size={15} className="text-violet" />
            <h2 className="text-[15px] font-semibold text-ink">Transcript · 对话转写</h2>
            {interview.transcript.length ? (
              <Badge tone={transcriptTone}>
                {interview.transcriptMode === "mock"
                  ? "Mock 演示内容"
                  : interview.transcriptMode === "pasted"
                    ? "粘贴导入"
                    : "手动编辑"}
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {interview.transcript.length ? (
              <Button size="xs" variant="ghost" icon={<Save size={12} />} onClick={() => toast("转写已自动保存")}>
                自动保存
              </Button>
            ) : null}
            <Button size="xs" variant="outline" icon={<FileText size={12} />} onClick={() => setPasteOpen(true)}>
              粘贴文本
            </Button>
            <Button size="xs" variant="soft" icon={<Sparkles size={12} />} onClick={insertDemoTranscript}>
              Mock Transcript
            </Button>
          </div>
        </div>

        {pasteOpen ? (
          <div className="border-b border-line bg-canvas/40 p-4">
            <Field
              label="粘贴对话文本"
              hint="支持每行「说话人：内容」格式；无说话人前缀的行会并入上一段"
            >
              <Textarea rows={8} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={"面试官：请做下自我介绍。\n候选人：好的，我是…\n……"} />
            </Field>
            <div className="mt-2 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setPasteOpen(false)}>
                取消
              </Button>
              <Button size="sm" variant="accent" disabled={!pasteText.trim()} onClick={savePasted}>
                导入 {pasteText ? pasteText.split("\n").filter((l) => l.trim()).length : 0} 行
              </Button>
            </div>
          </div>
        ) : null}

        {interview.transcript.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              compact
              icon={<ClipboardType size={24} />}
              title="还没有转写内容"
              description={
                <>
                  上传录音后，V1 使用 <b>Mock Transcript</b> 演示转写流程（真实 STT 后续接入）；
                  也可以直接粘贴对话文本，并手动修正说话人。
                </>
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-line">
            {interview.transcript.map((seg, idx) => (
              <div key={seg.id} className="px-5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tnum w-8 font-mono text-[10px] text-faint">
                    {idx + 1}
                  </span>
                  <Input
                    className="h-7 w-28 text-xs font-medium"
                    value={seg.speakerLabel}
                    onChange={(e) => updateSegment(seg.id, { speakerLabel: e.target.value })}
                  />
                  <Select
                    className="h-7 w-auto py-0 text-xs"
                    value={seg.role}
                    onChange={(e) => updateSegment(seg.id, { role: e.target.value as SpeakerRole })}
                  >
                    <option value="interviewer">面试官</option>
                    <option value="candidate">候选人</option>
                    <option value="unknown">未标注</option>
                  </Select>
                  <Input
                    className="tnum h-7 w-20 font-mono text-xs"
                    type="number"
                    min={0}
                    placeholder="秒"
                    value={seg.startSec ?? ""}
                    onChange={(e) =>
                      updateSegment(seg.id, {
                        startSec: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    title="开始时间（秒）"
                  />
                  <span className="text-[10px] text-faint">
                    {formatSeconds(seg.startSec)}
                  </span>
                  <button
                    onClick={() => removeSegment(seg.id)}
                    className="ml-auto rounded-md p-1 text-faint hover:bg-red-soft hover:text-red"
                    aria-label="删除片段"
                  >
                    <X size={14} />
                  </button>
                </div>
                <Textarea
                  className="mt-2 min-h-[54px] border-0 bg-canvas/50 text-[13px] leading-6 focus:bg-surface"
                  rows={2}
                  value={seg.text}
                  onChange={(e) => updateSegment(seg.id, { text: e.target.value })}
                  placeholder="说话内容…"
                />
              </div>
            ))}
            <div className="px-5 py-3">
              <Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={addSegment}>
                添加一段
              </Button>
            </div>
          </div>
        )}
      </Panel>

      {/* ======== 问题提取 · 回答分析 · Gap Analysis ======== */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-ink">问题提取 · 回答分析 · Gap Analysis</h2>
          <p className="mt-0.5 text-xs text-faint">
            提取问题 → 分维度评价回答 → 对照知识库/项目库做 Gap 检测
          </p>
        </div>
        <Button
          variant="accent"
          icon={<Sparkles size={14} />}
          loading={reviewRunning}
          disabled={interview.transcript.length === 0}
          onClick={runReview}
        >
          {interview.analysis ? "重新复盘" : "开始 AI 复盘"}
        </Button>
      </div>

      {reviewError ? (
        <FormNote tone="error">{reviewError}</FormNote>
      ) : null}

      {reviewRunning ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-surface text-muted">
          <Spinner size={22} className="text-violet" />
          <p className="text-sm">正在逐条比对问题、回答与你的项目/知识库…</p>
          <p className="text-xs text-faint">Mock 模式只做本地启发式分析</p>
        </div>
      ) : interview.analysis ? (
        <>
          <InterviewAnalysisView
            analysis={interview.analysis}
            onGapAction={(gap, action) => setGapAction({ gap, action })}
          />
          <GapActionModal
            gap={gapAction?.gap ?? null}
            action={gapAction?.action ?? null}
            interview={{ company: interview.company, position: interview.position, id: interview.id }}
            onClose={() => setGapAction(null)}
            onTodoAdded={onTodoAdded}
          />
        </>
      ) : (
        <EmptyState
          compact
          icon={<Sparkles size={22} />}
          title="复盘结果会显示在这里"
          description="点击「开始 AI 复盘」后，系统会给出逐问题评语与四类缺口建议；所有沉淀都需你确认后才写入。"
        />
      )}

      <InterviewFormModal open={editOpen} onClose={() => setEditOpen(false)} item={interview} />
      <ConfirmDialog
        open={removeAudioConfirm}
        onClose={() => setRemoveAudioConfirm(false)}
        onConfirm={removeAudio}
        title="移除本地录音？"
        description="将删除浏览器本地保存的音频文件（不可恢复），转写内容不受影响。"
        confirmText="移除"
      />
    </div>
  );
}

function buildDemoTranscript(company: string, position: string): TranscriptSegment[] {
  // 注意：以下候选人的"回答"均为占位符，不假设用户真实经历。
  // 用于在没有录音/真实 STT 时演示【提取 → 分析 → Gap → 沉淀】完整流程。
  const rows: Array<[number, string, string]> = [
    [0, "面试官", "先做个自我介绍吧。"],
    [8, "候选人", "[演示占位] 我的背景与项目经历……（请替换成你的真实自我介绍，建议用 B-G-A-R 结构）"],
    [32, "面试官", "介绍一个你最值得说的项目，以及你具体负责什么？"],
    [48, "候选人", "[演示占位] 项目背景、目标、我的职责与行动……（请在真实转写中替换，并带出量化结果）"],
    [76, "面试官", "这个项目的结果是怎么衡量的？数据口径是什么？"],
    [95, "候选人", "[演示占位] 结果不错，我们做了优化后数据有明显提升。（占位：缺少数字与口径，复盘会提示数据缺口）"],
    [120, "面试官", "如果换一种做法，你觉得结果会不一样吗？"],
    [136, "候选人", "[演示占位] 可能会，比如换一个实验设计……（占位：请补充你的反事实思考）"],
    [168, "面试官", "你对这个行业/公司最近的变化有什么了解？"],
    [185, "候选人", "[演示占位] 了解一些，但还不够系统……（占位：知识缺口会在这里出现）"],
  ];
  return rows.map(([start, label, text]) => ({
    id: uid("seg"),
    startSec: start,
    endSec: null,
    speakerLabel: label,
    role: label === "面试官" ? ("interviewer" as const) : ("candidate" as const),
    text: text.replace(/公司/g, company || "这家公司").replace(/岗位/g, position || "这个岗位"),
  }));
}

function parseTranscriptText(text: string): TranscriptSegment[] {
  const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
  const segs: TranscriptSegment[] = [];
  for (const line of lines) {
    const m = line.match(/^([^:：]{1,14})[:：]\s*(.*)$/s);
    if (m) {
      const label = m[1].trim();
      const role: SpeakerRole = /面试官|interviewer|hr/i.test(label)
        ? "interviewer"
        : /候选人|candidate|我/i.test(label)
          ? "candidate"
          : "unknown";
      segs.push({
        id: uid("seg"),
        startSec: null,
        endSec: null,
        speakerLabel: label,
        role,
        text: m[2].trim(),
      });
    } else if (segs.length) {
      const last = segs[segs.length - 1];
      last.text = last.text ? `${last.text}\n${line}` : line;
    } else {
      segs.push({
        id: uid("seg"),
        startSec: null,
        endSec: null,
        speakerLabel: "候选人",
        role: "candidate",
        text: line,
      });
    }
  }
  return segs.filter((s) => s.text.trim());
}
