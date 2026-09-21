import type { SectionLetter } from "./types";

export type CatalogPerson = {
  id: string;
  displayName: string;
  fullName: string;
  initials: string;
  grade: string;
  mos: string;
  email: string;
  sectionLetter: SectionLetter | null;
  identity: "echo" | "bravo" | "pm" | "other";
};

export const PEOPLE: Record<string, CatalogPerson> = {
  ryan: {
    id: "echo-ryan",
    displayName: "R. Cole",
    fullName: "SSG Ryan Cole",
    initials: "RC",
    grade: "SSG",
    mos: "18E",
    email: "r.cole@sfg.mil",
    sectionLetter: "E",
    identity: "echo",
  },
  vargas: {
    id: "bravo-vargas",
    displayName: "M. Vargas",
    fullName: "SGT M. Vargas",
    initials: "MV",
    grade: "SGT",
    mos: "18B",
    email: "m.vargas@sfg.mil",
    sectionLetter: "B",
    identity: "bravo",
  },
  nguyen: {
    id: "charlie-nguyen",
    displayName: "C. Nguyen",
    fullName: "SGT C. Nguyen",
    initials: "CN",
    grade: "SGT",
    mos: "18C",
    email: "c.nguyen@sfg.mil",
    sectionLetter: "C",
    identity: "other",
  },
  okonkwo: {
    id: "delta-okonkwo",
    displayName: "D. Okonkwo",
    fullName: "SGT D. Okonkwo",
    initials: "DO",
    grade: "SGT",
    mos: "18D",
    email: "d.okonkwo@sfg.mil",
    sectionLetter: "D",
    identity: "other",
  },
  alvarez: {
    id: "fox-alvarez",
    displayName: "F. Alvarez",
    fullName: "SGT F. Alvarez",
    initials: "FA",
    grade: "SGT",
    mos: "18F",
    email: "f.alvarez@sfg.mil",
    sectionLetter: "F",
    identity: "other",
  },
  ortiz: {
    id: "pm-ortiz",
    displayName: "R. Ortiz",
    fullName: "SFC R. Ortiz",
    initials: "RO",
    grade: "SFC",
    mos: "92Y",
    email: "r.ortiz@sfg.mil",
    sectionLetter: null,
    identity: "pm",
  },
  reyes: {
    id: "oda-reyes",
    displayName: "A. Reyes",
    fullName: "CPT A. Reyes",
    initials: "AR",
    grade: "CPT",
    mos: "18A",
    email: "a.reyes@sfg.mil",
    sectionLetter: null,
    identity: "other",
  },
};

export function personById(id: string): CatalogPerson | undefined {
  return Object.values(PEOPLE).find((person) => person.id === id);
}
