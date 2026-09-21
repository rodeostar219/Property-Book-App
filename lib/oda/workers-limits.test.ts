import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { CATALOG_ITEMS } from "./catalog";
import {
  ADD_TO_SIGNED_FOR_LABEL,
  CONFIRM_BEFORE_WRITE,
  planDa2062Confirm,
} from "./da2062-confirm";

describe("Workers 1102 hardening for 2062-in GET", () => {
  it("keeps Confirm-before-write and toast≠commit contract", () => {
    assert.equal(CONFIRM_BEFORE_WRITE, true);
    assert.equal(ADD_TO_SIGNED_FOR_LABEL, "Add to signed-for");
    const skipped = planDa2062Confirm({
      lines: [
        {
          lin: null,
          nsn: "582001D158000",
          serial: "15800421",
          nomenclature: "Radio Set, AN/PRC-158",
          quantity: 1,
        },
      ],
      dispositions: ["skip"],
      conflicts: [],
      sectionLetter: "E",
    });
    assert.equal(skipped.willWrite, false);
    assert.equal(skipped.accepted.length, 0);
  });

  it("does not encode picture-book stencils into catalog items at module init", () => {
    for (const item of CATALOG_ITEMS) {
      assert.equal(item.photoData, null);
    }
  });

  it("2062-in GET stays off loadWorkspace, PDF parse, fixtures, and OCR", () => {
    const page = readFileSync(new URL("../../app/(ledger)/receipts/2062-in/page.tsx", import.meta.url), "utf8");
    const panel = readFileSync(new URL("../../components/ledger/da2062-in-panel.tsx", import.meta.url), "utf8");
    const layout = readFileSync(new URL("../../app/(ledger)/layout.tsx", import.meta.url), "utf8");
    const actions = readFileSync(new URL("./da2062-actions.ts", import.meta.url), "utf8");

    assert.match(page, /loadDa2062InShell/);
    assert.doesNotMatch(page, /loadWorkspace/);
    assert.doesNotMatch(page, /da2062-fixtures/);
    assert.doesNotMatch(page, /parseDa2062Pdf/);

    assert.match(layout, /loadLedgerChrome/);
    assert.doesNotMatch(layout, /loadWorkspace/);

    assert.match(panel, /da2062-actions/);
    assert.match(panel, /da2062-confirm/);
    assert.doesNotMatch(panel, /from ["']@\/lib\/oda\/da2062["']/);
    assert.doesNotMatch(panel, /da2062-pdf/);

    assert.match(actions, /await import\("\.\/da2062"\)/);
    assert.match(actions, /await import\("\.\/da2062-fixtures"\)/);
    assert.match(actions, /import type \{ Da2062FixtureName \} from "\.\/da2062-fixtures"/);
    assert.doesNotMatch(actions, /import \{[^}]*da2062Fixture/);
    assert.doesNotMatch(actions, /import \{[^}]*parseDa2062Pdf/);
  });
});
