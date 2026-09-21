import { identityKey } from "./identity-key";
import { ODA, sectionShrLabel } from "./org";
import { PEOPLE } from "./people";
import {
  SECTION_META,
  type Da2062DestinationKind,
  type LineDisposition,
  type SectionLetter,
  type SourceConflict,
} from "./types";

export const CONFIRM_BEFORE_WRITE = true;
export const DA2062_IN_DOES_NOT_INVENT_APSR = true;
export const ADD_TO_SIGNED_FOR_LABEL = "Add to signed-for";
export const DA2062_SUCCESS_IS_NOT_ACCEPT = true;
export const DA2062_MAX_PDF_BYTES = 600_000;

export type Da2062PlanLine = {
  lin: string | null;
  nsn: string;
  serial: string | null;
  nomenclature: string;
  quantity: number;
};

export function defaultDispositionForLine(
  line: Pick<Da2062PlanLine, "nsn" | "serial" | "lin">,
  conflicts: SourceConflict[],
): LineDisposition {
  const key = identityKey(line);
  return conflicts.some((conflict) => conflict.identityKey === key) ? "flag" : "accept";
}

export function planDa2062Confirm(input: {
  lines: Da2062PlanLine[];
  dispositions: LineDisposition[];
  conflicts: SourceConflict[];
  sectionLetter?: SectionLetter | null;
}): {
  accepted: Da2062PlanLine[];
  skipped: Da2062PlanLine[];
  flagged: Da2062PlanLine[];
  conflictDiscrepancies: SourceConflict[];
  flaggedDiscrepancies: SourceConflict[];
  willWrite: boolean;
} {
  const accepted: Da2062PlanLine[] = [];
  const skipped: Da2062PlanLine[] = [];
  const flagged: Da2062PlanLine[] = [];
  input.lines.forEach((line, index) => {
    const disposition = input.dispositions[index] ?? "accept";
    if (disposition === "skip") skipped.push(line);
    else if (disposition === "flag") flagged.push(line);
    else accepted.push(line);
  });

  const activeKeys = new Set([...accepted, ...flagged].map((line) => identityKey(line)));
  const conflictDiscrepancies = input.conflicts.filter((conflict) =>
    activeKeys.has(conflict.identityKey),
  );
  const flaggedDiscrepancies: SourceConflict[] = flagged
    .filter((line) => !conflictDiscrepancies.some((conflict) => conflict.identityKey === identityKey(line)))
    .map((line) => ({
      identityKey: identityKey(line),
      nsn: line.nsn,
      serial: line.serial,
      lin: line.lin,
      sectionLetter: input.sectionLetter ?? null,
      sourceA: "da_2062",
      sourceB: "hand_receipt",
      factA: `${line.nomenclature} · qty ${line.quantity}${line.serial ? ` SN ${line.serial}` : " serial not recorded"}`,
      factB: "Flagged on Confirm — not added to signed-for",
      issue: "Flagged on Confirm",
      action: "Open a discrepancy. Do not auto-merge layered facts.",
      severity: "Review",
    }));

  return {
    accepted,
    skipped,
    flagged,
    conflictDiscrepancies,
    flaggedDiscrepancies,
    willWrite: accepted.length + flagged.length > 0,
  };
}

export function gainingPartyLabel(input: {
  destinationKind: Da2062DestinationKind;
  destinationSection: SectionLetter | null;
  gainingParty: string;
  gainingSection: SectionLetter | null;
}): string {
  if (input.destinationKind === "oda_hr") {
    return `ODA · ${input.gainingParty}`;
  }
  const section = input.gainingSection ?? input.destinationSection;
  if (section) {
    return `${SECTION_META[section].name} (${section}) · ${input.gainingParty}`;
  }
  return input.gainingParty;
}

export function destinationLabel(
  kind: Da2062DestinationKind,
  section: SectionLetter | null,
): string {
  if (kind === "oda_hr") return `ODA hand receipt · ${ODA.document} · PHRH ${ODA.phrhName}`;
  if (!section) return "Section Sub-hand receipt (SHR)";
  const holder = Object.values(PEOPLE).find((person) => person.sectionLetter === section);
  return `${SECTION_META[section].name} Sub-hand receipt (SHR) · ${holder?.fullName ?? "unassigned"}`;
}
