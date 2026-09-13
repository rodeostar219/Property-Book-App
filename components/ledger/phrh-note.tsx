import { ShieldCheck } from "lucide-react";
import { PHRH_NOTE } from "@/lib/ledger/copy";
import type { PropertyItem, ReceiptRecord } from "@/lib/ledger/types";

type Source = Pick<
  PropertyItem,
  "phrhName" | "shrHolderName" | "shrDocument"
> | Pick<ReceiptRecord, "phrhName" | "shrHolderName">;

export function PhrhChrome({
  source,
  compact = false,
}: {
  source: Source;
  compact?: boolean;
}) {
  const hasShr = Boolean(source.shrHolderName);
  return (
    <aside className={`phrh-note ${compact ? "compact" : ""}`}>
      <ShieldCheck />
      <div>
        <p>
          <b>PHRH</b> {source.phrhName}
          {hasShr ? (
            <>
              {" · "}
              <b>SHR</b> {source.shrHolderName}
              {"shrDocument" in source && source.shrDocument
                ? ` · ${source.shrDocument}`
                : null}
            </>
          ) : null}
        </p>
        {hasShr ? <small>{PHRH_NOTE}</small> : null}
      </div>
    </aside>
  );
}
