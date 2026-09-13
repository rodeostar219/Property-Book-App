import { STATUS_LABEL, UNIT_TRACKING_LABEL } from "@/lib/ledger/copy";
import { onHandLabel } from "@/lib/ledger/queries";
import type { AccountabilityStatus, PropertyItem } from "@/lib/ledger/types";

const tone: Record<AccountabilityStatus, string> = {
  signed_for: "green",
  on_hand: "green",
  needs_serial_check: "amber",
  shortage_recorded: "red",
};

export function statusText(item: PropertyItem): string {
  if (item.status === "on_hand") return onHandLabel(item);
  return STATUS_LABEL[item.status];
}

export function StatusChip({ item }: { item: PropertyItem }) {
  return (
    <span className="status-stack">
      <span className={`pill ${tone[item.status]}`}>{statusText(item)}</span>
      {item.unitTracking ? (
        <span className="pill blue">{UNIT_TRACKING_LABEL[item.unitTracking]}</span>
      ) : null}
    </span>
  );
}

export function ExceptionChip({
  severity,
}: {
  severity: "Review" | "Missing data" | "Shortage";
}) {
  const color =
    severity === "Shortage" ? "red" : severity === "Missing data" ? "amber" : "red";
  return <span className={`pill ${color}`}>{severity}</span>;
}
