import type { AccountabilityStatus, SectionLetter } from "@/lib/ledger/types";
import { MONTH_NAMES } from "@/lib/oda/months";

export const REQUIRED_BOM_GAP =
  "Required BOM is not in the records. Some lines carry COEI, BII, or AAL component facts, and a bill-of-materials table exists, but nothing marks a line as requiring a BOM. An empty component list is not counted as a missing BOM.";

export const LOAN_DIRECTION_GAP =
  "Loan direction is not in the records. The hand receipt stores section, location, and signed-for status. It does not store equipment loaned outside the office, equipment at maintenance, or equipment signed to the team and currently borrowed. Counts are omitted so they are not read as zero, and those rows are not subtracted from the hand-receipt total.";

export const MONTHLY_CENSUS_NOTE =
  "The piece total is current hand-receipt line quantities. Chart points are the serials on that month's Sub-hand receipt (filled SerNo and RegNo cells), not that live piece total and not OH Qty. A LotNo cell is not a serial. Missing months are omitted, not drawn as zero.";

export function pieceTotalChartNote(
  livePieces: number,
  points: Array<{ year: number; month: number; serials: number }>,
  uploadedMonths = 0,
): string {
  const latest = points.at(-1);
  if (!latest) {
    const monthWord = uploadedMonths === 1 ? "month" : "months";
    return `${MONTHLY_CENSUS_NOTE} This year has ${uploadedMonths} uploaded ${monthWord}. No serial counts are plotted. The current hand-receipt total of ${livePieces} pieces is not a chart point, and OH Qty is not a chart point.`;
  }
  const when = `${MONTH_NAMES[latest.month - 1]} ${latest.year}`;
  const serialWord = latest.serials === 1 ? "serial" : "serials";
  return `${MONTHLY_CENSUS_NOTE} The latest chart point is ${latest.serials} ${serialWord} on the ${when} Sub-hand receipt. That count is filled SerNo and RegNo cells. It is not the current hand-receipt total of ${livePieces} pieces and it is not OH Qty.`;
}

export const BOM_IMPORT_GAP =
  "BOM import is not saved. Component hand receipt import (COEI / BII / AAL) is not wired, so no component rows were written.";

export const DA2062_OUT_GAP =
  "DA Form 2062 OUT is not saved. OUT is property leaving this team or section for temporary custody with a person, a section, or an organization, and a return date is required. No OUT rows were written.";

export const DA2062_IN_DIRECTION =
  "2062 IN is property coming onto this team or section. The gaining party is the person or section accepting the property. The hand receipt is the record. Confirm writes signed-for lines in this workspace. It is not Accept theater, and it does not post GCSS-Army / the APSR.";

export const DA2062_OUT_DIRECTION =
  "2062 OUT is the other direction: property leaving this team or section. Custody goes to a person, another section, or an organization, and a return date is required. OUT is not the same record as IN.";

export type AttentionRow = {
  id: string;
  sectionLetter: SectionLetter | null;
  equipment: string;
  issue: string;
  action: string;
  href: string;
};

export type MovementRow = {
  id: "outside" | "maintenance" | "borrowed";
  direction: "Out" | "In";
  title: string;
  issue: string;
  action: string;
};

export const MOVEMENT_ROWS: MovementRow[] = [
  {
    id: "outside",
    direction: "Out",
    title: "Loaned outside the office",
    issue: "Not in the records",
    action: "No loan-out document with direction is stored",
  },
  {
    id: "maintenance",
    direction: "Out",
    title: "At maintenance",
    issue: "Not in the records",
    action: "No maintenance custody is stored",
  },
  {
    id: "borrowed",
    direction: "In",
    title: "Signed to the team, currently borrowed",
    issue: "Not in the records",
    action: "No incoming borrow, separate from the hand receipt, is stored",
  },
];

type CountItem = {
  id: string;
  lin: string | null;
  quantityRequired: number;
  sectionLetter?: SectionLetter | null;
  officialName?: string;
  commonName?: string | null;
  name: string;
  hasPictureBookPhoto: boolean;
  detailHref?: string;
};

export function handReceiptTotals(items: CountItem[]): {
  pieces: number;
  uniqueLins: number;
  piecesWithoutLin: number;
} {
  const pieces = items.reduce((sum, item) => sum + item.quantityRequired, 0);
  const uniqueLins = new Set(items.map((item) => item.lin).filter((lin): lin is string => Boolean(lin))).size;
  const piecesWithoutLin = items
    .filter((item) => !item.lin)
    .reduce((sum, item) => sum + item.quantityRequired, 0);
  return { pieces, uniqueLins, piecesWithoutLin };
}

export function sectionItemCount(items: CountItem[], letter: SectionLetter): number {
  return items.filter((item) => item.sectionLetter === letter).length;
}

export function missingPictureAttention(items: CountItem[]): AttentionRow[] {
  return items
    .filter((item) => !item.hasPictureBookPhoto)
    .map((item) => ({
      id: item.id,
      sectionLetter: item.sectionLetter ?? null,
      equipment: item.commonName || item.officialName || item.name,
      issue: "Missing picture-book photo",
      action: "Add a picture-book photo",
      href: item.detailHref ?? `/lines/${item.id}`,
    }));
}

export const STATUS_SHORT: Record<AccountabilityStatus, string> = {
  signed_for: "Signed for",
  on_hand: "On hand",
  needs_serial_check: "Needs serial",
  shortage_recorded: "Shortage",
};

export const STATUS_TONE: Record<AccountabilityStatus, "ok" | "warn" | "bad"> = {
  signed_for: "ok",
  on_hand: "ok",
  needs_serial_check: "warn",
  shortage_recorded: "bad",
};
