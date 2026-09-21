import Link from "next/link";
import { FileScan } from "lucide-react";
import { CompanionBanner } from "@/components/ledger/companion-banner";
import { CurrentBadge } from "@/components/ledger/app-shell";
import { Da2062OutPanel } from "@/components/ledger/da2062-out-panel";
import { PageHeader } from "@/components/ledger/page-header";
import { DA_2062_OUT_NOTE, DA_2062_OUT_TITLE } from "@/lib/ledger/copy";
import { getActor } from "@/lib/ledger/identity";
import type { SectionLetter } from "@/lib/oda/types";
import { SECTION_LETTERS } from "@/lib/oda/types";
import { outDestinationLabelText } from "@/lib/oda/da2062-out";
import { loadWorkspace } from "@/lib/oda/workspace";

export const dynamic = "force-dynamic";

function isSectionLetter(value: string | undefined): value is SectionLetter {
  return Boolean(value && (SECTION_LETTERS as string[]).includes(value));
}

export default async function Da2062OutPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const actor = await getActor();
  const workspace = await loadWorkspace(actor);
  const query = await searchParams;
  const requested = query.section?.toUpperCase();
  const defaultSection = isSectionLetter(requested)
    ? requested
    : actor.sectionLetter ?? "E";
  const history = workspace.da2062Imports.filter((row) => row.direction === "out");

  return (
    <>
      <CompanionBanner persistence={workspace.persistence} />
      <PageHeader
        title={DA_2062_OUT_TITLE}
        description={DA_2062_OUT_NOTE}
        meta={`${actor.fullName} · ${actor.mos ?? "18E"} · JBLM · issuer ${defaultSection} SHR`}
        actions={<CurrentBadge>Confirm before write</CurrentBadge>}
      />
      <Da2062OutPanel
        actor={actor}
        persistence={workspace.persistence}
        defaultSection={defaultSection}
      />
      <section className="panel month-compare">
        <div className="panel-head">
          <div>
            <h2>2062 out history</h2>
            <p>
              Versioned temporary hand receipts. Return date stays on the row. Source PDF stays
              attached. Prior imports stay queryable.
            </p>
          </div>
        </div>
        <div className="month-grid">
          {history.length === 0 ? (
            <p className="table-empty">No confirmed DA Form 2062 out events for this identity.</p>
          ) : (
            history.map((row) => (
              <article key={row.id}>
                <div className="month-title">
                  <span>
                    <FileScan />
                  </span>
                  <div>
                    <h3>{row.filename}</h3>
                    <p>
                      {row.importedBy} · {row.importedAt.slice(0, 10)} · {row.parsePath}
                      {row.issuerSection ? ` · issuer ${row.issuerSection}` : ""}
                    </p>
                  </div>
                  <span className="pill amber">Signed out</span>
                </div>
                <strong>{row.lineCount}</strong>
                <small>Lines on this temporary hand receipt</small>
                <div className="delta">
                  <span>
                    {row.outDestinationKind && row.outDestinationLabel
                      ? outDestinationLabelText({
                          kind: row.outDestinationKind as "person" | "section" | "organization",
                          label: row.outDestinationLabel,
                          section: row.gainingSection,
                        })
                      : "destination not recorded"}
                  </span>
                  <span>Return {row.returnDate ?? "not recorded"}</span>
                  <span>{row.discrepancyCount} discrepancies</span>
                </div>
                <Link className="snapshot-link" href={`/receipts/2062-out/history/${row.id}`}>
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
