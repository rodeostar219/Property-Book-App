import { env } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  accountabilityLines,
  componentFacts,
  custodyInEvents,
  da2062ImportLines,
  da2062Imports,
  odaSections,
  odaUnits,
  packingFacts,
  pictureBookEntries,
  shrInjectLines,
  shrInjects,
  sourceDiscrepancies,
  trackerFacts,
} from "@/db/schema";
import {
  ACCOUNTABILITY_LINES,
  BASELINE_INJECT_AT,
  BASELINE_INJECT_LABEL,
  PACKING_LINES,
  PEOPLE,
  SEED_CONFLICTS,
  TRACKER_LINES,
  electronicShrForSection,
  lineByKey,
  personById,
} from "./catalog";
import { detectSourceConflicts, type SourceFact } from "./discrepancy";
import { identityKey } from "./identity-key";
import { diffElectronicShr, injectCounts } from "./inject";
import { ODA } from "./org";
import { stencilDataUri } from "./picture-book";
import { ODA_SCHEMA_SQL } from "./schema-sql";
import {
  destinationLabel,
  enrichDa2062Lines,
  planDa2062Confirm,
  previewDa2062Conflicts,
  type AcceptedSignedForLine,
  type Da2062InDraft,
} from "./da2062";
import {
  INJECT_LABEL,
  SECTION_LETTERS,
  SECTION_META,
  type ElectronicShrLine,
  type LineDisposition,
  type SectionLetter,
} from "./types";

export type PersistenceMode = "d1" | "unavailable";

export type PictureBookRow = {
  lineKey: string;
  officialName: string;
  commonName: string;
  photoData: string | null;
  photoContentType: string | null;
  photoUpdatedAt: string | null;
  photoUpdatedBy: string | null;
};

export type InjectRecord = {
  id: number;
  sectionLetter: SectionLetter | null;
  label: string;
  injectedAt: string;
  injectedBy: string;
  addedCount: number;
  removedCount: number;
  changedCount: number;
  unchangedCount: number;
  priorInjectId: number | null;
  notes: string | null;
};

export type InjectLineRecord = {
  changeType: string;
  lineKey: string | null;
  lin: string | null;
  nsn: string | null;
  serial: string | null;
  nomenclature: string;
  quantity: number;
  priorNomenclature: string | null;
  priorQuantity: number | null;
  priorSerial: string | null;
  sectionLetter: string | null;
};

export type Da2062ImportRecord = {
  id: number;
  publicKey: string;
  parsePath: string;
  destinationKind: string;
  destinationSection: SectionLetter | null;
  issuer: string;
  gainingParty: string;
  gainingSection: SectionLetter | null;
  uic: string;
  filename: string;
  importedAt: string;
  importedBy: string;
  priorImportId: number | null;
  lineCount: number;
  discrepancyCount: number;
  notes: string | null;
  hasPdf: boolean;
};

export type Da2062ImportLineRecord = {
  lin: string | null;
  nsn: string | null;
  serial: string | null;
  nomenclature: string;
  quantity: number;
  officialName: string | null;
  actualName: string | null;
  photoData: string | null;
  sectionLetter: string | null;
  lineKey: string | null;
  confidence: string;
  disposition: LineDisposition;
};

export type CustodyInRecord = {
  nsn: string | null;
  serial: string | null;
  nomenclature: string;
  quantity: number;
  destinationKind: string;
  destinationSection: string | null;
  gainingParty: string;
  issuer: string;
  occurredAt: string;
  recordedBy: string;
  factLayer: string;
};

export type DiscrepancyRecord = {
  publicKey: string;
  identityKey: string;
  nsn: string | null;
  serial: string | null;
  itemKey: string | null;
  sectionLetter: SectionLetter | null;
  sourceA: string;
  sourceB: string;
  factA: string;
  factB: string;
  issue: string;
  action: string;
  severity: string;
  status: string;
  createdAt: string;
  createdBy: string;
};

function d1(): D1Database | null {
  try {
    return env.DB ?? null;
  } catch {
    return null;
  }
}

export function persistenceAvailable(): PersistenceMode {
  return d1() ? "d1" : "unavailable";
}

export async function ensureOdaStore(): Promise<PersistenceMode> {
  const binding = d1();
  if (!binding) return "unavailable";
  try {
    const statements = ODA_SCHEMA_SQL.split(";").map((part) => part.trim()).filter(Boolean);
    for (const statement of statements) {
      await binding.prepare(statement).run();
    }
    try {
      await binding
        .prepare(
          "ALTER TABLE da2062_import_lines ADD COLUMN disposition text DEFAULT 'accept' NOT NULL",
        )
        .run();
    } catch {
      // Column already exists on stores created after Slice 1 confirm UX.
    }
    const db = getDb();
    const existing = await db.select().from(odaUnits).limit(1);
    if (existing.length === 0) {
      await seedOdaStore();
    }
    return "d1";
  } catch (error) {
    console.error("ODA D1 bootstrap failed", error);
    return "unavailable";
  }
}

async function seedOdaStore() {
  const db = getDb();
  const [unit] = await db
    .insert(odaUnits)
    .values({
      uic: ODA.uic,
      name: ODA.name,
      groupName: ODA.group,
      installation: ODA.installation,
      documentNumber: ODA.document,
      phrhName: ODA.phrhName,
    })
    .returning();

  for (const letter of SECTION_LETTERS) {
    const meta = SECTION_META[letter];
    const holder = Object.values(PEOPLE).find((person) => person.sectionLetter === letter);
    await db.insert(odaSections).values({
      unitId: unit.id,
      letter,
      name: meta.name,
      mos: meta.mos,
      specialty: meta.specialty,
      shrHolderKey: holder?.id ?? null,
    });
  }

  for (const line of ACCOUNTABILITY_LINES) {
    await db.insert(accountabilityLines).values({
      key: line.key,
      unitId: unit.id,
      lin: line.lin,
      nsn: line.nsn,
      officialNomenclature: line.officialName,
      quantity: line.quantity,
      serialNumber: line.serial,
      accountabilityClass: line.accountabilityClass,
      networkClassification: line.networkClassification,
      location: line.location,
      status: line.status,
      sectionLetter: line.sectionLetter,
      shrHolderKey: line.shrHolderId,
    });
    for (const component of line.components) {
      await db.insert(componentFacts).values({
        lineKey: line.key,
        kind: component.kind,
        nomenclature: component.nomenclature,
        requiredQuantity: component.requiredQuantity,
        onHandQuantity: component.onHandQuantity,
        serialized: component.serialized,
      });
    }
    await db.insert(pictureBookEntries).values({
      accountabilityLineKey: line.key,
      officialName: line.officialName,
      commonName: line.commonName,
      photoData: stencilDataUri(line.commonName, line.officialName),
      photoContentType: "image/svg+xml",
      photoUpdatedAt: BASELINE_INJECT_AT,
      photoUpdatedBy: "seed",
    });
  }

  for (const row of TRACKER_LINES) {
    await db.insert(trackerFacts).values({
      key: row.key,
      nsn: row.nsn,
      serialNumber: row.serial,
      nomenclature: row.nomenclature,
      quantity: row.quantity,
      trackerName: row.trackerName,
      sectionLetter: row.sectionLetter,
    });
  }

  for (const row of PACKING_LINES) {
    await db.insert(packingFacts).values({
      key: row.key,
      nsn: row.nsn,
      serialNumber: row.serial,
      nomenclature: row.nomenclature,
      quantity: row.quantity,
      documentLabel: row.documentLabel,
      sectionLetter: row.sectionLetter,
    });
  }

  for (const letter of SECTION_LETTERS) {
    const current = electronicShrForSection(letter);
    const inserted: Array<{ id: number }> = await db
      .insert(shrInjects)
      .values({
        unitId: unit.id,
        sectionLetter: letter,
        label: `${BASELINE_INJECT_LABEL} · ${SECTION_META[letter].name}`,
        injectedAt: BASELINE_INJECT_AT,
        injectedBy: PEOPLE.ortiz.fullName,
        sourceKind: "electronic_shr",
        priorInjectId: null,
        addedCount: current.length,
        removedCount: 0,
        changedCount: 0,
        unchangedCount: 0,
        notes: "Seeded electronic Sub-hand receipt (SHR) snapshot. Prior versions stay queryable.",
      })
      .returning({ id: shrInjects.id });
    const injectId: number | undefined = inserted[0]?.id;
    if (!injectId) throw new Error("Failed to seed SHR inject.");
    for (const line of current) {
      await db.insert(shrInjectLines).values({
        injectId,
        changeType: "added",
        lineKey: line.key ?? null,
        lin: line.lin,
        nsn: line.nsn,
        serialNumber: line.serial,
        nomenclature: line.nomenclature,
        quantity: line.quantity,
        sectionLetter: letter,
      });
    }
  }

  for (const conflict of SEED_CONFLICTS) {
    await db.insert(sourceDiscrepancies).values({
      publicKey: `seed-${conflict.identityKey}-${conflict.sourceA}-${conflict.sourceB}`,
      unitId: unit.id,
      identityKey: conflict.identityKey,
      nsn: conflict.nsn,
      serialNumber: conflict.serial,
      lin: conflict.lin,
      sectionLetter: conflict.sectionLetter,
      sourceA: conflict.sourceA,
      sourceB: conflict.sourceB,
      factA: conflict.factA,
      factB: conflict.factB,
      issue: conflict.issue,
      action: conflict.action,
      severity: conflict.severity,
      status: "open",
      itemKey: ACCOUNTABILITY_LINES.find((line) => identityKey(line) === conflict.identityKey)?.key ?? null,
      createdAt: BASELINE_INJECT_AT,
      createdBy: "seed",
    });
  }
}

export async function listPictureBooks(): Promise<PictureBookRow[]> {
  if ((await ensureOdaStore()) !== "d1") return [];
  const db = getDb();
  const rows = await db.select().from(pictureBookEntries);
  return rows.map((row) => ({
    lineKey: row.accountabilityLineKey,
    officialName: row.officialName,
    commonName: row.commonName,
    photoData: row.photoData,
    photoContentType: row.photoContentType,
    photoUpdatedAt: row.photoUpdatedAt,
    photoUpdatedBy: row.photoUpdatedBy,
  }));
}

export async function writePictureBook(input: {
  lineKey: string;
  officialName: string;
  commonName: string;
  photoData: string | null;
  photoContentType: string | null;
  actorName: string;
}): Promise<PictureBookRow> {
  if ((await ensureOdaStore()) !== "d1") {
    throw new Error("D1 is unavailable. Picture book was not written.");
  }
  const catalog = lineByKey(input.lineKey);
  if (!catalog) throw new Error("Unknown hand-receipt line.");
  const db = getDb();
  const now = new Date().toISOString();
  const existing = await db
    .select()
    .from(pictureBookEntries)
    .where(eq(pictureBookEntries.accountabilityLineKey, input.lineKey))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(pictureBookEntries).values({
      accountabilityLineKey: input.lineKey,
      officialName: input.officialName,
      commonName: input.commonName,
      photoData: input.photoData,
      photoContentType: input.photoContentType,
      photoUpdatedAt: now,
      photoUpdatedBy: input.actorName,
    });
  } else {
    await db
      .update(pictureBookEntries)
      .set({
        officialName: input.officialName,
        commonName: input.commonName,
        photoData: input.photoData ?? existing[0].photoData,
        photoContentType: input.photoContentType ?? existing[0].photoContentType,
        photoUpdatedAt: now,
        photoUpdatedBy: input.actorName,
      })
      .where(eq(pictureBookEntries.accountabilityLineKey, input.lineKey));
  }

  const [row] = await db
    .select()
    .from(pictureBookEntries)
    .where(eq(pictureBookEntries.accountabilityLineKey, input.lineKey));

  return {
    lineKey: row.accountabilityLineKey,
    officialName: row.officialName,
    commonName: row.commonName,
    photoData: row.photoData,
    photoContentType: row.photoContentType,
    photoUpdatedAt: row.photoUpdatedAt,
    photoUpdatedBy: row.photoUpdatedBy,
  };
}

export async function readAccountabilitySnapshot(lineKey: string) {
  if ((await ensureOdaStore()) !== "d1") return lineByKey(lineKey) ?? null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(accountabilityLines)
    .where(eq(accountabilityLines.key, lineKey))
    .limit(1);
  return row ?? null;
}

export async function listInjects(): Promise<InjectRecord[]> {
  if ((await ensureOdaStore()) !== "d1") return [];
  const db = getDb();
  const rows = await db.select().from(shrInjects).orderBy(desc(shrInjects.id));
  return rows.map(toInjectRecord);
}

export async function getInject(id: number): Promise<{
  inject: InjectRecord;
  lines: InjectLineRecord[];
} | null> {
  if ((await ensureOdaStore()) !== "d1") return null;
  const db = getDb();
  const [inject] = await db.select().from(shrInjects).where(eq(shrInjects.id, id)).limit(1);
  if (!inject) return null;
  const lines = await db
    .select()
    .from(shrInjectLines)
    .where(eq(shrInjectLines.injectId, id));
  return {
    inject: toInjectRecord(inject),
    lines: lines.map((line) => ({
      changeType: line.changeType,
      lineKey: line.lineKey,
      lin: line.lin,
      nsn: line.nsn,
      serial: line.serialNumber,
      nomenclature: line.nomenclature,
      quantity: line.quantity,
      priorNomenclature: line.priorNomenclature,
      priorQuantity: line.priorQuantity,
      priorSerial: line.priorSerial,
      sectionLetter: line.sectionLetter,
    })),
  };
}

export async function latestInjectLines(section: SectionLetter): Promise<ElectronicShrLine[]> {
  if ((await ensureOdaStore()) !== "d1") return electronicShrForSection(section);
  const db = getDb();
  const [latest] = await db
    .select()
    .from(shrInjects)
    .where(eq(shrInjects.sectionLetter, section))
    .orderBy(desc(shrInjects.id))
    .limit(1);
  if (!latest) return electronicShrForSection(section);
  const lines = await db
    .select()
    .from(shrInjectLines)
    .where(eq(shrInjectLines.injectId, latest.id));
  return lines
    .filter((line) => line.changeType !== "removed")
    .map((line) => ({
      key: line.lineKey ?? undefined,
      lin: line.lin,
      nsn: line.nsn ?? "",
      serial: line.serialNumber,
      nomenclature: line.nomenclature,
      quantity: line.quantity,
      sectionLetter: (line.sectionLetter as SectionLetter) ?? section,
    }));
}

export async function writeInject(input: {
  sectionLetter: SectionLetter;
  incoming: ElectronicShrLine[];
  actorName: string;
  notes?: string;
}): Promise<{ injectId: number; discrepancyKeys: string[] }> {
  if ((await ensureOdaStore()) !== "d1") {
    throw new Error("D1 is unavailable. Inject changes was not written.");
  }
  const db = getDb();
  const [unit] = await db.select().from(odaUnits).limit(1);
  const current = await latestInjectLines(input.sectionLetter);
  const prior = await db
    .select()
    .from(shrInjects)
    .where(eq(shrInjects.sectionLetter, input.sectionLetter))
    .orderBy(desc(shrInjects.id))
    .limit(1);
  const diff = diffElectronicShr(current, input.incoming);
  const counts = injectCounts(diff);
  const now = new Date().toISOString();
  const [inject] = await db
    .insert(shrInjects)
    .values({
      unitId: unit.id,
      sectionLetter: input.sectionLetter,
      label: `${INJECT_LABEL} · ${SECTION_META[input.sectionLetter].name} · ${now.slice(0, 10)}`,
      injectedAt: now,
      injectedBy: input.actorName,
      sourceKind: "electronic_shr",
      priorInjectId: prior[0]?.id ?? null,
      addedCount: counts.addedCount,
      removedCount: counts.removedCount,
      changedCount: counts.changedCount,
      unchangedCount: counts.unchangedCount,
      notes:
        input.notes ??
        "Electronic Sub-hand receipt (SHR) inject. Not Accept theater. Prior snapshots remain queryable.",
    })
    .returning();

  for (const line of diff.lines) {
    await db.insert(shrInjectLines).values({
      injectId: inject.id,
      changeType: line.changeType,
      lineKey: line.key ?? null,
      lin: line.lin,
      nsn: line.nsn,
      serialNumber: line.serial,
      nomenclature: line.nomenclature,
      quantity: line.quantity,
      priorNomenclature: line.priorNomenclature ?? null,
      priorQuantity: line.priorQuantity ?? null,
      priorSerial: line.priorSerial ?? null,
      sectionLetter: line.sectionLetter,
    });
  }

  const discrepancyKeys = await openConflictsFromInject(unit.id, input.sectionLetter, input.incoming, input.actorName);
  return { injectId: inject.id, discrepancyKeys };
}

async function openConflictsFromInject(
  unitId: number,
  section: SectionLetter,
  incoming: ElectronicShrLine[],
  actorName: string,
): Promise<string[]> {
  const facts: SourceFact[] = [];
  for (const line of ACCOUNTABILITY_LINES.filter((row) => row.sectionLetter === section)) {
    facts.push({
      source: "hand_receipt",
      nsn: line.nsn,
      serial: line.serial,
      lin: line.lin,
      nomenclature: line.officialName,
      quantity: line.quantity,
      sectionLetter: section,
      present: true,
    });
  }
  for (const line of incoming) {
    facts.push({
      source: "sub_hand_receipt",
      nsn: line.nsn,
      serial: line.serial,
      lin: line.lin,
      nomenclature: line.nomenclature,
      quantity: line.quantity,
      sectionLetter: section,
      present: true,
    });
  }
  for (const row of TRACKER_LINES.filter((line) => !line.sectionLetter || line.sectionLetter === section)) {
    facts.push({
      source: "tracker",
      nsn: row.nsn,
      serial: row.serial,
      lin: null,
      nomenclature: row.nomenclature,
      quantity: row.quantity,
      sectionLetter: row.sectionLetter,
      present: true,
    });
  }
  for (const row of PACKING_LINES.filter((line) => line.sectionLetter === section)) {
    facts.push({
      source: "packing_1750",
      nsn: row.nsn,
      serial: row.serial,
      lin: null,
      nomenclature: row.nomenclature,
      quantity: row.quantity,
      sectionLetter: row.sectionLetter,
      present: true,
    });
  }

  const conflicts = detectSourceConflicts(facts);
  const db = getDb();
  const keys: string[] = [];
  const now = new Date().toISOString();
  for (const conflict of conflicts) {
    const publicKey = `inject-${conflict.identityKey}-${conflict.sourceA}-${conflict.sourceB}-${now}`;
    await db.insert(sourceDiscrepancies).values({
      publicKey,
      unitId,
      identityKey: conflict.identityKey,
      nsn: conflict.nsn,
      serialNumber: conflict.serial,
      lin: conflict.lin,
      sectionLetter: conflict.sectionLetter,
      sourceA: conflict.sourceA,
      sourceB: conflict.sourceB,
      factA: conflict.factA,
      factB: conflict.factB,
      issue: conflict.issue,
      action: conflict.action,
      severity: conflict.severity,
      status: "open",
      itemKey:
        ACCOUNTABILITY_LINES.find((line) => identityKey(line) === conflict.identityKey)?.key ??
        incoming.find((line) => identityKey(line) === conflict.identityKey)?.key ??
        null,
      createdAt: now,
      createdBy: actorName,
    });
    keys.push(publicKey);
  }
  return keys;
}

export async function listDiscrepancies(): Promise<DiscrepancyRecord[]> {
  if ((await ensureOdaStore()) !== "d1") {
    return SEED_CONFLICTS.map((conflict) => ({
      publicKey: `seed-${conflict.identityKey}-${conflict.sourceA}-${conflict.sourceB}`,
      identityKey: conflict.identityKey,
      nsn: conflict.nsn,
      serial: conflict.serial,
      itemKey: ACCOUNTABILITY_LINES.find((line) => identityKey(line) === conflict.identityKey)?.key ?? null,
      sectionLetter: conflict.sectionLetter,
      sourceA: conflict.sourceA,
      sourceB: conflict.sourceB,
      factA: conflict.factA,
      factB: conflict.factB,
      issue: conflict.issue,
      action: conflict.action,
      severity: conflict.severity,
      status: "open",
      createdAt: BASELINE_INJECT_AT,
      createdBy: "seed",
    }));
  }
  const db = getDb();
  const rows = await db.select().from(sourceDiscrepancies).orderBy(desc(sourceDiscrepancies.id));
  return rows.map((row) => ({
    publicKey: row.publicKey,
    identityKey: row.identityKey,
    nsn: row.nsn,
    serial: row.serialNumber,
    itemKey: row.itemKey,
    sectionLetter: (row.sectionLetter as SectionLetter | null) ?? null,
    sourceA: row.sourceA,
    sourceB: row.sourceB,
    factA: row.factA,
    factB: row.factB,
    issue: row.issue,
    action: row.action,
    severity: row.severity,
    status: row.status,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  }));
}

export async function listDa2062Imports(): Promise<Da2062ImportRecord[]> {
  if ((await ensureOdaStore()) !== "d1") return [];
  const db = getDb();
  const rows = await db.select().from(da2062Imports).orderBy(desc(da2062Imports.id));
  return rows.map(toDa2062ImportRecord);
}

export async function listAcceptedDa2062Lines(): Promise<AcceptedSignedForLine[]> {
  if ((await ensureOdaStore()) !== "d1") return [];
  const db = getDb();
  const rows = await db
    .select({
      importId: da2062Imports.id,
      destinationKind: da2062Imports.destinationKind,
      destinationSection: da2062Imports.destinationSection,
      gainingParty: da2062Imports.gainingParty,
      lin: da2062ImportLines.lin,
      nsn: da2062ImportLines.nsn,
      serial: da2062ImportLines.serialNumber,
      nomenclature: da2062ImportLines.nomenclature,
      officialName: da2062ImportLines.officialName,
      actualName: da2062ImportLines.actualName,
      photoData: da2062ImportLines.photoData,
      quantity: da2062ImportLines.quantity,
    })
    .from(da2062ImportLines)
    .innerJoin(da2062Imports, eq(da2062ImportLines.importId, da2062Imports.id))
    .where(eq(da2062ImportLines.disposition, "accept"));
  return rows
    .filter((row) => Boolean(row.nsn))
    .map((row) => ({
      importId: row.importId,
      nsn: row.nsn ?? "",
      serial: row.serial,
      lin: row.lin,
      nomenclature: row.nomenclature,
      officialName: row.officialName,
      actualName: row.actualName,
      photoData: row.photoData,
      quantity: row.quantity,
      destinationKind: row.destinationKind === "oda_hr" ? "oda_hr" : "section_shr",
      destinationSection: (row.destinationSection as SectionLetter | null) ?? null,
      gainingParty: row.gainingParty,
    }));
}

export async function getDa2062Import(id: number): Promise<{
  record: Da2062ImportRecord;
  lines: Da2062ImportLineRecord[];
  events: CustodyInRecord[];
  sourcePdfData: string | null;
  sourcePdfContentType: string | null;
} | null> {
  if ((await ensureOdaStore()) !== "d1") return null;
  const db = getDb();
  const [row] = await db.select().from(da2062Imports).where(eq(da2062Imports.id, id)).limit(1);
  if (!row) return null;
  const lines = await db.select().from(da2062ImportLines).where(eq(da2062ImportLines.importId, id));
  const events = await db.select().from(custodyInEvents).where(eq(custodyInEvents.importId, id));
  return {
    record: toDa2062ImportRecord(row),
    lines: lines.map((line) => ({
      lin: line.lin,
      nsn: line.nsn,
      serial: line.serialNumber,
      nomenclature: line.nomenclature,
      quantity: line.quantity,
      officialName: line.officialName,
      actualName: line.actualName,
      photoData: line.photoData,
      sectionLetter: line.sectionLetter,
      lineKey: line.lineKey,
      confidence: line.confidence,
      disposition: (line.disposition as LineDisposition | null) ?? "accept",
    })),
    events: events.map((event) => ({
      nsn: event.nsn,
      serial: event.serialNumber,
      nomenclature: event.nomenclature,
      quantity: event.quantity,
      destinationKind: event.destinationKind,
      destinationSection: event.destinationSection,
      gainingParty: event.gainingParty,
      issuer: event.issuer,
      occurredAt: event.occurredAt,
      recordedBy: event.recordedBy,
      factLayer: event.factLayer,
    })),
    sourcePdfData: row.sourcePdfData,
    sourcePdfContentType: row.sourcePdfContentType,
  };
}

export async function writeDa2062In(input: {
  draft: Da2062InDraft;
  dispositions: LineDisposition[];
  actorName: string;
}): Promise<{
  importId: number;
  discrepancyKeys: string[];
  acceptedCount: number;
  flaggedCount: number;
  skippedCount: number;
}> {
  if ((await ensureOdaStore()) !== "d1") {
    throw new Error("D1 is unavailable. DA Form 2062 in was not written.");
  }
  const conflicts = previewDa2062Conflicts(input.draft);
  const plan = planDa2062Confirm({
    lines: input.draft.lines,
    dispositions: input.dispositions,
    conflicts,
    sectionLetter: input.draft.destinationSection,
  });
  if (!plan.willWrite) {
    throw new Error("Cancel / all skipped. No rows written.");
  }

  const db = getDb();
  const [unit] = await db.select().from(odaUnits).limit(1);
  const now = new Date().toISOString();
  const prior = await db
    .select()
    .from(da2062Imports)
    .where(
      input.draft.destinationKind === "oda_hr"
        ? eq(da2062Imports.destinationKind, "oda_hr")
        : eq(da2062Imports.destinationSection, input.draft.destinationSection ?? ""),
    )
    .orderBy(desc(da2062Imports.id))
    .limit(1);
  const pictures = await listPictureBooks();
  const enriched = enrichDa2062Lines(input.draft.lines, pictures);
  const discrepancies = [...plan.conflictDiscrepancies, ...plan.flaggedDiscrepancies];
  const publicKey = `da2062-in-${input.draft.destinationKind}-${input.draft.destinationSection ?? "oda"}-${now}`;
  const [record] = await db
    .insert(da2062Imports)
    .values({
      unitId: unit.id,
      publicKey,
      direction: "in",
      status: "committed",
      parsePath: input.draft.parsePath,
      destinationKind: input.draft.destinationKind,
      destinationSection: input.draft.destinationSection,
      issuer: input.draft.issuer,
      gainingParty: input.draft.gainingParty,
      gainingSection: input.draft.gainingSection,
      uic: input.draft.uic,
      filename: input.draft.filename,
      sourcePdfData: input.draft.sourcePdfBase64
        ? `data:${input.draft.sourcePdfContentType};base64,${input.draft.sourcePdfBase64}`
        : null,
      sourcePdfContentType: input.draft.sourcePdfContentType,
      importedAt: now,
      importedBy: input.actorName,
      priorImportId: prior[0]?.id ?? null,
      lineCount: plan.accepted.length,
      discrepancyCount: discrepancies.length,
      notes: `Added ${plan.accepted.length} line${plan.accepted.length === 1 ? "" : "s"} to signed-for on ${destinationLabel(input.draft.destinationKind, input.draft.destinationSection)}. History written. Not Accept theater. Does not invent APSR accountability. ${plan.skipped.length} skipped · ${plan.flagged.length} flagged.`,
    })
    .returning();

  for (const [index, line] of enriched.entries()) {
    const disposition = input.dispositions[index] ?? "accept";
    await db.insert(da2062ImportLines).values({
      importId: record.id,
      lin: line.lin,
      nsn: line.nsn,
      serialNumber: line.serial,
      nomenclature: line.nomenclature,
      quantity: line.quantity,
      officialName: line.officialName,
      actualName: line.actualName,
      photoData: line.photoData,
      sectionLetter: input.draft.destinationSection,
      lineKey: line.knownLineKey,
      confidence: line.confidence,
      disposition,
    });
    if (disposition === "accept") {
      await db.insert(custodyInEvents).values({
        importId: record.id,
        lineKey: line.knownLineKey,
        nsn: line.nsn,
        serialNumber: line.serial,
        nomenclature: line.nomenclature,
        quantity: line.quantity,
        destinationKind: input.draft.destinationKind,
        destinationSection: input.draft.destinationSection,
        gainingParty: input.draft.gainingParty,
        issuer: input.draft.issuer,
        occurredAt: now,
        recordedBy: input.actorName,
        factLayer: "responsibility",
      });
    }
  }

  const discrepancyKeys: string[] = [];
  for (const conflict of discrepancies) {
    const key = `da2062-${conflict.identityKey}-${conflict.sourceA}-${conflict.sourceB}-${now}`;
    await db.insert(sourceDiscrepancies).values({
      publicKey: key,
      unitId: unit.id,
      identityKey: conflict.identityKey,
      nsn: conflict.nsn,
      serialNumber: conflict.serial,
      lin: conflict.lin,
      sectionLetter: conflict.sectionLetter ?? input.draft.destinationSection,
      sourceA: conflict.sourceA,
      sourceB: conflict.sourceB,
      factA: conflict.factA,
      factB: conflict.factB,
      issue: conflict.issue,
      action: conflict.action,
      severity: conflict.severity,
      status: "open",
      itemKey:
        ACCOUNTABILITY_LINES.find((line) => identityKey(line) === conflict.identityKey)?.key ??
        enriched.find((line) => identityKey(line) === conflict.identityKey)?.knownLineKey ??
        null,
      createdAt: now,
      createdBy: input.actorName,
    });
    discrepancyKeys.push(key);
  }

  const written = await getDa2062Import(record.id);
  if (
    !written ||
    written.events.length !== plan.accepted.length ||
    written.record.lineCount !== plan.accepted.length
  ) {
    throw new Error("D1 write did not assert history. No success is claimed.");
  }

  return {
    importId: record.id,
    discrepancyKeys,
    acceptedCount: plan.accepted.length,
    flaggedCount: plan.flagged.length,
    skippedCount: plan.skipped.length,
  };
}

function toDa2062ImportRecord(row: typeof da2062Imports.$inferSelect): Da2062ImportRecord {
  return {
    id: row.id,
    publicKey: row.publicKey,
    parsePath: row.parsePath,
    destinationKind: row.destinationKind,
    destinationSection: (row.destinationSection as SectionLetter | null) ?? null,
    issuer: row.issuer,
    gainingParty: row.gainingParty,
    gainingSection: (row.gainingSection as SectionLetter | null) ?? null,
    uic: row.uic,
    filename: row.filename,
    importedAt: row.importedAt,
    importedBy: row.importedBy,
    priorImportId: row.priorImportId,
    lineCount: row.lineCount,
    discrepancyCount: row.discrepancyCount,
    notes: row.notes,
    hasPdf: Boolean(row.sourcePdfData),
  };
}

export { personById };

function toInjectRecord(row: typeof shrInjects.$inferSelect): InjectRecord {
  return {
    id: row.id,
    sectionLetter: (row.sectionLetter as SectionLetter | null) ?? null,
    label: row.label,
    injectedAt: row.injectedAt,
    injectedBy: row.injectedBy,
    addedCount: row.addedCount,
    removedCount: row.removedCount,
    changedCount: row.changedCount,
    unchangedCount: row.unchangedCount,
    priorInjectId: row.priorInjectId,
    notes: row.notes,
  };
}
