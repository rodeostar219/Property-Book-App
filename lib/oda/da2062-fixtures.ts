import { PEOPLE } from "./catalog";
import { buildMinimalPdf } from "./da2062-pdf";
import { ODA } from "./org";

export type Da2062FixtureName =
  | "electronic-echo"
  | "ocr-echo"
  | "electronic-oda-hr"
  | "wrong-section-bravo"
  | "cross-uic";

export type Da2062Fixture = {
  name: Da2062FixtureName;
  filename: string;
  label: string;
  bytes: Uint8Array;
};

const ECHO_STRUCTURED_LINES = [
  "LINE|LIN=R57640|NSN=582001D158000|SERIAL=15800421|NOMENCLATURE=Radio Set, AN/PRC-158|QTY=1",
  "LINE|LIN=T05007|NSN=580501C949317|SERIAL=300415040404300|NOMENCLATURE=Telephone, Satellite: 9575A Iridium|QTY=1",
  "LINE|LIN=A35390|NSN=589501D050302|SERIAL=|NOMENCLATURE=BHI Mini-SATCOM Antenna Kit|QTY=1",
  "LINE|LIN=|NSN=6130014952839|SERIAL=013252|NOMENCLATURE=Charger, Battery|QTY=2",
];

function electronicEchoPdf(): Uint8Array {
  return buildMinimalPdf({
    title: "DA Form 2062 electronic Echo",
    fields: {
      PARSE_PATH: "electronic",
      UIC: ODA.uic,
      ISSUER: "1st SFG (A) S-4 / Battalion property",
      GAINING_PARTY: PEOPLE.ryan.fullName,
      GAINING_SECTION: "E",
    },
    lines: [
      "DA FORM 2062",
      "HAND RECEIPT/SHORTAGE LISTING",
      "PARSE_PATH=electronic",
      `UIC=${ODA.uic}`,
      "ISSUER=1st SFG (A) S-4 / Battalion property",
      `GAINING_PARTY=${PEOPLE.ryan.fullName}`,
      "GAINING_SECTION=E",
      ...ECHO_STRUCTURED_LINES,
    ],
  });
}

function ocrEchoPdf(): Uint8Array {
  return buildMinimalPdf({
    title: "DA Form 2062 scanned Echo",
    lines: [
      "DA FORM 2062",
      "HAND RECEIPT / SHORTAGE LISTING",
      "PARSE_PATH=ocr",
      `UIC ${ODA.uic}`,
      "FROM 1st SFG (A) S-4 / Battalion property",
      `TO ${PEOPLE.ryan.fullName} ECHO`,
      "NSN 582001D158000 SN 15800421 Radio Set, AN/PRC-158 QTY 1 LIN R57640",
      "NSN 580501C949317 SN 300415040404300 Telephone, Satellite: 9575A Iridium QTY 1 LIN T05007",
      "NSN 589501D050302 SN NOT RECORDED BHI Mini-SATCOM Antenna Kit QTY 1 LIN A35390",
      "NSN 6130014952839 SN 013252 Charger, Battery QTY 2",
    ],
  });
}

function electronicOdaHrPdf(): Uint8Array {
  return buildMinimalPdf({
    title: "DA Form 2062 electronic ODA HR",
    fields: {
      PARSE_PATH: "electronic",
      UIC: ODA.uic,
      ISSUER: "1st SFG (A) S-4",
      GAINING_PARTY: PEOPLE.reyes.fullName,
    },
    lines: [
      "DA FORM 2062",
      "PARSE_PATH=electronic",
      `UIC=${ODA.uic}`,
      "ISSUER=1st SFG (A) S-4",
      `GAINING_PARTY=${PEOPLE.reyes.fullName}`,
      "LINE|LIN=R57640|NSN=582001D158000|SERIAL=15800421|NOMENCLATURE=Radio Set, AN/PRC-158|QTY=1",
    ],
  });
}

function wrongSectionBravoPdf(): Uint8Array {
  return buildMinimalPdf({
    title: "DA Form 2062 Bravo",
    fields: {
      PARSE_PATH: "electronic",
      UIC: ODA.uic,
      ISSUER: "1st SFG (A) S-4",
      GAINING_PARTY: PEOPLE.vargas.fullName,
      GAINING_SECTION: "B",
    },
    lines: [
      "DA FORM 2062",
      `UIC=${ODA.uic}`,
      `GAINING_PARTY=${PEOPLE.vargas.fullName}`,
      "GAINING_SECTION=B",
      "LINE|LIN=R95035|NSN=1005015997613|SERIAL=W1234567|NOMENCLATURE=Rifle, 5.56 Millimeter: M4A1|QTY=1",
    ],
  });
}

function crossUicPdf(): Uint8Array {
  return buildMinimalPdf({
    title: "DA Form 2062 cross UIC",
    fields: {
      PARSE_PATH: "electronic",
      UIC: "W99XXX",
      ISSUER: "Other UIC S-4",
      GAINING_PARTY: PEOPLE.ryan.fullName,
      GAINING_SECTION: "E",
    },
    lines: [
      "DA FORM 2062",
      "UIC=W99XXX",
      `GAINING_PARTY=${PEOPLE.ryan.fullName}`,
      "GAINING_SECTION=E",
      "LINE|LIN=R57640|NSN=582001D158000|SERIAL=15800421|NOMENCLATURE=Radio Set, AN/PRC-158|QTY=1",
    ],
  });
}

export function da2062Fixture(name: Da2062FixtureName): Da2062Fixture {
  switch (name) {
    case "electronic-echo":
      return {
        name,
        filename: "DA2062-electronic-Echo-W51HXC.pdf",
        label: "Electronic / fillable Echo 2062",
        bytes: electronicEchoPdf(),
      };
    case "ocr-echo":
      return {
        name,
        filename: "DA2062-scanned-OCR-Echo-W51HXC.pdf",
        label: "Scanned / OCR Echo 2062",
        bytes: ocrEchoPdf(),
      };
    case "electronic-oda-hr":
      return {
        name,
        filename: "DA2062-electronic-ODA-HR-W51HXC.pdf",
        label: "Electronic ODA hand receipt 2062",
        bytes: electronicOdaHrPdf(),
      };
    case "wrong-section-bravo":
      return {
        name,
        filename: "DA2062-Bravo-wrong-section.pdf",
        label: "Bravo 2062 (wrong section for Echo)",
        bytes: wrongSectionBravoPdf(),
      };
    case "cross-uic":
      return {
        name,
        filename: "DA2062-cross-UIC-W99XXX.pdf",
        label: "Cross-UIC 2062",
        bytes: crossUicPdf(),
      };
    default: {
      const _never: never = name;
      throw new Error(`Unknown fixture ${_never}`);
    }
  }
}

export const DA2062_FIXTURE_NAMES: Da2062FixtureName[] = [
  "electronic-echo",
  "ocr-echo",
  "electronic-oda-hr",
  "wrong-section-bravo",
  "cross-uic",
];
