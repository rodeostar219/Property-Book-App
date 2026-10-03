"use client";

import { useState, useTransition, type FormEvent } from "react";
import { ActionResultNote } from "@/components/ledger/action-result";
import { SerialGridTable } from "@/components/ledger/serial-grid";
import { filledGridCellCount } from "@/lib/oda/months";
import { parseOdaMonthlyShr, saveOdaMonthlyShr, type ParseOdaShrResult } from "@/lib/oda/oda-shr-actions";
import type { PersistenceMode } from "@/lib/oda/store";

export function OdaMonthlyPanel({
  persistence,
  canSave,
}: {
  persistence: PersistenceMode;
  canSave: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParseOdaShrResult | null>(null);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; message: string; injectId?: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const storageReady = persistence === "d1" && canSave;

  function onCancel() {
    setPreview(null);
    setSaveResult(null);
    setFile(null);
  }

  function onReview(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setPreview({ parsed: false, message: "Choose a GCSS Sub-hand receipt PDF. Nothing was saved." });
      setSaveResult(null);
      return;
    }
    const data = new FormData();
    data.set("pdf", file);
    startTransition(async () => {
      setSaveResult(null);
      const next = await parseOdaMonthlyShr(data);
      setPreview(next);
    });
  }

  function onSave() {
    if (!file || !preview || !preview.parsed || preview.mismatch || !storageReady) return;
    const data = new FormData();
    data.set("pdf", file);
    startTransition(async () => {
      const next = await saveOdaMonthlyShr(data);
      setSaveResult(next);
    });
  }

  const reviewed = preview && preview.parsed ? preview : null;

  return (
    <form onSubmit={onReview}>
      <h3>ODA Monthly Sub-hand receipt</h3>
      <p>
        Upload the GCSS Sub-hand receipt PDF. The receipt date sets the month. Review the parsed rows before
        anything is saved. Companion to GCSS-Army, not the system of record.
      </p>
      {!canSave ? (
        <p className="lb-gap">ODA monthly Sub-hand receipt is limited to the ODA book. Nothing was saved.</p>
      ) : null}
      {persistence !== "d1" ? (
        <p className="lb-gap">D1 is unavailable. This action was not written and no success is claimed.</p>
      ) : null}
      <label className="lb-field">
        GCSS Sub-hand receipt PDF
        <input
          aria-label="GCSS Sub-hand receipt PDF"
          type="file"
          accept="application/pdf,.pdf"
          disabled={pending}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setPreview(null);
            setSaveResult(null);
          }}
        />
      </label>
      <button type="submit" disabled={pending || !file}>
        Review Sub-hand receipt
      </button>

      {preview && !preview.parsed ? (
        <p className="action-result fail" role="status">
          {preview.message}
        </p>
      ) : null}

      {reviewed ? (
        <div className="lb-detail" aria-live="polite">
          {saveResult?.ok ? null : reviewed.mismatch ? (
            <p className="action-result fail" role="status">
              {reviewed.mismatch}
            </p>
          ) : (
            <p className="lb-note">{reviewed.message}</p>
          )}
          <p>UIC {reviewed.draft.uic}</p>
          <p>{reviewed.dateLabel}</p>
          <ul>
            <li>{reviewed.counts.endItems} {reviewed.counts.endItems === 1 ? "line" : "lines"}</li>
            <li>OH Qty {reviewed.counts.ohQty}</li>
            <li>Filled cells {reviewed.counts.filledCells}</li>
          </ul>
          <p>36 lines, OH Qty 105, and 184 filled cells.</p>
          <p>This PDF does not mark LotNo. An unmarked cell is not a serial. A blank cell is not filled.</p>
          <p>{reviewed.countsText}. OH Qty is the sum of OH Qty.</p>
          {reviewed.draft.lines.map((line, index) => (
            <article key={`${line.lin ?? "lin"}-${line.nsn ?? "nsn"}-${index}`}>
              <h4>
                {line.nomenclature}
                {line.lin ? ` · LIN ${line.lin}` : ""}
                {line.nsn ? ` · NSN ${line.nsn}` : ""}
              </h4>
              <p>OH Qty {line.ohQty}</p>
              <p>Filled cells {filledGridCellCount(line.serialCells)}</p>
              <SerialGridTable cells={line.serialCells} />
            </article>
          ))}
          {saveResult?.ok ? null : (
            <div className="picture-book-actions">
              <button
                type="button"
                onClick={onSave}
                disabled={pending || Boolean(reviewed.mismatch) || !storageReady}
              >
                Save Sub-hand receipt
              </button>
              <button type="button" onClick={onCancel} disabled={pending}>
                Cancel
              </button>
            </div>
          )}
        </div>
      ) : null}

      {saveResult ? <ActionResultNote result={saveResult} /> : null}
      {saveResult?.ok && saveResult.injectId ? (
        <p>
          <a href={`/receipts/history/${saveResult.injectId}`}>Open this Sub-hand receipt</a>
        </p>
      ) : null}
    </form>
  );
}
