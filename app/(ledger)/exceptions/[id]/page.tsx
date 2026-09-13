import Link from "next/link";
import { notFound } from "next/navigation";
import { DisabledAction } from "@/components/ledger/disabled-action";
import { ExceptionChip } from "@/components/ledger/status-chip";
import { PageHeader } from "@/components/ledger/page-header";
import { formatSerial, NOT_WIRED } from "@/lib/ledger/copy";
import { getException, getPropertyItem } from "@/lib/ledger/queries";

export const dynamic = "force-dynamic";

export default async function ExceptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = getException(id);
  if (!row) notFound();
  const item = row.itemId ? getPropertyItem(row.itemId) : undefined;

  return (
    <>
      <PageHeader
        title={row.item}
        description={row.issue}
        meta="Slice A route only. Required audit-note resolve is Slice C."
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
          {item ? (
            <div>
              <dt>End item</dt>
              <dd>
                <Link href={`/items/${item.id}`}>{item.name}</Link>
              </dd>
            </div>
          ) : null}
        </dl>
        <div className="discrepancy-actions detail-actions">
          <DisabledAction label="Resolve" reason={NOT_WIRED.resolve} />
          <DisabledAction
            label="Add note"
            reason={NOT_WIRED.addNote}
            variant="outline"
          />
        </div>
      </section>
    </>
  );
}
