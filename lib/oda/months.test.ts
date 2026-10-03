import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { electronicShrForSection } from "./catalog";
import { ODA_SCHEMA_SQL } from "./schema-sql";
import {
  adjacentPointPairs,
  endItemCountNote,
  monthlySerialPoints,
  receiptSerialCount,
  unplottedReceiptNote,
  validateMonthlyPeriod,
  yearMonthCells,
  type SerialCell,
  type ShrInjectStamp,
  type ShrReceiptLine,
} from "./months";

const NOW = new Date("2026-10-03T12:00:00.000Z");

function inject(partial: Partial<ShrInjectStamp> & Pick<ShrInjectStamp, "id" | "injectedAt">): ShrInjectStamp {
  return {
    sectionLetter: "E",
    label: partial.label ?? "Sub-hand receipt update",
    notes: partial.notes ?? null,
    ...partial,
  };
}

describe("monthly Sub-hand receipt strip", () => {
  it("marks the September baseline uploaded and does not invent other months", () => {
    const cells = yearMonthCells(
      2026,
      [
        inject({
          id: 4,
          injectedAt: "2026-09-01T12:00:00.000Z",
          label: "Sub-hand receipt update · 01 Sep 26 baseline · Echo",
          notes: "Fixture snapshot — D1 unavailable, inject writes disabled.",
        }),
      ],
      "E",
      NOW,
    );
    const byLabel = Object.fromEntries(cells.map((cell) => [cell.label, cell.state]));
    assert.equal(byLabel.Jan, "missing");
    assert.equal(byLabel.Sep, "uploaded");
    assert.equal(cells.find((cell) => cell.label === "Sep")?.injectId, 4);
    assert.equal(byLabel.Oct, "missing");
    assert.equal(byLabel.Nov, "future");
    assert.equal(byLabel.Dec, "future");
  });

  it("rejects a future period and accepts the current month", () => {
    assert.match(validateMonthlyPeriod(2026, 11, NOW) ?? "", /future/);
    assert.equal(validateMonthlyPeriod(2026, 10, NOW), null);
    assert.match(validateMonthlyPeriod(2026, 0, NOW) ?? "", /Month/);
  });

  it("plots filled SerNo and RegNo cells and leaves out LotNo, blanks, OH Qty, and a stored piece total", () => {
    const cells: SerialCell[] = [
      { kind: "serNo", value: "SN-1" },
      { kind: "serNo", value: "" },
      { kind: "regNo", value: "RN-9" },
      { kind: "regNo", value: "—" },
      { kind: "lotNo", value: "LOT-44" },
      { kind: "lotNo", value: "LOT-45" },
    ];
    const lines: ShrReceiptLine[] = [
      {
        injectId: 2,
        ohQty: 11,
        untypedSerial: null,
        serialCells: cells,
        changeType: "added",
      },
      {
        injectId: 2,
        ohQty: 4,
        untypedSerial: "SHOULD-NOT-COUNT",
        serialCells: [{ kind: "serNo", value: "SN-2" }],
        changeType: "unchanged",
      },
      {
        injectId: 2,
        ohQty: 9,
        untypedSerial: null,
        serialCells: [{ kind: "serNo", value: "REMOVED" }],
        changeType: "removed",
      },
    ];
    const points = monthlySerialPoints(
      [
        inject({
          id: 1,
          injectedAt: "2026-08-02T12:00:00.000Z",
          notes: "No Sub-hand receipt lines",
        }),
        inject({
          id: 2,
          injectedAt: "2026-10-02T12:00:00.000Z",
          notes: "shr-period:2026-10 shr-pieces:99",
        }),
      ],
      lines,
      "E",
    );
    assert.deepEqual(
      points.map((point) => [point.month, point.serials, point.injectId]),
      [[10, 3, 2]],
    );
    assert.equal(points.some((point) => point.serials === 0), false);
    assert.equal(points.some((point) => point.month === 8), false);
    assert.deepEqual(adjacentPointPairs(points), []);
    const october = endItemCountNote(lines[0]);
    assert.match(october, /2 serials/);
    assert.match(october, /OH Qty 11/);
    assert.match(october, /Serials and OH Qty differ/);
    assert.doesNotMatch(october, /pieces|items/i);
    const matched = endItemCountNote({
      ohQty: 1,
      serialCells: [{ kind: "serNo", value: "SN-1" }],
    });
    assert.match(matched, /1 serial/);
    assert.match(matched, /OH Qty 1/);
    assert.doesNotMatch(matched, /differ|pieces|items/i);
  });

  it("does not plot a month with no receipt as zero", () => {
    const cells = yearMonthCells(2026, [], "E", NOW);
    assert.equal(cells.find((cell) => cell.label === "Jan")?.state, "missing");
    assert.equal(cells.find((cell) => cell.label === "Oct")?.state, "missing");
    const points = monthlySerialPoints([], [], "E");
    assert.equal(points.some((point) => point.serials === 0), false);
    assert.deepEqual(points, []);
  });

  it("keeps September uploaded and unplotted when the fixture serial field is not a SerNo or RegNo cell", () => {
    const stamp = inject({
      id: 4,
      injectedAt: "2026-09-01T12:00:00.000Z",
      label: "Sub-hand receipt update · 01 Sep 26 baseline · Echo",
      notes: "Fixture snapshot — D1 unavailable, Sub-hand receipt writes disabled.",
    });
    const echo = electronicShrForSection("E");
    const lines: ShrReceiptLine[] = echo.map((line) => ({
      injectId: 4,
      ohQty: line.quantity,
      untypedSerial: line.serial,
      serialCells: null,
      changeType: "added",
    }));
    assert.ok(echo.some((line) => line.serial));
    assert.ok(echo.some((line) => !line.serial));
    assert.equal(receiptSerialCount(lines).status, "untyped");
    const cells = yearMonthCells(2026, [stamp], "E", NOW);
    assert.equal(cells.find((cell) => cell.label === "Sep")?.state, "uploaded");
    assert.equal(cells.find((cell) => cell.label === "Jan")?.state, "missing");
    const points = monthlySerialPoints([stamp], lines, "E");
    assert.deepEqual(points, []);
    const note = unplottedReceiptNote(
      [{ name: "September", year: 2026, injectId: 4 }],
      lines,
    );
    assert.match(note ?? "", /September 2026/);
    assert.match(note ?? "", /do not identify SerNo or RegNo separately from LotNo/);
    assert.doesNotMatch(note ?? "", /stored piece total|pieces|items/i);
    assert.equal("pieces" in stamp, false);
  });

  it("does not invent a zero when a classified grid has no filled SerNo or RegNo cells", () => {
    const lines: ShrReceiptLine[] = [
      {
        injectId: 1,
        ohQty: 6,
        untypedSerial: null,
        serialCells: [
          { kind: "serNo", value: " " },
          { kind: "regNo", value: "NOT RECORDED" },
          { kind: "lotNo", value: "LOT-1" },
        ],
        changeType: "added",
      },
    ];
    const points = monthlySerialPoints(
      [
        inject({
          id: 1,
          injectedAt: "2026-09-01T12:00:00.000Z",
          notes: "shr-period:2026-09 shr-pieces:6",
        }),
      ],
      lines,
      "E",
    );
    assert.deepEqual(points, []);
    assert.equal(receiptSerialCount(lines).status, "no-serial-cells");
    const note = unplottedReceiptNote([{ name: "September", year: 2026, injectId: 1 }], lines);
    assert.match(note ?? "", /no SerNo or RegNo cells to count/);
    assert.doesNotMatch(note ?? "", /zero|pieces|items/i);
    const lineNote = endItemCountNote(lines[0]);
    assert.match(lineNote, /0 serials/);
    assert.match(lineNote, /OH Qty 6/);
    assert.match(lineNote, /Serials and OH Qty differ/);
    assert.doesNotMatch(lineNote, /pieces|items/i);
  });

  it("uses the latest receipt in the month and does not require a piece-total field", () => {
    const earlier: ShrReceiptLine = {
      injectId: 1,
      ohQty: 1,
      untypedSerial: null,
      serialCells: [{ kind: "serNo", value: "OLD" }],
      changeType: "added",
    };
    const later: ShrReceiptLine = {
      injectId: 2,
      ohQty: 1,
      untypedSerial: "UNTYPED",
      serialCells: null,
      changeType: "added",
    };
    const points = monthlySerialPoints(
      [
        inject({
          id: 1,
          injectedAt: "2026-09-01T12:00:00.000Z",
          notes: "shr-period:2026-09 shr-pieces:6",
        }),
        inject({
          id: 2,
          injectedAt: "2026-09-15T12:00:00.000Z",
          notes: "shr-period:2026-09",
        }),
      ],
      [earlier, later],
      "E",
    );
    assert.deepEqual(points, []);
    const shrInjects = ODA_SCHEMA_SQL.slice(
      ODA_SCHEMA_SQL.indexOf("CREATE TABLE IF NOT EXISTS shr_injects"),
      ODA_SCHEMA_SQL.indexOf("CREATE TABLE IF NOT EXISTS shr_inject_lines"),
    );
    const shrLines = ODA_SCHEMA_SQL.slice(
      ODA_SCHEMA_SQL.indexOf("CREATE TABLE IF NOT EXISTS shr_inject_lines"),
      ODA_SCHEMA_SQL.indexOf("CREATE TABLE IF NOT EXISTS source_discrepancies"),
    );
    assert.doesNotMatch(shrInjects, /piece/i);
    assert.doesNotMatch(shrLines, /piece/i);
    assert.match(shrLines, /serial_number/);
    assert.match(shrLines, /quantity/);
  });

  it("does not connect a line across a missing month", () => {
    const pairs = adjacentPointPairs([
      { year: 2026, month: 8 },
      { year: 2026, month: 10 },
    ]);
    assert.deepEqual(pairs, []);
  });
});
