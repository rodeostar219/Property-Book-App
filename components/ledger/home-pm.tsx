import Link from "next/link";
import {
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  ClipboardCheck,
} from "lucide-react";
import { CurrentBadge } from "@/components/ledger/app-shell";
import { Metric } from "@/components/ledger/metric";
import { PageHeader } from "@/components/ledger/page-header";
import { UNIT } from "@/lib/ledger/copy";
import type { Actor, LedgerException, LoanRecord } from "@/lib/ledger/types";

export function PmHome({
  actor,
  itemCount,
  exceptionCount,
  exceptions,
  renewSoon,
}: {
  actor: Actor;
  itemCount: number;
  exceptionCount: number;
  exceptions: LedgerException[];
  renewSoon: LoanRecord[];
}) {
  return (
    <>
      <PageHeader
        title="Unit home"
        description="Property Manager attention — the unit book lives under Unit property, not here."
        meta={`${UNIT.uic} ${UNIT.name} · signed in as ${actor.fullName}`}
        actions={<CurrentBadge>Hand receipt current</CurrentBadge>}
      />
      <div className="metrics">
        <Metric
          label="UNIT PROPERTY"
          value={String(itemCount)}
          note="Demo fixture lines"
          icon={Boxes}
          tone="teal"
        />
        <Metric
          label="SERIALIZED"
          value="184"
          note="From current hand receipt"
          icon={ClipboardCheck}
          tone="blue"
        />
        <Metric
          label="DA FORM 2062"
          value={String(renewSoon.length)}
          note="Approaching configured renewal"
          icon={ArrowRightLeft}
          tone="purple"
        />
        <Metric
          label="EXCEPTIONS"
          value={String(exceptionCount)}
          note="Open unit exceptions"
          icon={AlertTriangle}
          tone="red"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Open exceptions</h2>
              <p>Resolve with an audit note arrives in Slice C</p>
            </div>
            <Link href="/exceptions">View all</Link>
          </div>
          <ul className="home-item-list">
            {exceptions.slice(0, 4).map((row) => (
              <li key={row.id}>
                <Link href={`/exceptions/${row.id}`}>
                  <b>{row.item}</b>
                  <span>{row.issue}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel activity">
          <div className="panel-head">
            <div>
              <h2>PM shortcuts</h2>
              <p>Unit book and receipt tools</p>
            </div>
          </div>
          <article>
            <span className="activity-icon">
              <Boxes />
            </span>
            <div>
              <b>
                <Link href="/property">Unit property</Link>
              </b>
              <p>Full hand-receipt lines for {UNIT.uic}</p>
            </div>
          </article>
          <article>
            <span className="activity-icon">
              <ClipboardCheck />
            </span>
            <div>
              <b>
                <Link href="/receipts">Hand receipts</Link>
              </b>
              <p>Unit hand receipt and Sub-hand receipt (SHR) snapshots</p>
            </div>
          </article>
          <article>
            <span className="activity-icon assign">
              <ArrowRightLeft />
            </span>
            <div>
              <b>
                <Link href="/loans">DA Form 2062</Link>
              </b>
              <p>
                {renewSoon.length} document
                {renewSoon.length === 1 ? "" : "s"} near the configured renewal
              </p>
            </div>
          </article>
        </section>
      </div>
    </>
  );
}
