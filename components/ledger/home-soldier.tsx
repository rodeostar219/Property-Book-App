import Link from "next/link";
import { AlertTriangle, Package, ScrollText } from "lucide-react";
import { Metric } from "@/components/ledger/metric";
import { PageHeader } from "@/components/ledger/page-header";
import { SectionSwitcher } from "@/components/ledger/section-switcher";
import { SignedForList } from "@/components/ledger/signed-for-list";
import { UNIT } from "@/lib/ledger/copy";
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
        <SignedForList
          items={items}
          empty="No signed-for lines on this section Sub-hand receipt (SHR)."
        />
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
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>DA Form 2062 in</h2>
            <p>Scan or electronic extract onto your section SHR. Confirm before write.</p>
          </div>
          <Link href="/receipts/2062-in">Open 2062 in</Link>
        </div>
        <article className="da2062-home-cta">
          <span className="activity-icon">
            <ScrollText />
          </span>
          <div>
            <b>Import onto {actor.sectionLetter ? `${actor.sectionLetter} SHR` : "your section"}</b>
            <p>Ryan 18E path at JBLM. Out, return dates, boxes, and 1750 stay out of this slice.</p>
          </div>
        </article>
      </section>
    </>
  );
}
