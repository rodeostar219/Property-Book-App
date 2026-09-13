export type SectionLetter = "B" | "C" | "D" | "E" | "F";

export type DemoIdentity = "echo" | "bravo" | "pm";

export type ActorScope = "section" | "oda";

export type FactLayer =
  | "accountability"
  | "responsibility"
  | "components"
  | "packing"
  | "custody"
  | "visual_id";

export type FactSource =
  | "hand_receipt"
  | "sub_hand_receipt"
  | "tracker"
  | "picture_book"
  | "packing_1750";

export type InjectChangeType = "added" | "removed" | "changed" | "unchanged";

export type DiscrepancySeverity = "Review" | "Missing data" | "Shortage";

export type ElectronicShrLine = {
  key?: string;
  lin: string | null;
  nsn: string;
  serial: string | null;
  nomenclature: string;
  quantity: number;
  sectionLetter: SectionLetter;
};

export type InjectDiffLine = ElectronicShrLine & {
  changeType: InjectChangeType;
  priorNomenclature?: string | null;
  priorQuantity?: number | null;
  priorSerial?: string | null;
};

export type InjectDiff = {
  added: InjectDiffLine[];
  removed: InjectDiffLine[];
  changed: InjectDiffLine[];
  unchanged: InjectDiffLine[];
  lines: InjectDiffLine[];
};

export type SourceConflict = {
  identityKey: string;
  nsn: string;
  serial: string | null;
  lin: string | null;
  sectionLetter: SectionLetter | null;
  sourceA: FactSource;
  sourceB: FactSource;
  factA: string;
  factB: string;
  issue: string;
  action: string;
  severity: DiscrepancySeverity;
};

export const SECTION_LETTERS: SectionLetter[] = ["B", "C", "D", "E", "F"];

export const SECTION_META: Record<
  SectionLetter,
  { name: string; mos: string; specialty: string }
> = {
  B: { name: "Bravo", mos: "18B", specialty: "Weapons" },
  C: { name: "Charlie", mos: "18C", specialty: "Engineer" },
  D: { name: "Delta", mos: "18D", specialty: "Medical" },
  E: { name: "Echo", mos: "18E", specialty: "Communications" },
  F: { name: "Fox", mos: "18F", specialty: "Intelligence" },
};

export const INJECT_LABEL = "Sub-hand receipt update";
export const INJECT_ACTION_LABEL = "Sub-hand receipt update";
