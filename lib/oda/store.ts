import { env } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  accountabilityLines,
  componentFacts,
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
import { INJECT_LABEL, SECTION_LETTERS, SECTION_META, type ElectronicShrLine, type SectionLetter } from "./types";

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
