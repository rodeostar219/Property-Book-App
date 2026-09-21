import type { PropertyItem } from "@/lib/ledger/types";
import { ACCOUNTABILITY_LINES, TRACKER_LINES } from "./catalog";
import { detectSourceConflicts, type SourceFact } from "./discrepancy";
import { identityKey } from "./identity-key";
import { ODA, sectionShrLabel } from "./org";
import { PEOPLE } from "./people";
import { asPhotoSrc, stencilDataUri } from "./picture-book";
import {
  SECTION_LETTERS,
  SECTION_META,
  type Da2062DestinationKind,
  type Da2062ParsePath,
  type SectionLetter,
  type SourceConflict,
} from "./types";
import { extractPdfPayload } from "./da2062-pdf";
import type { IsolationActor } from "./access";
import { canViewSection, isOdaScope } from "./access";

export {
  ADD_TO_SIGNED_FOR_LABEL,
  CONFIRM_BEFORE_WRITE,
  DA2062_IN_DOES_NOT_INVENT_APSR,
  DA2062_MAX_PDF_BYTES,
  DA2062_SUCCESS_IS_NOT_ACCEPT,
  defaultDispositionForLine,
  destinationLabel,
  gainingPartyLabel,
  planDa2062Confirm,
} from "./da2062-confirm";

export type Da2062RejectReason = "wrong_section" | "cross_uic" | "section_isolation" | "unreadable";

export type Da2062InLine = {
  lin: string | null;
  nsn: string;
  serial: string | null;
  nomenclature: string;
  quantity: number;
  confidence: "high" | "degraded";
};

export type Da2062InDraft = {
  parsePath: Da2062ParsePath;
  filename: string;
  uic: string;
  issuer: string;
  gainingParty: string;
  gainingSection: SectionLetter | null;
  destinationKind: Da2062DestinationKind;
  destinationSection: SectionLetter | null;
  lines: Da2062InLine[];
  sourcePdfBase64: string;
  sourcePdfContentType: string;
  warnings: string[];
};

export type Da2062EnrichedLine = Da2062InLine & {
  officialName: string;
  actualName: string | null;
  photoData: string | null;
  knownLineKey: string | null;
};

export type Da2062ValidationOk = { ok: true };
export type Da2062ValidationFail = { ok: false; reason: Da2062RejectReason; message: string };
export type Da2062Validation = Da2062ValidationOk | Da2062ValidationFail;

const SECTION_ALIASES: Record<string, SectionLetter> = {
  B: "B",
  BRAVO: "B",
  C: "C",
  CHARLIE: "C",
  D: "D",
  DELTA: "D",
  E: "E",
  ECHO: "E",
  F: "F",
  FOX: "F",
};

export function blankSerialToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (
    upper === "—" ||
    upper === "-" ||
    upper === "–" ||
    upper === "N/A" ||
    upper === "NA" ||
    upper === "NONE" ||
    upper === "NULL" ||
    upper === "NOT" ||
    upper === "NOT RECORDED" ||
    upper === "SERIAL NOT RECORDED" ||
    upper === "BLANK"
  ) {
    return null;
  }
  return trimmed;
}

function normalizeKeyValue(raw: string): string {
  return raw.replace(/\r/g, "").trim();
}

function pickField(
  fields: Record<string, string>,
  text: string,
  names: string[],
): string | null {
  for (const name of names) {
    const direct = fields[name] ?? fields[name.toUpperCase()] ?? fields[name.toLowerCase()];
    if (direct?.trim()) return normalizeKeyValue(direct);
    const match = text.match(new RegExp(`(?:^|\\n)${name}\\s*[=:]\\s*(.+)`, "im"));
    if (match?.[1]) return normalizeKeyValue(match[1]);
    const spaced = text.match(new RegExp(`(?:^|\\n)${name}\\s+(.+)`, "im"));
    if (spaced?.[1]) return normalizeKeyValue(spaced[1]);
  }
  return null;
}

function parseSectionToken(value: string | null | undefined): SectionLetter | null {
  if (!value) return null;
  const token = value
    .toUpperCase()
    .replace(/[^A-Z]/g, " ")
    .split(/\s+/)
    .find((part) => SECTION_ALIASES[part]);
  if (token) return SECTION_ALIASES[token];
  const letter = value.trim().toUpperCase();
  return (SECTION_LETTERS as string[]).includes(letter) ? (letter as SectionLetter) : null;
}

function parseStructuredLines(text: string, confidence: Da2062InLine["confidence"]): Da2062InLine[] {
  const lines: Da2062InLine[] = [];
  for (const raw of text.split(/\n/)) {
    if (!raw.includes("LINE|") && !raw.startsWith("LINE|")) continue;
    const row = raw.includes("LINE|") ? raw.slice(raw.indexOf("LINE|")) : raw;
    const parts = Object.fromEntries(
      row
        .split("|")
        .slice(1)
        .map((part) => {
          const idx = part.indexOf("=");
          return idx === -1 ? [part, ""] : [part.slice(0, idx), part.slice(idx + 1)];
        }),
    );
    const nsn = (parts.NSN ?? "").replace(/\s+/g, "");
    if (!nsn) continue;
    lines.push({
      lin: blankSerialToNull(parts.LIN ?? null),
      nsn,
      serial: blankSerialToNull(parts.SERIAL ?? null),
      nomenclature: (parts.NOMENCLATURE ?? "not recorded").trim(),
      quantity: Math.max(1, Number(parts.QTY ?? "1") || 1),
      confidence,
    });
  }
  return lines;
}

function parseOcrLines(text: string): Da2062InLine[] {
  const lines: Da2062InLine[] = [];
  const pattern =
    /NSN\s+([A-Z0-9-]+)\s+(?:SN|SERIAL)\s+(NOT\s+RECORDED|[A-Z0-9-]+)\s+(.+?)\s+QTY\s+(\d+)(?:\s+LIN\s+([A-Z0-9]+))?/gi;
  for (const match of text.matchAll(pattern)) {
    lines.push({
      nsn: (match[1] ?? "").replace(/-/g, ""),
      serial: blankSerialToNull(match[2]),
      nomenclature: (match[3] ?? "not recorded").trim(),
      quantity: Math.max(1, Number(match[4] ?? "1") || 1),
      lin: blankSerialToNull(match[5] ?? null),
      confidence: "degraded",
    });
  }
  return lines;
}

function classifyPath(fields: Record<string, string>, text: string): Da2062ParsePath {
  const marker = (fields.PARSE_PATH ?? fields.parse_path ?? "").toLowerCase();
  if (marker === "electronic" || /PARSE_PATH\s*[=:]\s*electronic/i.test(text)) return "electronic";
  if (marker === "ocr" || /PARSE_PATH\s*[=:]\s*ocr/i.test(text)) return "ocr";
  if (Object.keys(fields).length >= 3) return "electronic";
  return "ocr";
}

export function parseDa2062Pdf(
  bytes: Uint8Array,
  filename: string,
  destination: { kind: Da2062DestinationKind; section: SectionLetter | null },
):
  | { ok: true; draft: Omit<Da2062InDraft, "sourcePdfBase64" | "sourcePdfContentType"> }
  | Da2062ValidationFail {
  const { text, fields } = extractPdfPayload(bytes);
  const haystack = `${text}\n${Object.entries(fields)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n")}`;
  if (!/DA\s*(FORM)?\s*2062/i.test(haystack) && !fields.UIC && !/UIC\s*[=:]/i.test(haystack)) {
    return {
      ok: false,
      reason: "unreadable",
      message: "PDF is not a readable DA Form 2062. Nothing was written.",
    };
  }

  const parsePath = classifyPath(fields, haystack);
  const uic = (pickField(fields, haystack, ["UIC"]) ?? "")
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase();
  const issuer =
    pickField(fields, haystack, ["ISSUER", "FROM"]) ??
    pickField(fields, haystack, ["ISSUING ORGANIZATION"]) ??
    "";
  const gainingParty =
    pickField(fields, haystack, ["GAINING_PARTY", "TO", "GAINING PARTY"]) ?? "";
  const gainingSection = parseSectionToken(
    pickField(fields, haystack, ["GAINING_SECTION", "SECTION", "GAINING SECTION"]) ??
      gainingParty,
  );

  const structured = parseStructuredLines(haystack, parsePath === "electronic" ? "high" : "degraded");
  const lines = structured.length > 0 ? structured : parseOcrLines(haystack);
  const warnings: string[] = [];
  if (parsePath === "ocr") {
    warnings.push("Scanned / OCR path — fields may be degraded. Confirm every line before write.");
  }
  if (lines.some((line) => line.serial == null)) {
    warnings.push("One or more serials are not recorded (shown as not recorded, never as —).");
  }

  return {
    ok: true,
    draft: {
      parsePath,
      filename,
      uic,
      issuer: issuer || "not recorded",
      gainingParty: gainingParty || "not recorded",
      gainingSection,
      destinationKind: destination.kind,
      destinationSection: destination.section,
      lines,
      warnings,
    },
  };
}

export function validateDa2062InDestination(input: {
  actor: IsolationActor;
  destinationKind: Da2062DestinationKind;
  destinationSection: SectionLetter | null;
  draft: Pick<Da2062InDraft, "uic" | "gainingSection" | "lines">;
}): Da2062Validation {
  const expectedUic = ODA.uic.toUpperCase();
  if (!input.draft.uic || input.draft.uic.toUpperCase() !== expectedUic) {
    return {
      ok: false,
      reason: "cross_uic",
      message: `Cross-UIC reject: PDF UIC ${input.draft.uic || "not recorded"} is not ${ODA.uic}. No rows written.`,
    };
  }

  if (input.destinationKind === "oda_hr") {
    if (!isOdaScope(input.actor)) {
      return {
        ok: false,
        reason: "section_isolation",
        message: "Section isolation: only ODA / PM can target the ODA hand receipt. No rows written.",
      };
    }
    if (input.draft.gainingSection) {
      return {
        ok: false,
        reason: "wrong_section",
        message: `Wrong destination: PDF gaining section ${input.draft.gainingSection} cannot post to the ODA hand receipt. No rows written.`,
      };
    }
    if (input.draft.lines.length === 0) {
      return {
        ok: false,
        reason: "unreadable",
        message: "DA Form 2062 has no readable lines. No rows written.",
      };
    }
    return { ok: true };
  }

  const section = input.destinationSection;
  if (!section) {
    return {
      ok: false,
      reason: "wrong_section",
      message: "Section Sub-hand receipt (SHR) destination is required. No rows written.",
    };
  }
  if (!canViewSection(input.actor, section)) {
    return {
      ok: false,
      reason: "section_isolation",
      message: `Section isolation: this identity cannot import a 2062 onto ${SECTION_META[section].name}. No rows written.`,
    };
  }
  if (input.draft.gainingSection && input.draft.gainingSection !== section) {
    return {
      ok: false,
      reason: "wrong_section",
      message: `Wrong section: PDF gaining party is ${SECTION_META[input.draft.gainingSection].name}, destination is ${SECTION_META[section].name}. No rows written.`,
    };
  }
  if (input.draft.lines.length === 0) {
    return {
      ok: false,
      reason: "unreadable",
      message: "DA Form 2062 has no readable lines. No rows written.",
    };
  }
  return { ok: true };
}

export type AcceptedSignedForLine = {
  importId: number;
  nsn: string;
  serial: string | null;
  lin: string | null;
  nomenclature: string;
  officialName: string | null;
  actualName: string | null;
  photoData: string | null;
  quantity: number;
  destinationKind: Da2062DestinationKind;
  destinationSection: SectionLetter | null;
  gainingParty: string;
};

export function signedForAdditionItem(line: AcceptedSignedForLine): PropertyItem {
  const holder = line.destinationSection
    ? Object.values(PEOPLE).find((person) => person.sectionLetter === line.destinationSection)
    : PEOPLE.ortiz;
  return {
    id: `da2062-${line.importId}-${identityKey(line)}`,
    nsn: line.nsn,
    name: line.officialName ?? line.nomenclature,
    officialName: line.officialName ?? line.nomenclature,
    commonName: line.actualName,
    serial: line.serial,
    quantityRequired: line.quantity,
    quantityOnHand: line.quantity,
    accountabilityClass: "Accountable",
    networkClassification: "Unclassified",
    assignedToId: holder?.id ?? null,
    assignedToName: holder?.fullName ?? line.gainingParty,
    location: line.destinationSection
      ? `${SECTION_META[line.destinationSection].name} section`
      : `${ODA.name} hand receipt`,
    status: "signed_for",
    sourceReceipt: `DA Form 2062 in #${line.importId} · companion signed-for (not APSR)`,
    phrhId: PEOPLE.reyes.id,
    phrhName: ODA.phrhName,
    shrHolderId: holder?.id,
    shrHolderName: holder?.fullName ?? line.gainingParty,
    shrDocument: line.destinationSection
      ? sectionShrLabel(line.destinationSection)
      : `${ODA.name} hand receipt`,
    sectionLetter: line.destinationSection ?? undefined,
    components: [],
    photoData: line.photoData,
    detailHref: `/receipts/2062-in/history/${line.importId}`,
  };
}

export function signedForMatchKey(input: {
  nsn?: string | null;
  serial?: string | null;
}): string {
  const serial = (input.serial ?? "").trim().toUpperCase();
  if (serial) return `sn:${serial}`;
  const nsn = (input.nsn ?? "").replace(/\s+/g, "").toUpperCase();
  return nsn ? `nsn:${nsn}` : "unknown";
}

export function mergeSignedForAdditions(
  catalogItems: PropertyItem[],
  additions: AcceptedSignedForLine[],
): PropertyItem[] {
  const existing = new Set(catalogItems.map((item) => signedForMatchKey(item)));
  const extra = additions
    .filter((line) => !existing.has(signedForMatchKey(line)))
    .map(signedForAdditionItem);
  return [...catalogItems, ...extra];
}

export function enrichDa2062Lines(
  lines: Da2062InLine[],
  pictures: Array<{
    lineKey: string;
    officialName: string;
    commonName: string;
    photoData: string | null;
    photoContentType?: string | null;
  }> = [],
): Da2062EnrichedLine[] {
  return lines.map((line) => {
    const catalog = ACCOUNTABILITY_LINES.find(
      (row) => identityKey(row) === identityKey(line) || (line.nsn && row.nsn === line.nsn && !line.serial && !row.serial),
    );
    const picture = catalog
      ? pictures.find((row) => row.lineKey === catalog.key)
      : undefined;
    const official = picture?.officialName ?? catalog?.officialName ?? line.nomenclature;
    const actual = picture?.commonName ?? catalog?.commonName ?? null;
    return {
      ...line,
      officialName: official,
      actualName: actual,
      photoData: asPhotoSrc(
        picture?.photoData ??
          (catalog ? stencilDataUri(catalog.commonName, catalog.officialName) : null),
        picture?.photoContentType,
      ),
      knownLineKey: catalog?.key ?? null,
    };
  });
}

export function previewDa2062Conflicts(
  draft: Pick<Da2062InDraft, "lines" | "destinationKind" | "destinationSection">,
): SourceConflict[] {
  const section = draft.destinationSection;
  const facts: SourceFact[] = [];

  const hrLines =
    draft.destinationKind === "oda_hr"
      ? ACCOUNTABILITY_LINES
      : ACCOUNTABILITY_LINES.filter((row) => row.sectionLetter === section);
  for (const line of hrLines) {
    facts.push({
      source: "hand_receipt",
      nsn: line.nsn,
      serial: line.serial,
      lin: line.lin,
      nomenclature: line.officialName,
      quantity: line.quantity,
      sectionLetter: line.sectionLetter,
      present: true,
    });
  }

  const hrKeys = new Set(hrLines.map((line) => identityKey(line)));
  for (const line of draft.lines) {
    facts.push({
      source: "da_2062",
      nsn: line.nsn,
      serial: line.serial,
      lin: line.lin,
      nomenclature: line.nomenclature,
      quantity: line.quantity,
      sectionLetter: section ?? null,
      present: true,
    });
    if (!hrKeys.has(identityKey(line))) {
      facts.push({
        source: "hand_receipt",
        nsn: line.nsn,
        serial: line.serial,
        lin: line.lin,
        nomenclature: line.nomenclature,
        quantity: 0,
        sectionLetter: section ?? null,
        present: false,
      });
    }
  }

  for (const row of TRACKER_LINES.filter((line) =>
    draft.destinationKind === "oda_hr"
      ? true
      : !line.sectionLetter || line.sectionLetter === section,
  )) {
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

  for (const line of hrLines) {
    facts.push({
      source: "picture_book",
      nsn: line.nsn,
      serial: line.serial,
      lin: line.lin,
      nomenclature: line.officialName,
      quantity: line.quantity,
      sectionLetter: line.sectionLetter,
      present: true,
    });
  }

  return detectSourceConflicts(facts, { includePictureBook: true });
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
