import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanionBanner } from "@/components/ledger/companion-banner";
import { DisabledAction } from "@/components/ledger/disabled-action";
import { ExceptionChip } from "@/components/ledger/status-chip";
import { PageHeader } from "@/components/ledger/page-header";
import { formatSerial, NOT_WIRED } from "@/lib/ledger/copy";
import { getActor } from "@/lib/ledger/identity";
import { sourceLabel, type FactSource } from "@/lib/oda/discrepancy";
import { loadWorkspace } from "@/lib/oda/workspace";

export const dynamic = "force-dynamic";

export default async function ExceptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getActor();
  const workspace = await loadWorkspace(actor);
  const row = workspace.exceptions.find((item) => item.id === id);
  if (!row) notFound();
  const item = row.itemId ? workspace.items.find((line) => line.id === row.itemId) : undefined;

  return (
    <>
      <CompanionBanner persistence={workspace.persistence} />
      <PageHeader
        title={row.item}
        description={row.issue}
        meta="Opened because sources disagreed. Nothing was auto-merged."
        actions={<ExceptionChip severity={row.severity} />}
      />
      <section className="panel">
        <dl className="detail-list">
          <div>
            <dt>Serial</dt>
            <dd>{formatSerial(row.serial)}</dd>
          </div>
          <div>
            <dt>Next action</dt>
            <dd>{row.action}</dd>
          </div>
          {row.sourceA && row.sourceB ? (
            <>
              <div>
                <dt>{sourceLabel(row.sourceA as FactSource)}</dt>
                <dd>{row.factA}</dd>
              </div>
              <div>
                <dt>{sourceLabel(row.sourceB as FactSource)}</dt>
                <dd>{row.factB}</dd>
              </div>
            </>
          ) : null}
          {row.sectionLetter ? (
            <div>
              <dt>Section</dt>
              <dd>{row.sectionLetter}</dd>
            </div>
          ) : null}
          {item ? (
            <div>
              <dt>Hand-receipt line</dt>
              <dd>
                <Link href={`/lines/${item.id}`}>{item.commonName ?? item.name}</Link>
              </dd>
            </div>
          ) : null}
        </dl>
        <div className="discrepancy-actions detail-actions">
          <DisabledAction label="Resolve" reason={NOT_WIRED.resolve} />
          <DisabledAction label="Add note" reason={NOT_WIRED.addNote} variant="outline" />
        </div>
      </section>
    </>
  );
}
