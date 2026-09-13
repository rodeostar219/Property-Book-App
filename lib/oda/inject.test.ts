import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diffElectronicShr, injectCounts, INJECT_IS_NOT_ACCEPT } from "./inject";
import type { ElectronicShrLine } from "./types";

const echoCurrent: ElectronicShrLine[] = [
  {
    nsn: "580501C949317",
    serial: "300415040404300",
    lin: null,
    nomenclature: "Telephone, Satellite: 9575A Iridium",
    quantity: 1,
    sectionLetter: "E",
  },
  {
    nsn: "582001D163000",
    serial: "10087231",
    lin: null,
    nomenclature: "Radio Set, AN/PRC-163",
    quantity: 1,
    sectionLetter: "E",
  },
];

describe("electronic SHR inject", () => {
  it("creates a versioned diff without treating inject as Accept theater", () => {
    assert.equal(INJECT_IS_NOT_ACCEPT, true);
    const incoming: ElectronicShrLine[] = [
      echoCurrent[0],
      {
        nsn: "582001D158000",
        serial: "15800421",
        lin: null,
        nomenclature: "Radio Set, AN/PRC-158",
        quantity: 1,
        sectionLetter: "E",
      },
    ];
    const diff = diffElectronicShr(echoCurrent, incoming);
    assert.equal(diff.added.length, 1);
    assert.equal(diff.removed.length, 1);
    assert.equal(diff.unchanged.length, 1);
    assert.equal(diff.added[0].serial, "15800421");
    assert.equal(diff.removed[0].serial, "10087231");
    const counts = injectCounts(diff);
    assert.deepEqual(counts, {
      addedCount: 1,
      removedCount: 1,
      changedCount: 0,
      unchangedCount: 1,
    });
  });

  it("records quantity/name changes and keeps prior values queryable on the row", () => {
    const incoming: ElectronicShrLine[] = [
      { ...echoCurrent[0], quantity: 2 },
      echoCurrent[1],
    ];
    const diff = diffElectronicShr(echoCurrent, incoming);
    assert.equal(diff.changed.length, 1);
    assert.equal(diff.changed[0].priorQuantity, 1);
    assert.equal(diff.changed[0].quantity, 2);
  });
});
