import {
  ACCOUNTABILITY_LINES,
  BASELINE_INJECT_AT,
  BASELINE_INJECT_LABEL,
  CATALOG_ITEMS,
  PACKING_LINES,
  PEOPLE,
  TRACKER_LINES,
  electronicShrForSection,
  lineByKey,
  personById,
  toPropertyItem,
} from "./catalog";
import { canViewSection, visibleSectionLetters } from "./access";
import { ODA, sectionShrLabel, sectionTitle } from "./org";
import { asPhotoSrc, stencilDataUri } from "./picture-book";
import { mergeSignedForAdditions, signedForMatchKey } from "./da2062";
import { applySignedOutState } from "./da2062-out";
import {
  ensureOdaStore,
  getDa2062Import,
  getInject,
  listAcceptedDa2062Lines,
  listDa2062Imports,
  listDiscrepancies,
  listInjects,
  listPictureBooks,
  listSignedOutLines,
  type Da2062ImportLineRecord,
  type Da2062ImportRecord,
  type CustodyInRecord,
  type CustodyOutRecord,
  type DiscrepancyRecord,
  type InjectLineRecord,
  type InjectRecord,
  type PersistenceMode,
  type PictureBookRow,
} from "./store";
import { SECTION_LETTERS, SECTION_META, type SectionLetter } from "./types";
import type { Actor, LedgerException, PropertyItem } from "@/lib/ledger/types";

export type SectionCard = {
  letter: SectionLetter;
  name: string;
  title: string;
  mos: string;
  specialty: string;
  holderName: string;
  lineCount: number;
  visible: boolean;
};

export type LayeredLine = PropertyItem & {
  layers: {
    accountability: string;
    responsibility: string;
    components: string;
    packing: string;
    custody: string;
    visualId: string;
  };
  packingNote: string | null;
  trackerNote: string | null;
};

export type Workspace = {
  persistence: PersistenceMode;
  sections: SectionCard[];
  items: LayeredLine[];
  exceptions: LedgerException[];
  injects: InjectRecord[];
  pictures: PictureBookRow[];
  da2062Imports: Da2062ImportRecord[];
};

function applyPicture(item: PropertyItem, pictures: PictureBookRow[]): LayeredLine {
  const picture = pictures.find((row) => row.lineKey === item.id);
  const packing = PACKING_LINES.find(
    (row) => row.serial === item.serial || row.nsn === item.nsn,
  );
  const tracker = TRACKER_LINES.find((row) => row.serial && row.serial === item.serial);
  return {
    ...item,
    officialName: picture?.officialName ?? item.officialName,
    commonName: picture?.commonName ?? item.commonName,
    photoData: asPhotoSrc(
      picture?.photoData ?? item.photoData ?? stencilDataUri(item.commonName ?? item.name, item.name),
      picture?.photoContentType,
    ),
    layers: {
      accountability: `Hand receipt ${ODA.document} · ${item.officialName ?? item.name}`,
      responsibility: item.shrDocument
        ? `${item.shrDocument} · ${item.shrHolderName}`
        : "No Sub-hand receipt (SHR)",
      components:
        item.components.length === 0
          ? "No COEI / BII / AAL on this line"
          : item.components.map((line) => `${line.kind} ${line.nomenclature}`).join(" · "),
      packing: packing
        ? `${packing.documentLabel} · qty ${packing.quantity}`
        : "No DD Form 1750 fact on this line",
      custody:
        item.status === "signed_out"
          ? `Signed out (temporary hand receipt) to ${item.signedOutTo ?? item.location}${item.returnDate ? ` · return ${item.returnDate}` : ""}`
          : item.assignedToName
            ? `Signed for by ${item.assignedToName} · ${item.location}`
            : `On hand · ${item.location}`,
      visualId: `Official: ${picture?.officialName ?? item.officialName ?? item.name} · Actual: ${picture?.commonName ?? item.commonName ?? "not recorded"}`,
    },
    packingNote: packing ? `${packing.documentLabel} qty ${packing.quantity}` : null,
    trackerNote: tracker ? `${tracker.trackerName} qty ${tracker.quantity}` : null,
  };
}

function toException(row: DiscrepancyRecord, actor: Actor): LedgerException | null {
  if (row.sectionLetter && !canViewSection(actor, row.sectionLetter)) return null;
  const holder = row.sectionLetter
    ? Object.values(PEOPLE).find((person) => person.sectionLetter === row.sectionLetter)
    : undefined;
  return {
    id: row.publicKey,
    itemId: row.itemKey,
    serial: row.serial,
    item: ACCOUNTABILITY_LINES.find((line) => line.key === row.itemKey)?.officialName ?? row.issue,
    issue: row.issue,
    action: row.action,
    severity: row.severity as LedgerException["severity"],
    assignedToId: holder?.id ?? null,
    sectionLetter: row.sectionLetter,
    sourceA: row.sourceA,
    sourceB: row.sourceB,
    factA: row.factA,
    factB: row.factB,
  };
}

export async function loadWorkspace(actor: Actor): Promise<Workspace> {
  const persistence = await ensureOdaStore();
  const pictures = persistence === "d1" ? await listPictureBooks() : [];
  const letters = visibleSectionLetters(actor);
  const catalogItems = CATALOG_ITEMS.filter((item) =>
    item.sectionLetter ? letters.includes(item.sectionLetter) : isOdaVisible(actor),
  ).map((item) => applyPicture(item, pictures));

  const acceptedAdditions =
    persistence === "d1"
      ? (await listAcceptedDa2062Lines()).filter((line) =>
          line.destinationKind === "oda_hr"
            ? isOdaVisible(actor)
            : Boolean(line.destinationSection && canViewSection(actor, line.destinationSection)),
        )
      : [];
  const signedOut =
    persistence === "d1"
      ? (await listSignedOutLines()).filter((line) =>
          line.issuerSection ? canViewSection(actor, line.issuerSection) : isOdaVisible(actor),
        )
      : [];
  const items = applySignedOutState(
    mergeSignedForAdditions(catalogItems, acceptedAdditions),
    signedOut,
  ).map((item) => applyPicture(item, pictures));

  const discrepancies = await listDiscrepancies();
  const exceptions = discrepancies
    .map((row) => toException(row, actor))
    .filter((row): row is LedgerException => Boolean(row));

  const injects =
    persistence === "d1"
      ? (await listInjects()).filter((row) =>
          row.sectionLetter ? canViewSection(actor, row.sectionLetter) : isOdaVisible(actor),
        )
      : fixtureInjects(actor);

  const da2062Imports =
    persistence === "d1"
      ? (await listDa2062Imports()).filter((row) => canSeeDa2062Import(actor, row))
      : [];

  const sections = SECTION_LETTERS.map((letter) => {
    const holder = Object.values(PEOPLE).find((person) => person.sectionLetter === letter);
    return {
      letter,
      name: SECTION_META[letter].name,
      title: sectionTitle(letter),
      mos: SECTION_META[letter].mos,
      specialty: SECTION_META[letter].specialty,
      holderName: holder?.fullName ?? "Unassigned",
      lineCount:
        ACCOUNTABILITY_LINES.filter((line) => line.sectionLetter === letter).length +
        acceptedAdditions.filter(
          (line) =>
            line.destinationSection === letter &&
            !ACCOUNTABILITY_LINES.some((row) => signedForMatchKey(row) === signedForMatchKey(line)),
        ).length,
      visible: canViewSection(actor, letter),
    };
  });

  return { persistence, sections, items, exceptions, injects, pictures, da2062Imports };
}

function canSeeDa2062Import(actor: Actor, row: Da2062ImportRecord): boolean {
  if (row.direction === "out") {
    if (row.issuerSection) return canViewSection(actor, row.issuerSection);
    return isOdaVisible(actor);
  }
  if (row.destinationKind === "oda_hr") return isOdaVisible(actor);
  if (row.destinationSection) return canViewSection(actor, row.destinationSection);
  return isOdaVisible(actor);
}

function isOdaVisible(actor: Actor): boolean {
  return actor.scope === "oda" || actor.role === "pm";
}

function fixtureInjects(actor: Actor): InjectRecord[] {
  return SECTION_LETTERS.filter((letter) => canViewSection(actor, letter)).map((letter, index) => ({
    id: index + 1,
    sectionLetter: letter,
    label: `${BASELINE_INJECT_LABEL} · ${SECTION_META[letter].name}`,
    injectedAt: BASELINE_INJECT_AT,
    injectedBy: PEOPLE.ortiz.fullName,
    addedCount: electronicShrForSection(letter).length,
    removedCount: 0,
    changedCount: 0,
    unchangedCount: 0,
    priorInjectId: index === 0 ? null : index,
    notes: "Fixture snapshot — D1 unavailable, inject writes disabled.",
  }));
}

export async function loadLine(actor: Actor, key: string): Promise<LayeredLine | null> {
  const workspace = await loadWorkspace(actor);
  return workspace.items.find((item) => item.id === key) ?? null;
}

export async function loadInjectDetail(actor: Actor, id: number) {
  const persistence = await ensureOdaStore();
  if (persistence !== "d1") {
    const letter = SECTION_LETTERS[id - 1];
    if (!letter || !canViewSection(actor, letter)) return null;
    const lines: InjectLineRecord[] = electronicShrForSection(letter).map((line) => ({
      changeType: "added",
      lineKey: line.key ?? null,
      lin: line.lin,
      nsn: line.nsn,
      serial: line.serial,
      nomenclature: line.nomenclature,
      quantity: line.quantity,
      priorNomenclature: null,
      priorQuantity: null,
      priorSerial: null,
      sectionLetter: letter,
    }));
    return {
      persistence,
      inject: fixtureInjects(actor).find((row) => row.id === id) ?? null,
      lines,
    };
  }
  const detail = await getInject(id);
  if (!detail) return null;
  if (detail.inject.sectionLetter && !canViewSection(actor, detail.inject.sectionLetter)) {
    return null;
  }
  return { persistence, ...detail };
}

export async function loadDa2062Detail(actor: Actor, id: number): Promise<{
  persistence: PersistenceMode;
  record: Da2062ImportRecord;
  lines: Da2062ImportLineRecord[];
  events: CustodyInRecord[];
  outEvents: CustodyOutRecord[];
  sourcePdfData: string | null;
  sourcePdfContentType: string | null;
} | null> {
  const persistence = await ensureOdaStore();
  if (persistence !== "d1") return null;
  const detail = await getDa2062Import(id);
  if (!detail) return null;
  if (!canSeeDa2062Import(actor, detail.record)) return null;
  return { persistence, ...detail };
}

export function catalogLineOrThrow(key: string) {
  const line = lineByKey(key);
  if (!line) throw new Error("Unknown hand-receipt line.");
  return line;
}

export { ODA, personById, sectionShrLabel, sectionTitle, toPropertyItem };
