import { identityKey } from "./identity-key";
import type { ElectronicShrLine, SourceConflict } from "./types";
export type { FactSource } from "./types";
import type { FactSource } from "./types";

export type SourceFact = {
  source: FactSource;
  nsn: string;
  serial: string | null;
  lin: string | null;
  nomenclature: string;
  quantity: number;
  sectionLetter?: ElectronicShrLine["sectionLetter"] | null;
  present: boolean;
};

function describeFact(fact: SourceFact): string {
  if (!fact.present) return "absent";
  const serial = fact.serial ? ` SN ${fact.serial}` : " serial not recorded";
  return `${fact.nomenclature} · qty ${fact.quantity}${serial}`;
}

function pairKey(a: FactSource, b: FactSource, identity: string): string {
  const [left, right] = [a, b].sort();
  return `${identity}|${left}|${right}`;
}

/**
 * Compare layered sources. Never merge. A mismatch opens a discrepancy.
 * Official vs common/actual name is visual ID and is not a conflict.
 */
export function detectSourceConflicts(
  facts: SourceFact[],
  options?: { includePictureBook?: boolean },
): SourceConflict[] {
  const byIdentity = new Map<string, SourceFact[]>();
  for (const fact of facts) {
    const key = identityKey(fact);
    const list = byIdentity.get(key) ?? [];
    list.push(fact);
    byIdentity.set(key, list);
  }

  const seen = new Set<string>();
  const conflicts: SourceConflict[] = [];
  const includePicture = options?.includePictureBook === true;

  for (const [key, group] of byIdentity) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const a = group[i];
        const b = group[j];
        if (a.source === b.source) continue;
        const involvesPicture = a.source === "picture_book" || b.source === "picture_book";
        if (involvesPicture && !includePicture) {
          continue;
        }
        const nameMismatch = involvesPicture ? false : a.nomenclature !== b.nomenclature;
        const mismatch =
          a.present !== b.present ||
          a.quantity !== b.quantity ||
          (a.serial ?? null) !== (b.serial ?? null) ||
          nameMismatch;
        if (!mismatch) continue;
        const dedupe = pairKey(a.source, b.source, key);
        if (seen.has(dedupe)) continue;
        seen.add(dedupe);
        conflicts.push({
          identityKey: key,
          nsn: a.nsn || b.nsn,
          serial: a.serial ?? b.serial,
          lin: a.lin ?? b.lin,
          sectionLetter: a.sectionLetter ?? b.sectionLetter ?? null,
          sourceA: a.source,
          sourceB: b.source,
          factA: describeFact(a),
          factB: describeFact(b),
          issue: `${sourceLabel(a.source)} and ${sourceLabel(b.source)} do not match`,
          action: "Open a discrepancy. Do not auto-merge layered facts.",
          severity: a.present !== b.present ? "Review" : "Shortage",
        });
      }
    }
  }

  return conflicts;
}

export function sourceLabel(source: FactSource): string {
  switch (source) {
    case "hand_receipt":
      return "Hand receipt";
    case "sub_hand_receipt":
      return "Sub-hand receipt (SHR)";
    case "tracker":
      return "Tracker";
    case "picture_book":
      return "Picture book (visual ID)";
    case "packing_1750":
      return "DD Form 1750";
    case "da_2062":
      return "DA Form 2062";
    default:
      return source;
  }
}

export const NEVER_AUTO_MERGE = true;
