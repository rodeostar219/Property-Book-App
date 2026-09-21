import Link from "next/link";
import { FileSearch, UploadCloud } from "lucide-react";
import { CompanionBanner } from "@/components/ledger/companion-banner";
import { CurrentBadge } from "@/components/ledger/app-shell";
import { Button } from "@/components/ui/button";
import { InjectPanel } from "@/components/ledger/inject-panel";
import { PageHeader } from "@/components/ledger/page-header";
import { PhrhChrome } from "@/components/ledger/phrh-note";
import { INJECT_FEED_LABEL } from "@/lib/ledger/copy";
import { requirePm } from "@/lib/ledger/identity";
import { getReceipts } from "@/lib/ledger/queries";
import { loadWorkspace } from "@/lib/oda/workspace";

export const dynamic = "force-dynamic";

export default async function ReceiptsPage() {
  const actor = await requirePm();
  const workspace = await loadWorkspace(actor);
  const rows = getReceipts().filter(
    (row) => row.kind === "hand_receipt" || row.kind === "sub_hand_receipt",
  );
  const current = rows.find((row) => row.status === "Current" && row.kind === "hand_receipt");
  const shr = rows.find((row) => row.kind === "sub_hand_receipt");

  return (
    <>
      <CompanionBanner persistence={workspace.persistence} />
      <PageHeader
        title="Hand receipts"
        description="ODA hand receipt plus electronic Sub-hand receipt (SHR) inject history. Not a monthly product. Not Accept theater."
        actions={
          <div className="split-actions">
            <Button asChild variant="outline">
              <Link href="/receipts/2062-in">
                <UploadCloud />
                Import DA 2062 in
              </Link>
            </Button>
            <Button asChild>
              <Link href="/receipts/2062-out">
                <UploadCloud />
                Sign out 2062
              </Link>
            </Button>
          </div>
        }
      />

      {current ? <PhrhChrome source={current} /> : null}
      {shr ? <PhrhChrome source={shr} compact /> : null}

      <InjectPanel sectionLetter="E" persistence={workspace.persistence} canEdit />

      <section className="panel month-compare">
        <div className="panel-head">
          <div>
            <h2>{INJECT_FEED_LABEL} history</h2>
            <p>Prior electronic SHR snapshots remain queryable. Nothing is silently applied to other layers.</p>
          </div>
          <CurrentBadge>Versioned change feed</CurrentBadge>
        </div>
        <div className="month-grid">
          {workspace.injects.length === 0 ? (
            <p className="table-empty">No inject snapshots yet.</p>
          ) : (
            workspace.injects.map((inject) => (
              <article key={inject.id}>
                <div className="month-title">
                  <span>
                    <FileSearch />
                  </span>
                  <div>
                    <h3>{inject.label}</h3>
                    <p>
                      {inject.injectedBy} · {inject.injectedAt.slice(0, 10)}
                      {inject.sectionLetter ? ` · section ${inject.sectionLetter}` : ""}
                    </p>
                  </div>
                  <span className="pill green">Queryable</span>
                </div>
                <strong>{inject.addedCount + inject.unchangedCount + inject.changedCount}</strong>
                <small>Lines in this snapshot</small>
                <div className="delta">
                  <span className="gain">+{inject.addedCount} added</span>
                  <span className="loss">−{inject.removedCount} removed</span>
                  <span>{inject.changedCount} changed</span>
                </div>
                <Link className="snapshot-link" href={`/receipts/history/${inject.id}`}>
                  Open snapshot
                </Link>
              </article>
            ))
          )}
        </div>
      </section>

      <h3 className="section-label">Source documents</h3>
      <div className="receipt-list">
        {rows.map((row) => (
          <article className="panel" key={row.id}>
            <span className="document-icon">
              <FileSearch />
            </span>
            <div className="receipt-name">
              <h3>{row.filename}</h3>
              <p>
                {row.kindLabel} · {row.uic}
              </p>
            </div>
            <div>
              <small>Effective date</small>
              <b>{row.effectiveDate}</b>
            </div>
            <div>
              <small>Line groups</small>
              <b>{row.lineGroups}</b>
            </div>
            <div>
              <small>Total quantity</small>
              <b>{row.totalQuantity}</b>
            </div>
            <span className={`pill ${row.status === "Current" ? "green" : "blue"}`}>
              {row.status}
            </span>
          </article>
        ))}
      </div>
    </>
  );
}
