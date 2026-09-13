import { Check, FileSearch, Plus, UploadCloud, X } from "lucide-react";
import { DisabledAction } from "@/components/ledger/disabled-action";
import { CurrentBadge } from "@/components/ledger/app-shell";
import { PageHeader } from "@/components/ledger/page-header";
import { PhrhChrome } from "@/components/ledger/phrh-note";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NOT_WIRED } from "@/lib/ledger/copy";
import { requirePm } from "@/lib/ledger/identity";
import { getReceiptPeriods, getReceipts } from "@/lib/ledger/queries";

export const dynamic = "force-dynamic";

export default async function ReceiptsPage() {
  await requirePm();
  const periods = getReceiptPeriods();
  const rows = getReceipts().filter(
    (row) => row.kind === "hand_receipt" || row.kind === "sub_hand_receipt",
  );
  const current = rows.find((row) => row.status === "Current" && row.kind === "hand_receipt");
  const shr = rows.find((row) => row.kind === "sub_hand_receipt");

  return (
    <>
      <PageHeader
        title="Hand receipts"
        description="Unit hand receipt snapshots and Sub-hand receipts (SHR). SHR is not a monthly product concept."
        actions={
          <DisabledAction
            label="Import hand receipt"
            reason={NOT_WIRED.importDocument}
            icon={<UploadCloud />}
          />
        }
      />

      {current ? <PhrhChrome source={current} /> : null}
      {shr ? <PhrhChrome source={shr} compact /> : null}

      <section className="panel month-compare">
        <div className="panel-head">
          <div>
            <h2>Period-to-period reconciliation</h2>
            <p>Serial, NSN, and LIN changes are never silently applied</p>
          </div>
          <CurrentBadge>September current</CurrentBadge>
        </div>
        <div className="month-grid">
          {periods.map((period, index) => (
            <article key={period.id}>
              <div className="month-title">
                <span>
                  <FileSearch />
                </span>
                <div>
                  <h3>{period.period}</h3>
                  <p>Effective {period.effective}</p>
                </div>
                <span className={`pill ${index === 0 ? "green" : "blue"}`}>
                  {period.status}
                </span>
              </div>
              <strong>{period.items}</strong>
              <small>Hand-receipt items</small>
              <div className="delta">
                <span className="gain">+{period.added} added</span>
                <span className="loss">−{period.removed} removed</span>
                <span>{period.unchanged} unchanged</span>
              </div>
              {index === 0 ? (
                <Button variant="outline" size="sm" asChild>
                  <a href="#comparison">Review changes</a>
                </Button>
              ) : (
                <DisabledAction
                  label="Open snapshot"
                  reason={NOT_WIRED.accept}
                  variant="outline"
                  size="sm"
                />
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="panel analysis-panel" id="comparison">
        <div className="panel-head">
          <div>
            <h2>September comparison</h2>
            <p>Read-only review. Accept is disabled until Slice D.</p>
          </div>
          <DisabledAction label="Accept as current" reason={NOT_WIRED.accept} />
        </div>
        <div className="analysis-metrics">
          <div>
            <strong>192</strong>
            <span>September items</span>
          </div>
          <div>
            <strong>190</strong>
            <span>August items</span>
          </div>
          <div>
            <strong>+4</strong>
            <span>Added this period</span>
          </div>
          <div>
            <strong>−2</strong>
            <span>Dropped this period</span>
          </div>
        </div>
        <Tabs defaultValue="changes">
          <TabsList>
            <TabsTrigger value="changes">Changes</TabsTrigger>
            <TabsTrigger value="summary">New receipt summary</TabsTrigger>
          </TabsList>
          <TabsContent value="changes">
            <div className="change-list">
              <article>
                <span className="change-icon green">
                  <Plus />
                </span>
                <div>
                  <b>4 items were added on the September hand receipt</b>
                  <p>Review new serial, NSN, and LIN records before accepting.</p>
                </div>
                <span className="pill green">GAIN</span>
              </article>
              <article>
                <span className="change-icon red">
                  <X />
                </span>
                <div>
                  <b>2 August items dropped from the new hand receipt</b>
                  <p>Document the reason for each removal.</p>
                </div>
                <span className="pill red">REVIEW</span>
              </article>
              <article>
                <span className="change-icon amber">
                  <FileSearch />
                </span>
                <div>
                  <b>1 new line has no serial recorded</b>
                  <p>BHI Mini-SATCOM Antenna Kit · NSN 589501D050302</p>
                </div>
                <span className="pill amber">MISSING DATA</span>
              </article>
              <article>
                <span className="change-icon green">
                  <Check />
                </span>
                <div>
                  <b>188 records are unchanged period to period</b>
                  <p>Accepted identifiers and history stay in place.</p>
                </div>
                <span className="pill green">MATCHED</span>
              </article>
            </div>
          </TabsContent>
          <TabsContent value="summary">
            <div className="receipt-summary">
              <p>
                <b>9</b> Dell E5420 workstations
              </p>
              <p>
                <b>8</b> Dell Latitude 7430 laptops
              </p>
              <p>
                <b>12</b> AN/PYQ-10 computer systems
              </p>
              <p>
                <b>12</b> Nett Warrior systems
              </p>
              <p>
                <b>4</b> AN/PRC-163 radio sets
              </p>
            </div>
          </TabsContent>
        </Tabs>
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
