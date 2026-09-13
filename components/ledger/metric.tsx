import type { LucideIcon } from "lucide-react";

export function Metric({
  label,
  value,
  note,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <article className={`metric ${tone}`}>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{note}</p>
      </div>
      <span>
        <Icon />
      </span>
    </article>
  );
}
