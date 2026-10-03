"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { ActionResultNote } from "@/components/ledger/action-result";
import { DisabledAction } from "@/components/ledger/disabled-action";
import { Button } from "@/components/ui/button";
import { INJECT_BUTTON_LABEL, INJECT_FEED_LABEL, NOT_WIRED } from "@/lib/ledger/copy";
import { injectSectionChanges, type ActionResult } from "@/lib/oda/actions";
import { MONTH_NAMES, validateMonthlyPeriod } from "@/lib/oda/months";
import type { PersistenceMode } from "@/lib/oda/store";
import type { SectionLetter } from "@/lib/oda/types";

export function InjectPanel({
  sectionLetter,
  persistence,
  canEdit,
  nowIso,
}: {
  sectionLetter: SectionLetter;
  persistence: PersistenceMode;
  canEdit: boolean;
  nowIso: string;
}) {
  const router = useRouter();
  const now = new Date(nowIso);
  const [year, setYear] = useState(String(now.getUTCFullYear()));
  const [month, setMonth] = useState("");
  const [payload, setPayload] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const blocked = persistence !== "d1" || !canEdit;
  const periodError = month === "" ? null : validateMonthlyPeriod(Number(year), Number(month), now);
  const periodReady = month !== "" && !periodError;

  function run(useCanned: boolean) {
    if (!periodReady) {
      const message = periodError ?? "Month and year are required for a monthly Sub-hand receipt. Nothing was saved.";
      setResult({ ok: false, message });
      return;
    }
    startTransition(async () => {
      const next = await injectSectionChanges(
        sectionLetter,
        useCanned ? undefined : payload,
        { year: Number(year), month: Number(month) },
      );
      setResult(next);
      if (next.ok && next.injectId) {
        router.push(`/receipts/history/${next.injectId}`);
      }
    });
  }

  return (
    <section className="panel inject-panel">
      <div className="panel-head">
        <div>
          <h2>{INJECT_FEED_LABEL}</h2>
          <p>
            Electronic 18E Sub-hand receipt (SHR). Diff writes versioned history; mismatches
            open a discrepancy. Not Accept theater. Prior snapshots stay queryable. Scanned DA
            Form 2062 in is a separate confirm-before-write flow.
          </p>
        </div>
      </div>
      <div className="inject-body">
        <p className="lb-gap">
          Review: section {sectionLetter} monthly Sub-hand receipt
          {month ? ` for ${MONTH_NAMES[Number(month) - 1]} ${year}` : ""}. This writes a versioned
          update in this workspace. It is not Accept theater.
        </p>
        <div className="lb-period">
          <label>
            Month
            <select
              aria-label="Sub-hand receipt month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              disabled={pending}
            >
              <option value="">Select month</option>
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={String(index + 1)}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Year
            <select
              aria-label="Sub-hand receipt year"
              value={year}
              onChange={(event) => setYear(event.target.value)}
              disabled={pending}
            >
              {[0, 1, 2].map((offset) => {
                const value = now.getUTCFullYear() - offset;
                return (
                  <option key={value} value={String(value)}>
                    {value}
                  </option>
                );
              })}
            </select>
          </label>
        </div>
        {periodError ? <p className="action-result fail">{periodError}</p> : null}
        <label>
          Optional electronic SHR JSON
          <textarea
            value={payload}
            onChange={(event) => setPayload(event.target.value)}
            placeholder='[{ "nsn": "...", "serial": "...", "nomenclature": "...", "quantity": 1, "sectionLetter": "E", "lin": null }]'
            disabled={blocked || pending}
            rows={5}
          />
        </label>
        <div className="picture-book-actions">
          {blocked ? (
            <>
              <DisabledAction
                label={INJECT_BUTTON_LABEL}
                reason={!canEdit ? NOT_WIRED.sectionLocked : NOT_WIRED.d1Down}
                icon={<UploadCloud />}
              />
              <DisabledAction label="Accept as current" reason={NOT_WIRED.accept} variant="outline" />
            </>
          ) : (
            <>
              <Button type="button" onClick={() => run(!payload.trim())} disabled={pending || !periodReady}>
                <UploadCloud />
                {INJECT_BUTTON_LABEL}
              </Button>
              <DisabledAction label="Accept as current" reason={NOT_WIRED.accept} variant="outline" />
            </>
          )}
        </div>
        {sectionLetter === "E" ? (
          <p className="inject-hint">
            An empty payload uses the canned Echo extract: add AN/PRC-158, drop the 163, change
            charger quantity. Mismatches open discrepancies instead of merging.
          </p>
        ) : null}
        <ActionResultNote result={result} />
      </div>
    </section>
  );
}
