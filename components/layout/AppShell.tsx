"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  Mic2,
  Sparkles,
  X,
} from "lucide-react";
import { cn, todayCN } from "@/lib/utils";
import { DataProvider } from "@/providers/data-context";
import { ToastProvider } from "@/components/ui/Toast";
import { createAIProvider } from "@/services/ai/provider";
import { PageLoading } from "@/components/ui/Loading";
import { useData } from "@/providers/data-context";
import { Badge } from "@/components/ui/Primitives";

// 唯一允许的一级页面：Dashboard / Interview Prep / Interview Review / Knowledge Base
const NAV_ITEMS: Array<{ href: string; label: string; icon: typeof LayoutDashboard; ai?: boolean }> = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/prep", label: "Interview Prep", icon: MessagesSquare, ai: true },
  { href: "/interviews", label: "Interview Review", icon: Mic2, ai: true },
  { href: "/knowledge", label: "Knowledge Base", icon: BookOpenText },
];

const TITLES: Record<string, { title: string; sub: string }> = {
  "/": { title: "Dashboard", sub: "目标投递 · 今日投递 · JD Match · Todo" },
  "/prep": { title: "Interview Prep", sub: "自我介绍 · Project Library · AI 追问" },
  "/interviews": {
    title: "Interview Review",
    sub: "录音 · Transcript · 问题提取 · 回答分析 · Gap Analysis",
  },
  "/knowledge": { title: "Knowledge Base", sub: "公司知识 · 行业知识 · 平台知识 · 面试经验 · 案例" },
};

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-line px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white">
          <Sparkles size={16} />
        </div>
        <div className="leading-tight">
          <p className="text-[15px] font-bold tracking-tight text-ink">Job OS</p>
          <p className="text-[10px] font-medium text-faint">Personal AI Job System</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors",
                active
                  ? "bg-violet-soft text-violet-deep"
                  : "text-muted hover:bg-line/50 hover:text-inkSoft"
              )}
            >
              <Icon
                size={16}
                className={cn(
                  active ? "text-violet" : "text-faint group-hover:text-muted"
                )}
              />
              <span className="flex-1">{item.label}</span>
              {item.ai ? (
                <Sparkles size={11} className={active ? "text-violet" : "text-faint"} />
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-line px-5 py-4">
        <p className="text-[11px] leading-4 text-faint">
          数据仅保存在本机浏览器。
          <br />
          请勿在公共电脑使用。
        </p>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready } = useData();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMock, setIsMock] = useState(true);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    try {
      setIsMock(createAIProvider().mode === "mock");
    } catch {
      setIsMock(true);
    }
  }, []);

  const meta = useMemo(() => {
    const key = Object.keys(TITLES).find((k) =>
      pathname === "/" ? k === "/" : pathname.startsWith(k) && k !== "/"
    );
    return TITLES[key ?? "/"] ?? TITLES["/"];
  }, [pathname]);

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      {/* Desktop sidebar */}
      <aside className="hidden w-[238px] shrink-0 border-r border-line bg-surface lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/25 backdrop-blur-[1px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[260px] border-r border-line bg-surface shadow-float animate-slide-in">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-md p-1 text-faint hover:text-inkSoft"
              aria-label="关闭菜单"
            >
              <X size={18} />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur sm:px-6">
          <button
            className="focus-ring -ml-1 rounded-md p-1.5 text-inkSoft lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="打开菜单"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-semibold text-ink sm:text-base">
              {meta.title}
            </h1>
            <p className="hidden text-xs text-faint sm:block">{meta.sub}</p>
          </div>
          <span className="hidden text-xs text-faint md:block">{todayCN()}</span>
          <Badge tone={isMock ? "amber" : "green"} title="当前 AI 能力模式">
            <Sparkles size={10} />
            {isMock ? "Mock AI" : "Server AI"}
          </Badge>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          {ready ? (
            <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 sm:py-7">
              {children}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <PageLoading />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <DataProvider>
        <Shell>{children}</Shell>
      </DataProvider>
    </ToastProvider>
  );
}
