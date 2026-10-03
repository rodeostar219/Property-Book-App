import Link from "next/link";
import { FileScan } from "lucide-react";
import { CompanionBanner } from "@/components/ledger/companion-banner";
import { ImportHub } from "@/components/ledger/import-hub";
import { getActor } from "@/lib/ledger/identity";
import { visibleSectionLetters } from "@/lib/oda/access";
import { loadDa2062InShell } from "@/lib/oda/da2062-shell";
import type { Da2062DestinationKind, SectionLetter } from "@/lib/oda/types";
import { SECTION_LETTERS } from "@/lib/oda/types";

export const dynamic = "force-dynamic";

// GET must stay under Workers CPU/memory limits: no full catalog, PDF parse, or OCR.

function isSectionLetter(value: string | undefined): value is SectionLetter {
  return Boolean(value && (SECTION_LETTERS as string[]).includes(value));
}

export default async function Da2062InPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; dest?: string }>;
}) {
  const actor = await getActor();
  const workspace = await loadDa2062InShell(actor);
  const query = await searchParams;
  const requested = query.section?.toUpperCase();
  const defaultSection = isSectionLetter(requested)
    ? requested
    : actor.sectionLetter ?? "E";
  const defaultKind: Da2062DestinationKind =
    query.dest === "oda_hr" && (actor.scope === "oda" || actor.role === "pm")
      ? "oda_hr"
      : "section_shr";

  return (
    <>
      <CompanionBanner persistence={workspace.persistence} />
      <ImportHub
        actor={actor}
        persistence={workspace.persistence}
        defaultKind={defaultKind}
        defaultSection={defaultKind === "oda_hr" ? null : defaultSection}
        nowIso={new Date().toISOString()}
        sections={visibleSectionLetters(actor)}
      />
      <section className="panel month-compare">
        <div className="panel-head">
          <div>
            <h2>2062 in history</h2>
            <p>Versioned custody-in events. Source PDF stays attached. Prior imports stay queryable.</p>
          </div>
        </div>
        <div className="month-grid">
          {workspace.da2062Imports.length === 0 ? (
            <p className="table-empty">No confirmed DA Form 2062 in events for this identity.</p>
          ) : (
            workspace.da2062Imports.map((row) => (
              <article key={row.id}>
                <div className="month-title">
                  <span>
                    <FileScan />
                  </span>
                  <div>
                    <h3>{row.filename}</h3>
                    <p>
                      {row.importedBy} · {row.importedAt.slice(0, 10)} · {row.parsePath}
                      {row.destinationSection ? ` · section ${row.destinationSection}` : " · ODA HR"}
                    </p>
                  </div>
                  <span className="pill green">Committed</span>
                </div>
                <strong>{row.lineCount}</strong>
                <small>Lines on this 2062 in</small>
                <div className="delta">
                  <span>{row.discrepancyCount} discrepancies</span>
                  <span>{row.hasPdf ? "PDF attached" : "no PDF"}</span>
                </div>
                <Link className="snapshot-link" href={`/receipts/2062-in/history/${row.id}`}>
                  Open history
                </Link>
              </article>
            ))
          )}
        </div>
      </section>
    </>
  );
}
