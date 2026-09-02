import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border border-dashed border-lineStrong bg-canvas/50 text-center",
        compact ? "rounded-lg px-4 py-6" : "rounded-2xl px-6 py-14",
        className
      )}
    >
      {icon ? <div className="mb-3 text-faint">{icon}</div> : null}
      <p className={cn("font-medium text-inkSoft", compact ? "text-sm" : "text-[15px]")}>{title}</p>
      {description ? (
        <p className={cn("mt-1 max-w-sm leading-6 text-muted", compact ? "text-[13px]" : "text-sm")}>
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
