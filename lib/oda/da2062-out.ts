import type { PropertyItem } from "@/lib/ledger/types";
import { PEOPLE } from "./catalog";
import type { IsolationActor } from "./access";
import { canViewSection } from "./access";
import {
  defaultDispositionForLine,
  extractDa2062Content,
  normalizeReturnDate,
  planDa2062Confirm,
  previewDa2062Conflicts,
  signedForMatchKey,
  type Da2062EnrichedLine,
  type Da2062InLine,
  type Da2062Validation,
  type Da2062ValidationFail,
} from "./da2062";
import { identityKey } from "./identity-key";
import { ODA, sectionShrLabel } from "./org";
import {
  SECTION_META,
  type Da2062OutDestinationKind,
  type Da2062ParsePath,
  type LineDisposition,
  type SectionLetter,
  type SourceConflict,
} from "./types";

export const DA2062_OUT_DOES_NOT_INVENT_APSR = true;
export const DA2062_OUT_SUCCESS_IS_NOT_ACCEPT = true;
export const PAST_DUE_WARNS_ONLY = true;
export const TEMP_30D_WARNS_ONLY = true;
export const TEMP_HAND_RECEIPT_DAYS = 30;
export const ADD_TEMPORARY_HAND_RECEIPT_LABEL = "Add temporary hand receipt";
export const SIGN_OUT_LABEL = "Sign out";

export const OUT_ORGANIZATIONS = [
  "1st SFG (A) S-4",
  "Battalion property",
  "Group S-4",
  "Range control",
] as const;

export type Da2062OutWarningKind = "past_due" | "temp_30d" | "return_date_required" | "parse";

export type Da2062OutWarning = {
  kind: Da2062OutWarningKind;
  message: string;
};

export type Da2062OutDraft = {
  parsePath: Da2062ParsePath;
  filename: string;
  uic: string;
  issuer: string;
  issuerSection: SectionLetter | null;
  outDestinationKind: Da2062OutDestinationKind;
  outDestinationLabel: string;
  destinationSection: SectionLetter | null;
  returnDate: string | null;
  lines: Da2062InLine[];
  sourcePdfBase64: string;
  sourcePdfContentType: string;
  warnings: string[];
};

function lineIdentity(line: Pick<Da2062InLine, "nsn" | "serial" | "lin">): string {
  return identityKey(line);
}

export type SignedOutLine = {
  importId: number;
  nsn: string;
  serial: string | null;
  lin: string | null;
  nomenclature: string;
  officialName: string | null;
  actualName: string | null;
  photoData: string | null;
  quantity: number;
  issuerSection: SectionLetter | null;
  outDestinationKind: Da2062OutDestinationKind;
  outDestinationLabel: string;
  returnDate: string;
  issuer: string;
};

export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function daysUntilReturn(returnDate: string, asOf: string): number {
  const start = Date.parse(`${asOf}T00:00:00Z`);
  const end = Date.parse(`${returnDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return Number.NaN;
  return Math.round((end - start) / 86_400_000);
}

export function isPastDue(returnDate: string, asOf: string): boolean {
  return daysUntilReturn(returnDate, asOf) < 0;
}

export function isTempHandReceiptWindow(returnDate: string, asOf: string): boolean {
  const days = daysUntilReturn(returnDate, asOf);
  return Number.isFinite(days) && days <= TEMP_HAND_RECEIPT_DAYS;
}

export function returnDateWarnings(
  returnDate: string | null | undefined,
  asOf = todayIso(),
): Da2062OutWarning[] {
  const normalized = normalizeReturnDate(returnDate ?? null);
  if (!normalized) {
    return [
      {
        kind: "return_date_required",
        message: "Return date is required before write. Cancel still leaves zero rows.",
      },
    ];
  }
  const warnings: Da2062OutWarning[] = [];
  if (isPastDue(normalized, asOf)) {
    warnings.push({
      kind: "past_due",
      message:
        "Return date is past due. Warn only — this product does not force turn-in or convert.",
    });
  }
  if (isTempHandReceiptWindow(normalized, asOf)) {
    warnings.push({
      kind: "temp_30d",
      message:
        "Temporary hand receipt return is ≤30 days. Awareness only — not a forced renewal, turn-in, or convert.",
    });
  }
  return warnings;
}

export function outDestinationLabelText(input: {
  kind: Da2062OutDestinationKind;
  label: string;
  section: SectionLetter | null;
}): string {
  if (input.kind === "person") return `Person · ${input.label}`;
  if (input.kind === "section") {
    const section = input.section;
    if (section) return `Section · ${SECTION_META[section].name} (${section})`;
    return `Section · ${input.label}`;
  }
  return `Organization · ${input.label}`;
}

export function resolveOutDestination(input: {
  kind: Da2062OutDestinationKind;
  label: string;
  section: SectionLetter | null;
}): { kind: Da2062OutDestinationKind; label: string; section: SectionLetter | null } {
  if (input.kind === "person") {
    const match = Object.values(PEOPLE).find(
      (person) =>
        person.fullName.toLowerCase() === input.label.toLowerCase() ||
        person.displayName.toLowerCase() === input.label.toLowerCase(),
    );
    return { kind: "person", label: match?.fullName ?? input.label, section: match?.sectionLetter ?? null };
  }
  if (input.kind === "section") {
    const section = input.section;
    if (!section) return { kind: "section", label: input.label, section: null };
    return {
      kind: "section",
      label: `${SECTION_META[section].name} (${section})`,
      section,
    };
  }
  return { kind: "organization", label: input.label, section: null };
}

function inferKindFromLabel(
  label: string | null,
  section: SectionLetter | null,
): Da2062OutDestinationKind | null {
  if (section && label) {
    const meta = SECTION_META[section];
    if (
      label.toUpperCase() === section ||
      label.toUpperCase().includes(meta.name.toUpperCase())
    ) {
      return "section";
    }
  }
  if (
    label &&
    Object.values(PEOPLE).some(
      (person) =>
        person.fullName.toLowerCase() === label.toLowerCase() ||
        label.toLowerCase().includes(person.fullName.toLowerCase()),
    )
  ) {
    return "person";
  }
  if (label && OUT_ORGANIZATIONS.some((org) => label.toLowerCase().includes(org.toLowerCase()))) {
    return "organization";
  }
  return null;
}

export function parseDa2062OutPdf(
  bytes: Uint8Array,
  filename: string,
  issuer: {
    section: SectionLetter | null;
    kind: Da2062OutDestinationKind;
    label: string;
    destinationSection: SectionLetter | null;
    returnDate: string | null;
  },
):
  | { ok: true; draft: Omit<Da2062OutDraft, "sourcePdfBase64" | "sourcePdfContentType"> }
  | Da2062ValidationFail {
  const extracted = extractDa2062Content(bytes);
  if (!extracted.ok) return extracted;
  const { content } = extracted;

  if (content.direction === "in") {
    return {
      ok: false,
      reason: "wrong_direction",
      message:
        "This PDF is a DA Form 2062 in. Use 2062 in. Temporary hand receipt (2062 out) was not written.",
    };
  }
  const looksLikeInbound =
    content.direction !== "out" &&
    content.outDestinationKind == null &&
    !content.returnDate &&
    Boolean(content.gainingSection);
  if (looksLikeInbound) {
    return {
      ok: false,
      reason: "wrong_direction",
      message:
        "This PDF looks like a DA Form 2062 in. Use 2062 in. Temporary hand receipt (2062 out) was not written.",
    };
  }
  if (content.outDestinationKind === "invalid") {
    return {
      ok: false,
      reason: "wrong_destination",
      message:
        "Destinations v1 are person / section / organization only. Location-style destinations are out of this slice. No rows written.",
    };
  }
  if (content.outDestinationKind && content.outDestinationKind !== issuer.kind) {
    return {
      ok: false,
      reason: "wrong_destination",
      message: `Wrong destination: PDF is ${content.outDestinationKind}, selected is ${issuer.kind}. Destinations v1 are person / section / organization only. No rows written.`,
    };
  }

  const kind =
    content.outDestinationKind ??
    issuer.kind ??
    inferKindFromLabel(content.outDestinationLabel ?? content.toParty, content.gainingSection);
  if (!kind) {
    return {
      ok: false,
      reason: "wrong_destination",
      message:
        "Destinations v1 are person / section / organization only. Choose a destination before write. No rows written.",
    };
  }

  const pdfLabel = content.outDestinationLabel ?? content.toParty;
  const formResolved = resolveOutDestination({
    kind: issuer.kind,
    label: issuer.label,
    section: issuer.destinationSection,
  });
  const pdfResolved = resolveOutDestination({
    kind,
    label: pdfLabel || formResolved.label,
    section: kind === "section" ? content.gainingSection ?? issuer.destinationSection : null,
  });
  const destination =
    content.outDestinationKind || content.outDestinationLabel
      ? pdfResolved
      : formResolved.kind
        ? formResolved
        : pdfResolved;

  const returnDate = content.returnDate ?? normalizeReturnDate(issuer.returnDate);
  const warnings = [...content.warnings];
  if (!content.direction) {
    warnings.push("PDF did not mark DIRECTION=out. Treated as a temporary hand receipt / DA Form 2062 out.");
  }
  if (!returnDate) {
    warnings.push("Return date is required on Confirm before write. Past due is warn only.");
  }
  for (const warning of returnDateWarnings(returnDate)) {
    if (warning.kind !== "return_date_required") warnings.push(warning.message);
  }

  return {
    ok: true,
    draft: {
      parsePath: content.parsePath,
      filename,
      uic: content.uic,
      issuer: content.issuer,
      issuerSection: content.issuerSection ?? issuer.section,
      outDestinationKind: destination.kind,
      outDestinationLabel: destination.label,
      destinationSection: destination.kind === "section" ? destination.section : null,
      returnDate,
      lines: content.lines,
      warnings,
    },
  };
}

export function validateDa2062Out(input: {
  actor: IsolationActor;
  issuerSection: SectionLetter | null;
  draft: Pick<
    Da2062OutDraft,
    | "uic"
    | "issuerSection"
    | "lines"
    | "outDestinationKind"
    | "outDestinationLabel"
    | "returnDate"
  >;
  requireReturnDate: boolean;
}): Da2062Validation {
  const expectedUic = ODA.uic.toUpperCase();
  if (!input.draft.uic || input.draft.uic.toUpperCase() !== expectedUic) {
    return {
      ok: false,
      reason: "cross_uic",
      message: `Cross-UIC reject: PDF UIC ${input.draft.uic || "not recorded"} is not ${ODA.uic}. No rows written.`,
    };
  }

  const section = input.issuerSection ?? input.draft.issuerSection;
  if (!section) {
    return {
      ok: false,
      reason: "wrong_section",
      message: "Issuing section is required to sign out a temporary hand receipt. No rows written.",
    };
  }
  if (!canViewSection(input.actor, section)) {
    return {
      ok: false,
      reason: "section_isolation",
      message: `Section isolation: this identity cannot sign out a 2062 from ${SECTION_META[section].name}. No rows written.`,
    };
  }
  if (input.draft.issuerSection && input.draft.issuerSection !== section) {
    return {
      ok: false,
      reason: "wrong_section",
      message: `Wrong section: PDF issuer section is ${SECTION_META[input.draft.issuerSection].name}, selected issuer is ${SECTION_META[section].name}. No rows written.`,
    };
  }
  if (!["person", "section", "organization"].includes(input.draft.outDestinationKind)) {
    return {
      ok: false,
      reason: "wrong_destination",
      message:
        "Destinations v1 are person / section / organization only. No rows written.",
    };
  }
  if (!input.draft.outDestinationLabel.trim()) {
    return {
      ok: false,
      reason: "wrong_destination",
      message: "Destination label is required. No rows written.",
    };
  }
  if (input.draft.lines.length === 0) {
    return {
      ok: false,
      reason: "unreadable",
      message: "DA Form 2062 has no readable lines. No rows written.",
    };
  }
  if (input.requireReturnDate && !normalizeReturnDate(input.draft.returnDate)) {
    return {
      ok: false,
      reason: "return_date_required",
      message: "Return date is required. Nothing was written.",
    };
  }
  return { ok: true };
}

export function previewDa2062OutConflicts(draft: Pick<Da2062OutDraft, "lines" | "issuerSection">): SourceConflict[] {
  return previewDa2062Conflicts({
    lines: draft.lines,
    destinationKind: "section_shr",
    destinationSection: draft.issuerSection,
  });
}

export function planDa2062OutConfirm(input: {
  lines: Da2062InLine[];
  dispositions: LineDisposition[];
  conflicts: SourceConflict[];
  issuerSection?: SectionLetter | null;
  returnDate: string | null;
}): ReturnType<typeof planDa2062Confirm> & { canCommit: boolean } {
  const plan = planDa2062Confirm({
    lines: input.lines,
    dispositions: input.dispositions,
    conflicts: input.conflicts,
    sectionLetter: input.issuerSection ?? null,
  });
  return {
    ...plan,
    canCommit: plan.willWrite && Boolean(normalizeReturnDate(input.returnDate)),
  };
}

export function signedOutItem(line: SignedOutLine): PropertyItem {
  const holder = line.issuerSection
    ? Object.values(PEOPLE).find((person) => person.sectionLetter === line.issuerSection)
    : PEOPLE.ryan;
  return {
    id: `da2062-out-${line.importId}-${lineIdentity(line)}`,
    nsn: line.nsn,
    name: line.officialName ?? line.nomenclature,
    officialName: line.officialName ?? line.nomenclature,
    commonName: line.actualName ?? undefined,
    serial: line.serial,
    quantityRequired: line.quantity,
    quantityOnHand: line.quantity,
    accountabilityClass: "Accountable",
    networkClassification: "Unclassified",
    assignedToId: holder?.id ?? null,
    assignedToName: holder?.fullName ?? line.issuer,
    location: outDestinationLabelText({
      kind: line.outDestinationKind,
      label: line.outDestinationLabel,
      section: line.outDestinationKind === "section" ? parseSectionFromLabel(line.outDestinationLabel) : null,
    }),
    status: "signed_out",
    sourceReceipt: `DA Form 2062 out #${line.importId} · temporary hand receipt (not APSR)`,
    phrhId: PEOPLE.reyes.id,
    phrhName: ODA.phrhName,
    shrHolderId: holder?.id,
    shrHolderName: holder?.fullName ?? line.issuer,
    shrDocument: line.issuerSection ? sectionShrLabel(line.issuerSection) : `${ODA.name} hand receipt`,
    sectionLetter: line.issuerSection ?? undefined,
    components: [],
    photoData: line.photoData,
    detailHref: `/receipts/2062-out/history/${line.importId}`,
    returnDate: line.returnDate,
    signedOutTo: line.outDestinationLabel,
  };
}

function parseSectionFromLabel(label: string): SectionLetter | null {
  const match = label.match(/\b([BCDEF])\b/);
  return match ? (match[1] as SectionLetter) : null;
}

export function applySignedOutState(
  catalogItems: PropertyItem[],
  signedOut: SignedOutLine[],
): PropertyItem[] {
  const byKey = new Map(signedOut.map((line) => [signedForMatchKey(line), line]));
  const updated = catalogItems.map((item) => {
    const overlay = byKey.get(signedForMatchKey(item));
    if (!overlay) return item;
    return {
      ...item,
      status: "signed_out" as const,
      location: outDestinationLabelText({
        kind: overlay.outDestinationKind,
        label: overlay.outDestinationLabel,
        section:
          overlay.outDestinationKind === "section"
            ? parseSectionFromLabel(overlay.outDestinationLabel)
            : null,
      }),
      sourceReceipt: `DA Form 2062 out #${overlay.importId} · temporary hand receipt (not APSR)`,
      detailHref: `/receipts/2062-out/history/${overlay.importId}`,
      returnDate: overlay.returnDate,
      signedOutTo: overlay.outDestinationLabel,
    };
  });
  const existing = new Set(catalogItems.map((item) => signedForMatchKey(item)));
  const extra = signedOut.filter((line) => !existing.has(signedForMatchKey(line))).map(signedOutItem);
  return [...updated, ...extra];
}

export function defaultOutDispositions(
  lines: Da2062EnrichedLine[] | Da2062InLine[],
  conflicts: SourceConflict[],
): LineDisposition[] {
  return lines.map((line) => defaultDispositionForLine(line, conflicts));
}
