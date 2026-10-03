import { CompanionBanner } from "@/components/ledger/companion-banner";
import { SectionWorkspace, type SectionLine } from "@/components/ledger/section-workspace";
import { getActor } from "@/lib/ledger/identity";
import { canViewSection } from "@/lib/oda/access";
import { injectPeriod } from "@/lib/oda/months";
import { baselinePieceTotal } from "@/lib/oda/baseline";
import { SECTION_LETTERS, type SectionLetter } from "@/lib/oda/types";
import { hasStoredPicture } from "@/lib/oda/picture-book";
import { loadWorkspace } from "@/lib/oda/workspace";

export const dynamic = "force-dynamic";

function isSectionLetter(value: string | undefined): value is SectionLetter {
  return Boolean(value && (SECTION_LETTERS as string[]).includes(value));
}

export default async function MyPropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; movement?: string }>;
}) {
  const actor = await getActor();
  const workspace = await loadWorkspace(actor);
  const query = await searchParams;
  const requested = query.section?.toUpperCase();
  const preferred = isSectionLetter(requested) ? requested : actor.sectionLetter ?? "E";
  const sectionLetter: SectionLetter = canViewSection(actor, preferred)
    ? preferred
    : actor.sectionLetter && canViewSection(actor, actor.sectionLetter)
      ? actor.sectionLetter
      : "E";
  const lines: SectionLine[] = workspace.items
    .filter((item) => item.sectionLetter === sectionLetter)
    .map((item) => ({
      id: item.id,
      lin: item.lin,
      nomenclature: item.officialName ?? item.name,
      actualName: item.commonName ?? null,
      nsn: item.nsn,
      serial: item.serial,
      location: item.location,
      status: item.status,
      quantity: item.quantityRequired,
      hasPictureBookPhoto: item.hasPictureBookPhoto,
      photoSrc: item.hasPictureBookPhoto && hasStoredPicture(item.photoData) ? item.photoData ?? null : null,
    }));
  const injects = workspace.injects
    .filter((row) => row.sectionLetter === sectionLetter)
    .map((row) => ({
      id: row.id,
      sectionLetter: row.sectionLetter,
      label: row.label,
      notes: row.notes,
      injectedAt: row.injectedAt,
    }));
  const now = new Date();
  const years = new Set<number>([now.getUTCFullYear(), now.getUTCFullYear() - 1]);
  for (const row of injects) {
    const period = injectPeriod(row);
    if (period) years.add(period.year);
  }

  return (
    <>
      <CompanionBanner persistence={workspace.persistence} />
      <SectionWorkspace
        sectionLetter={sectionLetter}
        lines={lines}
        injects={injects}
        baselinePieces={baselinePieceTotal(sectionLetter)}
        nowIso={now.toISOString()}
        years={[...years].sort((a, b) => a - b)}
        movement={query.movement ?? null}
      />
    </>
  );
}
