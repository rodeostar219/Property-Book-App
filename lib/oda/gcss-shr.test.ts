import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { buildMinimalPdf } from "./da2062-pdf";
import {
  countsMatchRyan,
  filledCellCountMismatch,
  formatParsedCounts,
  isRyanSeptemberReceipt,
  odaMonthlySaveRefusal,
  parseGcssShrPdf,
  parseGcssShrText,
  shrDraftCounts,
  storedLinesMatch,
  storedOdaLines,
  type GcssShrDraft,
  type ShrParsedCounts,
} from "./gcss-shr";
import {
  filledGridCellCount,
  lineSerialCount,
  monthlySerialPoints,
  parseStoredSerialCells,
  unplottedReceiptNote,
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

const UNMARKED_BODY = [
  "LIN AB1234 NSN 5820011111111 NOMENCLATURE RADIO SET LABST 11",
  "SerNo | RegNo | LotNo",
  "SN-1 | RN-1 | ",
  "SN-2 |  | LOT-9",
  " |  | LOT-10",
  " | RN-2 | ",
].join("\n");

const MARKED_BODY = [
  "LIN AB1234 NSN 5820011111111 NOMENCLATURE RADIO SET LABST 11",
  "SerNo: SN-1 | RegNo: RN-1 | ",
  "SerNo: SN-2 |  | LOT-9",
  " |  | LOT-10",
  " | RegNo: RN-2 | ",
].join("\n");

describe("GCSS Sub-hand receipt PDF shape", () => {
  it("keeps every grid cell and does not invent SerNo, RegNo, or a lot flag", () => {
    const parsed = parseGcssShrText(shapeText({ body: UNMARKED_BODY }));
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.draft.uic, "WH1FB3PB");
    assert.deepEqual([parsed.draft.year, parsed.draft.month, parsed.draft.day], [2026, 8, 1]);
    assert.equal(parsed.draft.lines.length, 1);
    const line = parsed.draft.lines[0];
    assert.ok(line);
    assert.equal(line.ohQty, 11);
    assert.equal(line.nomenclature, "RADIO SET");
    assert.equal(line.lin, "AB1234");
    const cells = line.serialCells ?? [];
    assert.equal(cells.length, 12);
    assert.equal(cells.some((cell) => cell.kind === "serNo" || cell.kind === "regNo" || cell.kind === "lotNo"), false);
    assert.deepEqual(
      cells.map((cell) => cell.value).filter((value) => value != null),
      ["SN-1", "RN-1", "SN-2", "LOT-9", "LOT-10", "RN-2"],
    );
    const counts = shrDraftCounts(parsed.draft);
    assert.equal(counts.filledCells, 6);
    assert.notEqual(counts.filledCells, counts.ohQty);
    assert.equal(storedOdaLines(parsed.draft)[0]?.serialNumber, null);
    assert.doesNotMatch(formatParsedCounts(counts), /\bserials\b|pieces|items|LABST/i);
  });

  it("counts an explicit SerNo or RegNo and leaves an unmarked cell out of that count", () => {
    const parsed = parseGcssShrText(shapeText({ body: MARKED_BODY }));
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const line = parsed.draft.lines[0];
    assert.ok(line);
    const cells = line.serialCells ?? [];
    assert.equal(cells.some((cell) => cell.kind === "lotNo"), false);
    assert.equal(cells.some((cell) => cell.kind === "unmarked" && cell.value === "LOT-9"), true);
    assert.equal(cells.some((cell) => (cell.kind === "serNo" || cell.kind === "regNo") && cell.value === "LOT-9"), false);
    assert.equal(lineSerialCount({ serialCells: line.serialCells }), 4);
    assert.equal(filledGridCellCount(line.serialCells), 6);
    assert.notEqual(filledGridCellCount(line.serialCells), line.ohQty);
    const restored = parseStoredSerialCells(JSON.stringify(line.serialCells));
    assert.equal(restored?.length, cells.length);
    assert.equal(filledGridCellCount(restored), 6);
  });

  it("leaves September uploaded and unplotted while filled cells are unmarked", () => {
    const parsed = parseGcssShrText(
      shapeText({
        date: "15 Sep 2026",
        body: ["LIN ZZ9 NSN 9999999999999 NOMENCLATURE CABLE LABST 6", "SN-UNKNOWN", "LOT-MAYBE"].join("\n"),
      }),
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const line = parsed.draft.lines[0];
    assert.ok(line);
    assert.equal(line.ohQty, 6);
    assert.equal(line.serialCells?.length, 2);
    assert.equal(line.serialCells?.every((cell) => cell.kind === "unmarked"), true);
    assert.equal(shrDraftCounts(parsed.draft).filledCells, 2);
    assert.equal(odaMonthlySaveRefusal(parsed.draft, NOW), null);
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
        untypedSerial: null,
        serialCells: line.serialCells,
        changeType: "added",
      },
    ];
    const cells = yearMonthCells(2026, [stamp], "E", NOW, { includeOdaLevel: true });
    assert.equal(cells.find((cell) => cell.label === "Sep")?.state, "uploaded");
    assert.deepEqual(monthlySerialPoints([stamp], lines, "E", { includeOdaLevel: true }), []);
    const note = unplottedReceiptNote([{ name: "September", year: 2026, injectId: 4 }], lines);
    assert.match(note ?? "", /filled cells are unmarked/);
    assert.doesNotMatch(note ?? "", /LotNo/);
  });

  it("plots September once a cell is stored as a SerNo or a RegNo", () => {
    const parsed = parseGcssShrText(shapeText({ date: "15 Sep 2026", body: MARKED_BODY }));
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
    assert.notEqual(points[0]?.serials, lines[0]?.ohQty);
    assert.notEqual(points[0]?.serials, filledGridCellCount(lines[0]?.serialCells));
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

  it("says the 1 Sep counts do not match and does not refuse an unmarked grid for missing marks", () => {
    const parsed = parseGcssShrPdf(
      buildMinimalPdf({
        title: "Sub-hand receipt",
        lines: shapeText({ date: "1 Sep 2026", body: UNMARKED_BODY }).split("\n"),
      }),
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(isRyanSeptemberReceipt(parsed.draft), true);
    const line = parsed.draft.lines[0];
    assert.ok(line?.serialCells && line.serialCells.length > 0);
    assert.equal(line.serialCells.every((cell) => cell.kind === "unmarked"), true);
    const counts = shrDraftCounts(parsed.draft);
    assert.notEqual(counts.endItems, 36);
    assert.notEqual(counts.ohQty, 105);
    assert.notEqual(counts.filledCells, 184);
    assert.ok(counts.filledCells > 0);
    const mismatch = filledCellCountMismatch(counts);
    assert.match(mismatch ?? "", /36 lines/);
    assert.match(mismatch ?? "", /OH Qty 105/);
    assert.match(mismatch ?? "", /184 filled cells/);
    assert.match(mismatch ?? "", /Nothing was saved/);
    assert.doesNotMatch(mismatch ?? "", /\bserials\b|unmarked|classified|SerNo|RegNo|LotNo|pieces|items|LABST/i);
    assert.equal(odaMonthlySaveRefusal(parsed.draft, NOW), mismatch);
    const parser = readFileSync(new URL("./gcss-shr.ts", import.meta.url), "utf8");
    const actions = readFileSync(new URL("./oda-shr-actions.ts", import.meta.url), "utf8");
    assert.doesNotMatch(`${parser}\n${actions}`, /ryanCountRefusal/);
    assert.doesNotMatch(parser, /kind:\s*"lotNo"/);
  });

  it("compares the three filled-cell counts without fabricating a 36-line receipt", () => {
    const matched: ShrParsedCounts = { endItems: 36, ohQty: 105, filledCells: 184 };
    const short: ShrParsedCounts = { endItems: 1, ohQty: 11, filledCells: 6 };
    assert.equal(countsMatchRyan(matched), true);
    assert.equal(filledCellCountMismatch(matched), null);
    assert.equal(countsMatchRyan(short), false);
    assert.match(filledCellCountMismatch(short) ?? "", /184 filled cells/);
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
    assert.equal(counts.filledCells, 184);
  });

  it("labels the confirm screen with filled cells and says this PDF does not mark LotNo", () => {
    const panel = readFileSync(new URL("../../components/ledger/oda-monthly-panel.tsx", import.meta.url), "utf8");
    const hub = readFileSync(new URL("../../components/ledger/import-hub.tsx", import.meta.url), "utf8");
    const screen = `${panel}\n${hub}`;
    assert.match(panel, /Sub-hand receipt/);
    assert.match(panel, /GCSS Sub-hand receipt PDF/);
    assert.match(panel, /OH Qty/);
    assert.match(panel, /Cancel/);
    assert.match(panel, /36 lines, OH Qty 105, and 184 filled cells/);
    assert.match(panel, /This PDF does not mark LotNo/);
    assert.match(panel, /An unmarked cell is not a serial/);
    assert.match(panel, /Filled cells/);
    assert.doesNotMatch(panel, /\bserials\b/);
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
