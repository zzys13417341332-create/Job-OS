import { cn, clamp } from "@/lib/utils";

export function toneForScore(score: number): string {
  if (score >= 82) return "#279A6B";
  if (score >= 68) return "#6D5AE0";
  if (score >= 55) return "#3E74E8";
  return "#CE4641";
}

export function ProgressBar({
  value,
  tone,
  className,
}: {
  value: number;
  tone?: string;
  className?: string;
}) {
  const v = clamp(value, 0, 100);
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-line", className)}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${v}%`, background: tone ?? toneForScore(v) }}
      />
    </div>
  );
}

export function ScoreRing({
  score,
  size = 72,
  strokeWidth = 6,
  caption,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  caption?: string;
}) {
  const v = clamp(Math.round(score), 0, 100);
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const color = toneForScore(v);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E6E6EC" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          style={{ transition: "stroke-dashoffset .6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tnum font-mono text-lg font-semibold" style={{ color }}>
          {v}
        </span>
        {caption ? <span className="text-[9px] text-faint">{caption}</span> : null}
      </div>
    </div>
  );
}

export function MiniBar({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-inkSoft">{label}</span>
        <span className="flex items-center gap-2">
          {note ? <span className="truncate text-[11px] text-faint">{note}</span> : null}
          <span className="tnum font-mono font-medium text-ink">{Math.round(value)}</span>
        </span>
      </div>
      <ProgressBar value={value} />
    </div>
  );
}
