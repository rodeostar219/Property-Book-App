import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanionBanner } from "@/components/ledger/companion-banner";
import { PageHeader } from "@/components/ledger/page-header";
import { formatSerial } from "@/lib/ledger/copy";
import { getActor } from "@/lib/ledger/identity";
import { destinationLabel, gainingPartyLabel } from "@/lib/oda/da2062-confirm";
import type { Da2062DestinationKind } from "@/lib/oda/types";
import { loadDa2062Detail } from "@/lib/oda/workspace";

export const dynamic = "force-dynamic";

export default async function Da2062InHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const importId = Number(id);
  if (!Number.isFinite(importId)) notFound();
  const actor = await getActor();
  const detail = await loadDa2062Detail(actor, importId);
  if (!detail) notFound();
  const { record, lines, events, persistence, sourcePdfData } = detail;

  return (
    <>
      <CompanionBanner persistence={persistence} />
      <PageHeader
        title={record.filename}
        description="Added to signed-for plus history. Not Accept theater. Companion to GCSS-Army / APSR — does not invent APSR accountability."
        meta={`${record.importedBy} · ${record.importedAt}${record.priorImportId ? ` · prior #${record.priorImportId}` : " · no prior"}`}
      />
      <section className="panel">
        <dl className="receipt-meta da2062-meta">
          <div>
            <small>Issuer</small>
            <strong>{record.issuer}</strong>
          </div>
          <div>
            <small>Gaining party</small>
            <strong>
              {gainingPartyLabel({
                destinationKind: record.destinationKind as Da2062DestinationKind,
                destinationSection: record.destinationSection,
                gainingParty: record.gainingParty,
                gainingSection: record.gainingSection,
              })}
            </strong>
          </div>
          <div>
            <small>Destination</small>
            <strong>
              {destinationLabel(
                record.destinationKind as Da2062DestinationKind,
                record.destinationSection,
              )}
            </strong>
          </div>
          <div>
            <small>Parse path</small>
            <strong>{record.parsePath === "electronic" ? "Electronic extract" : "Scanned / OCR"}</strong>
          </div>
        </dl>
        {record.notes ? <p className="inject-hint">{record.notes}</p> : null}
        {record.priorImportId ? (
          <p className="inject-hint">
            Prior 2062 in stays queryable:{" "}
            <Link href={`/receipts/2062-in/history/${record.priorImportId}`}>
              open #{record.priorImportId}
            </Link>
          </p>
        ) : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Photo</th>
                <th>Official / actual</th>
                <th>NSN</th>
                <th>Serial</th>
                <th>Qty</th>
                <th>Line action</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={`${line.nsn}-${line.serial}-${index}`}>
                  <td>
                    {line.photoData ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="da2062-thumb" src={line.photoData} alt="" />
                    ) : (
                      <span className="photo-empty da2062-thumb-empty">none</span>
                    )}
                  </td>
                  <td>
                    <b>{line.officialName ?? line.nomenclature}</b>
                    <small>Actual: {line.actualName ?? "not recorded"}</small>
                  </td>
                  <td>
                    <code>{line.nsn ?? "not recorded"}</code>
                  </td>
                  <td>
                    <strong>{formatSerial(line.serial)}</strong>
                  </td>
                  <td>{line.quantity}</td>
                  <td>
                    <span className={`pill ${line.disposition === "accept" ? "green" : line.disposition === "flag" ? "amber" : "blue"}`}>
                      {line.disposition === "accept"
                        ? "Added to signed-for"
                        : line.disposition === "flag"
                          ? "Flagged"
                          : "Skipped"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="section-label">Signed-for additions</h3>
        <div className="change-list">
          {events.map((event, index) => (
            <article key={`${event.nsn}-${event.serial}-${index}`}>
              <div>
                <b>{event.nomenclature}</b>
                <p>
                  Signed in by {event.gainingParty} · serial {formatSerial(event.serial)} · qty{" "}
                  {event.quantity} · {event.factLayer}
                </p>
              </div>
              <time>{event.occurredAt.slice(0, 10)}</time>
            </article>
          ))}
        </div>
        {sourcePdfData ? (
          <p className="inject-hint">
            <a href={sourcePdfData} download={record.filename}>
              Download attached source PDF
            </a>
          </p>
        ) : null}
      </section>
      <p className="slice-stub">
        {record.destinationSection ? (
          <>
            <Link href={`/sections/${record.destinationSection}`}>
              Open section Sub-hand receipt (SHR)
            </Link>
            {" · "}
          </>
        ) : null}
        <Link href="/receipts/2062-in">Back to 2062 in</Link>
        {" · "}
        <Link href="/exceptions">Open discrepancies</Link>
      </p>
    </>
  );
}
