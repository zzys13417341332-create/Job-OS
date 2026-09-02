"use client";

import type { HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// ---------- 通用色点（配合 Badge 使用） ----------
export type Tone = "violet" | "blue" | "green" | "amber" | "red" | "muted";

export const TONE_BADGE: Record<Tone, string> = {
  violet: "bg-violet-soft text-violet-deep",
  blue: "bg-blue-soft text-blue-deep",
  green: "bg-green-soft text-green-deep",
  amber: "bg-amber-soft text-amber",
  red: "bg-red-soft text-red",
  muted: "bg-line/70 text-inkSoft",
};

export const TONE_TEXT: Record<Tone, string> = {
  violet: "text-violet",
  blue: "text-blue",
  green: "text-green",
  amber: "text-amber",
  red: "text-red",
  muted: "text-muted",
};

export function Badge({
  tone = "muted",
  className,
  children,
  title,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] leading-4 font-medium",
        TONE_BADGE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

// ---------- 编辑风格区段（无卡片感，适合长内容与知识库） ----------
export function Section({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn("border-t border-line py-6 first:border-t-0", className)}
      {...rest}
    >
      {children}
    </section>
  );
}

// ---------- 面板（数据密集区域使用） ----------
export function Panel({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-line bg-surface", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  desc,
  actions,
  className,
}: {
  title: ReactNode;
  desc?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4",
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {desc ? <p className="mt-1 text-[13px] leading-5 text-muted">{desc}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

// ---------- 表单控件 ----------
export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline gap-1 text-[13px] font-medium text-inkSoft">
        {label}
        {required ? <span className="text-red">*</span> : null}
        {hint ? <span className="ml-1 text-xs font-normal text-faint">{hint}</span> : null}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-red">{error}</p> : null}
    </div>
  );
}

const controlBase =
  "focus-ring w-full rounded-lg border border-lineStrong bg-surface px-3 text-sm text-ink placeholder:text-faint transition-colors hover:border-muted disabled:bg-line/40 disabled:text-muted";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlBase, "h-9", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlBase, "min-h-[88px] py-2 leading-6", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlBase, "h-9 cursor-pointer pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

export function FormActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-2", className)}>
      {children}
    </div>
  );
}

/** 表单下方提示（错误 / 成功 / 信息） */
export function FormNote({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  const cls =
    tone === "error"
      ? "border-red-line bg-red-soft text-red"
      : tone === "success"
        ? "border-green-line bg-green-soft text-green-deep"
        : "border-blue-line bg-blue-soft text-blue-deep";
  return (
    <p className={cn("rounded-lg border px-3 py-2 text-[13px] leading-5", cls)}>{children}</p>
  );
}
