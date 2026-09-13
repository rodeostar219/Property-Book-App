import Link from "next/link";
import { AlertTriangle, Package } from "lucide-react";
import { Metric } from "@/components/ledger/metric";
import { PageHeader } from "@/components/ledger/page-header";
import { StatusChip } from "@/components/ledger/status-chip";
import { UNIT } from "@/lib/ledger/copy";
import { soldierAssignedSerials } from "@/lib/ledger/fixtures";
import type { Actor, LedgerException, PropertyItem } from "@/lib/ledger/types";

export function SoldierHome({
  actor,
  items,
  exceptions,
}: {
  actor: Actor;
  items: PropertyItem[];
  exceptions: LedgerException[];
}) {
  return (
    <>
      <PageHeader
        title={`${actor.fullName}`}
        description="Property you signed for — not the unit property book."
        meta={`${UNIT.uic} ${UNIT.name} · demo serials ${soldierAssignedSerials.join(", ")}`}
      />
      <div className="metrics soldier-metrics">
        <Metric
          label="SIGNED FOR"
          value={String(items.length)}
          note="End items on your Sub-hand receipt (SHR)"
          icon={Package}
          tone="teal"
        />
        <Metric
          label="NEEDS ATTENTION"
          value={String(exceptions.length)}
          note="Exceptions on your property"
          icon={AlertTriangle}
          tone="red"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Your signed-for property</h2>
              <p>Open an end item for receipt chrome. Cards land in Slice B.</p>
            </div>
            <Link href="/my-property">Open my property</Link>
          </div>
          <ul className="home-item-list">
            {items.map((item) => (
              <li key={item.id}>
                <Link href={`/items/${item.id}`}>
                  <b>{item.name}</b>
                  <span>{item.serial ?? "No serial"}</span>
                </Link>
                <StatusChip item={item} />
              </li>
            ))}
          </ul>
        </section>
        <section className="panel activity">
          <div className="panel-head">
            <div>
              <h2>Needs attention</h2>
              <p>Structured Home attention lands in Slice B</p>
            </div>
            <Link href="/exceptions">Exceptions</Link>
          </div>
          {exceptions.length === 0 ? (
            <p className="table-empty">No open exceptions on your property.</p>
          ) : (
            exceptions.map((row) => (
              <article key={row.id}>
                <span className="activity-icon loss">
                  <AlertTriangle />
                </span>
                <div>
                  <b>
                    <Link href={`/exceptions/${row.id}`}>{row.item}</Link>
                  </b>
                  <p>{row.issue}</p>
                </div>
                <time>{row.severity}</time>
              </article>
            ))
          )}
        </section>
      </div>
    </>
  );
}
