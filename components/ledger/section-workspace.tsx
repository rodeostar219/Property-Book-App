"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { sectionShrLabel } from "@/lib/oda/org";
import {
  MOVEMENT_ROWS,
  STATUS_SHORT,
  STATUS_TONE,
  handReceiptTotals,
  pieceTotalChartNote,
} from "@/lib/oda/overview";
import {
  MONTH_NAMES,
  adjacentPointPairs,
  monthlyPiecePoints,
  yearMonthCells,
  type PiecePoint,
  type ShrInjectStamp,
} from "@/lib/oda/months";
import { formatSerial } from "@/lib/ledger/copy";
import type { AccountabilityStatus } from "@/lib/ledger/types";
import type { SectionLetter } from "@/lib/oda/types";

export type SectionLine = {
  id: string;
  lin: string | null;
  nomenclature: string;
  actualName: string | null;
  nsn: string;
  serial: string | null;
  location: string;
  status: AccountabilityStatus;
  quantity: number;
  hasPictureBookPhoto: boolean;
  photoSrc: string | null;
};

type SortKey = "lin" | "nomenclature" | "actual" | "nsn" | "serial" | "location" | "status";
type Tab = "all" | "missing-picture" | "needs-serial";

const SORTS: Array<{ id: SortKey; label: string }> = [
  { id: "lin", label: "LIN" },
  { id: "nomenclature", label: "Nomenclature" },
  { id: "actual", label: "Actual name" },
  { id: "nsn", label: "NSN" },
  { id: "serial", label: "Serial number" },
  { id: "location", label: "Location" },
  { id: "status", label: "Status" },
];

const COLUMNS = ["LIN", "Nomenclature", "Actual name", "NSN", "Serial number", "Location", "Status"];

export function SectionWorkspace({
  sectionLetter,
  lines,
  injects,
  nowIso,
  years,
  movement,
}: {
  sectionLetter: SectionLetter;
  lines: SectionLine[];
  injects: ShrInjectStamp[];
  nowIso: string;
  years: number[];
  movement: string | null;
}) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [year, setYear] = useState(now.getUTCFullYear());
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("lin");
  const [status, setStatus] = useState<"any" | AccountabilityStatus>("any");
  const [serial, setSerial] = useState<"any" | "missing" | "recorded">("any");
  const [location, setLocation] = useState("any");
  const [filterOpen, setFilterOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [movementId, setMovementId] = useState<string | null>(movement);

  const cells = useMemo(
    () => yearMonthCells(year, injects, sectionLetter, now),
    [injects, now, sectionLetter, year],
  );
  const points = useMemo(
    () => monthlyPiecePoints(injects, sectionLetter).filter((point) => point.year === year),
    [injects, sectionLetter, year],
  );
  const totals = handReceiptTotals(
    lines.map((line) => ({
      ...line,
      name: line.nomenclature,
      quantityRequired: line.quantity,
      sectionLetter,
    })),
  );
  const locations = useMemo(
    () => [...new Set(lines.map((line) => line.location))].sort((a, b) => a.localeCompare(b)),
    [lines],
  );
  const filterCount = Number(status !== "any") + Number(serial !== "any") + Number(location !== "any");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = lines.filter((line) => {
      if (tab === "missing-picture" && line.hasPictureBookPhoto) return false;
      if (tab === "needs-serial" && line.status !== "needs_serial_check") return false;
      if (status !== "any" && line.status !== status) return false;
      if (serial === "missing" && line.serial) return false;
      if (serial === "recorded" && !line.serial) return false;
      if (location !== "any" && line.location !== location) return false;
      if (!needle) return true;
      const haystack = [line.lin, line.nomenclature, line.actualName, line.nsn, line.serial, line.location]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
    return [...rows].sort((a, b) => compareLines(a, b, sort));
  }, [lines, location, query, serial, sort, status, tab]);

  const missingPhotos = lines.filter((line) => !line.hasPictureBookPhoto);
  const withPhotos = lines.filter((line) => line.hasPictureBookPhoto);
  const selected = lines.find((line) => line.id === selectedId) ?? null;
  useEffect(() => {
    if (!selectedId) return;
    document.getElementById("line-detail")?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);
  const activeMovement = MOVEMENT_ROWS.find((row) => row.id === movementId) ?? null;
  const groupLabel =
    tab === "missing-picture" ? "Missing picture" : tab === "needs-serial" ? "Needs serial" : "Hand receipt lines";

  function onRowKey(event: React.KeyboardEvent, id: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedId(id);
    }
  }

  return (
    <div className="lb">
      <section aria-labelledby="shr-months">
        <div className="lb-section-head">
          <h2 id="shr-months" className="lb-group">
            Monthly Sub-hand receipts
            <span>{cells.filter((cell) => cell.state === "uploaded").length}</span>
          </h2>
          <label className="lb-year-select">
            <span className="sr-only">Year</span>
            <select
              aria-label="Sub-hand receipt year"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {years.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="lb-year" role="list">
          {cells.map((cell) => {
            const body = (
              <>
                <b>{cell.label}</b>
                <small>{cell.state === "uploaded" ? "Uploaded" : cell.state === "future" ? "Future" : "Missing"}</small>
              </>
            );
            if (cell.state === "uploaded" && cell.injectId) {
              return (
                <Link
                  key={cell.month}
                  href={`/receipts/history/${cell.injectId}`}
                  className="lb-month is-uploaded"
                  role="listitem"
                >
                  {body}
                  <span className="sr-only">
                    Open {cell.name} {cell.year} Sub-hand receipt
                  </span>
                </Link>
              );
            }
            return (
              <div key={cell.month} className={`lb-month is-${cell.state}`} role="listitem">
                {body}
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="picture-book-heading">
        <h2 id="picture-book-heading" className="lb-group">
          Picture book
          <span>{lines.length}</span>
        </h2>
        <p className="lb-note">
          {sectionShrLabel(sectionLetter)} visual ID. Official nomenclature stays on the line. A stencil is not a
          photo.
        </p>
        <PictureGroup title="Missing picture" lines={missingPhotos} onOpen={setSelectedId} />
        <PictureGroup title="Picture on file" lines={withPhotos} onOpen={setSelectedId} />
      </section>

      <section aria-labelledby="totals-heading">
        <h2 id="totals-heading" className="lb-group">
          Property total
          <span>{totals.pieces}</span>
        </h2>
        <p className="lb-total-inline">
          <strong>{totals.pieces}</strong>
          <span>pieces from current hand-receipt line quantities</span>
        </p>
        <TrendChart points={points} />
        <p className="lb-gap">{pieceTotalChartNote(totals.pieces, points)}</p>
      </section>

      <section aria-labelledby="movement-section" id="movement">
        <h2 id="movement-section" className="lb-group">
          Equipment movement
        </h2>
        <ul className="lb-rows">
          {MOVEMENT_ROWS.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className={`lb-row ${movementId === row.id ? "is-selected" : ""}`}
                onClick={() => setMovementId(row.id)}
              >
                <span className={`lb-dir lb-dir-${row.direction === "Out" ? "out" : "in"}`}>{row.direction}</span>
                <span className="lb-title">
                  {row.title}
                  <small>{row.issue}</small>
                </span>
                <span className="lb-chip">Open</span>
              </button>
            </li>
          ))}
        </ul>
        {activeMovement ? (
          <aside className="lb-detail" aria-label={activeMovement.title}>
            <p className="lb-kicker">
              {activeMovement.direction === "Out" ? "Leaving the section" : "Coming onto the section"}
            </p>
            <h3>{activeMovement.title}</h3>
            <p>{activeMovement.issue}</p>
            <p>{activeMovement.action}</p>
            <p className="lb-gap">
              No records match this movement. The count is not zero, and these pieces are not removed from the section
              total above.
            </p>
          </aside>
        ) : null}
      </section>

      <section aria-labelledby="property-table-heading">
        <h2 id="property-table-heading" className="lb-group">
          {groupLabel}
          <span>{visible.length}</span>
        </h2>
        <div className="lb-split">
          <div>
            <div className="lb-toolbar lb-table-toolbar">
              <div className="lb-tabs" role="tablist" aria-label="Property table views">
                {(
                  [
                    ["all", "All"],
                    ["missing-picture", "Missing picture"],
                    ["needs-serial", "Needs serial"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    className={tab === id ? "is-selected" : ""}
                    onClick={() => setTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="lb-toolbar-tools">
                <label className="lb-search">
                  <span className="sr-only">Search property</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search LIN, name, NSN, serial"
                    aria-label="Search LIN, nomenclature, actual name, NSN, or serial"
                  />
                </label>
                <div className="lb-pop">
                  <button
                    type="button"
                    aria-expanded={filterOpen}
                    aria-controls="property-filter"
                    onClick={() => {
                      setFilterOpen((open) => !open);
                      setDisplayOpen(false);
                    }}
                  >
                    Filter{filterCount ? ` ${filterCount}` : ""}
                  </button>
                  {filterOpen ? (
                    <div id="property-filter" className="lb-menu" role="dialog" aria-label="Filter">
                      <label>
                        Status
                        <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
                          <option value="any">Any status</option>
                          <option value="signed_for">Signed for</option>
                          <option value="on_hand">On hand</option>
                          <option value="needs_serial_check">Needs serial</option>
                          <option value="shortage_recorded">Shortage</option>
                        </select>
                      </label>
                      <label>
                        Serial number
                        <select value={serial} onChange={(event) => setSerial(event.target.value as typeof serial)}>
                          <option value="any">Any</option>
                          <option value="missing">Not recorded</option>
                          <option value="recorded">Recorded</option>
                        </select>
                      </label>
                      <label>
                        Location
                        <select value={location} onChange={(event) => setLocation(event.target.value)}>
                          <option value="any">Any location</option>
                          {locations.map((place) => (
                            <option key={place} value={place}>
                              {place}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setStatus("any");
                          setSerial("any");
                          setLocation("any");
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="lb-pop">
                  <button
                    type="button"
                    aria-expanded={displayOpen}
                    aria-controls="property-display"
                    onClick={() => {
                      setDisplayOpen((open) => !open);
                      setFilterOpen(false);
                    }}
                  >
                    Display
                  </button>
                  {displayOpen ? (
                    <div id="property-display" className="lb-menu" role="dialog" aria-label="Display options">
                      <label>
                        Order
                        <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
                          {SORTS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <fieldset>
                        <legend>Fields</legend>
                        {COLUMNS.map((column) => (
                          <label key={column} className="lb-check">
                            <input type="checkbox" checked disabled readOnly />
                            {column}
                          </label>
                        ))}
                        <p>These seven columns stay on the hand-receipt table.</p>
                      </fieldset>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="table-wrap">
            <table className="lb-table">
              <thead>
                <tr>
                  {COLUMNS.map((column) => (
                    <th key={column} scope="col">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="table-empty">
                      No hand-receipt lines match this view.
                    </td>
                  </tr>
                ) : (
                  visible.map((line) => (
                    <tr
                      key={line.id}
                      id={`line-${line.id}`}
                      tabIndex={0}
                      aria-selected={selectedId === line.id}
                      className={selectedId === line.id ? "is-selected" : ""}
                      onClick={() => setSelectedId(line.id)}
                      onKeyDown={(event) => onRowKey(event, line.id)}
                    >
                      <td className="lb-id">{line.lin ?? "No LIN"}</td>
                      <td>{line.nomenclature}</td>
                      <td>{line.actualName || "not recorded"}</td>
                      <td className="lb-mono">{line.nsn}</td>
                      <td className="lb-mono">{formatSerial(line.serial)}</td>
                      <td>
                        <span className="lb-chip">{line.location}</span>
                      </td>
                      <td>
                        <span className={`lb-status is-${STATUS_TONE[line.status]}`}>
                          <i />
                          {STATUS_SHORT[line.status]}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
          {selected ? (
            <aside className="lb-detail" id="line-detail" aria-label="Line detail">
              <p className="lb-kicker">{selected.lin ?? "No LIN"}</p>
              <h3>{selected.actualName || selected.nomenclature}</h3>
              <p>Official nomenclature: {selected.nomenclature}</p>
              <dl>
                <div>
                  <dt>NSN</dt>
                  <dd>{selected.nsn}</dd>
                </div>
                <div>
                  <dt>Serial number</dt>
                  <dd>{formatSerial(selected.serial)}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{selected.location}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <span className={`lb-status is-${STATUS_TONE[selected.status]}`}>
                      <i />
                      {STATUS_SHORT[selected.status]}
                    </span>
                  </dd>
                </div>
              </dl>
              <div className="lb-controls">
                <Link href={`/lines/${selected.id}`}>Open line</Link>
                {selected.hasPictureBookPhoto ? null : <Link href={`/lines/${selected.id}`}>Add picture</Link>}
                <button type="button" onClick={() => setSelectedId(null)}>
                  Close
                </button>
              </div>
            </aside>
          ) : (
            <p className="lb-note lb-detail-placeholder">Select a line for its hand-receipt facts.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function PictureGroup({
  title,
  lines,
  onOpen,
}: {
  title: string;
  lines: SectionLine[];
  onOpen: (id: string) => void;
}) {
  return (
    <>
      <h3 className="lb-group lb-subgroup">
        {title}
        <span>{lines.length}</span>
      </h3>
      {lines.length === 0 ? (
        <p className="lb-note">None.</p>
      ) : (
        <ul className="lb-rows">
          {lines.map((line) => (
            <li key={line.id}>
              <button type="button" className="lb-row" onClick={() => onOpen(line.id)}>
                {line.photoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="lb-thumb" src={line.photoSrc} alt="" />
                ) : (
                  <span className="lb-thumb is-empty" aria-hidden="true" />
                )}
                <span className="lb-id">{line.lin ?? "No LIN"}</span>
                <span className="lb-title">
                  {line.actualName || "Actual name not recorded"}
                  <small>{line.nomenclature}</small>
                </span>
                <span className="lb-chip">{line.hasPictureBookPhoto ? "Photo" : "Missing picture"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function TrendChart({ points }: { points: PiecePoint[] }) {
  if (points.length === 0) return null;
  const width = 560;
  const height = 128;
  const pad = 18;
  const min = Math.min(...points.map((point) => point.pieces));
  const max = Math.max(...points.map((point) => point.pieces));
  const span = Math.max(max - min, 1);
  const x = (index: number) =>
    points.length === 1 ? width / 2 : pad + (index * (width - pad * 2)) / (points.length - 1);
  const y = (pieces: number) => pad + ((max - pieces) / span) * (height - pad * 2);
  const pairs = adjacentPointPairs(points);

  return (
    <figure className="lb-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Stored monthly Sub-hand receipt totals">
        {pairs.map(([start, end]) => (
          <line
            key={`${start}-${end}`}
            x1={x(start)}
            y1={y(points[start].pieces)}
            x2={x(end)}
            y2={y(points[end].pieces)}
          />
        ))}
        {points.map((point, index) => (
          <g key={`${point.year}-${point.month}`}>
            <circle cx={x(index)} cy={y(point.pieces)} r="4" />
            <text x={x(index)} y={height - 2} textAnchor="middle">
              {MONTH_NAMES[point.month - 1].slice(0, 3)}
            </text>
          </g>
        ))}
      </svg>
      <table>
        <caption>Monthly piece totals on record</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Pieces</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={`${point.year}-${point.month}`}>
              <td>
                {MONTH_NAMES[point.month - 1]} {point.year}
              </td>
              <td>{point.pieces}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function compareLines(a: SectionLine, b: SectionLine, sort: SortKey): number {
  const value = (line: SectionLine) => {
    if (sort === "lin") return line.lin ?? "";
    if (sort === "nomenclature") return line.nomenclature;
    if (sort === "actual") return line.actualName ?? "";
    if (sort === "nsn") return line.nsn;
    if (sort === "serial") return line.serial ?? "";
    if (sort === "location") return line.location;
    return STATUS_SHORT[line.status];
  };
  const left = value(a);
  const right = value(b);
  if ((sort === "lin" || sort === "serial" || sort === "actual") && !left !== !right) {
    return left ? -1 : 1;
  }
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}
