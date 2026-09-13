"use server";

import { revalidatePath } from "next/cache";
import { getActor } from "@/lib/ledger/identity";
import { assertCanViewSection } from "./access";
import { catalogLineOrThrow } from "./workspace";
import { demoIncomingEchoShr } from "./catalog";
import { stencilDataUri } from "./picture-book";
import {
  ADD_TO_SIGNED_FOR_LABEL,
  bytesToBase64,
  DA2062_MAX_PDF_BYTES,
  destinationLabel,
  enrichDa2062Lines,
  parseDa2062Pdf,
  planDa2062Confirm,
  previewDa2062Conflicts,
  validateDa2062InDestination,
  type Da2062EnrichedLine,
  type Da2062InDraft,
} from "./da2062";
import { da2062Fixture, type Da2062FixtureName } from "./da2062-fixtures";
import {
  ensureOdaStore,
  listPictureBooks,
  readAccountabilitySnapshot,
  writeDa2062In,
  writeInject,
  writePictureBook,
} from "./store";
import type { Da2062DestinationKind, ElectronicShrLine, LineDisposition, SectionLetter, SourceConflict } from "./types";

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

export async function replaceLinePhoto(
  lineKey: string,
  formData: FormData,
): Promise<ActionResult> {
  const blocked = await requireD1();
  if (blocked) return blocked;
  const actor = await getActor();
  const line = catalogLineOrThrow(lineKey);
  try {
    assertCanViewSection(actor, line.sectionLetter);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Section isolation blocked this write.");
  }

  const file = formData.get("photo");
  let photoData: string | null = null;
  let photoContentType: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > 1_500_000) {
      return fail("Photo is too large for the Sprint 1 visual store (1.5 MB).");
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    photoContentType = file.type || "application/octet-stream";
    photoData = `data:${photoContentType};base64,${btoa(binary)}`;
  } else {
    photoData = stencilDataUri(
      String(formData.get("commonName") ?? line.commonName),
      line.officialName,
    );
    photoContentType = "image/svg+xml";
  }

  const before = await readAccountabilitySnapshot(lineKey);
  await writePictureBook({
    lineKey,
    officialName: line.officialName,
    commonName: String(formData.get("commonName") ?? line.commonName),
    photoData,
    photoContentType,
    actorName: actor.fullName,
  });
  const after = await readAccountabilitySnapshot(lineKey);
  if (before && after) {
    const qtyBefore = "quantity" in before ? before.quantity : line.quantity;
    const qtyAfter = "quantity" in after ? after.quantity : line.quantity;
    const serialBefore = "serialNumber" in before ? before.serialNumber : line.serial;
    const serialAfter = "serialNumber" in after ? after.serialNumber : line.serial;
    if (qtyBefore !== qtyAfter || serialBefore !== serialAfter) {
      return fail("Aborted: picture book write must not change accountability.");
    }
  }

  revalidatePath(`/lines/${lineKey}`);
  revalidatePath("/my-property");
  revalidatePath("/property");
  return { ok: true, message: "Picture book updated in D1. Accountability line unchanged." };
}

export async function updateCommonName(
  lineKey: string,
  commonName: string,
): Promise<ActionResult> {
  const blocked = await requireD1();
  if (blocked) return blocked;
  const actor = await getActor();
  const line = catalogLineOrThrow(lineKey);
  try {
    assertCanViewSection(actor, line.sectionLetter);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Section isolation blocked this write.");
  }
  const trimmed = commonName.trim();
  if (!trimmed) return fail("Common / actual name is required.");
  const before = await readAccountabilitySnapshot(lineKey);
  await writePictureBook({
    lineKey,
    officialName: line.officialName,
    commonName: trimmed,
    photoData: null,
    photoContentType: null,
    actorName: actor.fullName,
  });
  const after = await readAccountabilitySnapshot(lineKey);
  const beforeOfficial =
    before && "officialNomenclature" in before
      ? before.officialNomenclature
      : before && "officialName" in before
        ? before.officialName
        : line.officialName;
  const afterOfficial =
    after && "officialNomenclature" in after
      ? after.officialNomenclature
      : after && "officialName" in after
        ? after.officialName
        : line.officialName;
  if (beforeOfficial !== afterOfficial) {
    return fail("Aborted: visual name write must not change official accountability nomenclature.");
  }
  revalidatePath(`/lines/${lineKey}`);
  return { ok: true, message: "Common / actual name written to the picture-book layer only." };
}

export async function injectSectionChanges(
  sectionLetter: SectionLetter,
  payloadJson?: string,
): Promise<ActionResult> {
  const blocked = await requireD1();
  if (blocked) return blocked;
  const actor = await getActor();
  try {
    assertCanViewSection(actor, sectionLetter);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Section isolation blocked this write.");
  }

  let incoming;
  if (payloadJson?.trim()) {
    try {
      const parsed = JSON.parse(payloadJson) as ElectronicShrLine[];
      if (!Array.isArray(parsed)) return fail("Electronic SHR payload must be an array of lines.");
      incoming = parsed;
    } catch {
      return fail("Electronic SHR payload is not valid JSON.");
    }
  } else if (sectionLetter === "E") {
    incoming = demoIncomingEchoShr();
  } else {
    return fail("Sprint 1 ships a canned Echo electronic SHR. Paste JSON to inject another section.");
  }

  const result = await writeInject({
    sectionLetter,
    incoming,
    actorName: actor.fullName,
  });
  revalidatePath("/receipts");
  revalidatePath(`/receipts/history/${result.injectId}`);
  revalidatePath("/exceptions");
  revalidatePath(`/sections/${sectionLetter}`);
  return {
    ok: true,
    injectId: result.injectId,
    message: `Sub-hand receipt update written as inject #${result.injectId}. ${result.discrepancyKeys.length} source mismatch${result.discrepancyKeys.length === 1 ? "" : "es"} opened as discrepancies. Prior snapshots remain queryable.`,
  };
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
  return {
    ok: true,
    message:
      "Parsed for Confirm. Nothing was written to the hand receipt, Sub-hand receipt (SHR), or history. Confirm is required even when the parse is perfect.",
    draft,
    enriched,
    conflicts,
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
