"use client";

import { useEffect, useState } from "react";
import { MessagesSquare, ScanSearch, Sparkles, UserRound } from "lucide-react";
import type { Project } from "@/lib/types";
import { useData } from "@/providers/data-context";
import { PageHeader } from "./PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { IntroManager } from "@/components/prep/IntroManager";
import { ProjectsPage } from "./ProjectsPage";
import { PredictionPanel } from "@/components/prep/PredictionPanel";
import { FollowUpModal } from "@/components/projects/FollowUpModal";
import { ResumeModal } from "@/components/resume/ResumeModal";
import { cn } from "@/lib/utils";

const MODULES = [
  { id: "intro", label: "自我介绍", icon: MessagesSquare },
  { id: "projects", label: "Project Library", icon: ScanSearch },
  { id: "ai", label: "AI 追问", icon: Sparkles },
];

export function PrepPage() {
  const { db } = useData();
  const [resumeOpen, setResumeOpen] = useState(false);
  const [followProject, setFollowProject] = useState<Project | null>(null);

  // 支持从其他页面带锚点进入（#projects / #ai）
  useEffect(() => {
    const id = window.location.hash.replace("#", "");
    if (id) {
      const el = document.getElementById(id);
      if (el) window.setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Interview Prep"
        title="面试准备"
        description="页面只保留三个模块：自我介绍、Project Library（结构化项目）、AI 追问（按项目预测问题 + JD 预测）。"
      />

      {/* 模块内快速导航 */}
      <div className="mb-8 flex flex-wrap gap-2">
        {MODULES.map((m) => (
          <button
            key={m.id}
            onClick={() => scrollTo(m.id)}
            className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] font-medium text-muted transition-colors hover:border-violet hover:text-violet-deep"
          >
            <m.icon size={13} />
            {m.label}
          </button>
        ))}
      </div>

      {/* ===== 模块 1：自我介绍 ===== */}
      <section id="intro" className="mb-14 scroll-mt-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <MessagesSquare size={17} className="text-violet" />
              自我介绍
            </h2>
            <p className="mt-0.5 text-[13px] text-muted">
              多岗位 / 多版本模板；AI 匹配以 Resume Profile 为锚点。
            </p>
          </div>
          <Button size="sm" variant="outline" icon={<UserRound size={13} />} onClick={() => setResumeOpen(true)}>
            编辑个人资料
          </Button>
        </div>
        <IntroManager />
      </section>

      {/* ===== 模块 2：Project Library ===== */}
      <section id="projects" className="mb-14 scroll-mt-6">
        <div className="mb-4 border-b border-line pb-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <ScanSearch size={17} className="text-violet" />
            Project Library
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">
            每个项目结构化保存 BGAR + 数据 / 决策 / 难点，支撑 JD 匹配与复盘缺口检测。
          </p>
        </div>
        <ProjectsPage embedded />
      </section>

      {/* ===== 模块 3：AI 追问 ===== */}
      <section id="ai" className="scroll-mt-6">
        <div className="mb-4 border-b border-line pb-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Sparkles size={17} className="text-violet" />
            AI 追问
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">
            两类入口：按项目生成 7 类面试追问；粘贴 JD 预测最可能被问的项目与问题。
          </p>
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="mb-1 text-[15px] font-semibold text-ink">按项目生成追问</h3>
            <p className="mb-4 text-[13px] leading-5 text-muted">
              问题只基于项目里真实存在的内容生成；缺失字段会提示你先补充，不编造。
            </p>
            {db.projects.length === 0 ? (
              <EmptyState
                compact
                title="先到 Project Library 添加项目"
                description="有项目记录后，这里可以按项目生成/复习 AI 追问。"
              />
            ) : (
              <div className="space-y-2">
                {db.projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setFollowProject(p)}
                    className="flex w-full items-center gap-3 rounded-xl border border-line px-4 py-3 text-left transition-colors hover:border-violet-line hover:bg-violet-soft/40"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-ink">{p.name}</span>
                      <span className="mt-0.5 block text-xs text-faint">
                        {p.interviewQuestions.length
                          ? `已保存 ${p.interviewQuestions.length} 个追问`
                          : "尚未生成追问"}
                      </span>
                    </span>
                    <Sparkles size={15} className="shrink-0 text-violet" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-violet-line bg-surface p-5">
            <h3 className="mb-1 flex items-center gap-2 text-[15px] font-semibold text-ink">
              <Sparkles size={15} className="text-violet" />
              JD → 面试预测
            </h3>
            <p className="mb-3 text-[13px] leading-5 text-muted">
              粘贴完整 JD，预测最可能被问的项目、问题与准备清单（Mock AI）。
            </p>
            <PredictionPanel />
          </div>
        </div>
      </section>

      {followProject ? (
        <FollowUpModal project={followProject} onClose={() => setFollowProject(null)} />
      ) : null}
      <ResumeModal open={resumeOpen} onClose={() => setResumeOpen(false)} />
    </div>
  );
}
