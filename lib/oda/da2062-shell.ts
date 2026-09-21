import { canViewSection, isOdaScope } from "./access";
import {
  ensureOdaStore,
  listDa2062Imports,
  listDiscrepancies,
  type Da2062ImportRecord,
  type PersistenceMode,
} from "./store";
import type { Actor } from "@/lib/ledger/types";

function canSeeDa2062Import(actor: Actor, row: Da2062ImportRecord): boolean {
  if (row.destinationKind === "oda_hr") return isOdaScope(actor);
  if (row.destinationSection) return canViewSection(actor, row.destinationSection);
  return isOdaScope(actor);
}

/** Slim GET loader for /receipts/2062-in — persistence + history cards, no catalog/PDF/OCR. */
export async function loadDa2062InShell(actor: Actor): Promise<{
  persistence: PersistenceMode;
  da2062Imports: Da2062ImportRecord[];
}> {
  const persistence = await ensureOdaStore();
  if (persistence !== "d1") return { persistence, da2062Imports: [] };
  const da2062Imports = (await listDa2062Imports()).filter((row) => canSeeDa2062Import(actor, row));
  return { persistence, da2062Imports };
}

export async function loadLedgerChrome(actor: Actor): Promise<{ exceptionCount: number }> {
  const discrepancies = await listDiscrepancies();
  return {
    exceptionCount: discrepancies.filter(
      (row) => !row.sectionLetter || canViewSection(actor, row.sectionLetter),
    ).length,
  };
}
