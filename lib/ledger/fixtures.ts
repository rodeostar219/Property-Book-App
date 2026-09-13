import { DA_2062_TITLE, UNIT } from "./copy";
import {
  CATALOG_ITEMS,
  PEOPLE,
  SEED_CONFLICTS,
  personById,
} from "@/lib/oda/catalog";
import { ODA } from "@/lib/oda/org";
import type {
  Actor,
  LedgerDocument,
  LedgerException,
  LoanRecord,
  PropertyItem,
  ReceiptPeriod,
  ReceiptRecord,
} from "./types";

export const DEMO_SOLDIER: Actor = {
  id: PEOPLE.ryan.id,
  displayName: PEOPLE.ryan.displayName,
  fullName: PEOPLE.ryan.fullName,
  initials: PEOPLE.ryan.initials,
  role: "soldier",
  email: PEOPLE.ryan.email,
  grade: PEOPLE.ryan.grade,
  mos: PEOPLE.ryan.mos,
  sectionLetter: "E",
  scope: "section",
  identity: "echo",
};

export const DEMO_BRAVO: Actor = {
  id: PEOPLE.vargas.id,
  displayName: PEOPLE.vargas.displayName,
  fullName: PEOPLE.vargas.fullName,
  initials: PEOPLE.vargas.initials,
  role: "soldier",
  email: PEOPLE.vargas.email,
  grade: PEOPLE.vargas.grade,
  mos: PEOPLE.vargas.mos,
  sectionLetter: "B",
  scope: "section",
  identity: "bravo",
};

export const DEMO_PM: Actor = {
  id: PEOPLE.ortiz.id,
  displayName: PEOPLE.ortiz.displayName,
  fullName: PEOPLE.ortiz.fullName,
  initials: PEOPLE.ortiz.initials,
  role: "pm",
  email: PEOPLE.ortiz.email,
  grade: PEOPLE.ortiz.grade,
  mos: PEOPLE.ortiz.mos,
  scope: "oda",
  identity: "pm",
};

export const PHRH = {
  id: PEOPLE.reyes.id,
  fullName: ODA.phrhName,
};

export const people: Actor[] = [DEMO_SOLDIER, DEMO_BRAVO, DEMO_PM];

export const propertyItems: PropertyItem[] = CATALOG_ITEMS;

export const soldierAssignedSerials = propertyItems
  .filter((item) => item.assignedToId === DEMO_SOLDIER.id)
  .map((item) => item.serial)
  .filter((serial): serial is string => Boolean(serial));

export const exceptions: LedgerException[] = SEED_CONFLICTS.map((conflict) => {
  const holder = conflict.sectionLetter
    ? Object.values(PEOPLE).find((person) => person.sectionLetter === conflict.sectionLetter)
    : undefined;
  const item = propertyItems.find((row) => row.serial && row.serial === conflict.serial);
  return {
    id: `seed-${conflict.identityKey}-${conflict.sourceA}-${conflict.sourceB}`,
    itemId: item?.id ?? null,
    serial: conflict.serial,
    item: item?.name ?? conflict.issue,
    issue: conflict.issue,
    action: conflict.action,
    severity: conflict.severity,
    assignedToId: holder?.id ?? null,
    sectionLetter: conflict.sectionLetter,
    sourceA: conflict.sourceA,
    sourceB: conflict.sourceB,
    factA: conflict.factA,
    factB: conflict.factB,
  };
});

export const receipts: ReceiptRecord[] = [
  {
    id: "rcpt-oda",
    filename: "ODA-1223 Hand Receipt · APSR extract",
    kind: "hand_receipt",
    kindLabel: "Hand receipt",
    uic: UNIT.document,
    effectiveDate: "01 Sep 2026",
    lineGroups: CATALOG_ITEMS.length,
    totalQuantity: CATALOG_ITEMS.reduce((sum, item) => sum + item.quantityRequired, 0),
    status: "Current",
    phrhName: ODA.phrhName,
  },
  {
    id: "rcpt-echo",
    filename: "Echo Sub-hand receipt · electronic",
    kind: "sub_hand_receipt",
    kindLabel: "Sub-hand receipt (SHR)",
    uic: UNIT.document,
    effectiveDate: "01 Sep 2026",
    lineGroups: CATALOG_ITEMS.filter((item) => item.sectionLetter === "E").length,
    totalQuantity: CATALOG_ITEMS.filter((item) => item.sectionLetter === "E").length,
    status: "Current",
    phrhName: ODA.phrhName,
    shrHolderName: PEOPLE.ryan.fullName,
  },
  {
    id: "rcpt-bravo",
    filename: "Bravo Sub-hand receipt · electronic",
    kind: "sub_hand_receipt",
    kindLabel: "Sub-hand receipt (SHR)",
    uic: UNIT.document,
    effectiveDate: "01 Sep 2026",
    lineGroups: CATALOG_ITEMS.filter((item) => item.sectionLetter === "B").length,
    totalQuantity: CATALOG_ITEMS.filter((item) => item.sectionLetter === "B").length,
    status: "Current",
    phrhName: ODA.phrhName,
    shrHolderName: PEOPLE.vargas.fullName,
  },
];

export const receiptPeriods: ReceiptPeriod[] = [
  {
    id: "period-sep",
    period: "September 2026 baseline",
    effective: "01 Sep 2026",
    items: CATALOG_ITEMS.length,
    added: CATALOG_ITEMS.length,
    removed: 0,
    unchanged: 0,
    status: "Current",
  },
];

export const loans: LoanRecord[] = [
  {
    id: "loan-1",
    direction: "Incoming",
    document: `${DA_2062_TITLE} · BN S6`,
    item: "AN/PRC-163 Radio Set",
    serial: "10087231",
    party: "BN S6",
    signed: "28 Aug 2026",
    renewsOn: "28 Feb 2027",
    daysRemaining: 170,
    status: "Active",
  },
  {
    id: "loan-2",
    direction: "Outgoing",
    document: `${DA_2062_TITLE} · FOX`,
    item: "Dell Latitude 7430",
    serial: "J4RC6L3",
    party: "FOX",
    signed: "26 Aug 2026",
    renewsOn: "26 Feb 2027",
    daysRemaining: 168,
    status: "Active",
  },
];

export const documents: LedgerDocument[] = [
  {
    id: "doc-1",
    filename: "ODA-1223 Hand Receipt · APSR extract",
    kindLabel: "Hand receipt",
    date: "01 Sep 2026",
    notes: `Current ODA hand receipt · PHRH ${ODA.phrhName}`,
  },
  {
    id: "doc-2",
    filename: "Echo Sub-hand receipt · electronic",
    kindLabel: "Sub-hand receipt (SHR)",
    date: "01 Sep 2026",
    notes: "SHR for SSG Ryan Cole · does not relieve PHRH · scanned 2062 is Sprint 2",
  },
];

export { personById };
