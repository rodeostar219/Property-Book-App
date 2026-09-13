import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectSourceConflicts, NEVER_AUTO_MERGE } from "./discrepancy";

describe("source conflicts", () => {
  it("opens a discrepancy instead of merging HR vs tracker", () => {
    assert.equal(NEVER_AUTO_MERGE, true);
    const conflicts = detectSourceConflicts([
      {
        source: "hand_receipt",
        nsn: "7021016793258",
        serial: "GPC1902107",
        lin: null,
        nomenclature: "Computer, Digital",
        quantity: 0,
        present: false,
        sectionLetter: "F",
      },
      {
        source: "tracker",
        nsn: "7021016793258",
        serial: "GPC1902107",
        lin: null,
        nomenclature: "Computer, Digital",
        quantity: 1,
        present: true,
        sectionLetter: "F",
      },
    ]);
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].sourceA, "hand_receipt");
    assert.equal(conflicts[0].sourceB, "tracker");
    assert.match(conflicts[0].issue, /do not match/);
  });

  it("opens a discrepancy when HR quantity disagrees with a 1750", () => {
    const conflicts = detectSourceConflicts([
      {
        source: "hand_receipt",
        nsn: "582001D163000",
        serial: "10087231",
        lin: null,
        nomenclature: "Radio Set, AN/PRC-163",
        quantity: 1,
        present: true,
        sectionLetter: "E",
      },
      {
        source: "packing_1750",
        nsn: "582001D163000",
        serial: "10087231",
        lin: null,
        nomenclature: "Radio Set, AN/PRC-163",
        quantity: 2,
        present: true,
        sectionLetter: "E",
      },
    ]);
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].severity, "Shortage");
  });

  it("ignores picture-book common name even when picture facts are included", () => {
    const conflicts = detectSourceConflicts(
      [
        {
          source: "da_2062",
          nsn: "580501C949317",
          serial: "300415040404300",
          lin: null,
          nomenclature: "Telephone, Satellite: 9575A Iridium",
          quantity: 1,
          present: true,
          sectionLetter: "E",
        },
        {
          source: "picture_book",
          nsn: "580501C949317",
          serial: "300415040404300",
          lin: null,
          nomenclature: "Iridium",
          quantity: 1,
          present: true,
          sectionLetter: "E",
        },
      ],
      { includePictureBook: true },
    );
    assert.equal(conflicts.length, 0);
  });

  it("does not treat picture-book common name as an accountability conflict", () => {
    const conflicts = detectSourceConflicts([
      {
        source: "hand_receipt",
        nsn: "580501C949317",
        serial: "300415040404300",
        lin: null,
        nomenclature: "Telephone, Satellite: 9575A Iridium",
        quantity: 1,
        present: true,
        sectionLetter: "E",
      },
      {
        source: "picture_book",
        nsn: "580501C949317",
        serial: "300415040404300",
        lin: null,
        nomenclature: "Iridium",
        quantity: 1,
        present: true,
        sectionLetter: "E",
      },
    ]);
    assert.equal(conflicts.length, 0);
  });
});
