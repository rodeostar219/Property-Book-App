import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADD_TO_SIGNED_FOR_LABEL,
  CONFIRM_BEFORE_WRITE,
  DA2062_IN_DOES_NOT_INVENT_APSR,
  DA2062_SUCCESS_IS_NOT_ACCEPT,
  blankSerialToNull,
  defaultDispositionForLine,
  enrichDa2062Lines,
  gainingPartyLabel,
  parseDa2062Pdf,
  planDa2062Confirm,
  previewDa2062Conflicts,
  validateDa2062InDestination,
} from "./da2062";
import { da2062Fixture } from "./da2062-fixtures";
import { extractPdfPayload } from "./da2062-pdf";
import { formatSerial } from "@/lib/ledger/copy";
import { ODA } from "./org";
import type { IsolationActor } from "./access";

const echo: IsolationActor = { role: "soldier", scope: "section", sectionLetter: "E" };
const bravo: IsolationActor = { role: "soldier", scope: "section", sectionLetter: "B" };
const pm: IsolationActor = { role: "pm", scope: "oda" };

describe("DA Form 2062 in", () => {
  it("requires a confirm screen before any write, even on a perfect parse", () => {
    assert.equal(CONFIRM_BEFORE_WRITE, true);
    assert.equal(DA2062_IN_DOES_NOT_INVENT_APSR, true);
    assert.equal(DA2062_SUCCESS_IS_NOT_ACCEPT, true);
    assert.equal(ADD_TO_SIGNED_FOR_LABEL, "Add to signed-for");
  });

  it("treats blank / em-dash serials as null and displays not recorded", () => {
    assert.equal(blankSerialToNull("—"), null);
    assert.equal(blankSerialToNull("NOT RECORDED"), null);
    assert.equal(blankSerialToNull(""), null);
    assert.equal(formatSerial(null), "not recorded");
    assert.notEqual(formatSerial(null), "—");
  });

  it("electronic and OCR paths parse to the same confirm shape", () => {
    const electronic = parseDa2062Pdf(
      da2062Fixture("electronic-echo").bytes,
      "electronic.pdf",
      { kind: "section_shr", section: "E" },
    );
    const ocr = parseDa2062Pdf(da2062Fixture("ocr-echo").bytes, "ocr.pdf", {
      kind: "section_shr",
      section: "E",
    });
    assert.equal(electronic.ok, true);
    assert.equal(ocr.ok, true);
    if (!electronic.ok || !ocr.ok) return;
    assert.equal(electronic.draft.parsePath, "electronic");
    assert.equal(ocr.draft.parsePath, "ocr");
    assert.equal(electronic.draft.uic, ODA.uic);
    assert.equal(ocr.draft.uic, ODA.uic);
    assert.equal(electronic.draft.gainingSection, "E");
    assert.equal(ocr.draft.gainingSection, "E");
    assert.equal(electronic.draft.lines.length, 4);
    assert.equal(ocr.draft.lines.length, 4);

    const eSerials = electronic.draft.lines.map((line) => line.serial);
    const oSerials = ocr.draft.lines.map((line) => line.serial);
    assert.deepEqual(eSerials, ["15800421", "300415040404300", null, "013252"]);
    assert.deepEqual(oSerials, eSerials);
    assert.equal(
      electronic.draft.lines.find((line) => line.nsn === "589501D050302")?.serial,
      null,
    );

    const eQty = electronic.draft.lines.find((line) => line.serial === "013252")?.quantity;
    const oQty = ocr.draft.lines.find((line) => line.serial === "013252")?.quantity;
    assert.equal(eQty, 2);
    assert.equal(oQty, 2);
  });

  it("rejects cross-UIC with no rows", () => {
    const parsed = parseDa2062Pdf(da2062Fixture("cross-uic").bytes, "cross.pdf", {
      kind: "section_shr",
      section: "E",
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const check = validateDa2062InDestination({
      actor: echo,
      destinationKind: "section_shr",
      destinationSection: "E",
      draft: parsed.draft,
    });
    assert.equal(check.ok, false);
    if (check.ok) return;
    assert.equal(check.reason, "cross_uic");
    assert.match(check.message, /No rows written/);
  });

  it("rejects wrong section and Echo targeting Bravo", () => {
    const parsed = parseDa2062Pdf(da2062Fixture("wrong-section-bravo").bytes, "bravo.pdf", {
      kind: "section_shr",
      section: "E",
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const mismatch = validateDa2062InDestination({
      actor: echo,
      destinationKind: "section_shr",
      destinationSection: "E",
      draft: parsed.draft,
    });
    assert.equal(mismatch.ok, false);
    if (!mismatch.ok) assert.equal(mismatch.reason, "wrong_section");

    const isolation = validateDa2062InDestination({
      actor: echo,
      destinationKind: "section_shr",
      destinationSection: "B",
      draft: { uic: ODA.uic, gainingSection: "B", lines: parsed.draft.lines },
    });
    assert.equal(isolation.ok, false);
    if (!isolation.ok) assert.equal(isolation.reason, "section_isolation");

    const bravoOk = validateDa2062InDestination({
      actor: bravo,
      destinationKind: "section_shr",
      destinationSection: "B",
      draft: parsed.draft,
    });
    assert.equal(bravoOk.ok, true);
  });

  it("Echo cannot target the ODA hand receipt", () => {
    const parsed = parseDa2062Pdf(da2062Fixture("electronic-oda-hr").bytes, "oda.pdf", {
      kind: "oda_hr",
      section: null,
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const echoBlocked = validateDa2062InDestination({
      actor: echo,
      destinationKind: "oda_hr",
      destinationSection: null,
      draft: parsed.draft,
    });
    assert.equal(echoBlocked.ok, false);
    const pmOk = validateDa2062InDestination({
      actor: pm,
      destinationKind: "oda_hr",
      destinationSection: null,
      draft: parsed.draft,
    });
    assert.equal(pmOk.ok, true);
  });

  it("opens discrepancies for HR / tracker / picture conflicts and never auto-merges", () => {
    const parsed = parseDa2062Pdf(
      da2062Fixture("electronic-echo").bytes,
      "electronic.pdf",
      { kind: "section_shr", section: "E" },
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const conflicts = previewDa2062Conflicts(parsed.draft);
    assert.ok(conflicts.length >= 2);
    const serials = conflicts.map((row) => row.serial);
    assert.ok(serials.includes("15800421"));
    assert.ok(serials.includes("013252"));
    for (const conflict of conflicts) {
      assert.match(conflict.action, /not auto-merge|Do not auto-merge/i);
    }
  });

  it("enriches known lines with official, actual, and photo without inventing APSR rows", () => {
    const parsed = parseDa2062Pdf(
      da2062Fixture("electronic-echo").bytes,
      "electronic.pdf",
      { kind: "section_shr", section: "E" },
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const enriched = enrichDa2062Lines(parsed.draft.lines);
    const iridium = enriched.find((line) => line.serial === "300415040404300");
    assert.equal(iridium?.officialName, "Telephone, Satellite: 9575A Iridium");
    assert.equal(iridium?.actualName, "Iridium");
    assert.ok(iridium?.photoData?.startsWith("data:image/svg+xml"));
    const radio = enriched.find((line) => line.serial === "15800421");
    assert.equal(radio?.knownLineKey, null);
    assert.equal(radio?.actualName, null);
  });

  it("plans accept / skip / flag without writing skipped lines", () => {
    const parsed = parseDa2062Pdf(
      da2062Fixture("electronic-echo").bytes,
      "electronic.pdf",
      { kind: "section_shr", section: "E" },
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const conflicts = previewDa2062Conflicts(parsed.draft);
    const defaults = parsed.draft.lines.map((line) => defaultDispositionForLine(line, conflicts));
    assert.equal(defaults[0], "flag");
    assert.equal(defaults[3], "flag");
    assert.ok(defaults.includes("accept"));
    const allSkip = planDa2062Confirm({
      lines: parsed.draft.lines,
      dispositions: parsed.draft.lines.map(() => "skip"),
      conflicts,
      sectionLetter: "E",
    });
    assert.equal(allSkip.willWrite, false);
    assert.equal(allSkip.accepted.length, 0);

    const mixed = planDa2062Confirm({
      lines: parsed.draft.lines,
      dispositions: ["accept", "skip", "flag", "accept"],
      conflicts,
      sectionLetter: "E",
    });
    assert.equal(mixed.accepted.length, 2);
    assert.equal(mixed.skipped.length, 1);
    assert.equal(mixed.flagged.length, 1);
    assert.equal(mixed.willWrite, true);
    assert.ok(mixed.flaggedDiscrepancies.length + mixed.conflictDiscrepancies.length >= 1);
    assert.equal(
      gainingPartyLabel({
        destinationKind: "section_shr",
        destinationSection: "E",
        gainingParty: "SSG Ryan Cole",
        gainingSection: "E",
      }),
      "Echo (E) · SSG Ryan Cole",
    );
  });

  it("extracts AcroForm fields from the electronic fixture PDF", () => {
    const payload = extractPdfPayload(da2062Fixture("electronic-echo").bytes);
    assert.equal(payload.fields.UIC, ODA.uic);
    assert.equal(payload.fields.GAINING_SECTION, "E");
  });
});
