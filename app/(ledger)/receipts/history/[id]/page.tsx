import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanionBanner } from "@/components/ledger/companion-banner";
import { PageHeader } from "@/components/ledger/page-header";
import { formatSerial, INJECT_FEED_LABEL } from "@/lib/ledger/copy";
import { getActor } from "@/lib/ledger/identity";
import { loadInjectDetail } from "@/lib/oda/workspace";

export const dynamic = "force-dynamic";

const TONE: Record<string, string> = {
  added: "green",
  removed: "red",
  changed: "amber",
  unchanged: "blue",
};

export default async function InjectHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const injectId = Number(id);
  if (!Number.isFinite(injectId)) notFound();
  const actor = await getActor();
  const detail = await loadInjectDetail(actor, injectId);
  if (!detail?.inject) notFound();

  const { inject, lines, persistence } = detail;

  return (
    <>
      <CompanionBanner persistence={persistence} />
      <PageHeader
        title={inject.label}
        description={`${INJECT_FEED_LABEL} · electronic SHR snapshot. This is not Accept theater.`}
        meta={`${inject.injectedBy} · ${inject.injectedAt}${inject.priorInjectId ? ` · prior #${inject.priorInjectId}` : " · no prior"}`}
      />
      <section className="panel">
        <div className="analysis-metrics">
          <div>
            <strong>{inject.addedCount}</strong>
            <span>Added</span>
          </div>
          <div>
            <strong>{inject.removedCount}</strong>
            <span>Removed</span>
          </div>
          <div>
            <strong>{inject.changedCount}</strong>
            <span>Changed</span>
          </div>
          <div>
            <strong>{inject.unchangedCount}</strong>
            <span>Unchanged</span>
          </div>
        </div>
        {inject.notes ? <p className="inject-hint">{inject.notes}</p> : null}
        {inject.priorInjectId ? (
          <p className="inject-hint">
            Prior snapshot stays queryable:{" "}
            <Link href={`/receipts/history/${inject.priorInjectId}`}>
              open inject #{inject.priorInjectId}
            </Link>
          </p>
        ) : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Change</th>
                <th>NSN / nomenclature</th>
                <th>Serial</th>
                <th>Qty</th>
                <th>Prior</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={`${line.nsn}-${line.serial}-${index}`}>
                  <td>
                    <span className={`pill ${TONE[line.changeType] ?? "blue"}`}>
                      {line.changeType}
                    </span>
                  </td>
                  <td>
                    <code>{line.nsn ?? "not recorded"}</code>
                    <b>{line.nomenclature}</b>
                  </td>
                  <td>
                    <strong>{formatSerial(line.serial)}</strong>
                  </td>
                  <td>{line.quantity}</td>
                  <td>
                    {line.changeType === "changed"
                      ? `was qty ${line.priorQuantity ?? "n/a"} · ${line.priorNomenclature ?? ""}`
                      : "not a change"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="slice-stub">
        <Link href="/receipts">Back to hand receipts</Link>
      </p>
    </>
  );
}
