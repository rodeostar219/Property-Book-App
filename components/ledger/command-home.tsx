import Link from "next/link";
import { ODA } from "@/lib/oda/org";
import {
  LOAN_DIRECTION_GAP,
  MOVEMENT_ROWS,
  REQUIRED_BOM_GAP,
  handReceiptTotals,
  missingPictureAttention,
  sectionItemCount,
} from "@/lib/oda/overview";
import { SECTION_META } from "@/lib/oda/types";
import type { Actor, PropertyItem } from "@/lib/ledger/types";
import type { SectionCard } from "@/lib/oda/workspace";

export function CommandHome({
  actor,
  items,
  sections,
}: {
  actor: Actor;
  items: PropertyItem[];
  sections: SectionCard[];
}) {
  const totals = handReceiptTotals(items);
  const attention = missingPictureAttention(items);
  const bookHref = actor.role === "pm" ? "/property" : "/my-property";
  const seesWholeBook = actor.role === "pm" || actor.scope === "oda";

  return (
    <div className="lb">
      <p className="lb-note">
        PHRH {ODA.phrhName} · {ODA.document} · companion to GCSS-Army / APSR. Not a system of record.
      </p>

      <Link className="lb-total" href={bookHref}>
        <strong>{totals.pieces}</strong>
        <span>pieces on the hand receipt</span>
        <small>
          {totals.uniqueLins} unique LIN{totals.uniqueLins === 1 ? "" : "s"}
          {" · "}
          {totals.piecesWithoutLin} piece{totals.piecesWithoutLin === 1 ? "" : "s"} with no LIN
        </small>
      </Link>
      {seesWholeBook ? (
        <p className="lb-note">Every section on this identity’s hand receipt. Selecting a count opens those lines.</p>
      ) : (
        <p className="lb-note">
          Section isolation is on. Totals are the lines {actor.displayName} can open. Other sections stay locked and
          their counts are hidden.
        </p>
      )}

      <section aria-labelledby="section-breakdown">
        <h2 id="section-breakdown" className="lb-group">
          Sections
          <span>{sections.length}</span>
        </h2>
        <ul className="lb-rows">
          {sections.map((section) => {
            const count = section.visible ? sectionItemCount(items, section.letter) : null;
            const meta = SECTION_META[section.letter];
            if (!section.visible || count === null) {
              return (
                <li key={section.letter} className="lb-row is-locked">
                  <span className="lb-id">{section.letter}</span>
                  <span className="lb-title">
                    {meta.name}
                    <small>
                      {meta.mos} {meta.specialty}
                    </small>
                  </span>
                  <span className="lb-chip">Locked</span>
                </li>
              );
            }
            return (
              <li key={section.letter}>
                <Link className="lb-row" href={`/my-property?section=${section.letter}`}>
                  <span className="lb-id">{section.letter}</span>
                  <span className="lb-title">
                    {meta.name}
                    <small>
                      {meta.mos} {meta.specialty}
                    </small>
                  </span>
                  <span className="lb-chip">
                    {count} {count === 1 ? "line" : "lines"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="attention-heading">
        <h2 id="attention-heading" className="lb-group">
          Needs attention
          <span>{attention.length}</span>
        </h2>
        <p className="lb-gap">{REQUIRED_BOM_GAP}</p>
        <ul className="lb-rows">
          {attention.map((row) => (
            <li key={row.id}>
              <Link className="lb-row" href={row.href}>
                <span className="lb-id">{row.sectionLetter ?? "ODA"}</span>
                <span className="lb-title">
                  {row.equipment}
                  <small>{row.issue}</small>
                </span>
                <span className="lb-chip">{row.action}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="movement-heading">
        <h2 id="movement-heading" className="lb-group">
          Movement
        </h2>
        <p className="lb-gap">{LOAN_DIRECTION_GAP}</p>
        <ul className="lb-rows">
          {MOVEMENT_ROWS.map((row) => (
            <li key={row.id}>
              <Link className="lb-row" href={`/my-property?movement=${row.id}`}>
                <span className={`lb-dir lb-dir-${row.direction === "Out" ? "out" : "in"}`}>{row.direction}</span>
                <span className="lb-title">
                  {row.title}
                  <small>{row.issue}</small>
                </span>
                <span className="lb-chip">{row.action}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
