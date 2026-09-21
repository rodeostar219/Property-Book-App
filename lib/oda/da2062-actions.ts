"use server";

import { revalidatePath } from "next/cache";
import { getActor } from "@/lib/ledger/identity";
import {
  ADD_TO_SIGNED_FOR_LABEL,
  DA2062_MAX_PDF_BYTES,
  defaultDispositionForLine,
  destinationLabel,
  planDa2062Confirm,
} from "./da2062-confirm";
import { ensureOdaStore, listPictureBooks, writeDa2062In } from "./store";
import type { Da2062EnrichedLine, Da2062InDraft } from "./da2062";
import type { Da2062DestinationKind, LineDisposition, SectionLetter, SourceConflict } from "./types";
import type { Da2062FixtureName } from "./da2062-fixtures";

export type ActionResult =
  | { ok: true; message: string; injectId?: number; importId?: number }
  | { ok: false; message: string };

export type ParseDa2062Result =
  | {
      ok: true;
      message: string;
      draft: Da2062InDraft;
      enriched: Da2062EnrichedLine[];
      conflicts: SourceConflict[];
      defaultDispositions: LineDisposition[];
    }
  | { ok: false; message: string; reason?: string };

function fail(message: string): ActionResult {
  return { ok: false, message };
}

async function requireD1(): Promise<ActionResult | null> {
  const mode = await ensureOdaStore();
  if (mode !== "d1") {
    return fail("D1 is unavailable. This action was not written and no success is claimed.");
  }
  return null;
}

function readDestination(formData: FormData): {
  kind: Da2062DestinationKind;
  section: SectionLetter | null;
} {
  const kind = String(formData.get("destinationKind") ?? "section_shr");
  const sectionRaw = String(formData.get("destinationSection") ?? "").toUpperCase();
  const section = (["B", "C", "D", "E", "F"] as const).includes(sectionRaw as SectionLetter)
    ? (sectionRaw as SectionLetter)
    : null;
  return {
    kind: kind === "oda_hr" ? "oda_hr" : "section_shr",
    section: kind === "oda_hr" ? null : section,
  };
}

async function pdfFromForm(formData: FormData): Promise<
  | { ok: true; filename: string; bytes: Uint8Array }
  | { ok: false; message: string }
> {
  const fixtureName = String(formData.get("fixture") ?? "").trim();
  if (fixtureName) {
    try {
      const { da2062Fixture } = await import("./da2062-fixtures");
      const fixture = da2062Fixture(fixtureName as Da2062FixtureName);
      return { ok: true, filename: fixture.filename, bytes: fixture.bytes };
    } catch {
      return { ok: false, message: "Unknown DA Form 2062 fixture. Nothing was written." };
    }
  }
  const file = formData.get("pdf");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Upload a DA Form 2062 PDF. Nothing was written." };
  }
  if (file.size > DA2062_MAX_PDF_BYTES) {
    return {
      ok: false,
      message: `PDF is too large for the Sprint 2 store (${Math.round(DA2062_MAX_PDF_BYTES / 1000)} KB). Nothing was written.`,
    };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { ok: true, filename: file.name || "DA-Form-2062.pdf", bytes };
}

export async function parseDa2062In(formData: FormData): Promise<ParseDa2062Result> {
  const actor = await getActor();
  const destination = readDestination(formData);
  const pdf = await pdfFromForm(formData);
  if (!pdf.ok) return pdf;
  const {
    parseDa2062Pdf,
    validateDa2062InDestination,
    enrichDa2062Lines,
    previewDa2062Conflicts,
    bytesToBase64,
  } = await import("./da2062");
  const parsed = parseDa2062Pdf(pdf.bytes, pdf.filename, destination);
  if (!parsed.ok) return { ok: false, message: parsed.message, reason: parsed.reason };
  const check = validateDa2062InDestination({
    actor,
    destinationKind: destination.kind,
    destinationSection: destination.section,
    draft: parsed.draft,
  });
  if (!check.ok) return { ok: false, message: check.message, reason: check.reason };

  const pictures = (await ensureOdaStore()) === "d1" ? await listPictureBooks() : [];
  const draft: Da2062InDraft = {
    ...parsed.draft,
    sourcePdfBase64: bytesToBase64(pdf.bytes),
    sourcePdfContentType: "application/pdf",
  };
  const enriched = enrichDa2062Lines(draft.lines, pictures);
  const conflicts = previewDa2062Conflicts(draft);
  const defaultDispositions = enriched.map((line) => defaultDispositionForLine(line, conflicts));
  return {
    ok: true,
    message:
      "Parsed for Confirm. Nothing was written to the hand receipt, Sub-hand receipt (SHR), or history. Confirm is required even when the parse is perfect.",
    draft,
    enriched,
    conflicts,
    defaultDispositions,
  };
}

export async function confirmDa2062In(
  draftJson: string,
  dispositionsJson: string,
): Promise<ActionResult> {
  const blocked = await requireD1();
  if (blocked) return blocked;
  const actor = await getActor();
  let draft: Da2062InDraft;
  let dispositions: LineDisposition[];
  try {
    draft = JSON.parse(draftJson) as Da2062InDraft;
    dispositions = JSON.parse(dispositionsJson) as LineDisposition[];
  } catch {
    return fail("Confirm payload is not valid JSON. Nothing was written.");
  }
  if (!draft?.lines?.length || !draft.uic) {
    return fail("Confirm payload is incomplete. Nothing was written.");
  }
  if (!Array.isArray(dispositions) || dispositions.length !== draft.lines.length) {
    return fail("Per-line accept / skip / flag is required. Nothing was written.");
  }
  const { validateDa2062InDestination, previewDa2062Conflicts } = await import("./da2062");
  const check = validateDa2062InDestination({
    actor,
    destinationKind: draft.destinationKind,
    destinationSection: draft.destinationSection,
    draft,
  });
  if (!check.ok) return fail(check.message);

  const plan = planDa2062Confirm({
    lines: draft.lines,
    dispositions,
    conflicts: previewDa2062Conflicts(draft),
    sectionLetter: draft.destinationSection,
  });
  if (!plan.willWrite) {
    return fail("Cancel / all lines skipped. No rows written.");
  }

  const result = await writeDa2062In({ draft, dispositions, actorName: actor.fullName });
  revalidatePath("/receipts/2062-in");
  revalidatePath(`/receipts/2062-in/history/${result.importId}`);
  revalidatePath("/exceptions");
  revalidatePath("/receipts");
  revalidatePath("/documents");
  revalidatePath("/");
  if (draft.destinationSection) revalidatePath(`/sections/${draft.destinationSection}`);
  revalidatePath("/my-property");
  return {
    ok: true,
    importId: result.importId,
    message: `${ADD_TO_SIGNED_FOR_LABEL}: ${result.acceptedCount} line${result.acceptedCount === 1 ? "" : "s"} added to ${destinationLabel(draft.destinationKind, draft.destinationSection)}. History #${result.importId} asserted in D1. ${result.discrepancyKeys.length} discrepancy${result.discrepancyKeys.length === 1 ? "" : "ies"} opened. Not Accept theater.`,
  };
}
