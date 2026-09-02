import { JOB_STATUS_LABELS, JOB_STATUS_TONES } from "@/lib/constants";
import { JOB_STATUSES, type JobStatus } from "@/lib/types";
import { Badge, type Tone } from "@/components/ui/Primitives";
import { Select } from "@/components/ui/Primitives";

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge tone={JOB_STATUS_TONES[status] as Tone} title={`状态：${JOB_STATUS_LABELS[status]}`}>
      {JOB_STATUS_LABELS[status]}
    </Badge>
  );
}

export function JobStatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: JobStatus;
  onChange: (v: JobStatus) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      className="h-7 w-auto py-0 text-xs"
      onChange={(e) => onChange(e.target.value as JobStatus)}
      aria-label="修改岗位状态"
    >
      {JOB_STATUSES.map((s) => (
        <option key={s} value={s}>
          {JOB_STATUS_LABELS[s]}
        </option>
      ))}
    </Select>
  );
}
