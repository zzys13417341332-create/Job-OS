"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Circle,
  ClipboardList,
  Crosshair,
  Plus,
  ScanSearch,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { Priority, Todo } from "@/lib/types";
import { PRIORITY_LABELS, TODO_SOURCE_LABELS } from "@/lib/constants";
import { cn, formatDate, isPast, todayCN } from "@/lib/utils";
import { defaultTodoDraft } from "@/lib/factories";
import { useData } from "@/providers/data-context";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Badge, Input, Panel, Select, type Tone } from "@/components/ui/Primitives";
import { ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScoreRing } from "@/components/ui/Progress";
import { JobsPage } from "./JobsPage";
import { MatchWorkbench } from "@/components/match/MatchWorkbench";
import { DataSettingsModal } from "@/components/settings/DataSettingsModal";
import { isToday } from "@/lib/utils";

const priorityTone: Record<Priority, Tone> = { high: "red", medium: "amber", low: "muted" };

const MODULES = [
  { id: "goal", label: "目标投递岗位数量", icon: Crosshair },
  { id: "today", label: "今日投递", icon: Circle },
  { id: "match", label: "JD Match", icon: ScanSearch },
  { id: "todo", label: "Todo", icon: ClipboardList },
];

export function DashboardPage() {
  const { db, api } = useData();
  const { toast } = useToast();
  const [targetEditing, setTargetEditing] = useState(false);
  const [targetDraft, setTargetDraft] = useState(String(db.settings.dailyApplyTarget));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [todoDeleting, setTodoDeleting] = useState<Todo | null>(null);

  useEffect(() => {
    const id = window.location.hash.replace("#", "");
    if (id) {
      const el = document.getElementById(id);
      if (el) window.setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
  }, []);

  const target = db.settings.dailyApplyTarget;
  const appliedToday = useMemo(
    () => db.jobs.filter((j) => j.appliedAt && isToday(j.appliedAt)).length,
    [db.jobs]
  );
  const donePct = target > 0 ? Math.min(100, Math.round((appliedToday / target) * 100)) : 0;
  const todoOpen = useMemo(
    () =>
      db.todos
        .filter((t) => !t.completed)
        .sort((a, b) => (a.deadline && b.deadline ? a.deadline.localeCompare(b.deadline) : a.deadline ? -1 : b.deadline ? 1 : b.createdAt.localeCompare(a.createdAt))),
    [db.todos]
  );
  const missingProfile = !db.resume.name && db.resume.experiences.length === 0;

  const saveTarget = () => {
    const n = Math.max(0, Math.min(100, Number.parseInt(targetDraft, 10) || 0));
    api.updateSettings({ dailyApplyTarget: n });
    setTargetEditing(false);
    toast(n > 0 ? `今日目标已设为 ${n}` : "已关闭每日目标数量提示");
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };

  const quickTodo = (title: string, priority: Priority = "medium") => {
    if (!title.trim()) return;
    api.addTodo(
      defaultTodoDraft({
        title: title.trim(),
        priority,
        source: "manual",
        deadline: "",
      })
    );
    toast("已加入 Todo。");
  };

  return (
    <div className="space-y-14">
      {/* 页头 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium text-muted">{todayCN()}</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-ink">Dashboard</h1>
          <p className="mt-1 text-[13px] text-muted">
            四个模块：目标投递岗位数量 → 今日投递 → JD Match → Todo。
          </p>
        </div>
        <Button size="sm" variant="outline" icon={<Settings2 size={13} />} onClick={() => setSettingsOpen(true)}>
          设置与数据
        </Button>
      </div>

      {/* 模块导航 */}
      <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {MODULES.map((m) => (
          <button
            key={m.id}
            onClick={() => scrollTo(m.id)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] font-medium text-muted transition-colors hover:border-violet hover:text-violet-deep"
          >
            <m.icon size={13} />
            {m.label}
          </button>
        ))}
      </div>

      {/* ===== 模块 1：目标投递岗位数量 ===== */}
      <section id="goal" className="scroll-mt-6">
        <ModuleHeading
          icon={<Crosshair size={16} />}
          title="目标投递岗位数量"
          desc="目标是高质量候选池上限，不是必须投满的 KPI。"
        />
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <Panel className="flex items-center gap-5 p-6">
            <ScoreRing score={donePct} size={92} strokeWidth={7} caption="完成" />
            <div>
              <p className="text-[12px] text-muted">每日目标</p>
              {targetEditing ? (
                <div className="mt-1 flex items-center gap-1.5">
                  <Input
                    autoFocus
                    type="number"
                    min={0}
                    max={100}
                    className="h-8 w-20"
                    value={targetDraft}
                    onChange={(e) => setTargetDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveTarget();
                      if (e.key === "Escape") setTargetEditing(false);
                    }}
                  />
                  <Button size="xs" onClick={saveTarget}>
                    确定
                  </Button>
                </div>
              ) : (
                <button onClick={() => { setTargetDraft(String(target)); setTargetEditing(true); }} className="group flex items-baseline gap-2">
                  <span className="tnum font-mono text-4xl font-bold text-ink">{target}</span>
                  <span className="text-[11px] text-faint underline decoration-dotted group-hover:text-violet">
                    点击修改
                  </span>
                </button>
              )}
              <p className="tnum mt-1 text-[13px] text-muted">
                今日已投 <b className="font-semibold text-ink">{appliedToday}</b> 个
                {target > appliedToday ? `，还可投 ${target - appliedToday} 个` : "，已达成目标 🎉"}
              </p>
            </div>
          </Panel>

          <Panel className="p-6">
            <p className="text-[13px] font-semibold text-ink">求职进行中</p>
            <p className="tnum mt-2 font-mono text-4xl font-bold text-violet-deep">
              {db.jobs.filter((j) =>
                ["applied", "written_test", "interview_1", "interview_2", "interview_final"].includes(j.status)
              ).length}
            </p>
            <p className="mt-2 text-xs leading-5 text-faint">
              已投递 → 笔试 / 一面 / 二面 / 终面 任一环节
            </p>
            {missingProfile ? (
              <Link href="/prep#intro" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-violet hover:underline">
                <Sparkles size={12} /> 先完善个人资料（影响 AI 匹配）
              </Link>
            ) : null}
          </Panel>

          <Panel className="p-6">
            <p className="text-[13px] font-semibold text-ink">距离目标还需要</p>
            <p className="tnum mt-2 font-mono text-4xl font-bold text-ink">
              {Math.max(0, target - appliedToday)}
            </p>
            <p className="mt-2 text-xs leading-5 text-faint">
              优先投「高匹配度」岗位，见下方 JD Match 报告与今日投递列表。
            </p>
          </Panel>
        </div>
      </section>

      {/* ===== 模块 2：今日投递 ===== */}
      <section id="today" className="scroll-mt-6">
        <ModuleHeading
          icon={<Circle size={16} />}
          title="今日投递"
          desc="新增 / 编辑 / 删除 / 状态修改 / 搜索 / 筛选都在这里完成；今天投递的岗位自动计入上方目标。"
        />
        <JobsPage embedded />
      </section>

      {/* ===== 模块 3：JD Match ===== */}
      <section id="match" className="scroll-mt-6">
        <ModuleHeading
          icon={<ScanSearch size={16} />}
          title="JD Match"
          desc="粘贴 JD → 五维匹配报告（Mock AI）→ 判断是否值得投递 → 保存为「待投递」或「已投递」。"
          extra={<Badge tone="amber">Mock AI</Badge>}
        />
        <MatchWorkbench />
      </section>

      {/* ===== 模块 4：Todo ===== */}
      <section id="todo" className="scroll-mt-6">
        <ModuleHeading
          icon={<ClipboardList size={16} />}
          title="Todo"
          desc="JD Match 与面试复盘发现的缺口会自动变成这里的 Todo。"
        />
        <TodoPanel
          todosOpen={todoOpen}
          doneCount={db.todos.length - todoOpen.length}
          onAdd={quickTodo}
          onToggle={(id) => api.toggleTodo(id)}
          onDelete={(todo) => setTodoDeleting(todo)}
        />
      </section>

      <DataSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ConfirmDialog
        open={Boolean(todoDeleting)}
        onClose={() => setTodoDeleting(null)}
        onConfirm={() => {
          if (todoDeleting) {
            api.deleteTodo(todoDeleting.id);
            toast("Todo 已删除。");
            setTodoDeleting(null);
          }
        }}
        title="删除这条 Todo？"
        description={todoDeleting ? <>将删除「{todoDeleting.title}」。</> : null}
        confirmText="删除"
      />
    </div>
  );
}

function ModuleHeading({
  icon,
  title,
  desc,
  extra,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
          <span className="text-violet">{icon}</span>
          {title}
          {extra}
        </h2>
        {desc ? <p className="mt-1 max-w-2xl text-[13px] leading-5 text-muted">{desc}</p> : null}
      </div>
    </div>
  );
}

function TodoPanel({
  todosOpen,
  doneCount,
  onAdd,
  onToggle,
  onDelete,
}: {
  todosOpen: Todo[];
  doneCount: number;
  onAdd: (title: string, priority: Priority) => void;
  onToggle: (id: string) => void;
  onDelete: (todo: Todo) => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const submit = () => {
    if (!title.trim()) return;
    onAdd(title, priority);
    setTitle("");
    setPriority("medium");
  };

  return (
    <Panel>
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h3 className="text-[15px] font-semibold text-ink">待办 {todosOpen.length} · 已完成 {doneCount}</h3>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-line bg-canvas/40 p-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="例如：补充字节商业化知识"
          className="min-w-[200px] flex-1"
        />
        <Select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className="w-24"
          aria-label="优先级"
        >
          {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </Select>
        <Button size="sm" variant="soft" icon={<Plus size={14} />} onClick={submit}>
          添加
        </Button>
      </div>
      {todosOpen.length === 0 ? (
        <div className="px-5 py-10">
          <EmptyState
            compact
            icon={<Check size={22} />}
            title="没有待办，状态很好"
            description="JD Match 和面试复盘发现的缺口会自动沉淀到这里。"
          />
        </div>
      ) : (
        <ul className="max-h-[520px] divide-y divide-line overflow-y-auto">
          {todosOpen.map((todo) => (
            <li key={todo.id} className="group flex items-start gap-3 px-5 py-3.5">
              <button
                onClick={() => onToggle(todo.id)}
                className="focus-ring mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-lineStrong text-transparent transition-colors hover:border-green hover:text-green"
                aria-label="完成"
              >
                <Check size={12} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] leading-5 text-ink">{todo.title}</p>
                {todo.description ? (
                  <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-faint">{todo.description}</p>
                ) : null}
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge tone={priorityTone[todo.priority]}>P{PRIORITY_LABELS[todo.priority]}</Badge>
                  <Badge tone="muted">{TODO_SOURCE_LABELS[todo.source]}</Badge>
                  {todo.deadline ? (
                    <Badge tone={isPast(todo.deadline) ? "red" : "blue"}>
                      {isPast(todo.deadline) ? "已逾期 " : ""}
                      {formatDate(todo.deadline)}
                    </Badge>
                  ) : null}
                  {todo.gapType ? <Badge tone="violet">缺口沉淀</Badge> : null}
                </div>
              </div>
              <button
                onClick={() => onDelete(todo)}
                className="rounded-md p-1.5 text-faint opacity-0 transition-opacity hover:bg-red-soft hover:text-red group-hover:opacity-100"
                title="删除"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
