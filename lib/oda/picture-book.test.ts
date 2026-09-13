import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allowedPictureBookColumns,
  forbiddenAccountabilityMutationFromPhoto,
  pictureBookTouchesAccountability,
  stencilSvg,
} from "./picture-book";

describe("picture book is visual only", () => {
  it("does not invent accountability", () => {
    assert.equal(pictureBookTouchesAccountability(), false);
    for (const column of forbiddenAccountabilityMutationFromPhoto()) {
      assert.equal(allowedPictureBookColumns().includes(column), false);
    }
  });

  it("stencil is a visual mark, not a serial or qty", () => {
    const svg = stencilSvg("Iridium", "Telephone, Satellite: 9575A Iridium");
    assert.match(svg, /Visual ID only/);
    assert.doesNotMatch(svg, /quantity/);
    assert.doesNotMatch(svg, /serial_number/);
  });
});
