import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanionBanner } from "@/components/ledger/companion-banner";
import { InjectPanel } from "@/components/ledger/inject-panel";
import { PageHeader } from "@/components/ledger/page-header";
import { Button } from "@/components/ui/button";
import { PhrhChrome } from "@/components/ledger/phrh-note";
import { PropertySearch } from "@/components/ledger/property-search";
import { SectionSwitcher } from "@/components/ledger/section-switcher";
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
  searchParams,
}: {
  params: Promise<{ letter: string }>;
  searchParams: Promise<{ from?: string; history?: string }>;
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
  const query = await searchParams;
  const historyId = query.history ? Number(query.history) : null;
  const addedFrom2062 = query.from === "2062" && Number.isFinite(historyId);
  const items = workspace.items.filter((item) => item.sectionLetter === letter);
  const card = workspace.sections.find((section) => section.letter === letter);

  return (
    <>
      <CompanionBanner persistence={workspace.persistence} />
      {addedFrom2062 ? (
        <aside className="companion-banner">
          <p>
            Added to this section Sub-hand receipt (SHR) signed-for list. History written. Not Accept
            theater.
          </p>
          <small>
            <Link href={`/receipts/2062-in/history/${historyId}`}>Open 2062 in history #{historyId}</Link>
          </small>
        </aside>
      ) : null}
      <PageHeader
        title={sectionTitle(letter)}
        description={`Section Sub-hand receipt (SHR) under the ${ODA.name} hand receipt. PHRH remains ${ODA.phrhName}.`}
        meta={`${items.length} visible line${items.length === 1 ? "" : "s"} · holder ${card?.holderName ?? "unassigned"}`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/receipts/2062-in?section=${letter}`}>Import DA 2062 in</Link>
          </Button>
        }
      />
      <SectionSwitcher sections={workspace.sections} active={letter} />
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
      <PropertySearch
        items={items}
        empty="No accountability lines on this section Sub-hand receipt (SHR)."
      />
    </>
  );
}
