import Link from "next/link";
import { AlertTriangle, ClipboardCheck, ScrollText } from "lucide-react";
import { CurrentBadge } from "@/components/ledger/app-shell";
import { Metric } from "@/components/ledger/metric";
import { PageHeader } from "@/components/ledger/page-header";
import { SectionSwitcher } from "@/components/ledger/section-switcher";
import { SignedForList } from "@/components/ledger/signed-for-list";
import { UNIT } from "@/lib/ledger/copy";
import type { Actor, LedgerException, PropertyItem } from "@/lib/ledger/types";
import type { SectionCard } from "@/lib/oda/workspace";

export function PmHome({
  actor,
  signedFor,
  exceptionCount,
  exceptions,
  sections,
}: {
  actor: Actor;
  signedFor: PropertyItem[];
  exceptionCount: number;
  exceptions: LedgerException[];
  sections: SectionCard[];
}) {
  return (
    <>
      <PageHeader
        title="ODA home"
        description="Section switcher and My signed-for first — the unit-wide book is under ODA property, not here."
        meta={`${UNIT.uic} ${UNIT.name} · ${UNIT.group} · ${UNIT.installation} · ${actor.fullName}`}
        actions={
          <div className="page-title-actions">
            <Link className="snapshot-link" href="/receipts/2062-in">
              <ScrollText /> DA Form 2062 in
            </Link>
            <Link className="snapshot-link" href="/receipts/2062-out">
              <ScrollText /> DA Form 2062 out
            </Link>
            <CurrentBadge>Hand receipt current</CurrentBadge>
          </div>
        }
      />
      <SectionSwitcher sections={sections} />
      <div className="metrics soldier-metrics">
        <Metric
          label="SIGNED FOR"
          value={String(signedFor.length)}
          note="End items you personally signed for"
          icon={ClipboardCheck}
          tone="teal"
        />
        <Metric
          label="NEEDS ATTENTION"
          value={String(exceptionCount)}
          note="Open discrepancies — never auto-merged"
          icon={AlertTriangle}
          tone="red"
        />
      </div>
      <div className="dashboard-grid">
        <SignedForList
          items={signedFor}
          empty="No personal signed-for lines. Use the Bravo–Fox switcher for section Sub-hand receipts (SHR)."
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
            <p className="table-empty">No open discrepancies.</p>
          ) : (
            exceptions.slice(0, 4).map((row) => (
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
