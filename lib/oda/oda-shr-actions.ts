"use server";

import { revalidatePath } from "next/cache";
import { getActor } from "@/lib/ledger/identity";
import { isOdaScope } from "./access";
import type { ActionResult } from "./da2062-actions";
import {
  filledCellCountMismatch,
  formatParsedCounts,
  isRyanSeptemberReceipt,
  odaMonthlySaveRefusal,
  parseGcssShrPdf,
  receiptDateLabel,
  shrDraftCounts,
  storedLinesMatch,
  type GcssShrDraft,
  type ShrParsedCounts,
} from "./gcss-shr";
import { deleteShrInject, ensureOdaStore, getInject, writeOdaMonthlyShr } from "./store";

const MAX_PDF_BYTES = 4_000_000;

export type ParseOdaShrResult =
  | {
      parsed: true;
      draft: GcssShrDraft;
      counts: ShrParsedCounts;
      dateLabel: string;
      countsText: string;
      mismatch: string | null;
      message: string;
    }
  | { parsed: false; message: string };

function fail(message: string): ActionResult {
  return { ok: false, message };
}

async function pdfFromForm(
  formData: FormData,
): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; message: string }> {
  const file = formData.get("pdf");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose a GCSS Sub-hand receipt PDF. Nothing was saved." };
  }
  if (file.size > MAX_PDF_BYTES) {
    return { ok: false, message: "That Sub-hand receipt PDF is too large. Nothing was saved." };
  }
  const namedPdf = file.name.toLowerCase().endsWith(".pdf");
  if (file.type && file.type !== "application/pdf" && !namedPdf) {
    return { ok: false, message: "Choose a GCSS Sub-hand receipt PDF. Nothing was saved." };
  }
  return { ok: true, bytes: new Uint8Array(await file.arrayBuffer()) };
}

export async function parseOdaMonthlyShr(formData: FormData): Promise<ParseOdaShrResult> {
  const actor = await getActor();
  if (!isOdaScope(actor)) {
    return {
      parsed: false,
      message: "ODA monthly Sub-hand receipt is limited to the ODA book. Nothing was saved.",
    };
  }
  const pdf = await pdfFromForm(formData);
  if (!pdf.ok) return { parsed: false, message: pdf.message };
  const parsed = parseGcssShrPdf(pdf.bytes);
  if (!parsed.ok) return { parsed: false, message: parsed.message };
  const counts = shrDraftCounts(parsed.draft);
  const mismatch = isRyanSeptemberReceipt(parsed.draft) ? filledCellCountMismatch(counts) : null;
  const dateLabel = receiptDateLabel(parsed.draft);
  const countsText = formatParsedCounts(counts);
  const summary = `Review the ${dateLabel} Sub-hand receipt for UIC ${parsed.draft.uic}. ${countsText}. Nothing was saved.`;
  return {
    parsed: true,
    draft: parsed.draft,
    counts,
    dateLabel,
    countsText,
    mismatch,
    message: mismatch ?? summary,
  };
}

export async function saveOdaMonthlyShr(formData: FormData): Promise<ActionResult> {
  const mode = await ensureOdaStore();
  if (mode !== "d1") {
    return fail("D1 is unavailable. This action was not written and no success is claimed.");
  }
  const actor = await getActor();
  if (!isOdaScope(actor)) {
    return fail("ODA monthly Sub-hand receipt is limited to the ODA book. Nothing was saved.");
  }
  const pdf = await pdfFromForm(formData);
  if (!pdf.ok) return fail(pdf.message);
  const parsed = parseGcssShrPdf(pdf.bytes);
  if (!parsed.ok) return fail(parsed.message);
  const refusal = odaMonthlySaveRefusal(parsed.draft, new Date());
  if (refusal) return fail(refusal);

  let injectId: number;
  try {
    const written = await writeOdaMonthlyShr({
      uic: parsed.draft.uic,
      year: parsed.draft.year,
      month: parsed.draft.month,
      day: parsed.draft.day,
      actorName: actor.fullName,
      lines: parsed.draft.lines.map((line) => ({
        lin: line.lin,
        nsn: line.nsn,
        nomenclature: line.nomenclature,
        ohQty: line.ohQty,
        serialCells: line.serialCells,
      })),
    });
    injectId = written.injectId;
  } catch {
    return fail("The Sub-hand receipt was not written. Nothing was saved.");
  }

  const stored = await getInject(injectId);
  const matched =
    stored != null &&
    storedLinesMatch(
      parsed.draft,
      stored.lines.map((line) => ({
        quantity: line.quantity,
        serial: line.serial,
        serialCells: line.serialCells,
      })),
    );
  if (!stored || !matched) {
    await deleteShrInject(injectId);
    return fail("The Sub-hand receipt rows were not stored. Nothing was saved.");
  }

  const storedDraft: GcssShrDraft = {
    ...parsed.draft,
    lines: stored.lines.map((line, index) => ({
      lin: parsed.draft.lines[index]?.lin ?? line.lin,
      nsn: parsed.draft.lines[index]?.nsn ?? line.nsn,
      nomenclature: line.nomenclature,
      ohQty: line.quantity,
      serialCells: line.serialCells,
    })),
  };
  const storedRefusal = odaMonthlySaveRefusal(storedDraft, new Date());
  if (storedRefusal) {
    await deleteShrInject(injectId);
    return fail(storedRefusal);
  }

  revalidatePath("/receipts");
  revalidatePath(`/receipts/history/${injectId}`);
  revalidatePath("/my-property");
  revalidatePath("/");
  return {
    ok: true,
    injectId,
    message: `Saved the ${receiptDateLabel(parsed.draft)} ODA Sub-hand receipt for UIC ${parsed.draft.uic}. ${formatParsedCounts(shrDraftCounts(storedDraft))}. Prior snapshots remain queryable. Companion to GCSS-Army, not the system of record.`,
  };
}
