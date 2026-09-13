import Link from "next/link";
import { ArrowDownToLine, CalendarClock, Download, FileArchive, ArrowRightLeft, UploadCloud } from "lucide-react";
import { DisabledAction } from "@/components/ledger/disabled-action";
import { Metric } from "@/components/ledger/metric";
import { PageHeader } from "@/components/ledger/page-header";
import { DA_2062_SUBTITLE, DA_2062_TITLE, NOT_WIRED, RENEWAL_PLACEHOLDER_NOTE } from "@/lib/ledger/copy";
import { requirePm } from "@/lib/ledger/identity";
import { getLoans } from "@/lib/ledger/queries";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function LoansPage() {
  await requirePm();
  const rows = getLoans();
  const incoming = rows.filter((row) => row.direction === "Incoming").length;
  const outgoing = rows.filter((row) => row.direction === "Outgoing").length;
  const renewSoon = rows.filter((row) => row.status === "Renew soon");

  return (
    <>
      <PageHeader
        title={DA_2062_TITLE}
        description={`${DA_2062_SUBTITLE} for temporary property signed in or out.`}
        meta={RENEWAL_PLACEHOLDER_NOTE}
        actions={
          <div className="split-actions">
            <Button asChild variant="outline">
              <Link href="/receipts/2062-in">
                <ArrowDownToLine />
                Incoming 2062
              </Link>
            </Button>
            <DisabledAction
              label="Outgoing 2062"
              reason={NOT_WIRED.da2062Out}
              icon={<UploadCloud />}
            />
          </div>
        }
      />
      <div className="metrics loan-metrics">
        <Metric
          label="ACTIVE DOCUMENTS"
          value={String(rows.length)}
          note={`${incoming} incoming · ${outgoing} outgoing`}
          icon={FileArchive}
          tone="teal"
        />
        <Metric
          label="TEMPORARY ITEMS"
          value="31"
          note="Fixture register count"
          icon={ArrowRightLeft}
          tone="blue"
        />
        <Metric
          label="APPROACHING RENEWAL"
          value={String(renewSoon.length)}
          note="Uses the unit-configured placeholder"
          icon={CalendarClock}
          tone="red"
        />
      </div>
      <section className="panel">
        <div className="toolbar">
          <div className="loan-summary">
            <span>
              <b>Renewal:</b> {RENEWAL_PLACEHOLDER_NOTE}
            </span>
          </div>
          <DisabledAction
            label="2062 register"
            reason={NOT_WIRED.export}
            icon={<Download />}
            variant="outline"
            size="sm"
          />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Direction / document</th>
                <th>Item</th>
                <th>Serial number</th>
                <th>Other party</th>
                <th>Signed date</th>
                <th>Renewal due</th>
                <th>Time remaining</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((loan) => (
                <tr key={loan.id}>
                  <td>
                    <span className={`direction ${loan.direction.toLowerCase()}`}>
                      {loan.direction === "Incoming" ? (
                        <ArrowDownToLine />
                      ) : (
                        <UploadCloud />
                      )}
                    </span>
                    <b>{loan.document}</b>
                  </td>
                  <td>
                    <b>{loan.item}</b>
                  </td>
                  <td>
                    <strong>{loan.serial}</strong>
                  </td>
                  <td>{loan.party}</td>
                  <td>{loan.signed}</td>
                  <td>
                    <b>{loan.renewsOn}</b>
                  </td>
                  <td>{loan.daysRemaining} days</td>
                  <td>
                    <span className={`pill ${loan.status === "Active" ? "green" : "amber"}`}>
                      {loan.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
