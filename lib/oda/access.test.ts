import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canEditSection,
  canViewSection,
  SectionIsolationError,
  visibleSectionLetters,
  type IsolationActor,
} from "./access";

function actor(partial: Partial<IsolationActor>): IsolationActor {
  return {
    role: "soldier",
    scope: "section",
    ...partial,
  };
}

describe("section isolation", () => {
  it("Echo SHR holder cannot see Bravo lines", () => {
    const echo = actor({ sectionLetter: "E", scope: "section" });
    assert.equal(canViewSection(echo, "E"), true);
    assert.equal(canViewSection(echo, "B"), false);
    assert.equal(canEditSection(echo, "B"), false);
    assert.deepEqual(visibleSectionLetters(echo), ["E"]);
  });

  it("Bravo SHR holder cannot see Echo lines", () => {
    const bravo = actor({ sectionLetter: "B", scope: "section" });
    assert.equal(canViewSection(bravo, "B"), true);
    assert.equal(canViewSection(bravo, "E"), false);
  });

  it("PM / ODA-level can see every section", () => {
    const pm = actor({ role: "pm", scope: "oda", sectionLetter: undefined });
    assert.deepEqual(visibleSectionLetters(pm), ["B", "C", "D", "E", "F"]);
    assert.equal(canEditSection(pm, "C"), true);
  });

  it("throws an isolation error instead of leaking another section", () => {
    const echo = actor({ sectionLetter: "E" });
    assert.throws(() => {
      if (!canViewSection(echo, "D")) throw new SectionIsolationError("D");
    }, SectionIsolationError);
  });
});
