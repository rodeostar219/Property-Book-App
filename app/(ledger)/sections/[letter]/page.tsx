import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanionBanner } from "@/components/ledger/companion-banner";
import { InjectPanel } from "@/components/ledger/inject-panel";
import { PageHeader } from "@/components/ledger/page-header";
import { PhrhChrome } from "@/components/ledger/phrh-note";
import { PropertyTable } from "@/components/ledger/property-table";
import { getActor } from "@/lib/ledger/identity";
import { canViewSection } from "@/lib/oda/access";
import { SECTION_LETTERS, type SectionLetter } from "@/lib/oda/types";
import { loadWorkspace, sectionTitle } from "@/lib/oda/workspace";
import { ODA } from "@/lib/oda/org";

export const dynamic = "force-dynamic";

function isSectionLetter(value: string): value is SectionLetter {
  return (SECTION_LETTERS as string[]).includes(value);
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ letter: string }>;
}) {
  const { letter: raw } = await params;
  const letter = raw.toUpperCase();
  if (!isSectionLetter(letter)) notFound();

  const actor = await getActor();
  if (!canViewSection(actor, letter)) {
    return (
      <section className="empty">
        <h2>Section isolation</h2>
        <p>
          This identity cannot see or edit the {letter} Sub-hand receipt (SHR). Switch to ODA / PM
          or the matching section holder.
        </p>
        <Link href="/sections">Back to sections</Link>
      </section>
    );
  }

  const workspace = await loadWorkspace(actor);
  const items = workspace.items.filter((item) => item.sectionLetter === letter);
  const card = workspace.sections.find((section) => section.letter === letter);

  return (
    <>
      <CompanionBanner persistence={workspace.persistence} />
      <PageHeader
        title={sectionTitle(letter)}
        description={`Section Sub-hand receipt (SHR) under the ${ODA.name} hand receipt. PHRH remains ${ODA.phrhName}.`}
        meta={`${items.length} visible line${items.length === 1 ? "" : "s"} · holder ${card?.holderName ?? "unassigned"}`}
      />
      <PhrhChrome
        source={{
          phrhName: ODA.phrhName,
          shrHolderName: card?.holderName,
          shrDocument: `${card?.title ?? letter} Sub-hand receipt (SHR)`,
        }}
      />
      <InjectPanel
        sectionLetter={letter}
        persistence={workspace.persistence}
        canEdit={canViewSection(actor, letter)}
      />
      <section className="panel">
        <PropertyTable
          items={items}
          empty="No accountability lines on this section Sub-hand receipt (SHR)."
        />
      </section>
    </>
  );
}
