"use client";

import { useMemo, useState } from "react";
import {
  ClipboardPaste,
  FileText,
  Link2,
  ListChecks,
  Sparkles,
  Upload,
} from "lucide-react";
import type {
  KnowledgeCategory,
  Knowledge,
  Project,
  ProjectType,
} from "@/lib/types";
import { KNOWLEDGE_CATEGORIES } from "@/lib/types";
import {
  IMPORTANCE_LABELS,
  KNOWLEDGE_CATEGORY_LABELS,
  PROJECT_TYPE_LABELS,
} from "@/lib/constants";
import { defaultKnowledgeDraft, defaultProjectDraft } from "@/lib/factories";
import { readFileAsText } from "@/lib/utils";
import { parseKnowledgeText, parseProjectText } from "@/lib/import/splitter";
import type {
  ImportSourceKind,
  ImportTarget,
  KnowledgeImportItem,
  ProjectImportItem,
} from "@/lib/import/types";
import { useData } from "@/providers/data-context";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Field, FormActions, Input, Select, Textarea } from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

type InputTab = "paste" | "file" | "feishu";

type Loaded =
  | { kind: "knowledge"; items: KnowledgeImportItem[] }
  | { kind: "project"; items: ProjectImportItem[] };

const TARGET_LABEL: Record<ImportTarget, string> = {
  knowledge: "知识卡片",
  project: "项目",
};

const ACCEPT_EXT = ".txt,.md,.markdown,.docx";

export function BulkImportModal({
  open,
  onClose,
  target,
}: {
  open: boolean;
  onClose: () => void;
  target: ImportTarget;
}) {
  const { api } = useData();
  const { toast } = useToast();

  const [tab, setTab] = useState<InputTab>("paste");
  const [pasteText, setPasteText] = useState("");
  const [fileName, setFileName] = useState("");
  const [feishuUrl, setFeishuUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(
    null
  );

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState(0);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceKind, setSourceKind] = useState<ImportSourceKind>("paste");

  const reset = () => {
    setTab("paste");
    setPasteText("");
    setFileName("");
    setFeishuUrl("");
    setBusy(false);
    setMessage(null);
    setLoaded(null);
    setSelected(new Set());
    setSkipped(0);
    setSourceUrl("");
    setSourceKind("paste");
  };

  const close = () => {
    reset();
    onClose();
  };

  const currentText = pasteText.trim();
  const canParse = currentText.length > 0 && !busy;

  const showMessage = (tone: "error" | "info", text: string) =>
    setMessage({ tone, text });

  const parseText = (text: string, kind: ImportSourceKind, url = "") => {
    const result =
      target === "knowledge"
        ? parseKnowledgeText(text)
        : parseProjectText(text);
    const next: Loaded =
      target === "knowledge"
        ? { kind: "knowledge", items: result.items as KnowledgeImportItem[] }
        : { kind: "project", items: result.items as ProjectImportItem[] };
    const itemKeys = next.items.map((i) => i.key);
    const skippedCount = result.skipped;
    if (next.items.length === 0) {
      showMessage("error", "没有解析出可导入的内容，请检查文本是否为空。");
      return;
    }
    setLoaded(next);
    setSelected(new Set(itemKeys));
    setSkipped(skippedCount);
    setSourceKind(kind);
    setSourceUrl(url);
    setMessage(null);
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    setMessage(null);
    try {
      const lower = file.name.toLowerCase();
      let text: string;
      if (lower.endsWith(".docx")) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/import/docx", { method: "POST", body: form });
        const data = (await res.json()) as { ok?: boolean; text?: string; message?: string };
        if (!res.ok || !data.ok || typeof data.text !== "string") {
          showMessage("error", data.message ?? "docx 解析失败。");
          setFileName("");
          return;
        }
        text = data.text;
      } else {
        text = await readFileAsText(file);
      }
      setFileName(file.name);
      setPasteText(text);
      setTab("paste");
      showMessage(
        "info",
        `已读取「${file.name}」（${text.length} 字符）。点击下方按钮解析。`
      );
    } catch {
      showMessage("error", "读取文件失败，请重试。");
    } finally {
      setBusy(false);
    }
  };

  const fetchFeishu = async () => {
    const url = feishuUrl.trim();
    if (!url) {
      showMessage("error", "请先粘贴飞书文档链接。");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/feishu/raw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        text?: string;
        message?: string;
      };
      if (!data.ok || typeof data.text !== "string") {
        showMessage("error", data.message ?? "获取飞书文档失败。");
        return;
      }
      setPasteText(data.text);
      setSourceUrl(url);
      setTab("paste");
      showMessage(
        "info",
        `已获取文档（${data.text.length} 字符），可在下方调整后解析。`
      );
    } catch {
      showMessage("error", "网络请求失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  };

  const toggleAll = () => {
    if (!loaded) return;
    setSelected((prev) =>
      prev.size === loaded.items.length
        ? new Set()
        : new Set(loaded.items.map((i) => i.key))
    );
  };

  const toggleOne = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const updateKnowledge = (key: string, patch: Partial<KnowledgeImportItem>) => {
    setLoaded((prev) => {
      if (!prev || prev.kind !== "knowledge") return prev;
      return {
        ...prev,
        items: prev.items.map((it) => (it.key === key ? { ...it, ...patch } : it)),
      };
    });
  };

  const updateProject = (key: string, patch: Partial<ProjectImportItem>) => {
    setLoaded((prev) => {
      if (!prev || prev.kind !== "project") return prev;
      return {
        ...prev,
        items: prev.items.map((it) => (it.key === key ? { ...it, ...patch } : it)),
      };
    });
  };

  const confirmImport = () => {
    if (!loaded) return;
    setBusy(true);
    window.setTimeout(() => {
      let count = 0;
      if (loaded.kind === "knowledge") {
        for (const it of loaded.items) {
          if (!selected.has(it.key)) continue;
          const draft = defaultKnowledgeDraft({
            title: it.title,
            content: it.content,
            category: it.category,
            importance: it.importance,
            tags: it.tags,
            source:
              sourceKind === "feishu"
                ? "url"
                : (sourceKind as Knowledge["source"]),
            sourceUrl,
          });
          api.addKnowledge(draft);
          count += 1;
        }
      } else {
        for (const it of loaded.items) {
          if (!selected.has(it.key)) continue;
          const draft = defaultProjectDraft({
            name: it.name,
            company: it.company,
            type: it.type,
            background: it.background,
            actions: it.actions,
            result: it.result,
            data: it.data,
            challenges: it.challenges,
            skills: it.skills,
            tools: it.tools,
            tags: it.tags,
          } as Partial<Project>);
          api.addProject(draft);
          count += 1;
        }
      }
      setBusy(false);
      toast(
        `已导入 ${count} 条${TARGET_LABEL[target]}${skipped > 0 ? `（跳过 ${skipped} 段过短内容）` : ""}`
      );
      close();
    }, 120);
  };

  const itemCount = loaded?.items.length ?? 0;
  const selectedCount = selected.size;
  const label = TARGET_LABEL[target];

  const titleHint =
    target === "knowledge"
      ? "将按文档标题自动拆成多条知识卡片：标题→卡片标题，正文→内容，并自动判断分类/标签。"
      : "将按文档标题自动拆成多个项目草稿，正文放入「背景」并尽力提取 结果/数据/难点，导入后可在编辑里补全 BGAR。";

  const reviewBody = useMemo(() => {
    if (!loaded) return null;
    if (loaded.kind === "knowledge") {
      return (
        <div className="space-y-2">
          {loaded.items.map((it) => (
            <div
              key={it.key}
              className={cn(
                "rounded-xl border px-3.5 py-3 transition-colors",
                selected.has(it.key)
                  ? "border-violet-line bg-violet-soft/25"
                  : "border-line bg-canvas/40 opacity-60"
              )}
            >
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={selected.has(it.key)}
                  onChange={() => toggleOne(it.key)}
                  className="mt-2.5 h-4 w-4 accent-violet"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <Input
                    value={it.title}
                    onChange={(e) => updateKnowledge(it.key, { title: e.target.value })}
                    className="font-medium"
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Select
                      value={it.category}
                      onChange={(e) =>
                        updateKnowledge(it.key, {
                          category: e.target.value as KnowledgeCategory,
                        })
                      }
                    >
                      {KNOWLEDGE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {KNOWLEDGE_CATEGORY_LABELS[c]}
                        </option>
                      ))}
                    </Select>
                    <Select
                      value={String(it.importance)}
                      onChange={(e) =>
                        updateKnowledge(it.key, {
                          importance: Number(e.target.value) as 1 | 2 | 3 | 4 | 5,
                        })
                      }
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {IMPORTANCE_LABELS[n]}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <p className="line-clamp-2 whitespace-pre-line text-xs leading-5 text-muted">
                    {it.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {loaded.items.map((it) => (
          <div
            key={it.key}
            className={cn(
              "rounded-xl border px-3.5 py-3 transition-colors",
              selected.has(it.key)
                ? "border-violet-line bg-violet-soft/25"
                : "border-line bg-canvas/40 opacity-60"
            )}
          >
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={selected.has(it.key)}
                onChange={() => toggleOne(it.key)}
                className="mt-2.5 h-4 w-4 accent-violet"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_140px]">
                  <Input
                    value={it.name}
                    onChange={(e) => updateProject(it.key, { name: e.target.value })}
                    className="font-medium"
                  />
                  <Input
                    value={it.company}
                    placeholder="公司（可空）"
                    onChange={(e) => updateProject(it.key, { company: e.target.value })}
                  />
                  <Select
                    value={it.type}
                    onChange={(e) =>
                      updateProject(it.key, { type: e.target.value as ProjectType })
                    }
                  >
                    {(
                      Object.keys(PROJECT_TYPE_LABELS) as ProjectType[]
                    ).map((t) => (
                      <option key={t} value={t}>
                        {PROJECT_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </Select>
                </div>
                <p className="line-clamp-2 whitespace-pre-line text-xs leading-5 text-muted">
                  {it.background ||
                    [it.result, it.data, it.challenges].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }, [loaded, selected]);

  return (
    <Modal
      open={open}
      onClose={close}
      size={loaded ? "lg" : "md"}
      title={loaded ? `确认导入 · 共 ${itemCount} 条` : `批量导入${label}`}
      description={
        loaded
          ? `勾选需要写入的条目（已自动全选）。分类/标签为启发式结果，可修改后再导入。`
          : titleHint
      }
      footer={
        loaded ? (
          <FormActions>
            <Button variant="ghost" onClick={() => setLoaded(null)}>
              返回修改来源
            </Button>
            <Button variant="ghost" onClick={close}>
              取消
            </Button>
            <Button
              variant="accent"
              icon={<Sparkles size={14} />}
              loading={busy}
              disabled={selectedCount === 0}
              onClick={confirmImport}
            >
              导入 {selectedCount} 条
            </Button>
          </FormActions>
        ) : null
      }
    >
      {loaded ? (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <button
              onClick={toggleAll}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-violet-deep hover:bg-violet-soft"
            >
              <ListChecks size={13} />
              {selectedCount === itemCount ? "取消全选" : "全选"}
            </button>
            <span>
              已选 {selectedCount}/{itemCount}
              {skipped > 0 ? ` · 跳过 ${skipped} 段过短内容` : ""}
            </span>
          </div>
          <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">{reviewBody}</div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 来源切换 */}
          <div className="flex gap-1.5 rounded-lg bg-line/40 p-1">
            {(
              [
                { key: "paste", label: "粘贴文本", icon: ClipboardPaste },
                { key: "file", label: "上传文档", icon: Upload },
                { key: "feishu", label: "飞书链接", icon: Link2 },
              ] as Array<{ key: InputTab; label: string; icon: typeof Upload }>
            ).map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                    tab === t.key
                      ? "bg-surface text-ink shadow-sm"
                      : "text-muted hover:text-inkSoft"
                  )}
                >
                  <Icon size={14} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === "paste" ? (
            <div>
              <Field
                label="粘贴内容"
                hint="支持从飞书/Notion/Word 复制全文；建议保留标题（# / 一、 等），会按标题自动分段"
              >
                <Textarea
                  rows={12}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={"粘贴文档全文…\n\n例如：\n# 巨量引擎产品体系\n…正文…\n\n# 竞价广告原理\n…正文…"}
                  className="font-mono text-[12.5px] leading-6"
                />
              </Field>
            </div>
          ) : null}

          {tab === "file" ? (
            <div className="space-y-3">
              <div
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-lineStrong bg-canvas/50 px-6 py-10 text-center"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) void handleFile(f);
                }}
              >
                <FileText size={26} className="text-faint" />
                <p className="text-sm text-muted">
                  {fileName ? `已选择：${fileName}` : "拖入文件，或点击选择"}
                </p>
                <p className="text-xs text-faint">
                  支持 .md / .txt / .docx（Word、飞书导出），单个 ≤ 15MB
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Upload size={13} />}
                  loading={busy}
                  onClick={() => document.getElementById("bulk-import-file")?.click()}
                >
                  选择文件
                </Button>
                <input
                  id="bulk-import-file"
                  type="file"
                  accept={ACCEPT_EXT}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                    e.target.value = "";
                  }}
                />
              </div>
              {fileName ? (
                <div className="text-right">
                  <Button
                    variant="accent"
                    icon={<Sparkles size={14} />}
                    loading={busy}
                    disabled={!canParse}
                    onClick={() => parseText(pasteText, "file")}
                  >
                    解析并预览
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === "feishu" ? (
            <div className="space-y-3">
              <Field label="飞书文档分享链接" hint="粘贴文档右上角「分享」复制的链接">
                <Input
                  value={feishuUrl}
                  onChange={(e) => setFeishuUrl(e.target.value)}
                  placeholder="https://xxx.feishu.cn/docx/xxxx 或 /wiki/xxxx"
                />
              </Field>
              <Button
                variant="accent"
                icon={<Link2 size={14} />}
                loading={busy}
                disabled={!feishuUrl.trim()}
                onClick={() => void fetchFeishu()}
              >
                获取文档内容
              </Button>
              <p className="text-xs leading-5 text-faint">
                需要部署时配置飞书开放平台凭证（FEISHU_APP_ID / FEISHU_APP_SECRET）。
                未配置时会提示；临时可用「导出为 .md 或 .docx」后走上传方式。
              </p>
            </div>
          ) : null}

          {tab === "paste" ? (
            <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
              <span className="mr-auto text-xs text-faint">
                {currentText.length > 0 ? `${currentText.length} 字符` : ""}
              </span>
              <Button variant="ghost" onClick={close}>
                取消
              </Button>
              <Button
                variant="accent"
                icon={<Sparkles size={14} />}
                loading={busy}
                disabled={!canParse}
                onClick={() => parseText(pasteText, "paste")}
              >
                解析并预览
              </Button>
            </div>
          ) : null}

          {message ? (
            <div
              className={cn(
                "rounded-lg border px-3.5 py-2.5 text-[13px] leading-5",
                message.tone === "error"
                  ? "border-red-line bg-red-soft/40 text-red"
                  : "border-blue-line bg-blue-soft/40 text-blue-deep"
              )}
            >
              {message.text}
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
