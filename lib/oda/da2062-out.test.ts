import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CATALOG_ITEMS, PEOPLE } from "./catalog";
import {
  ADD_TEMPORARY_HAND_RECEIPT_LABEL,
  DA2062_OUT_DOES_NOT_INVENT_APSR,
  DA2062_OUT_SUCCESS_IS_NOT_ACCEPT,
  PAST_DUE_WARNS_ONLY,
  TEMP_30D_WARNS_ONLY,
  applySignedOutState,
  defaultOutDispositions,
  isPastDue,
  outDestinationLabelText,
  parseDa2062OutPdf,
  planDa2062OutConfirm,
  previewDa2062OutConflicts,
  returnDateWarnings,
  validateDa2062Out,
} from "./da2062-out";
import { da2062OutFixture } from "./da2062-out-fixtures";
import { da2062Fixture } from "./da2062-fixtures";
import { CONFIRM_BEFORE_WRITE, blankSerialToNull } from "./da2062";
import { formatSerial } from "@/lib/ledger/copy";
import { ODA } from "./org";
import type { IsolationActor } from "./access";

const echo: IsolationActor = { role: "soldier", scope: "section", sectionLetter: "E" };
const bravo: IsolationActor = { role: "soldier", scope: "section", sectionLetter: "B" };
const asOf = "2026-09-21";

const personIssuer = {
  section: "E" as const,
  kind: "person" as const,
  label: PEOPLE.nguyen.fullName,
  destinationSection: null,
  returnDate: "2026-10-05",
};

describe("DA Form 2062 out", () => {
  it("requires confirm before write and does not invent APSR drop", () => {
    assert.equal(CONFIRM_BEFORE_WRITE, true);
    assert.equal(DA2062_OUT_DOES_NOT_INVENT_APSR, true);
    assert.equal(DA2062_OUT_SUCCESS_IS_NOT_ACCEPT, true);
    assert.equal(PAST_DUE_WARNS_ONLY, true);
    assert.equal(TEMP_30D_WARNS_ONLY, true);
    assert.equal(ADD_TEMPORARY_HAND_RECEIPT_LABEL, "Add temporary hand receipt");
  });

  it("electronic and OCR paths parse to the same confirm shape with return date", () => {
    const electronic = parseDa2062OutPdf(
      da2062OutFixture("electronic-echo-out").bytes,
      "electronic-out.pdf",
      personIssuer,
    );
    const ocr = parseDa2062OutPdf(da2062OutFixture("ocr-echo-out").bytes, "ocr-out.pdf", personIssuer);
    assert.equal(electronic.ok, true);
    assert.equal(ocr.ok, true);
    if (!electronic.ok || !ocr.ok) return;
    assert.equal(electronic.draft.parsePath, "electronic");
    assert.equal(ocr.draft.parsePath, "ocr");
    assert.equal(electronic.draft.uic, ODA.uic);
    assert.equal(electronic.draft.issuerSection, "E");
    assert.equal(ocr.draft.issuerSection, "E");
    assert.equal(electronic.draft.outDestinationKind, "person");
    assert.equal(electronic.draft.outDestinationLabel, PEOPLE.nguyen.fullName);
    assert.equal(electronic.draft.returnDate, "2026-10-05");
    assert.equal(ocr.draft.returnDate, "2026-10-05");
    assert.equal(electronic.draft.lines.length, 4);
    assert.equal(ocr.draft.lines.length, 4);
    assert.deepEqual(
      electronic.draft.lines.map((line) => line.serial),
      ["15800421", "300415040404300", null, "013252"],
    );
    assert.equal(blankSerialToNull("NOT RECORDED"), null);
    assert.equal(formatSerial(null), "not recorded");
  });

  it("warns only for past due and ≤30-day temporary hand receipts", () => {
    const pastDue = returnDateWarnings("2026-08-15", asOf);
    assert.ok(pastDue.some((row) => row.kind === "past_due"));
    assert.ok(pastDue.some((row) => row.kind === "temp_30d"));
    assert.equal(isPastDue("2026-08-15", asOf), true);
    assert.ok(pastDue.every((row) => /warn only|awareness only/i.test(row.message)));
    assert.ok(pastDue.every((row) => /does not force|not a forced/i.test(row.message)));

    const within30 = returnDateWarnings("2026-10-05", asOf);
    assert.equal(
      within30.some((row) => row.kind === "past_due"),
      false,
    );
    assert.ok(within30.some((row) => row.kind === "temp_30d"));

    const later = returnDateWarnings("2026-12-01", asOf);
    assert.equal(later.length, 0);

    const missing = returnDateWarnings(null, asOf);
    assert.equal(missing[0]?.kind, "return_date_required");
  });

  it("parses a past-due PDF for confirm and does not block write at validation", () => {
    const parsed = parseDa2062OutPdf(
      da2062OutFixture("past-due-echo-out").bytes,
      "past-due.pdf",
      { ...personIssuer, returnDate: null },
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.draft.returnDate, "2026-08-15");
    assert.ok(parsed.draft.warnings.some((warning) => /past due/i.test(warning)));
    const check = validateDa2062Out({
      actor: echo,
      issuerSection: "E",
      draft: parsed.draft,
      requireReturnDate: true,
    });
    assert.equal(check.ok, true);
  });

  it("requires a return date before write", () => {
    const parsed = parseDa2062OutPdf(
      da2062OutFixture("missing-return-echo-out").bytes,
      "missing.pdf",
      { ...personIssuer, returnDate: null },
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.draft.returnDate, null);
    const check = validateDa2062Out({
      actor: echo,
      issuerSection: "E",
      draft: parsed.draft,
      requireReturnDate: true,
    });
    assert.equal(check.ok, false);
    if (!check.ok) assert.equal(check.reason, "return_date_required");
  });

  it("rejects cross-UIC, wrong section, invalid destination, and 2062 in PDFs", () => {
    const cross = parseDa2062OutPdf(da2062OutFixture("cross-uic-out").bytes, "cross.pdf", personIssuer);
    assert.equal(cross.ok, true);
    if (!cross.ok) return;
    const crossCheck = validateDa2062Out({
      actor: echo,
      issuerSection: "E",
      draft: cross.draft,
      requireReturnDate: true,
    });
    assert.equal(crossCheck.ok, false);
    if (!crossCheck.ok) {
      assert.equal(crossCheck.reason, "cross_uic");
      assert.match(crossCheck.message, /No rows written/);
    }

    const bravoPdf = parseDa2062OutPdf(
      da2062OutFixture("wrong-section-bravo-out").bytes,
      "bravo.pdf",
      { ...personIssuer, section: "E" },
    );
    assert.equal(bravoPdf.ok, true);
    if (!bravoPdf.ok) return;
    const echoBlocked = validateDa2062Out({
      actor: echo,
      issuerSection: "E",
      draft: bravoPdf.draft,
      requireReturnDate: true,
    });
    assert.equal(echoBlocked.ok, false);
    if (!echoBlocked.ok) assert.equal(echoBlocked.reason, "wrong_section");

    const isolation = validateDa2062Out({
      actor: echo,
      issuerSection: "B",
      draft: bravoPdf.draft,
      requireReturnDate: true,
    });
    assert.equal(isolation.ok, false);
    if (!isolation.ok) assert.equal(isolation.reason, "section_isolation");

    const bravoOk = validateDa2062Out({
      actor: bravo,
      issuerSection: "B",
      draft: bravoPdf.draft,
      requireReturnDate: true,
    });
    assert.equal(bravoOk.ok, true);

    const invalid = parseDa2062OutPdf(
      da2062OutFixture("invalid-destination-out").bytes,
      "location.pdf",
      { ...personIssuer, kind: "person" },
    );
    assert.equal(invalid.ok, false);
    if (!invalid.ok) assert.equal(invalid.reason, "wrong_destination");

    const inbound = parseDa2062OutPdf(da2062Fixture("electronic-echo").bytes, "in.pdf", personIssuer);
    assert.equal(inbound.ok, false);
    if (!inbound.ok) assert.equal(inbound.reason, "wrong_direction");
  });

  it("accepts organization destination and labels person / section / organization", () => {
    const parsed = parseDa2062OutPdf(
      da2062OutFixture("electronic-echo-out-org").bytes,
      "org.pdf",
      {
        section: "E",
        kind: "organization",
        label: "1st SFG (A) S-4",
        destinationSection: null,
        returnDate: "2026-10-05",
      },
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.draft.outDestinationKind, "organization");
    assert.equal(parsed.draft.outDestinationLabel, "1st SFG (A) S-4");
    assert.equal(
      outDestinationLabelText({
        kind: "organization",
        label: "1st SFG (A) S-4",
        section: null,
      }),
      "Organization · 1st SFG (A) S-4",
    );
  });

  it("opens discrepancies for conflicts and skips write when every line is skipped", () => {
    const parsed = parseDa2062OutPdf(
      da2062OutFixture("electronic-echo-out").bytes,
      "electronic-out.pdf",
      personIssuer,
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const conflicts = previewDa2062OutConflicts(parsed.draft);
    assert.ok(conflicts.length >= 2);
    const defaults = defaultOutDispositions(parsed.draft.lines, conflicts);
    assert.ok(defaults.includes("flag"));
    const allSkip = planDa2062OutConfirm({
      lines: parsed.draft.lines,
      dispositions: parsed.draft.lines.map(() => "skip"),
      conflicts,
      issuerSection: "E",
      returnDate: parsed.draft.returnDate,
    });
    assert.equal(allSkip.willWrite, false);
    assert.equal(allSkip.canCommit, false);

    const missingDate = planDa2062OutConfirm({
      lines: parsed.draft.lines,
      dispositions: parsed.draft.lines.map(() => "accept"),
      conflicts,
      issuerSection: "E",
      returnDate: null,
    });
    assert.equal(missingDate.willWrite, true);
    assert.equal(missingDate.canCommit, false);
  });

  it("shows signed-out state with return date and does not duplicate catalog identities", () => {
    const parsed = parseDa2062OutPdf(
      da2062OutFixture("electronic-echo-out").bytes,
      "electronic-out.pdf",
      personIssuer,
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const echoItems = CATALOG_ITEMS.filter((item) => item.sectionLetter === "E");
    const signedOut = parsed.draft.lines.map((line) => ({
      importId: 9,
      nsn: line.nsn,
      serial: line.serial,
      lin: line.lin,
      nomenclature: line.nomenclature,
      officialName: line.nomenclature,
      actualName: null,
      photoData: null,
      quantity: line.quantity,
      issuerSection: "E" as const,
      outDestinationKind: "person" as const,
      outDestinationLabel: PEOPLE.nguyen.fullName,
      returnDate: "2026-10-05",
      issuer: PEOPLE.ryan.fullName,
    }));
    const merged = applySignedOutState(echoItems, signedOut);
    const iridium = merged.find((item) => item.serial === "300415040404300");
    assert.equal(iridium?.status, "signed_out");
    assert.equal(iridium?.returnDate, "2026-10-05");
    assert.equal(iridium?.signedOutTo, PEOPLE.nguyen.fullName);
    assert.match(iridium?.sourceReceipt ?? "", /temporary hand receipt/);
    assert.doesNotMatch(iridium?.sourceReceipt ?? "", /APSR drop/i);
    const radio = merged.find((item) => item.serial === "15800421");
    assert.ok(radio);
    assert.equal(radio?.detailHref, "/receipts/2062-out/history/9");
    const iridiumMatches = merged.filter((item) => item.serial === "300415040404300");
    assert.equal(iridiumMatches.length, 1);
  });
});
