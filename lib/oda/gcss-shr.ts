import { blankSerialToNull } from "./da2062";
import { extractPdfPayload } from "./da2062-pdf";
import {
  MONTH_NAMES,
  encodeSerialCells,
  lineSerialCount,
  receiptSerialCount,
  validateMonthlyPeriod,
  type SerialCell,
  type ShrReceiptLine,
} from "./months";

/** Known totals for Ryan's 1 Sep 2026 ODA Sub-hand receipt. Not a fabricated extract. */
export const RYAN_SEPTEMBER_2026 = {
  uic: "WH1FB3PB",
  year: 2026,
  month: 9,
  day: 1,
  endItems: 36,
  ohQty: 105,
  filledSerials: 184,
} as const;

export type GcssEndItem = {
  lin: string | null;
  nsn: string | null;
  nomenclature: string;
  /** On-hand quantity. LABST on the GCSS form. Not a serial count. */
  ohQty: number;
  /** Null when this end item cannot tell SerNo from RegNo from LotNo. */
  serialCells: SerialCell[] | null;
};

export type GcssShrDraft = {
  uic: string;
  year: number;
  month: number;
  day: number;
  lines: GcssEndItem[];
};

export type ShrParsedCounts = {
  endItems: number;
  ohQty: number;
  /** Null when any end item does not identify SerNo and RegNo separately from LotNo. */
  filledSerials: number | null;
};

const MONTH_INDEX: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function monthNumber(token: string): number | null {
  return MONTH_INDEX[token.toLowerCase().replace(/\./g, "")] ?? null;
}

export function parseReceiptDate(text: string): { year: number; month: number; day: number } | null {
  const labeledNamed = text.match(
    /\b(?:receipt\s+date|date)\s*[:=]?\s*(\d{1,2})[\s\-\/.]+([A-Za-z]+)\.?[\s\-\/.]+(\d{4})\b/i,
  );
  const named = labeledNamed ?? text.match(/\b(\d{1,2})[\s\-\/.]+([A-Za-z]+)\.?[\s\-\/.]+(\d{4})\b/);
  if (named) {
    const month = monthNumber(named[2] ?? "");
    const day = Number(named[1]);
    const year = Number(named[3]);
    if (month && day >= 1 && day <= 31 && year >= 2000) return { year, month, day };
  }
  const labeledIso = text.match(/\b(?:receipt\s+date|date)\s*[:=]?\s*(20\d{2})-(\d{2})-(\d{2})\b/i);
  const iso = labeledIso ?? text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { year, month, day };
  }
  const us = text.match(/\b(?:receipt\s+date|date)\s*[:=]?\s*(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/i);
  if (us) {
    const month = Number(us[1]);
    const day = Number(us[2]);
    const year = Number(us[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { year, month, day };
  }
  return null;
}

export function parseUic(text: string): string | null {
  const labeled = text.match(/\bUIC\s*[:=]?\s*([A-Z0-9]{5,})\b/i);
  return labeled?.[1]?.toUpperCase() ?? null;
}

export function receiptDateLabel(draft: Pick<GcssShrDraft, "year" | "month" | "day">): string {
  return `${draft.day} ${MONTH_NAMES[draft.month - 1]} ${draft.year}`;
}

function isGridHeader(line: string): boolean {
  return /ser\s*-?\s*no/i.test(line) && /reg\s*-?\s*no/i.test(line) && /lot\s*-?\s*no/i.test(line);
}

function cleanLabelValue(value: string): string {
  return value.replace(/^[\s:=/|]+/, "").replace(/[\s:=/|]+$/, "").trim();
}

function betweenLabels(line: string, start: RegExp, end: RegExp | null): string {
  const startMatch = start.exec(line);
  if (!startMatch) return "";
  const from = startMatch.index + startMatch[0].length;
  const rest = line.slice(from);
  if (!end) return cleanLabelValue(rest);
  const endMatch = end.exec(rest);
  if (!endMatch) return cleanLabelValue(rest);
  return cleanLabelValue(rest.slice(0, endMatch.index));
}

function cellsFromParts(parts: [string, string, string]): SerialCell[] {
  return [
    { kind: "serNo", value: blankSerialToNull(parts[0]) },
    { kind: "regNo", value: blankSerialToNull(parts[1]) },
    { kind: "lotNo", value: blankSerialToNull(parts[2]) },
  ];
}

function parsePipeRow(line: string): SerialCell[] | "ambiguous" | null {
  if (!line.includes("|")) return null;
  const parts = line.split("|").map((part) => part.trim());
  if (parts.length !== 3) return "ambiguous";
  if (parts.every((part) => /^(ser\s*-?\s*no|reg\s*-?\s*no|lot\s*-?\s*no)$/i.test(part))) return null;
  return cellsFromParts([parts[0] ?? "", parts[1] ?? "", parts[2] ?? ""]);
}

/** A labeled data row such as `SerNo: SN1 RegNo: LotNo: LOT`. A bare header returns null. */
function parseLabeledRow(line: string): SerialCell[] | null {
  if (!isGridHeader(line) || line.includes("|")) return null;
  const ser = betweenLabels(line, /ser\s*-?\s*no/i, /reg\s*-?\s*no/i);
  const reg = betweenLabels(line, /reg\s*-?\s*no/i, /lot\s*-?\s*no/i);
  const lot = betweenLabels(line, /lot\s*-?\s*no/i, null);
  if (!ser && !reg && !lot) {
    if (/[:=]/.test(line)) return cellsFromParts(["", "", ""]);
    return null;
  }
  return cellsFromParts([ser, reg, lot]);
}

function parseTokenRow(line: string): SerialCell[] | "ambiguous" | null {
  if (line.includes("|") || isGridHeader(line)) return null;
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;
  if (tokens.length !== 3) return "ambiguous";
  return cellsFromParts([tokens[0] ?? "", tokens[1] ?? "", tokens[2] ?? ""]);
}

type FieldBits = {
  lin?: string | null;
  nsn?: string | null;
  nomenclature?: string | null;
  ohQty?: number;
};

function isDateOnlyLine(line: string): boolean {
  if (isGridHeader(line)) return false;
  return (
    /^\s*(?:receipt\s+)?date\b/i.test(line) ||
    /^\d{1,2}[\s\-\/.]+[A-Za-z]+\.?[\s\-\/.]+\d{4}\s*$/i.test(line) ||
    /^20\d{2}-\d{2}-\d{2}$/.test(line) ||
    /^\d{1,2}\/\d{1,2}\/20\d{2}$/.test(line)
  );
}

function readFields(line: string): FieldBits | null {
  const lin = line.match(/\bLIN\s*[:=]?\s*([A-Z0-9]+)/i);
  const nsn = line.match(/\bNSN\s*[:=]?\s*([0-9A-Z-]{4,})/i);
  const nom = line.match(
    /\b(?:NOMENCLATURE|DESCRIPTION)\s*[:=]?\s*(.+?)(?=\s+\b(?:LIN|NSN|LABST|UIC|DATE)\b|$)/i,
  );
  const labst = line.match(/\bLABST\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
  if (!lin && !nsn && !nom && !labst) return null;
  const bits: FieldBits = {};
  if (lin?.[1]) bits.lin = lin[1].toUpperCase();
  if (nsn?.[1]) bits.nsn = nsn[1].replace(/-/g, "").toUpperCase();
  if (nom?.[1]) bits.nomenclature = nom[1].trim();
  if (labst?.[1]) {
    const qty = Number(labst[1]);
    bits.ohQty = Number.isFinite(qty) && Number.isInteger(qty) ? qty : Number.NaN;
  }
  return bits;
}

type WorkingItem = {
  lin: string | null;
  nsn: string | null;
  nomenclature: string | null;
  ohQty: number | null;
  serialCells: SerialCell[];
  sawHeader: boolean;
  unclassified: boolean;
};

function blankItem(): WorkingItem {
  return {
    lin: null,
    nsn: null,
    nomenclature: null,
    ohQty: null,
    serialCells: [],
    sawHeader: false,
    unclassified: false,
  };
}

function flushItem(item: WorkingItem, lines: GcssEndItem[], errors: string[]): void {
  if (item.ohQty == null || Number.isNaN(item.ohQty)) {
    errors.push("An end item is missing OH Qty.");
    return;
  }
  if (!item.nomenclature) {
    errors.push("An end item is missing nomenclature.");
    return;
  }
  lines.push({
    lin: item.lin,
    nsn: item.nsn,
    nomenclature: item.nomenclature,
    ohQty: item.ohQty,
    serialCells: item.unclassified ? null : item.sawHeader ? item.serialCells : null,
  });
}

function applyFields(current: WorkingItem | null, bits: FieldBits): WorkingItem {
  const startsNext =
    current != null &&
    ((bits.lin != null && current.lin != null && bits.lin !== current.lin) ||
      (bits.ohQty != null &&
        current.ohQty != null &&
        !Number.isNaN(bits.ohQty) &&
        (bits.lin != null || bits.nomenclature != null)));
  const item = !current || startsNext ? blankItem() : current;
  if (bits.lin && !item.lin) item.lin = bits.lin;
  if (bits.nsn && !item.nsn) item.nsn = bits.nsn;
  if (bits.nomenclature && !item.nomenclature) item.nomenclature = bits.nomenclature;
  if (bits.ohQty != null && (item.ohQty == null || Number.isNaN(bits.ohQty))) item.ohQty = bits.ohQty;
  return item;
}

function appendCells(item: WorkingItem, cells: SerialCell[]): void {
  if (item.unclassified) return;
  item.sawHeader = true;
  item.serialCells = [...item.serialCells, ...cells];
}

export function parseGcssShrText(
  text: string,
): { ok: true; draft: GcssShrDraft } | { ok: false; message: string } {
  const uic = parseUic(text);
  if (!uic) {
    return { ok: false, message: "UIC was not found on this Sub-hand receipt. Nothing was saved." };
  }
  const date = parseReceiptDate(text);
  if (!date) {
    return { ok: false, message: "The Sub-hand receipt date was not found. Nothing was saved." };
  }

  const items: GcssEndItem[] = [];
  const errors: string[] = [];
  let current: WorkingItem | null = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/^\s*UIC\b/i.test(line) || isDateOnlyLine(line)) continue;
    if (/^GCSS/i.test(line) || /^sub[-\s]?hand receipt\b/i.test(line)) continue;

    if (isGridHeader(line)) {
      if (!current) {
        errors.push("A SerNo / RegNo / LotNo grid was found before an end item.");
        continue;
      }
      const labeled = parseLabeledRow(line);
      if (labeled && labeled.some((cell) => cell.value)) {
        appendCells(current, labeled);
        continue;
      }
      current.sawHeader = true;
      continue;
    }

    if (current?.sawHeader) {
      const piped = parsePipeRow(line);
      if (piped === "ambiguous") {
        current.unclassified = true;
        current.serialCells = [];
        continue;
      }
      if (piped) {
        appendCells(current, piped);
        continue;
      }
      const tokens = parseTokenRow(line);
      if (tokens === "ambiguous") {
        current.unclassified = true;
        current.serialCells = [];
        continue;
      }
      if (tokens) {
        appendCells(current, tokens);
        continue;
      }
    }

    const fields = readFields(line);
    if (fields) {
      const next = applyFields(current, fields);
      if (current && next !== current) flushItem(current, items, errors);
      current = next;
      continue;
    }

    if (current) {
      current.unclassified = true;
      current.serialCells = [];
    }
  }

  if (current) flushItem(current, items, errors);
  if (errors.length > 0) {
    return { ok: false, message: `${errors[0]} Nothing was saved.` };
  }
  if (items.length === 0) {
    return {
      ok: false,
      message: "No end-item lines were read from this Sub-hand receipt PDF. Nothing was saved.",
    };
  }

  return {
    ok: true,
    draft: { uic, year: date.year, month: date.month, day: date.day, lines: items },
  };
}

export function parseGcssShrPdf(
  bytes: Uint8Array,
): { ok: true; draft: GcssShrDraft } | { ok: false; message: string } {
  const extracted = extractPdfPayload(bytes);
  const fieldText = Object.entries(extracted.fields)
    .map(([key, value]) => `${key} ${value}`)
    .join("\n");
  return parseGcssShrText(`${fieldText}\n${extracted.text}`);
}

export function shrDraftCounts(draft: GcssShrDraft): ShrParsedCounts {
  const receiptLines: ShrReceiptLine[] = draft.lines.map((line) => ({
    injectId: 0,
    ohQty: line.ohQty,
    untypedSerial: null,
    serialCells: line.serialCells,
    changeType: "added",
  }));
  const count = receiptSerialCount(receiptLines);
  return {
    endItems: draft.lines.length,
    ohQty: draft.lines.reduce((sum, line) => sum + line.ohQty, 0),
    filledSerials: count.status === "counted" ? count.serials : count.status === "no-serial-cells" ? 0 : null,
  };
}

export function formatParsedCounts(counts: ShrParsedCounts): string {
  const serials =
    counts.filledSerials == null
      ? "serials not identified"
      : `${counts.filledSerials} ${counts.filledSerials === 1 ? "serial" : "serials"}`;
  const lineWord = counts.endItems === 1 ? "line" : "lines";
  return `${counts.endItems} end-item ${lineWord}, OH Qty ${counts.ohQty}, and ${serials}`;
}

export function isRyanSeptemberReceipt(draft: Pick<GcssShrDraft, "uic" | "year" | "month" | "day">): boolean {
  return (
    draft.uic.toUpperCase() === RYAN_SEPTEMBER_2026.uic &&
    draft.year === RYAN_SEPTEMBER_2026.year &&
    draft.month === RYAN_SEPTEMBER_2026.month &&
    draft.day === RYAN_SEPTEMBER_2026.day
  );
}

export function countsMatchRyan(counts: ShrParsedCounts): boolean {
  return (
    counts.endItems === RYAN_SEPTEMBER_2026.endItems &&
    counts.ohQty === RYAN_SEPTEMBER_2026.ohQty &&
    counts.filledSerials === RYAN_SEPTEMBER_2026.filledSerials
  );
}

export function ryanCountRefusal(draft: GcssShrDraft): string | null {
  if (!isRyanSeptemberReceipt(draft)) return null;
  const counts = shrDraftCounts(draft);
  if (countsMatchRyan(counts)) return null;
  return `This 1 Sep 2026 ODA Sub-hand receipt does not match. Expected 36 end-item lines, OH Qty 105, and 184 serials (filled SerNo and RegNo cells). Parsed ${formatParsedCounts(counts)}. A LotNo cell is not a serial. A blank cell is not a serial. Nothing was saved.`;
}

export function odaMonthlySaveRefusal(draft: GcssShrDraft, now: Date): string | null {
  if (draft.lines.length === 0) return "No end-item lines were read. Nothing was saved.";
  const periodError = validateMonthlyPeriod(draft.year, draft.month, now);
  if (periodError) return periodError;
  return ryanCountRefusal(draft);
}

export type StoredOdaLine = {
  lin: string | null;
  nsn: string | null;
  nomenclature: string;
  quantity: number;
  serialNumber: null;
  serialCells: SerialCell[] | null;
  serialCellsJson: string | null;
};

/** Rows prepared for storage. The serial column stays empty so a blank or LotNo is not copied into it. */
export function storedOdaLines(draft: GcssShrDraft): StoredOdaLine[] {
  return draft.lines.map((line) => ({
    lin: line.lin,
    nsn: line.nsn,
    nomenclature: line.nomenclature,
    quantity: line.ohQty,
    serialNumber: null,
    serialCells: line.serialCells,
    serialCellsJson: encodeSerialCells(line.serialCells),
  }));
}

export function storedLinesMatch(
  draft: GcssShrDraft,
  stored: Array<{ quantity: number; serial: string | null; serialCells: SerialCell[] | null }>,
): boolean {
  if (stored.length !== draft.lines.length) return false;
  return draft.lines.every((line, index) => {
    const row = stored[index];
    if (!row) return false;
    if (row.quantity !== line.ohQty) return false;
    if (row.serial != null) return false;
    return JSON.stringify(row.serialCells) === JSON.stringify(line.serialCells);
  });
}

export function filledSerialsOnLine(line: Pick<GcssEndItem, "serialCells">): number | null {
  return lineSerialCount({ serialCells: line.serialCells });
}
