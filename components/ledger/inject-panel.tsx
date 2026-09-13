"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { ActionResultNote } from "@/components/ledger/action-result";
import { DisabledAction } from "@/components/ledger/disabled-action";
import { Button } from "@/components/ui/button";
import { INJECT_BUTTON_LABEL, INJECT_FEED_LABEL, NOT_WIRED } from "@/lib/ledger/copy";
import { injectSectionChanges, type ActionResult } from "@/lib/oda/actions";
import type { PersistenceMode } from "@/lib/oda/store";
import type { SectionLetter } from "@/lib/oda/types";

export function InjectPanel({
  sectionLetter,
  persistence,
  canEdit,
}: {
  sectionLetter: SectionLetter;
  persistence: PersistenceMode;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [payload, setPayload] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const blocked = persistence !== "d1" || !canEdit;

  function run(useCanned: boolean) {
    startTransition(async () => {
      const next = await injectSectionChanges(
        sectionLetter,
        useCanned ? undefined : payload,
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
            Form 2062 is out of Sprint 1.
          </p>
        </div>
      </div>
      <div className="inject-body">
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
              <Button type="button" onClick={() => run(!payload.trim())} disabled={pending}>
                <UploadCloud />
                {INJECT_BUTTON_LABEL}
              </Button>
              <DisabledAction label="Accept as current" reason={NOT_WIRED.accept} variant="outline" />
            </>
          )}
        </div>
        {sectionLetter === "E" ? (
          <p className="inject-hint">
            Empty payload injects the canned Echo extract: add AN/PRC-158, drop the 163, change
            charger quantity. Mismatches open discrepancies instead of merging.
          </p>
        ) : null}
        <ActionResultNote result={result} />
      </div>
    </section>
  );
}
