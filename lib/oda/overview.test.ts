import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACCOUNTABILITY_LINES, CATALOG_ITEMS } from "./catalog";
import { loans } from "@/lib/ledger/fixtures";
import {
  LOAN_DIRECTION_GAP,
  MOVEMENT_ROWS,
  REQUIRED_BOM_GAP,
  handReceiptTotals,
  missingPictureAttention,
  sectionItemCount,
} from "./overview";
import { baselinePieceTotal } from "./baseline";

describe("commander hand receipt totals", () => {
  it("separates pieces from unique LINs and does not treat a blank LIN as a LIN", () => {
    const totals = handReceiptTotals(CATALOG_ITEMS);
    const pieces = ACCOUNTABILITY_LINES.reduce((sum, line) => sum + line.quantity, 0);
    const unique = new Set(ACCOUNTABILITY_LINES.map((line) => line.lin).filter(Boolean)).size;
    assert.equal(totals.pieces, pieces);
    assert.equal(totals.uniqueLins, unique);
    assert.ok(totals.piecesWithoutLin >= 1);
    assert.equal(totals.uniqueLins + 0, unique);
    assert.notEqual(totals.pieces, totals.uniqueLins);
  });

  it("counts section items from the same lines as the hand receipt", () => {
    assert.equal(sectionItemCount(CATALOG_ITEMS, "E"), ACCOUNTABILITY_LINES.filter((line) => line.sectionLetter === "E").length);
    assert.equal(baselinePieceTotal("E"), ACCOUNTABILITY_LINES.filter((line) => line.sectionLetter === "E").reduce((sum, line) => sum + line.quantity, 0));
  });

  it("lists missing picture-book photos and does not treat a stencil or empty components as a required BOM", () => {
    const rows = missingPictureAttention(CATALOG_ITEMS);
    assert.equal(rows.length, CATALOG_ITEMS.length);
    assert.equal(rows[0]?.issue, "Missing picture-book photo");
    assert.match(REQUIRED_BOM_GAP, /not in the records/);
    const withStencil = missingPictureAttention([
      {
        ...CATALOG_ITEMS[0],
        hasPictureBookPhoto: false,
      },
    ]);
    assert.equal(withStencil.length, 1);
    const withPhoto = missingPictureAttention([
      {
        ...CATALOG_ITEMS[0],
        hasPictureBookPhoto: true,
      },
    ]);
    assert.equal(withPhoto.length, 0);
    assert.equal(ACCOUNTABILITY_LINES.some((line) => line.components.length === 0), true);
    assert.match(REQUIRED_BOM_GAP, /not counted as a missing BOM/);
  });

  it("does not use fixture loan rows as loan direction", () => {
    assert.ok(loans.length > 0);
    assert.equal(MOVEMENT_ROWS.length, 3);
    assert.deepEqual(
      MOVEMENT_ROWS.map((row) => row.direction),
      ["Out", "Out", "In"],
    );
    assert.match(LOAN_DIRECTION_GAP, /not in the records/);
    assert.match(LOAN_DIRECTION_GAP, /not read as zero/);
    for (const row of MOVEMENT_ROWS) {
      assert.equal(row.issue, "Not in the records");
      assert.equal("count" in row, false);
    }
  });
});
