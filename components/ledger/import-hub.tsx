"use client";

import { useState } from "react";
import { Da2062InPanel } from "@/components/ledger/da2062-in-panel";
import { InjectPanel } from "@/components/ledger/inject-panel";
import {
  BOM_IMPORT_GAP,
  DA2062_IN_DIRECTION,
  DA2062_OUT_DIRECTION,
  DA2062_OUT_GAP,
  ODA_MONTHLY_SHR_GAP,
} from "@/lib/oda/overview";
import { MONTH_NAMES, validateMonthlyPeriod } from "@/lib/oda/months";
import { SECTION_META, type Da2062DestinationKind, type SectionLetter } from "@/lib/oda/types";
import type { Actor } from "@/lib/ledger/types";
import type { PersistenceMode } from "@/lib/oda/store";

type ImportKind = "shr-oda" | "shr-section" | "bom" | "2062-in" | "2062-out";

const OPTIONS: Array<{ id: ImportKind; title: string; detail: string }> = [
  {
    id: "shr-oda",
    title: "ODA Monthly Sub Hand Receipt",
    detail: "Month and year for the ODA Sub-hand receipt under the primary hand receipt holder.",
  },
  {
    id: "shr-section",
    title: "Section Monthly Sub Hand Receipt",
    detail: "Month, year, and section. Reuses the electronic Sub-hand receipt update.",
  },
  {
    id: "bom",
    title: "BOM",
    detail: "Component hand receipt — COEI, BII, and AAL. Official nomenclature stays on the end item.",
  },
  {
    id: "2062-in",
    title: "2062 IN",
    detail: "Property coming onto this team or section.",
  },
  {
    id: "2062-out",
    title: "2062 OUT",
    detail: "Property leaving this team or section.",
  },
];

export function ImportHub({
  actor,
  persistence,
  defaultKind,
  defaultSection,
  nowIso,
  sections,
}: {
  actor: Actor;
  persistence: PersistenceMode;
  defaultKind: Da2062DestinationKind;
  defaultSection: SectionLetter | null;
  nowIso: string;
  sections: SectionLetter[];
}) {
  const now = new Date(nowIso);
  const [kind, setKind] = useState<ImportKind>("2062-in");
  const [section, setSection] = useState<SectionLetter>(defaultSection ?? actor.sectionLetter ?? sections[0] ?? "E");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(String(now.getUTCFullYear()));
  const [outParty, setOutParty] = useState<"person" | "section" | "organization" | "">("");
  const [returnDate, setReturnDate] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  function refuse(message: string) {
    setNotice(message);
  }

  function periodProblem(): string | null {
    if (!month) return "Month and year are required. Nothing was saved.";
    return validateMonthlyPeriod(Number(year), Number(month), now);
  }

  return (
    <div className="lb">
      <p className="lb-note">{DA2062_IN_DIRECTION}</p>
      <p className="lb-note">{DA2062_OUT_DIRECTION}</p>

      <h2 className="lb-group">
        Import
        <span>{OPTIONS.length}</span>
      </h2>
      <ul className="lb-rows">
        {OPTIONS.map((option) => (
          <li key={option.id}>
            <button
              type="button"
              className={`lb-row ${kind === option.id ? "is-selected" : ""}`}
              aria-pressed={kind === option.id}
              onClick={() => {
                setKind(option.id);
                setNotice(null);
              }}
            >
              <span className="lb-title">
                {option.title}
                <small>{option.detail}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="lb-detail lb-import-flow" aria-live="polite">
        {kind === "shr-oda" ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const problem = periodProblem();
              refuse(problem ?? ODA_MONTHLY_SHR_GAP);
            }}
          >
            <h3>ODA Monthly Sub Hand Receipt</h3>
            <PeriodFields month={month} year={year} now={now} setMonth={setMonth} setYear={setYear} />
            <p className="lb-gap">{ODA_MONTHLY_SHR_GAP}</p>
            <button type="submit">Save ODA monthly Sub-hand receipt</button>
          </form>
        ) : null}

        {kind === "shr-section" ? (
          <div>
            <h3>Section Monthly Sub Hand Receipt</h3>
            <label className="lb-field">
              Section
              <select
                aria-label="Section"
                value={section}
                onChange={(event) => setSection(event.target.value as SectionLetter)}
              >
                {sections.map((letter) => (
                  <option key={letter} value={letter}>
                    {SECTION_META[letter].name} ({letter})
                  </option>
                ))}
              </select>
            </label>
            <InjectPanel
              key={section}
              sectionLetter={section}
              persistence={persistence}
              canEdit={sections.includes(section)}
              nowIso={nowIso}
            />
          </div>
        ) : null}

        {kind === "bom" ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              refuse(BOM_IMPORT_GAP);
            }}
          >
            <h3>BOM</h3>
            <p>
              BOM here means the component hand receipt for an end item: COEI, BII, and AAL. It does not replace official
              nomenclature.
            </p>
            <p className="lb-gap">{BOM_IMPORT_GAP}</p>
            <button type="submit">Save BOM</button>
          </form>
        ) : null}

        {kind === "2062-in" ? (
          <div>
            <h3>2062 IN</h3>
            <p>{DA2062_IN_DIRECTION}</p>
            <Da2062InPanel
              actor={actor}
              persistence={persistence}
              defaultKind={defaultKind}
              defaultSection={defaultSection}
            />
          </div>
        ) : null}

        {kind === "2062-out" ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!outParty || !returnDate) {
                refuse("2062 OUT needs a receiving party and a return date. Nothing was saved.");
                return;
              }
              refuse(DA2062_OUT_GAP);
            }}
          >
            <h3>2062 OUT</h3>
            <p>{DA2062_OUT_DIRECTION}</p>
            <label className="lb-field">
              Receiving party
              <select
                aria-label="2062 OUT receiving party"
                value={outParty}
                onChange={(event) => setOutParty(event.target.value as typeof outParty)}
              >
                <option value="">Select</option>
                <option value="person">Person</option>
                <option value="section">Section</option>
                <option value="organization">Organization</option>
              </select>
            </label>
            <label className="lb-field">
              Return date
              <input
                aria-label="2062 OUT return date"
                type="date"
                value={returnDate}
                onChange={(event) => setReturnDate(event.target.value)}
              />
            </label>
            <p className="lb-gap">{DA2062_OUT_GAP}</p>
            <button type="submit">Save 2062 OUT</button>
          </form>
        ) : null}

        {notice ? (
          <p className="action-result fail" role="status">
            {notice} Not completed.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function PeriodFields({
  month,
  year,
  now,
  setMonth,
  setYear,
}: {
  month: string;
  year: string;
  now: Date;
  setMonth: (value: string) => void;
  setYear: (value: string) => void;
}) {
  return (
    <div className="lb-period">
      <label>
        Month
        <select aria-label="Month" value={month} onChange={(event) => setMonth(event.target.value)}>
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
        <select aria-label="Year" value={year} onChange={(event) => setYear(event.target.value)}>
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
  );
}
