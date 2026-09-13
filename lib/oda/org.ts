import { SECTION_META, type SectionLetter } from "./types";

export const ODA = {
  name: "ODA-1223",
  shortName: "1223",
  uic: "W51HXC",
  document: "WH1FB3PB",
  group: "1st SFG (A)",
  battalion: "1st Battalion",
  company: "B Company",
  installation: "JBLM",
  receiptLabel: "18E",
  phrhName: "CPT A. Reyes",
  phrhGrade: "18A",
  assistantPhrhName: "CW2 L. Park",
  pmName: "SFC R. Ortiz",
} as const;

export const COMPANION_DISCLAIMER =
  "Operational property workspace · Companion to GCSS-Army / APSR · Not a system of record · Not a GCSS replacement";

export function sectionTitle(letter: SectionLetter): string {
  const meta = SECTION_META[letter];
  return `${meta.name} (${letter}) · ${meta.mos} ${meta.specialty}`;
}

export function sectionShrLabel(letter: SectionLetter): string {
  return `${SECTION_META[letter].name} Sub-hand receipt (SHR)`;
}
