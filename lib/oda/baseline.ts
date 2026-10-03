import { electronicShrForSection } from "./catalog";
import type { SectionLetter } from "./types";

/** Piece total on the seeded section Sub-hand receipt snapshot. Not a trend. */
export function baselinePieceTotal(letter: SectionLetter): number {
  return electronicShrForSection(letter).reduce((sum, line) => sum + line.quantity, 0);
}
