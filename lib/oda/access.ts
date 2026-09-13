import { SECTION_LETTERS, type ActorScope, type SectionLetter } from "./types";

export type IsolationActor = {
  role: "soldier" | "pm";
  scope: ActorScope;
  sectionLetter?: SectionLetter | null;
};

export function actorSectionLetter(actor: IsolationActor): SectionLetter | null {
  return actor.sectionLetter ?? null;
}

export function isOdaScope(actor: IsolationActor): boolean {
  return actor.scope === "oda" || actor.role === "pm";
}

export function canViewSection(actor: IsolationActor, letter: SectionLetter): boolean {
  if (isOdaScope(actor)) return true;
  return actor.sectionLetter === letter;
}

export function canEditSection(actor: IsolationActor, letter: SectionLetter): boolean {
  return canViewSection(actor, letter);
}

export function visibleSectionLetters(actor: IsolationActor): SectionLetter[] {
  if (isOdaScope(actor)) return [...SECTION_LETTERS];
  return actor.sectionLetter ? [actor.sectionLetter] : [];
}

export function assertCanViewSection(actor: IsolationActor, letter: SectionLetter): void {
  if (!canViewSection(actor, letter)) {
    throw new SectionIsolationError(letter);
  }
}

export class SectionIsolationError extends Error {
  readonly letter: SectionLetter;

  constructor(letter: SectionLetter) {
    super(
      `Section isolation: this identity cannot see or edit ${letter} section lines.`,
    );
    this.name = "SectionIsolationError";
    this.letter = letter;
  }
}
