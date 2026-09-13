import Link from "next/link";
import { AlertTriangle, Download } from "lucide-react";
import { CompanionBanner } from "@/components/ledger/companion-banner";
import { DisabledAction } from "@/components/ledger/disabled-action";
import { ExceptionChip } from "@/components/ledger/status-chip";
import { PageHeader } from "@/components/ledger/page-header";
import { formatSerial, NOT_WIRED } from "@/lib/ledger/copy";
import { getActor } from "@/lib/ledger/identity";
import { sourceLabel, type FactSource } from "@/lib/oda/discrepancy";
import { loadWorkspace } from "@/lib/oda/workspace";

export const dynamic = "force-dynamic";

export default async function ExceptionsPage() {
  const actor = await getActor();
  const workspace = await loadWorkspace(actor);
  const rows = workspace.exceptions;

  return (
    <>
      <CompanionBanner persistence={workspace.persistence} />
      <PageHeader
        title="Exceptions"
        description={
          actor.role === "pm"
            ? "Source conflicts across hand receipt, tracker, picture book, and DD Form 1750. Resolve stays unwired."
            : "Discrepancies on your section. Other sections stay isolated."
        }
        actions={
          <DisabledAction
            label="Export exception list"
            reason={NOT_WIRED.export}
            icon={<Download />}
            variant="outline"
          />
        }
      />
      <section className="panel discrepancy-list">
        {rows.length === 0 ? (
          <p className="table-empty">No open discrepancies visible to this identity.</p>
        ) : (
          rows.map((row) => (
            <article key={row.id}>
              <span className="alert-symbol">
                <AlertTriangle />
              </span>
              <div>
                <h3>
                  <Link href={`/exceptions/${row.id}`}>{row.item}</Link>
                  <code>{formatSerial(row.serial)}</code>
                </h3>
                <p>{row.issue}</p>
                {row.sourceA && row.sourceB ? (
                  <small>
                    {sourceLabel(row.sourceA as FactSource)} vs {sourceLabel(row.sourceB as FactSource)}
                    {row.sectionLetter ? ` · section ${row.sectionLetter}` : ""}
                  </small>
                ) : (
                  <small>Next action: {row.action}</small>
                )}
              </div>
              <ExceptionChip severity={row.severity} />
              <div className="discrepancy-actions">
                <DisabledAction label="Resolve" reason={NOT_WIRED.resolve} size="sm" />
                <DisabledAction
                  label="Add note"
                  reason={NOT_WIRED.addNote}
                  variant="outline"
                  size="sm"
                />
              </div>
            </article>
          ))
        )}
      </section>
    </>
  );
}
