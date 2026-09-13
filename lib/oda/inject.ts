import { identityKey } from "./identity-key";
import type {
  ElectronicShrLine,
  InjectDiff,
  InjectDiffLine,
} from "./types";

function lineMap(lines: ElectronicShrLine[]): Map<string, ElectronicShrLine> {
  const map = new Map<string, ElectronicShrLine>();
  for (const line of lines) {
    map.set(identityKey(line), line);
  }
  return map;
}

function factsChanged(prior: ElectronicShrLine, next: ElectronicShrLine): boolean {
  return (
    prior.nomenclature !== next.nomenclature ||
    prior.quantity !== next.quantity ||
    (prior.serial ?? null) !== (next.serial ?? null) ||
    (prior.lin ?? null) !== (next.lin ?? null) ||
    prior.sectionLetter !== next.sectionLetter
  );
}

export function diffElectronicShr(
  current: ElectronicShrLine[],
  incoming: ElectronicShrLine[],
): InjectDiff {
  const currentMap = lineMap(current);
  const incomingMap = lineMap(incoming);
  const added: InjectDiffLine[] = [];
  const removed: InjectDiffLine[] = [];
  const changed: InjectDiffLine[] = [];
  const unchanged: InjectDiffLine[] = [];

  for (const [key, next] of incomingMap) {
    const prior = currentMap.get(key);
    if (!prior) {
      added.push({ ...next, changeType: "added" });
      continue;
    }
    if (factsChanged(prior, next)) {
      changed.push({
        ...next,
        changeType: "changed",
        priorNomenclature: prior.nomenclature,
        priorQuantity: prior.quantity,
        priorSerial: prior.serial,
      });
    } else {
      unchanged.push({ ...next, changeType: "unchanged" });
    }
  }

  for (const [key, prior] of currentMap) {
    if (!incomingMap.has(key)) {
      removed.push({ ...prior, changeType: "removed" });
    }
  }

  return {
    added,
    removed,
    changed,
    unchanged,
    lines: [...added, ...removed, ...changed, ...unchanged],
  };
}

export function injectCounts(diff: InjectDiff) {
  return {
    addedCount: diff.added.length,
    removedCount: diff.removed.length,
    changedCount: diff.changed.length,
    unchangedCount: diff.unchanged.length,
  };
}

/** Inject records a versioned feed. It does not accept theater or flatten layers. */
export const INJECT_IS_NOT_ACCEPT = true;
