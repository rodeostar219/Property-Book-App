import { blankSerialToNull } from "./da2062";

export const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export type MonthState = "uploaded" | "missing" | "future";

export type ShrInjectStamp = {
  id: number;
  sectionLetter: string | null;
  label: string;
  notes: string | null;
  injectedAt: string;
};

export type MonthCell = {
  year: number;
  month: number;
  label: string;
  name: string;
  state: MonthState;
  injectId: number | null;
};

export type PiecePoint = {
  year: number;
  month: number;
  /** Filled SerNo and RegNo cells on that month's Sub-hand receipt. */
  serials: number;
  injectId: number;
};

/** A cell in the SerNo / RegNo / LotNo grid under one end item. */
export type SerialCellKind = "serNo" | "regNo" | "lotNo";

export type SerialCell = {
  kind: SerialCellKind;
  value: string | null;
};

/**
 * One end item on a monthly Sub-hand receipt.
 * `serialCells` is null when the stored line cannot tell a LotNo cell from a SerNo or RegNo cell.
 * `ohQty` is the on-hand quantity for that end item. It is not a chart point.
 */
export type ShrReceiptLine = {
  injectId: number;
  ohQty: number;
  untypedSerial: string | null;
  serialCells: SerialCell[] | null;
  changeType?: string;
};

const PERIOD_RE = /shr-period:(\d{4})-(\d{2})/;

export function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1);
}

export function validateMonthlyPeriod(year: number, month: number, now: Date): string | null {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return "Year is not a valid Sub-hand receipt year. Nothing was saved.";
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return "Month is not valid. Nothing was saved.";
  }
  if (monthIndex(year, month) > monthIndex(now.getUTCFullYear(), now.getUTCMonth() + 1)) {
    return "That month is still in the future. Nothing was saved.";
  }
  return null;
}

export function injectPeriod(inject: ShrInjectStamp): { year: number; month: number } | null {
  const tagged = inject.notes?.match(PERIOD_RE);
  if (tagged) {
    return { year: Number(tagged[1]), month: Number(tagged[2]) };
  }
  const date = new Date(inject.injectedAt);
  if (Number.isNaN(date.getTime())) return null;
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function isFilledSerialCell(value: string | null | undefined): boolean {
  return blankSerialToNull(value) !== null;
}

/** Restore a stored SerNo / RegNo / LotNo grid. Unknown shapes stay unclassified. */
export function parseStoredSerialCells(raw: string | null | undefined): SerialCell[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const cells: SerialCell[] = [];
    for (const cell of parsed) {
      if (!cell || typeof cell !== "object") return null;
      const kind = (cell as { kind?: unknown }).kind;
      if (kind !== "serNo" && kind !== "regNo" && kind !== "lotNo") return null;
      const value = (cell as { value?: unknown }).value;
      if (value == null) {
        cells.push({ kind, value: null });
        continue;
      }
      if (typeof value !== "string") return null;
      cells.push({ kind, value: blankSerialToNull(value) });
    }
    return cells;
  } catch {
    return null;
  }
}

export function encodeSerialCells(cells: SerialCell[] | null): string | null {
  if (cells == null) return null;
  return JSON.stringify(cells);
}

export type SerialGridRow = {
  serNo: string | null;
  regNo: string | null;
  lotNo: string | null;
};

/** Three-across rows. Null when the stored cells are not SerNo, RegNo, LotNo in that order. */
export function serialGridRows(cells: SerialCell[] | null): SerialGridRow[] | null {
  if (cells == null || cells.length % 3 !== 0) return null;
  const rows: SerialGridRow[] = [];
  for (let index = 0; index < cells.length; index += 3) {
    const ser = cells[index];
    const reg = cells[index + 1];
    const lot = cells[index + 2];
    if (!ser || !reg || !lot) return null;
    if (ser.kind !== "serNo" || reg.kind !== "regNo" || lot.kind !== "lotNo") return null;
    rows.push({ serNo: ser.value, regNo: reg.value, lotNo: lot.value });
  }
  return rows;
}

/** Filled SerNo and RegNo cells. Null when the line does not identify those cells. LotNo is not counted. */
export function lineSerialCount(line: Pick<ShrReceiptLine, "serialCells">): number | null {
  if (line.serialCells == null) return null;
  return line.serialCells.filter(
    (cell) => (cell.kind === "serNo" || cell.kind === "regNo") && isFilledSerialCell(cell.value),
  ).length;
}

export function endItemCounts(line: Pick<ShrReceiptLine, "serialCells" | "ohQty">): {
  serials: number | null;
  ohQty: number;
  differs: boolean | null;
} {
  const serials = lineSerialCount(line);
  if (serials == null) return { serials: null, ohQty: line.ohQty, differs: null };
  return { serials, ohQty: line.ohQty, differs: serials !== line.ohQty };
}

/** Screen sentence for one end item. OH Qty stays labeled. Serials are SerNo and RegNo only. */
export function endItemCountNote(line: Pick<ShrReceiptLine, "serialCells" | "ohQty">): string {
  const counts = endItemCounts(line);
  if (counts.serials == null) {
    return `OH Qty ${counts.ohQty}. This line does not identify SerNo or RegNo separately from LotNo, so it has no serial count.`;
  }
  const serialLabel = `${counts.serials} ${counts.serials === 1 ? "serial" : "serials"}`;
  if (counts.differs) {
    return `${serialLabel}. OH Qty ${counts.ohQty}. Serials and OH Qty differ.`;
  }
  return `${serialLabel}. OH Qty ${counts.ohQty}.`;
}

export type ReceiptSerialCount =
  | { status: "counted"; serials: number }
  | { status: "untyped" }
  | { status: "no-serial-cells" };

function onReceipt(line: ShrReceiptLine): boolean {
  return line.changeType !== "removed";
}

/** Count filled SerNo and RegNo cells. Do not guess from an unclassified serial field or from OH Qty. */
export function receiptSerialCount(lines: ShrReceiptLine[]): ReceiptSerialCount {
  const present = lines.filter(onReceipt);
  if (present.some((line) => line.serialCells == null)) return { status: "untyped" };
  const serials = present.reduce((sum, line) => sum + (lineSerialCount(line) ?? 0), 0);
  if (serials === 0) return { status: "no-serial-cells" };
  return { status: "counted", serials };
}

export function classifyMonth(
  year: number,
  month: number,
  now: Date,
  uploaded: boolean,
): MonthState {
  if (uploaded) return "uploaded";
  if (monthIndex(year, month) > monthIndex(now.getUTCFullYear(), now.getUTCMonth() + 1)) {
    return "future";
  }
  return "missing";
}

function stampInScope(
  row: ShrInjectStamp,
  sectionLetter: string,
  includeOdaLevel: boolean,
): boolean {
  if (row.sectionLetter === sectionLetter) return true;
  return includeOdaLevel && (row.sectionLetter == null || row.sectionLetter === "");
}

export function yearMonthCells(
  year: number,
  injects: ShrInjectStamp[],
  sectionLetter: string,
  now: Date,
  options?: { includeOdaLevel?: boolean },
): MonthCell[] {
  const includeOdaLevel = options?.includeOdaLevel === true;
  const mine = injects.filter((row) => stampInScope(row, sectionLetter, includeOdaLevel));
  return MONTH_LABELS.map((label, index) => {
    const month = index + 1;
    const matches = mine.filter((row) => {
      const period = injectPeriod(row);
      return period?.year === year && period.month === month;
    });
    const latest = [...matches].sort((a, b) => {
      const byTime = a.injectedAt.localeCompare(b.injectedAt);
      return byTime !== 0 ? byTime : a.id - b.id;
    }).at(-1);
    return {
      year,
      month,
      label,
      name: MONTH_NAMES[index],
      state: classifyMonth(year, month, now, Boolean(latest)),
      injectId: latest?.id ?? null,
    };
  });
}

function latestInMonth(rows: ShrInjectStamp[]): ShrInjectStamp | undefined {
  return [...rows].sort((a, b) => a.injectedAt.localeCompare(b.injectedAt) || a.id - b.id).at(-1);
}

/**
 * Chart point for a month: filled SerNo and RegNo cells on that month's latest Sub-hand receipt.
 * LotNo, OH Qty, the live hand-receipt piece total, and an unclassified serial field are not points.
 * A receipt with no filled SerNo or RegNo cells is omitted, not drawn as zero.
 */
export function monthlySerialPoints(
  injects: ShrInjectStamp[],
  lines: ShrReceiptLine[],
  sectionLetter: string,
  options?: { includeOdaLevel?: boolean },
): PiecePoint[] {
  const includeOdaLevel = options?.includeOdaLevel === true;
  const mine = injects.filter((row) => stampInScope(row, sectionLetter, includeOdaLevel));
  const buckets = new Map<string, ShrInjectStamp[]>();
  for (const row of mine) {
    const period = injectPeriod(row);
    if (!period) continue;
    const key = `${period.year}-${String(period.month).padStart(2, "0")}`;
    const list = buckets.get(key) ?? [];
    list.push(row);
    buckets.set(key, list);
  }

  const points: PiecePoint[] = [];
  for (const [key, rows] of buckets) {
    const latest = latestInMonth(rows);
    if (!latest) continue;
    const count = receiptSerialCount(lines.filter((line) => line.injectId === latest.id));
    if (count.status !== "counted") continue;
    const [yearText, monthText] = key.split("-");
    points.push({
      year: Number(yearText),
      month: Number(monthText),
      serials: count.serials,
      injectId: latest.id,
    });
  }

  return points.sort((a, b) => monthIndex(a.year, a.month) - monthIndex(b.year, b.month));
}

export function unplottedReceiptNote(
  months: Array<{ name: string; year: number; injectId: number | null }>,
  lines: ShrReceiptLine[],
): string | null {
  if (months.length === 0) return null;
  return months
    .map((month) => {
      const label = `${month.name} ${month.year}`;
      const count =
        month.injectId == null
          ? ({ status: "no-serial-cells" } as const)
          : receiptSerialCount(lines.filter((line) => line.injectId === month.injectId));
      if (count.status === "untyped") {
        return `${label}’s Sub-hand receipt is present. Its lines do not identify SerNo or RegNo separately from LotNo, so the serial count is not plotted.`;
      }
      return `${label}’s Sub-hand receipt is present and has no SerNo or RegNo cells to count, so it is not plotted.`;
    })
    .join(" ");
}

/** Connect a line only across adjacent recorded months. A gap is not a zero. */
export function adjacentPointPairs(points: Array<{ year: number; month: number }>): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (monthIndex(current.year, current.month) - monthIndex(previous.year, previous.month) === 1) {
      pairs.push([index - 1, index]);
    }
  }
  return pairs;
}
