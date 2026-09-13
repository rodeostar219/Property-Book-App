export const UNIT = {
  name: "SFODA-1223",
  uic: "W51HXC",
  document: "WH1FB3PB",
  receiptLabel: "18E",
} as const;

export const SHR_FIRST_USE =
  "Sub-hand receipt (SHR)";

export const PHRH_NOTE =
  "A Sub-hand receipt (SHR) does not relieve the primary hand receipt holder (PHRH). Both remain visible on the end item.";

export const RENEWAL_PLACEHOLDER_DAYS = 180;

export const RENEWAL_PLACEHOLDER_NOTE =
  `Renewal interval is a unit-configured placeholder (${RENEWAL_PLACEHOLDER_DAYS} days), not a regulatory default.`;

export const DA_2062_TITLE = "DA Form 2062";
export const DA_2062_SUBTITLE = "Hand Receipt/Shortage Listing";

export const NOT_WIRED = {
  resolve:
    "Resolve is not persisted yet. Slice C will require an audit note before an exception can close.",
  accept:
    "Accept is not persisted in Slice A. The PHRH/SHR inventory ceremony is Slice D.",
  custody: "Custody changes are not persisted in Slice A.",
  location: "Location changes are not persisted in Slice A.",
  export: "Export is not wired in Slice A — no file is generated.",
  addProperty: "Adding property is not persisted in Slice A.",
  importDocument: "Document import is not persisted in Slice A.",
  importComponents: "COEI / BII / AAL import is not persisted in Slice A.",
  addNote: "Notes are not persisted in Slice A.",
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
