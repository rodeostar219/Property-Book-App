"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, FileScan, UploadCloud } from "lucide-react";
import { ActionResultNote } from "@/components/ledger/action-result";
import { DisabledAction } from "@/components/ledger/disabled-action";
import { Button } from "@/components/ui/button";
import { DA_2062_IN_NOTE, NOT_WIRED, formatSerial } from "@/lib/ledger/copy";
import {
  confirmDa2062In,
  parseDa2062In,
  type ActionResult,
  type ParseDa2062Result,
} from "@/lib/oda/actions";
import { destinationLabel } from "@/lib/oda/da2062";
import type { Da2062FixtureName } from "@/lib/oda/da2062-fixtures";
import type { PersistenceMode } from "@/lib/oda/store";
import type { Actor } from "@/lib/ledger/types";
import { SECTION_LETTERS, SECTION_META, type Da2062DestinationKind, type SectionLetter } from "@/lib/oda/types";

type Props = {
  actor: Actor;
  persistence: PersistenceMode;
  defaultKind: Da2062DestinationKind;
  defaultSection: SectionLetter | null;
};

export function Da2062InPanel({ actor, persistence, defaultKind, defaultSection }: Props) {
  const router = useRouter();
  const [kind, setKind] = useState<Da2062DestinationKind>(defaultKind);
  const [section, setSection] = useState<SectionLetter | null>(
    defaultSection ?? actor.sectionLetter ?? "E",
  );
  const [file, setFile] = useState<File | null>(null);
  const [parse, setParse] = useState<ParseDa2062Result | null>(null);
  const [commit, setCommit] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const canOdaHr = actor.scope === "oda" || actor.role === "pm";
  const confirmBlocked = persistence !== "d1";

  const destinationReady = kind === "oda_hr" ? canOdaHr : Boolean(section);

  function destinationData() {
    const data = new FormData();
    data.set("destinationKind", kind);
    if (kind === "section_shr" && section) data.set("destinationSection", section);
    return data;
  }

  function runParse(extra: FormData) {
    startTransition(async () => {
      setCommit(null);
      const data = destinationData();
      extra.forEach((value, key) => data.set(key, value));
      const next = await parseDa2062In(data);
      setParse(next);
    });
  }

  function onUpload(event: React.FormEvent) {
    event.preventDefault();
    const data = new FormData();
    if (file) data.set("pdf", file);
    runParse(data);
  }

  function onFixture(name: Da2062FixtureName) {
    const data = new FormData();
    data.set("fixture", name);
    runParse(data);
  }

  function onConfirm() {
    if (!parse || !parse.ok) return;
    startTransition(async () => {
      const next = await confirmDa2062In(JSON.stringify(parse.draft));
      setCommit(next);
      if (next.ok && next.importId) {
        router.push(`/receipts/2062-in/history/${next.importId}`);
      }
    });
  }

  const fixtures = useMemo(() => {
    const echo: { name: Da2062FixtureName; label: string }[] = [
      { name: "electronic-echo", label: "Electronic Echo sample" },
      { name: "ocr-echo", label: "Scanned / OCR Echo sample" },
    ];
    if (canOdaHr) echo.push({ name: "electronic-oda-hr", label: "Electronic ODA HR sample" });
    return echo;
  }, [canOdaHr]);

  return (
    <section className="panel da2062-panel">
      <div className="panel-head">
        <div>
          <h2>Upload DA Form 2062 in</h2>
          <p>{DA_2062_IN_NOTE}</p>
        </div>
      </div>
      <form className="da2062-body" onSubmit={onUpload}>
        <fieldset className="da2062-destinations">
          <legend>Signed-for destination</legend>
          <label className={`import-types-card ${kind === "section_shr" ? "selected" : ""}`}>
            <input
              type="radio"
              name="destinationKind"
              checked={kind === "section_shr"}
              onChange={() => setKind("section_shr")}
            />
            <b>Section Sub-hand receipt (SHR)</b>
            <span>Bravo–Fox / Echo-style section holder</span>
          </label>
          <label className={`import-types-card ${kind === "oda_hr" ? "selected" : ""} ${!canOdaHr ? "locked" : ""}`}>
            <input
              type="radio"
              name="destinationKind"
              checked={kind === "oda_hr"}
              disabled={!canOdaHr}
              onChange={() => setKind("oda_hr")}
            />
            <b>ODA hand receipt</b>
            <span>{canOdaHr ? "PHRH destination" : "ODA / PM only — section isolation"}</span>
          </label>
        </fieldset>

        {kind === "section_shr" ? (
          <label>
            Section holder
            <select
              value={section ?? ""}
              onChange={(event) => setSection(event.target.value as SectionLetter)}
            >
              {SECTION_LETTERS.map((letter) => (
                <option key={letter} value={letter}>
                  {SECTION_META[letter].name} ({letter}) · {SECTION_META[letter].mos}{" "}
                  {actor.sectionLetter && actor.sectionLetter !== letter ? "· other section" : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="dropzone">
          <UploadCloud />
          <strong>{file ? file.name : "Drop or choose a DA Form 2062 PDF"}</strong>
          <span>Electronic / fillable or scanned. Both end on the same confirm screen.</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <div className="picture-book-actions">
          <Button type="submit" disabled={pending || !destinationReady || !file}>
            <FileScan />
            Parse for confirm
          </Button>
          {fixtures.map((fixture) => (
            <Button
              key={fixture.name}
              type="button"
              variant="outline"
              disabled={pending || !destinationReady}
              onClick={() => onFixture(fixture.name)}
            >
              {fixture.label}
            </Button>
          ))}
          <DisabledAction label="2062 out" reason={NOT_WIRED.da2062Out} variant="outline" />
        </div>
        <p className="inject-hint">
          Parse never writes. Wrong section or cross-UIC rejects with no rows. Toast is not a commit.
        </p>
      </form>

      {parse && !parse.ok ? <ActionResultNote result={parse} /> : null}

      {parse?.ok ? (
        <div className="da2062-confirm">
          <div className="panel-head">
            <div>
              <h2>Confirm before write</h2>
              <p>
                Human accept is required even on a perfect {parse.draft.parsePath === "electronic" ? "electronic" : "scanned / OCR"} parse.
              </p>
            </div>
            <span className={`pill ${parse.draft.parsePath === "electronic" ? "green" : "amber"}`}>
              {parse.draft.parsePath === "electronic" ? "Electronic extract" : "Scanned / OCR degraded"}
            </span>
          </div>
          <dl className="receipt-meta da2062-meta">
            <div>
              <small>Issuer</small>
              <strong>{parse.draft.issuer}</strong>
            </div>
            <div>
              <small>Gaining party / section</small>
              <strong>
                {parse.draft.gainingParty}
                {parse.draft.gainingSection ? ` · ${SECTION_META[parse.draft.gainingSection].name}` : ""}
              </strong>
            </div>
            <div>
              <small>Destination</small>
              <strong>{destinationLabel(parse.draft.destinationKind, parse.draft.destinationSection)}</strong>
            </div>
            <div>
              <small>UIC</small>
              <strong>{parse.draft.uic}</strong>
            </div>
          </dl>
          {parse.draft.warnings.length > 0 ? (
            <ul className="da2062-warnings">
              {parse.draft.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Official / actual</th>
                  <th>NSN / LIN</th>
                  <th>Serial</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                {parse.enriched.map((line, index) => (
                  <tr key={`${line.nsn}-${line.serial}-${index}`}>
                    <td>
                      {line.photoData ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="da2062-thumb" src={line.photoData} alt="" />
                      ) : (
                        <span className="photo-empty da2062-thumb-empty">none</span>
                      )}
                    </td>
                    <td>
                      <b>{line.officialName}</b>
                      <small>Actual: {line.actualName ?? "not recorded"}</small>
                    </td>
                    <td>
                      <code>{line.nsn}</code>
                      <b>{line.lin ?? "LIN not recorded"}</b>
                    </td>
                    <td>
                      <strong>{formatSerial(line.serial)}</strong>
                    </td>
                    <td>{line.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="da2062-conflicts">
            <h3>Conflicts stay discrepancies</h3>
            {parse.conflicts.length === 0 ? (
              <p className="inject-hint">No HR / tracker / picture mismatches on this extract.</p>
            ) : (
              parse.conflicts.map((conflict) => (
                <article key={`${conflict.identityKey}-${conflict.sourceA}-${conflict.sourceB}`}>
                  <b>{conflict.issue}</b>
                  <p>
                    {conflict.factA} vs {conflict.factB}
                  </p>
                  <small>{conflict.action}</small>
                </article>
              ))
            )}
          </div>
          <div className="picture-book-actions da2062-confirm-actions">
            {confirmBlocked ? (
              <DisabledAction
                label="Confirm custody in"
                reason={NOT_WIRED.d1Down}
                icon={<ArrowDownToLine />}
              />
            ) : (
              <Button type="button" onClick={onConfirm} disabled={pending}>
                <ArrowDownToLine />
                Confirm custody in
              </Button>
            )}
            <Button type="button" variant="outline" disabled={pending} onClick={() => setParse(null)}>
              Cancel — no write
            </Button>
          </div>
          <p className="inject-hint">
            Confirm writes a responsibility / custody-in event and versioned history, attaches the
            source PDF, and opens discrepancies. It does not invent APSR accountability or merge layers.
          </p>
          <ActionResultNote result={commit} />
        </div>
      ) : null}
    </section>
  );
}
