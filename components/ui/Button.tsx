"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "accent" | "soft" | "outline" | "ghost" | "danger";
type Size = "xs" | "sm" | "md";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-inkSoft disabled:opacity-45",
  accent: "bg-violet text-white hover:bg-violet-deep disabled:opacity-45",
  soft: "bg-violet-soft text-violet-deep hover:bg-violet-line disabled:opacity-55",
  outline: "border border-lineStrong bg-surface text-inkSoft hover:border-muted disabled:opacity-45",
  ghost: "text-inkSoft hover:bg-line/60 disabled:opacity-45",
  danger: "bg-red text-white hover:opacity-90 disabled:opacity-45",
};

const SIZE_CLASSES: Record<Size, string> = {
  xs: "h-7 px-2.5 text-xs gap-1.5",
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors select-none",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
