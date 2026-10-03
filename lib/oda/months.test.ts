import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adjacentPointPairs,
  monthlyPiecePoints,
  validateMonthlyPeriod,
  yearMonthCells,
  type ShrInjectStamp,
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

  it("plots only stored monthly Sub-hand receipt totals and skips a snapshot with no stored total", () => {
    const points = monthlyPiecePoints(
      [
        inject({
          id: 1,
          injectedAt: "2026-09-01T12:00:00.000Z",
          label: "Sub-hand receipt update · 01 Sep 26 baseline · Echo",
          notes: "Seeded electronic Sub-hand receipt (SHR) snapshot.",
        }),
        inject({
          id: 2,
          injectedAt: "2026-10-02T12:00:00.000Z",
          label: "Sub-hand receipt update · Echo · Oct 2026",
          notes: "shr-period:2026-10 shr-pieces:7",
        }),
        inject({
          id: 3,
          injectedAt: "2026-08-02T12:00:00.000Z",
          label: "Sub-hand receipt update · Echo · 2026-08-02",
          notes: "Electronic feed only",
        }),
      ],
      "E",
    );
    assert.deepEqual(
      points.map((point) => [point.month, point.pieces]),
      [[10, 7]],
    );
    assert.deepEqual(adjacentPointPairs(points), []);
  });

  it("keeps an earlier stored total when a later record in that month has none", () => {
    const points = monthlyPiecePoints(
      [
        inject({
          id: 1,
          injectedAt: "2026-09-01T12:00:00.000Z",
          label: "Sub-hand receipt update · Echo · Sep 2026",
          notes: "shr-period:2026-09 shr-pieces:6",
        }),
        inject({
          id: 2,
          injectedAt: "2026-09-15T12:00:00.000Z",
          notes: "shr-period:2026-09",
          label: "Sub-hand receipt update · Echo · Sep 2026",
        }),
      ],
      "E",
    );
    assert.deepEqual(
      points.map((point) => [point.month, point.pieces]),
      [[9, 6]],
    );
  });

  it("does not plot a snapshot that never stored a piece total", () => {
    const points = monthlyPiecePoints(
      [
        inject({
          id: 1,
          injectedAt: "2026-09-01T12:00:00.000Z",
          label: "Sub-hand receipt update · 01 Sep 26 baseline · Echo",
          notes: "Fixture snapshot",
        }),
        inject({
          id: 2,
          injectedAt: "2026-09-15T12:00:00.000Z",
          notes: "shr-period:2026-09",
          label: "Sub-hand receipt update · Echo · Sep 2026",
        }),
      ],
      "E",
    );
    assert.equal(points.length, 0);
  });

  it("does not connect a line across a missing month", () => {
    const pairs = adjacentPointPairs([
      { year: 2026, month: 8 },
      { year: 2026, month: 10 },
    ]);
    assert.deepEqual(pairs, []);
  });
});
