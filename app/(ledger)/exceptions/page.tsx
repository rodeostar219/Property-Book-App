import Link from "next/link";
import { AlertTriangle, Download } from "lucide-react";
import { DisabledAction } from "@/components/ledger/disabled-action";
import { ExceptionChip } from "@/components/ledger/status-chip";
import { PageHeader } from "@/components/ledger/page-header";
import { NOT_WIRED } from "@/lib/ledger/copy";
import { getActor } from "@/lib/ledger/identity";
import { getExceptionsFor } from "@/lib/ledger/queries";

export const dynamic = "force-dynamic";

export default async function ExceptionsPage() {
  const actor = await getActor();
  const rows = getExceptionsFor(actor);

  return (
    <>
      <PageHeader
        title="Exceptions"
        description={
          actor.role === "pm"
            ? "Unit exceptions. Resolve with a required audit note is Slice C."
            : "Exceptions on property you signed for. Resolve is Slice C."
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
        {rows.map((row) => (
          <article key={row.id}>
            <span className="alert-symbol">
              <AlertTriangle />
            </span>
            <div>
              <h3>
                <Link href={`/exceptions/${row.id}`}>{row.item}</Link>
                <code>{row.serial}</code>
              </h3>
              <p>{row.issue}</p>
              <small>Next action: {row.action}</small>
            </div>
            <ExceptionChip severity={row.severity} />
            <div className="discrepancy-actions">
              <DisabledAction
                label="Resolve"
                reason={NOT_WIRED.resolve}
                size="sm"
              />
              <DisabledAction
                label="Add note"
                reason={NOT_WIRED.addNote}
                variant="outline"
                size="sm"
              />
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
