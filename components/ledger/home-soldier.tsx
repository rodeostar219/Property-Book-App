import Link from "next/link";
import { AlertTriangle, Package } from "lucide-react";
import { Metric } from "@/components/ledger/metric";
import { PageHeader } from "@/components/ledger/page-header";
import { SectionSwitcher } from "@/components/ledger/section-switcher";
import { StatusChip } from "@/components/ledger/status-chip";
import { formatSerial, UNIT } from "@/lib/ledger/copy";
import type { Actor, LedgerException, PropertyItem } from "@/lib/ledger/types";
import type { SectionCard } from "@/lib/oda/workspace";

export function SoldierHome({
  actor,
  items,
  exceptions,
  sections,
}: {
  actor: Actor;
  items: PropertyItem[];
  exceptions: LedgerException[];
  sections: SectionCard[];
}) {
  return (
    <>
      <PageHeader
        title={`${actor.fullName}`}
        description="Your section Sub-hand receipt (SHR) — not the ODA property book."
        meta={`${UNIT.uic} ${UNIT.name} · ${UNIT.group} · ${UNIT.installation} · ${actor.mos ?? "18E"} ${actor.sectionLetter ? `section ${actor.sectionLetter}` : ""}`}
      />
      <SectionSwitcher sections={sections} active={actor.sectionLetter} />
      <div className="metrics soldier-metrics">
        <Metric
          label="SIGNED FOR"
          value={String(items.length)}
          note="End items on your section Sub-hand receipt (SHR)"
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
              <h2>My signed-for</h2>
              <p>Section Sub-hand receipt (SHR) lines — tap a line for official / actual name and photo.</p>
            </div>
            <Link href="/my-property">Open my section</Link>
          </div>
          <ul className="home-item-list">
            {items.map((item) => (
              <li key={item.id}>
                <Link href={`/lines/${item.id}`}>
                  <b>{item.commonName ?? item.name}</b>
                  <span>
                    {item.officialName ?? item.name} · {formatSerial(item.serial)}
                  </span>
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
              <p>Source mismatches stay open as discrepancies</p>
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
