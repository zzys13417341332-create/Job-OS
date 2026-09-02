"use client";

import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function TagsEditor({
  value,
  onChange,
  placeholder = "输入后回车添加",
  suggestions,
  className,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
}) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const tag = raw.trim().replace(/^[,，]+|[,，]+$/g, "");
    if (!tag || value.includes(tag)) return;
    onChange([...value, tag]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
      setDraft("");
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-lineStrong bg-surface px-2 py-1.5 focus-within:border-violet">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-violet-soft px-2 py-0.5 text-xs font-medium text-violet-deep"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== tag))}
              className="rounded-sm p-px hover:bg-violet-line"
              aria-label={`移除 ${tag}`}
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim()) {
              add(draft);
              setDraft("");
            }
          }}
          placeholder={value.length ? "" : placeholder}
          className="min-w-[110px] flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
        />
      </div>
      {suggestions && suggestions.length ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {suggestions
            .filter((s) => !value.includes(s))
            .slice(0, 12)
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="focus-ring inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-[11px] text-muted transition-colors hover:border-violet hover:text-violet-deep"
              >
                <Plus size={10} />
                {s}
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}
