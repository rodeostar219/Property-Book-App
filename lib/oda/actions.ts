"use server";

import { revalidatePath } from "next/cache";
import { getActor } from "@/lib/ledger/identity";
import { assertCanViewSection } from "./access";
import { catalogLineOrThrow } from "./workspace";
import { demoIncomingEchoShr } from "./catalog";
import { stencilDataUri } from "./picture-book";
import { ensureOdaStore, readAccountabilitySnapshot, writeInject, writePictureBook } from "./store";
import type { ElectronicShrLine, SectionLetter } from "./types";

export type { ActionResult, ParseDa2062Result } from "./da2062-actions";
export { confirmDa2062In, parseDa2062In } from "./da2062-actions";
import type { ActionResult } from "./da2062-actions";

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
