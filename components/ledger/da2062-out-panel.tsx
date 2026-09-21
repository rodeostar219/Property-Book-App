"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpFromLine, FileScan, UploadCloud } from "lucide-react";
import { ActionResultNote } from "@/components/ledger/action-result";
import { DisabledAction } from "@/components/ledger/disabled-action";
import { Button } from "@/components/ui/button";
import {
  ADD_TEMPORARY_HAND_RECEIPT,
  DA_2062_OUT_NOTE,
  NOT_WIRED,
  formatSerial,
} from "@/lib/ledger/copy";
import {
  confirmDa2062Out,
  parseDa2062Out,
  type ActionResult,
  type ParseDa2062OutResult,
} from "@/lib/oda/actions";
import { PEOPLE } from "@/lib/oda/catalog";
import {
  OUT_ORGANIZATIONS,
  outDestinationLabelText,
  planDa2062OutConfirm,
  returnDateWarnings,
  todayIso,
} from "@/lib/oda/da2062-out";
import type { Da2062OutFixtureName } from "@/lib/oda/da2062-out-fixtures";
import { identityKey } from "@/lib/oda/identity-key";
import type { PersistenceMode } from "@/lib/oda/store";
import type { Actor } from "@/lib/ledger/types";
import {
  SECTION_LETTERS,
  SECTION_META,
  type Da2062OutDestinationKind,
  type LineDisposition,
  type SectionLetter,
} from "@/lib/oda/types";

type Props = {
  actor: Actor;
  persistence: PersistenceMode;
  defaultSection: SectionLetter | null;
};

const PERSON_OPTIONS = Object.values(PEOPLE);

function defaultReturnDate(): string {
  const asOf = todayIso();
  const date = new Date(`${asOf}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 14);
  return date.toISOString().slice(0, 10);
}

export function Da2062OutPanel({ actor, persistence, defaultSection }: Props) {
  const router = useRouter();
  const canPickIssuer = actor.scope === "oda" || actor.role === "pm";
  const [issuerSection, setIssuerSection] = useState<SectionLetter>(
    defaultSection ?? actor.sectionLetter ?? "E",
  );
  const [kind, setKind] = useState<Da2062OutDestinationKind>("person");
  const [personId, setPersonId] = useState(PEOPLE.nguyen.id);
  const [orgLabel, setOrgLabel] = useState<string>(OUT_ORGANIZATIONS[0]);
  const [destinationSection, setDestinationSection] = useState<SectionLetter>("B");
  const [returnDate, setReturnDate] = useState(defaultReturnDate);
  const [file, setFile] = useState<File | null>(null);
  const [parse, setParse] = useState<ParseDa2062OutResult | null>(null);
  const [dispositions, setDispositions] = useState<LineDisposition[]>([]);
  const [confirmReturnDate, setConfirmReturnDate] = useState<string>("");
  const [commit, setCommit] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const confirmBlocked = persistence !== "d1";

  function destinationLabelForForm(): string {
    if (kind === "person") {
      return PERSON_OPTIONS.find((person) => person.id === personId)?.fullName ?? PEOPLE.nguyen.fullName;
    }
    if (kind === "section") return `${SECTION_META[destinationSection].name} (${destinationSection})`;
    return orgLabel;
  }

  function destinationData() {
    const data = new FormData();
    data.set("issuerSection", issuerSection);
    data.set("outDestinationKind", kind);
    data.set("outDestinationLabel", destinationLabelForForm());
    if (kind === "section") data.set("destinationSection", destinationSection);
    if (returnDate) data.set("returnDate", returnDate);
    return data;
  }

  function runParse(extra: FormData) {
    startTransition(async () => {
      setCommit(null);
      const data = destinationData();
      extra.forEach((value, key) => data.set(key, value));
      const next = await parseDa2062Out(data);
      setParse(next);
      if (next.ok) {
        setDispositions(next.defaultDispositions);
        setConfirmReturnDate(next.draft.returnDate ?? returnDate);
      } else {
        setDispositions([]);
      }
    });
  }

  function onUpload(event: React.FormEvent) {
    event.preventDefault();
    const data = new FormData();
    if (file) data.set("pdf", file);
    runParse(data);
  }

  function onFixture(name: Da2062OutFixtureName) {
    const data = new FormData();
    data.set("fixture", name);
    if (name === "electronic-echo-out-org") {
      setKind("organization");
      setOrgLabel("1st SFG (A) S-4");
      data.set("outDestinationKind", "organization");
      data.set("outDestinationLabel", "1st SFG (A) S-4");
    } else {
      setKind("person");
      setPersonId(PEOPLE.nguyen.id);
      data.set("outDestinationKind", "person");
      data.set("outDestinationLabel", PEOPLE.nguyen.fullName);
    }
    runParse(data);
  }

  function onConfirm() {
    if (!parse || !parse.ok) return;
    const resolved =
      dispositions.length === parse.enriched.length ? dispositions : parse.defaultDispositions;
    const draft = { ...parse.draft, returnDate: confirmReturnDate || parse.draft.returnDate };
    startTransition(async () => {
      const next = await confirmDa2062Out(JSON.stringify(draft), JSON.stringify(resolved));
      setCommit(next);
      if (next.ok && next.importId) {
        const dest = draft.issuerSection;
        router.push(
          dest
            ? `/sections/${dest}?from=2062-out&history=${next.importId}`
            : `/receipts/2062-out/history/${next.importId}`,
        );
      }
    });
  }

  function onCancel() {
    setParse(null);
    setDispositions([]);
    setCommit(null);
  }

  function setLineDisposition(index: number, next: LineDisposition) {
    setDispositions((current) => current.map((value, i) => (i === index ? next : value)));
  }

  const fixtures = useMemo(
    () =>
      [
        { name: "electronic-echo-out" as const, label: "Electronic Echo sample" },
        { name: "ocr-echo-out" as const, label: "Scanned / OCR Echo sample" },
        { name: "electronic-echo-out-org" as const, label: "Organization sample" },
        { name: "past-due-echo-out" as const, label: "Past-due sample (warn only)" },
        { name: "wrong-section-bravo-out" as const, label: "Bravo sample (expect reject)" },
        { name: "cross-uic-out" as const, label: "Cross-UIC sample (expect reject)" },
        { name: "invalid-destination-out" as const, label: "Location destination (expect reject)" },
      ] satisfies { name: Da2062OutFixtureName; label: string }[],
    [],
  );

  return (
    <section className="panel da2062-panel">
      <div className="panel-head">
        <div>
          <h2>Upload DA Form 2062 out</h2>
          <p>{DA_2062_OUT_NOTE}</p>
        </div>
      </div>
      <form className="da2062-body" onSubmit={onUpload}>
        <label>
          Issuing section
          <select
            value={issuerSection}
            disabled={!canPickIssuer}
            onChange={(event) => setIssuerSection(event.target.value as SectionLetter)}
          >
            {SECTION_LETTERS.map((letter) => (
              <option key={letter} value={letter}>
                {SECTION_META[letter].name} ({letter})
                {actor.sectionLetter && actor.sectionLetter !== letter ? " · other section" : ""}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="da2062-destinations three">
          <legend>Signed-out destination (v1)</legend>
          {(
            [
              ["person", "Person", "Named Soldier / custodian"],
              ["section", "Section", "Bravo–Fox Sub-hand receipt (SHR)"],
              ["organization", "Organization", "S-4 / unit activity — not an APSR drop"],
            ] as const
          ).map(([value, title, note]) => (
            <label key={value} className={`import-types-card ${kind === value ? "selected" : ""}`}>
              <input
                type="radio"
                name="outDestinationKind"
                checked={kind === value}
                onChange={() => setKind(value)}
              />
              <b>{title}</b>
              <span>{note}</span>
            </label>
          ))}
        </fieldset>

        {kind === "person" ? (
          <label>
            Person
            <select value={personId} onChange={(event) => setPersonId(event.target.value)}>
              {PERSON_OPTIONS.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.fullName}
                  {person.sectionLetter ? ` · ${person.sectionLetter}` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {kind === "section" ? (
          <label>
            Destination section
            <select
              value={destinationSection}
              onChange={(event) => setDestinationSection(event.target.value as SectionLetter)}
            >
              {SECTION_LETTERS.map((letter) => (
                <option key={letter} value={letter}>
                  {SECTION_META[letter].name} ({letter})
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {kind === "organization" ? (
          <label>
            Organization
            <select value={orgLabel} onChange={(event) => setOrgLabel(event.target.value)}>
              {OUT_ORGANIZATIONS.map((org) => (
                <option key={org} value={org}>
                  {org}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label>
          Return date (required)
          <input type="date" value={returnDate} onChange={(event) => setReturnDate(event.target.value)} />
        </label>

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
          <Button type="submit" disabled={pending || !file}>
            <FileScan />
            Parse for confirm
          </Button>
          {fixtures.map((fixture) => (
            <Button
              key={fixture.name}
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onFixture(fixture.name)}
            >
              {fixture.label}
            </Button>
          ))}
          <DisabledAction label="DD Form 1750" reason={NOT_WIRED.da2062Boxes} variant="outline" />
        </div>
        <p className="inject-hint">
          Upload → parse → Confirm. Never auto-write. Return date is required. Past due / ≤30 days
          warn only. Toast is not a commit. R2 attachment is unused — source PDF stays with the D1
          history row like 2062 in.
        </p>
      </form>

      {parse && !parse.ok ? <ActionResultNote result={parse} /> : null}

      {parse?.ok ? (
        <Da2062OutConfirm
          parse={parse}
          dispositions={dispositions}
          returnDate={confirmReturnDate}
          pending={pending}
          confirmBlocked={confirmBlocked}
          onDisposition={setLineDisposition}
          onReturnDate={setConfirmReturnDate}
          onConfirm={onConfirm}
          onCancel={onCancel}
          commit={commit}
        />
      ) : null}
    </section>
  );
}

function Da2062OutConfirm({
  parse,
  dispositions,
  returnDate,
  pending,
  confirmBlocked,
  onDisposition,
  onReturnDate,
  onConfirm,
  onCancel,
  commit,
}: {
  parse: Extract<ParseDa2062OutResult, { ok: true }>;
  dispositions: LineDisposition[];
  returnDate: string;
  pending: boolean;
  confirmBlocked: boolean;
  onDisposition: (index: number, next: LineDisposition) => void;
  onReturnDate: (next: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  commit: ActionResult | null;
}) {
  const resolved =
    dispositions.length === parse.enriched.length ? dispositions : parse.defaultDispositions;
  const plan = planDa2062OutConfirm({
    lines: parse.draft.lines,
    dispositions: resolved,
    conflicts: parse.conflicts,
    issuerSection: parse.draft.issuerSection,
    returnDate,
  });
  const dateWarnings = returnDateWarnings(returnDate);

  return (
    <div className="da2062-confirm">
      <div className="panel-head">
        <div>
          <h2>Confirm before write</h2>
          <p>
            Electronic and OCR both stop here. Bad or partial parse never silent-commits. Per line:
            accept, skip, or flag a discrepancy. This is a temporary hand receipt — not Accept
            theater and not an APSR drop.
          </p>
        </div>
        <span className={`pill ${parse.draft.parsePath === "electronic" ? "green" : "amber"}`}>
          {parse.draft.parsePath === "electronic" ? "Electronic extract" : "Scanned / OCR degraded"}
        </span>
      </div>
      <dl className="receipt-meta da2062-meta">
        <div>
          <small>Issuer</small>
          <strong>
            {parse.draft.issuer}
            {parse.draft.issuerSection ? ` · ${SECTION_META[parse.draft.issuerSection].name}` : ""}
          </strong>
        </div>
        <div>
          <small>Destination</small>
          <strong>
            {outDestinationLabelText({
              kind: parse.draft.outDestinationKind,
              label: parse.draft.outDestinationLabel,
              section: parse.draft.destinationSection,
            })}
          </strong>
        </div>
        <div>
          <small>Return date</small>
          <strong>{returnDate || "required"}</strong>
        </div>
        <div>
          <small>UIC</small>
          <strong>{parse.draft.uic}</strong>
        </div>
      </dl>
      <label className="da2062-return">
        Return date (required)
        <input type="date" value={returnDate} onChange={(event) => onReturnDate(event.target.value)} />
      </label>
      {parse.draft.warnings.length > 0 || dateWarnings.length > 0 ? (
        <ul className="da2062-warnings">
          {[...parse.draft.warnings, ...dateWarnings.map((row) => row.message)].map((warning) => (
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
              <th>NSN</th>
              <th>Serial</th>
              <th>Qty</th>
              <th>Line action</th>
            </tr>
          </thead>
          <tbody>
            {parse.enriched.map((line, index) => {
              const hasConflict = parse.conflicts.some(
                (conflict) => conflict.identityKey === identityKey(line),
              );
              return (
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
                  </td>
                  <td>
                    <strong>{formatSerial(line.serial)}</strong>
                  </td>
                  <td>{line.quantity}</td>
                  <td>
                    <div
                      className="da2062-line-actions"
                      role="group"
                      aria-label={`Line action for ${line.nomenclature}`}
                    >
                      {(["accept", "skip", "flag"] as const).map((option) => (
                        <label
                          key={option}
                          className={`${option}${resolved[index] === option ? " selected" : ""}`}
                        >
                          <input
                            type="radio"
                            name={`line-disposition-out-${index}`}
                            checked={resolved[index] === option}
                            onChange={() => onDisposition(index, option)}
                          />
                          {option === "accept"
                            ? "Accept"
                            : option === "skip"
                              ? "Skip"
                              : "Flag discrepancy"}
                        </label>
                      ))}
                    </div>
                    {hasConflict ? (
                      <small className="da2062-line-hint">
                        HR / tracker conflict — flag or accept still opens a discrepancy
                      </small>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="da2062-conflicts">
        <h3>Conflicts stay discrepancies</h3>
        {parse.conflicts.length === 0 ? (
          <p className="inject-hint">No HR / tracker mismatches on this extract.</p>
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
            label={ADD_TEMPORARY_HAND_RECEIPT}
            reason={NOT_WIRED.d1Down}
            icon={<ArrowUpFromLine />}
          />
        ) : (
          <Button type="button" onClick={onConfirm} disabled={pending || !plan.canCommit}>
            <ArrowUpFromLine />
            {ADD_TEMPORARY_HAND_RECEIPT}
          </Button>
        )}
        <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
          Cancel — no write
        </Button>
      </div>
      <p className="inject-hint">
        {ADD_TEMPORARY_HAND_RECEIPT} is section-isolated on the issuing SHR. Accepted lines become
        signed-out with the return date visible. Flag opens a discrepancy. Skip writes nothing for
        that line. Cancel leaves zero rows. Not Accept theater. Does not invent APSR accountability.
      </p>
      <ActionResultNote result={commit} />
    </div>
  );
}
