import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { buildMinimalPdf } from "./da2062-pdf";
import {
  countsMatchRyan,
  filledSerialsOnLine,
  formatParsedCounts,
  isRyanSeptemberReceipt,
  odaMonthlySaveRefusal,
  parseGcssShrPdf,
  parseGcssShrText,
  ryanCountRefusal,
  shrDraftCounts,
  storedLinesMatch,
  storedOdaLines,
  type GcssShrDraft,
  type ShrParsedCounts,
} from "./gcss-shr";
import {
  endItemCountNote,
  monthlySerialPoints,
  unplottedReceiptNote,
  serialGridRows,
  yearMonthCells,
  type ShrInjectStamp,
  type ShrReceiptLine,
} from "./months";

const NOW = new Date("2026-10-03T12:00:00.000Z");

function shapeText(input: { uic?: string; date?: string; body: string }): string {
  return ["GCSS-Army", "Sub-hand receipt", `UIC ${input.uic ?? "WH1FB3PB"}`, `Date ${input.date ?? "1 Aug 2026"}`, input.body].join(
    "\n",
  );
}

const CLASSIFIED_BODY = [
  "LIN AB1234 NSN 5820011111111 NOMENCLATURE RADIO SET LABST 11",
  "SerNo | RegNo | LotNo",
  "SN-1 | RN-1 | ",
  "SN-2 |  | LOT-9",
  " |  | LOT-10",
  " | RN-2 | ",
].join("\n");

describe("GCSS Sub-hand receipt PDF shape", () => {
  it("reads UIC, date, OH Qty from LABST, and a three-across SerNo/RegNo/LotNo grid", () => {
    const parsed = parseGcssShrText(shapeText({ body: CLASSIFIED_BODY }));
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.draft.uic, "WH1FB3PB");
    assert.deepEqual(
      [parsed.draft.year, parsed.draft.month, parsed.draft.day],
      [2026, 8, 1],
    );
    assert.equal(parsed.draft.lines.length, 1);
    const line = parsed.draft.lines[0];
    assert.ok(line);
    assert.equal(line.ohQty, 11);
    assert.equal(line.nomenclature, "RADIO SET");
    assert.equal(line.lin, "AB1234");
    const rows = serialGridRows(line.serialCells);
    assert.ok(rows);
    assert.deepEqual(rows, [
      { serNo: "SN-1", regNo: "RN-1", lotNo: null },
      { serNo: "SN-2", regNo: null, lotNo: "LOT-9" },
      { serNo: null, regNo: null, lotNo: "LOT-10" },
      { serNo: null, regNo: "RN-2", lotNo: null },
    ]);
  });

  it("does not count a blank cell or a LotNo as a serial and does not copy either into SerNo or RegNo", () => {
    const parsed = parseGcssShrText(shapeText({ body: CLASSIFIED_BODY }));
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const line = parsed.draft.lines[0];
    assert.ok(line);
    assert.equal(filledSerialsOnLine(line), 4);
    const cells = line.serialCells ?? [];
    assert.equal(
      cells.filter((cell) => cell.kind === "serNo" || cell.kind === "regNo").some((cell) => cell.value == null),
      true,
    );
    assert.equal(
      cells.some((cell) => (cell.kind === "serNo" || cell.kind === "regNo") && cell.value === "LOT-9"),
      false,
    );
    assert.equal(
      cells.some((cell) => (cell.kind === "serNo" || cell.kind === "regNo") && cell.value === "LOT-10"),
      false,
    );
    const stored = storedOdaLines(parsed.draft);
    assert.equal(stored[0]?.serialNumber, null);
    assert.equal(stored[0]?.quantity, 11);
    const counts = shrDraftCounts(parsed.draft);
    assert.equal(counts.endItems, 1);
    assert.equal(counts.ohQty, 11);
    assert.equal(counts.filledSerials, 4);
    assert.notEqual(counts.filledSerials, counts.ohQty);
    const note = endItemCountNote({ ohQty: line.ohQty, serialCells: line.serialCells });
    assert.match(note, /4 serials/);
    assert.match(note, /OH Qty 11/);
    assert.match(note, /Serials and OH Qty differ/);
    assert.doesNotMatch(note, /pieces|items|LABST/i);
    assert.doesNotMatch(formatParsedCounts(counts), /pieces|items|LABST/i);
  });

  it("keeps OH Qty off the chart point and plots filled SerNo and RegNo cells only", () => {
    const parsed = parseGcssShrText(shapeText({ date: "1 Aug 2026", body: CLASSIFIED_BODY }));
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const stamp: ShrInjectStamp = {
      id: 9,
      sectionLetter: null,
      label: "ODA Sub-hand receipt",
      notes: "shr-period:2026-08",
      injectedAt: "2026-08-02T00:00:00.000Z",
    };
    const lines: ShrReceiptLine[] = parsed.draft.lines.map((line) => ({
      injectId: 9,
      ohQty: line.ohQty,
      untypedSerial: "LOT-9",
      serialCells: line.serialCells,
      changeType: "added",
    }));
    const points = monthlySerialPoints([stamp], lines, "E", { includeOdaLevel: true });
    assert.deepEqual(
      points.map((point) => [point.month, point.serials]),
      [[8, 4]],
    );
    assert.equal(points[0]?.serials, 4);
    assert.equal(lines[0]?.ohQty, 11);
    assert.notEqual(points[0]?.serials, lines[0]?.ohQty);
    assert.equal(points.some((point) => point.serials === 0), false);
  });

  it("leaves a grid unclassified when SerNo, RegNo, and LotNo cannot be told apart", () => {
    const parsed = parseGcssShrText(
      shapeText({
        body: ["LIN ZZ9 NSN 9999999999999 NOMENCLATURE CABLE LABST 6", "SN-UNKNOWN", "LOT-MAYBE"].join("\n"),
      }),
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const line = parsed.draft.lines[0];
    assert.ok(line);
    assert.equal(line.serialCells, null);
    assert.equal(line.ohQty, 6);
    assert.equal(shrDraftCounts(parsed.draft).filledSerials, null);
    const stamp: ShrInjectStamp = {
      id: 4,
      sectionLetter: null,
      label: "ODA Sub-hand receipt",
      notes: "shr-period:2026-09",
      injectedAt: "2026-10-03T00:00:00.000Z",
    };
    const lines: ShrReceiptLine[] = [
      {
        injectId: 4,
        ohQty: line.ohQty,
        untypedSerial: "SN-UNKNOWN",
        serialCells: null,
        changeType: "added",
      },
    ];
    const cells = yearMonthCells(2026, [stamp], "E", NOW, { includeOdaLevel: true });
    assert.equal(cells.find((cell) => cell.label === "Sep")?.state, "uploaded");
    assert.deepEqual(monthlySerialPoints([stamp], lines, "E", { includeOdaLevel: true }), []);
    const note = unplottedReceiptNote([{ name: "September", year: 2026, injectId: 4 }], lines);
    assert.match(note ?? "", /do not identify SerNo or RegNo separately from LotNo/);
  });

  it("plots September from saved SerNo and RegNo cells and drops the untyped note", () => {
    const parsed = parseGcssShrText(shapeText({ date: "15 Sep 2026", body: CLASSIFIED_BODY }));
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(isRyanSeptemberReceipt(parsed.draft), false);
    assert.equal(odaMonthlySaveRefusal(parsed.draft, NOW), null);
    const stamp: ShrInjectStamp = {
      id: 11,
      sectionLetter: null,
      label: "ODA Sub-hand receipt",
      notes: "shr-period:2026-09",
      injectedAt: "2026-10-03T00:00:00.000Z",
    };
    const lines: ShrReceiptLine[] = parsed.draft.lines.map((line) => ({
      injectId: 11,
      ohQty: line.ohQty,
      untypedSerial: null,
      serialCells: line.serialCells,
      changeType: "added",
    }));
    const cells = yearMonthCells(2026, [stamp], "E", NOW, { includeOdaLevel: true });
    assert.equal(cells.find((cell) => cell.label === "Sep")?.state, "uploaded");
    const points = monthlySerialPoints([stamp], lines, "E", { includeOdaLevel: true });
    assert.deepEqual(
      points.map((point) => point.serials),
      [4],
    );
    const unplotted = cells.filter(
      (cell) => cell.state === "uploaded" && !points.some((point) => point.month === cell.month),
    );
    assert.equal(unplottedReceiptNote(unplotted, lines), null);
    assert.equal(storedLinesMatch(parsed.draft, [{ quantity: 11, serial: null, serialCells: lines[0]?.serialCells ?? null }]), true);
    assert.equal(
      storedLinesMatch(parsed.draft, [{ quantity: 11, serial: "LOT-9", serialCells: lines[0]?.serialCells ?? null }]),
      false,
    );
  });

  it("refuses to save a 1 Sep 2026 WH1FB3PB parse that does not match 36, OH Qty 105, and 184 serials", () => {
    const parsed = parseGcssShrPdf(
      buildMinimalPdf({
        title: "Sub-hand receipt",
        lines: shapeText({ date: "1 Sep 2026", body: CLASSIFIED_BODY }).split("\n"),
      }),
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(isRyanSeptemberReceipt(parsed.draft), true);
    assert.notEqual(parsed.draft.lines.length, 36);
    const counts = shrDraftCounts(parsed.draft);
    assert.notEqual(counts.ohQty, 105);
    assert.notEqual(counts.filledSerials, 184);
    const refusal = ryanCountRefusal(parsed.draft);
    assert.match(refusal ?? "", /36 end-item lines/);
    assert.match(refusal ?? "", /OH Qty 105/);
    assert.match(refusal ?? "", /184 serials/);
    assert.match(refusal ?? "", /Nothing was saved/);
    assert.doesNotMatch(refusal ?? "", /pieces|items|LABST/i);
    assert.match(odaMonthlySaveRefusal(parsed.draft, NOW) ?? "", /Nothing was saved/);
  });

  it("compares the three counts without fabricating a 36-line receipt", () => {
    const matched: ShrParsedCounts = { endItems: 36, ohQty: 105, filledSerials: 184 };
    const short: ShrParsedCounts = { endItems: 1, ohQty: 4, filledSerials: 4 };
    const lotsWouldHaveInflated: ShrParsedCounts = { endItems: 36, ohQty: 105, filledSerials: 183 };
    assert.equal(countsMatchRyan(matched), true);
    assert.equal(countsMatchRyan(short), false);
    assert.equal(countsMatchRyan(lotsWouldHaveInflated), false);
    assert.equal(countsMatchRyan({ endItems: 36, ohQty: 105, filledSerials: null }), false);
    const draft = {
      uic: "WH1FB3PB",
      year: 2026,
      month: 9,
      day: 1,
      lines: [],
    } satisfies GcssShrDraft;
    assert.match(odaMonthlySaveRefusal(draft, NOW) ?? "", /No end-item lines/);
  });

  it("records that Ryan's PDF is absent so the 36 / 105 / 184 check stays unmet", () => {
    const root = join(import.meta.dirname, "../..");
    const pdfs = listPdfs(root);
    const qualifying = pdfs.filter((path) => {
      const text = readFileSync(path).toString("latin1");
      return /WH1FB3PB/.test(text) && /sep|september/i.test(text) && /2026/.test(text);
    });
    if (qualifying.length === 0) {
      assert.equal(qualifying.length, 0);
      return;
    }
    const parsed = parseGcssShrPdf(new Uint8Array(readFileSync(qualifying[0] ?? "")));
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const counts = shrDraftCounts(parsed.draft);
    assert.equal(counts.endItems, 36);
    assert.equal(counts.ohQty, 105);
    assert.equal(counts.filledSerials, 184);
  });

  it("asks for the PDF on the ODA screen and does not call OH Qty pieces, items, or LABST", () => {
    const panel = readFileSync(new URL("../../components/ledger/oda-monthly-panel.tsx", import.meta.url), "utf8");
    const hub = readFileSync(new URL("../../components/ledger/import-hub.tsx", import.meta.url), "utf8");
    const screen = `${panel}\n${hub}`;
    assert.match(panel, /Sub-hand receipt/);
    assert.match(panel, /GCSS Sub-hand receipt PDF/);
    assert.match(panel, /OH Qty/);
    assert.match(panel, /Cancel/);
    assert.match(panel, /filled SerNo and RegNo cells/);
    assert.doesNotMatch(panel, /2062|LABST/);
    assert.doesNotMatch(panel, /\binject\b|\bpieces\b|\bitems\b/i);
    assert.doesNotMatch(panel.replaceAll("Sub-hand receipt", ""), /hand receipt/i);
    assert.match(hub, /OdaMonthlyPanel/);
    assert.doesNotMatch(hub, /ODA_MONTHLY_SHR_GAP/);
    assert.doesNotMatch(screen, /aria-label="Month"/);
  });
});

function listPdfs(dir: string): string[] {
  const found: string[] = [];
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return found;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry === ".git" || entry === "dist" || entry === ".next" || entry === ".wrangler") {
      continue;
    }
    const path = join(dir, entry);
    let info;
    try {
      info = statSync(path);
    } catch {
      continue;
    }
    if (info.isDirectory()) {
      found.push(...listPdfs(path));
    } else if (entry.toLowerCase().endsWith(".pdf")) {
      found.push(path);
    }
  }
  return found;
}
