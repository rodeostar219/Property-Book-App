import { COMPANION_NOTE } from "@/lib/ledger/copy";
import type { PersistenceMode } from "@/lib/oda/store";

export function CompanionBanner({ persistence }: { persistence: PersistenceMode }) {
  return (
    <aside className="companion-banner">
      <p>{COMPANION_NOTE}</p>
      <small>
        {persistence === "d1"
          ? "D1 writes are live for picture book, electronic SHR inject, and confirmed DA Form 2062 in."
          : "D1 unavailable — mutations stay disabled. No fake success toasts."}
      </small>
    </aside>
  );
}
