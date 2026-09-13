import { COMPANION_DISCLAIMER, ODA } from "@/lib/oda/org";
import { INJECT_ACTION_LABEL, INJECT_LABEL } from "@/lib/oda/types";

export const UNIT = {
  name: ODA.name,
  uic: ODA.uic,
  document: ODA.document,
  receiptLabel: ODA.receiptLabel,
  group: ODA.group,
  installation: ODA.installation,
} as const;

export const SHR_FIRST_USE = "Sub-hand receipt (SHR)";

export const PHRH_NOTE =
  "A Sub-hand receipt (SHR) does not relieve the primary hand receipt holder (PHRH). Both remain visible on the end item.";

export const RENEWAL_PLACEHOLDER_DAYS = 180;

export const RENEWAL_PLACEHOLDER_NOTE =
  `Renewal interval is a unit-configured placeholder (${RENEWAL_PLACEHOLDER_DAYS} days), not a regulatory default.`;

export const DA_2062_TITLE = "DA Form 2062";
export const DA_2062_SUBTITLE = "Hand Receipt/Shortage Listing";
export const DA_2062_IN_TITLE = "DA Form 2062 in";
export const DA_2062_IN_NOTE =
  "Scan / import IN only. Confirm before write. Success adds to signed-for plus history — not Accept theater. Companion to GCSS-Army / APSR — a PDF does not invent formal APSR accountability.";
export const ADD_TO_SIGNED_FOR = "Add to signed-for";

export const COMPANION_NOTE = COMPANION_DISCLAIMER;
export const INJECT_FEED_LABEL = INJECT_LABEL;
export const INJECT_BUTTON_LABEL = INJECT_ACTION_LABEL;

export const NOT_WIRED = {
  resolve:
    "Resolve is not persisted yet. A required audit note before close stays out of Sprint 1.",
  accept:
    "Accept / inventory ceremony is out of Sprint 1. Use Sub-hand receipt update for an electronic 18E extract.",
  custody: "Custody changes are not persisted in Sprint 1.",
  location: "Location changes are not persisted in Sprint 1.",
  export: "Export is not wired — no file is generated.",
  addProperty: "Adding property is not persisted in Sprint 1.",
  importDocument: "DA Form 2062 out, boxes, and DD Form 1750 generate stay out of this slice.",
  importComponents: "COEI / BII / AAL / component CHR import is out of this 2062-in slice.",
  da2062Out: "DA Form 2062 out is the next slice. Return dates stay out of this PR.",
  da2062Boxes: "Boxes and DD Form 1750 generate stay out of this 2062-in slice.",
  addNote: "Notes are not persisted in Sprint 1.",
  d1Down: "D1 is unavailable. This mutation is disabled so the UI cannot fake a commit.",
  sectionLocked:
    "Section isolation: this identity cannot see or edit another section's Sub-hand receipt (SHR).",
} as const;

export function formatSerial(serial: string | null | undefined): string {
  if (!serial || serial === "—") return "not recorded";
  return serial;
}

export const STATUS_LABEL: Record<
  import("./types").AccountabilityStatus,
  string
> = {
  signed_for: "Signed for / On hand receipt",
  on_hand: "On hand",
  needs_serial_check: "Needs serial check",
  shortage_recorded: "Shortage recorded",
};

export const UNIT_TRACKING_LABEL: Record<
  import("./types").UnitTrackingFlag,
  string
> = {
  assigned: "Assigned (unit tracking)",
  tdy: "TDY (unit tracking)",
};
