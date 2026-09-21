import { PEOPLE } from "./catalog";
import { buildMinimalPdf } from "./da2062-pdf";
import { ODA } from "./org";

export type Da2062OutFixtureName =
  | "electronic-echo-out"
  | "ocr-echo-out"
  | "electronic-echo-out-org"
  | "past-due-echo-out"
  | "missing-return-echo-out"
  | "wrong-section-bravo-out"
  | "cross-uic-out"
  | "invalid-destination-out";

export type Da2062OutFixture = {
  name: Da2062OutFixtureName;
  filename: string;
  label: string;
  bytes: Uint8Array;
};

const ECHO_OUT_LINES = [
  "LINE|LIN=R57640|NSN=582001D158000|SERIAL=15800421|NOMENCLATURE=Radio Set, AN/PRC-158|QTY=1",
  "LINE|LIN=T05007|NSN=580501C949317|SERIAL=300415040404300|NOMENCLATURE=Telephone, Satellite: 9575A Iridium|QTY=1",
  "LINE|LIN=A35390|NSN=589501D050302|SERIAL=|NOMENCLATURE=BHI Mini-SATCOM Antenna Kit|QTY=1",
  "LINE|LIN=|NSN=6130014952839|SERIAL=013252|NOMENCLATURE=Charger, Battery|QTY=2",
];

function electronicEchoOutPdf(overrides?: {
  returnDate?: string;
  destinationKind?: string;
  destination?: string;
  issuerSection?: string;
  uic?: string;
  direction?: string;
  extraFields?: Record<string, string>;
  extraLines?: string[];
}): Uint8Array {
  const destinationKind = overrides?.destinationKind ?? "person";
  const destination = overrides?.destination ?? PEOPLE.nguyen.fullName;
  const returnDate = overrides?.returnDate;
  const issuerSection = overrides?.issuerSection ?? "E";
  const uic = overrides?.uic ?? ODA.uic;
  const direction = overrides?.direction ?? "out";
  const fields: Record<string, string> = {
    PARSE_PATH: "electronic",
    DIRECTION: direction,
    UIC: uic,
    ISSUER: PEOPLE.ryan.fullName,
    ISSUER_SECTION: issuerSection,
    DESTINATION_KIND: destinationKind,
    DESTINATION: destination,
    TO: destination,
    ...(returnDate ? { RETURN_DATE: returnDate } : {}),
    ...overrides?.extraFields,
  };
  return buildMinimalPdf({
    title: "DA Form 2062 electronic Echo out",
    fields,
    lines: [
      "DA FORM 2062",
      "HAND RECEIPT/SHORTAGE LISTING",
      "TEMPORARY HAND RECEIPT",
      `PARSE_PATH=electronic`,
      `DIRECTION=${direction}`,
      `UIC=${uic}`,
      `ISSUER=${PEOPLE.ryan.fullName}`,
      `ISSUER_SECTION=${issuerSection}`,
      `DESTINATION_KIND=${destinationKind}`,
      `DESTINATION=${destination}`,
      ...(returnDate ? [`RETURN_DATE=${returnDate}`] : []),
      ...ECHO_OUT_LINES,
      ...(overrides?.extraLines ?? []),
    ],
  });
}

function ocrEchoOutPdf(): Uint8Array {
  return buildMinimalPdf({
    title: "DA Form 2062 scanned Echo out",
    lines: [
      "DA FORM 2062",
      "HAND RECEIPT / SHORTAGE LISTING",
      "TEMPORARY HAND RECEIPT",
      "PARSE_PATH=ocr",
      "DIRECTION out",
      `UIC ${ODA.uic}`,
      `FROM ${PEOPLE.ryan.fullName} ECHO`,
      "ISSUER_SECTION E",
      "DESTINATION_KIND person",
      `TO ${PEOPLE.nguyen.fullName}`,
      "RETURN DATE 2026-10-05",
      "NSN 582001D158000 SN 15800421 Radio Set, AN/PRC-158 QTY 1 LIN R57640",
      "NSN 580501C949317 SN 300415040404300 Telephone, Satellite: 9575A Iridium QTY 1 LIN T05007",
      "NSN 589501D050302 SN NOT RECORDED BHI Mini-SATCOM Antenna Kit QTY 1 LIN A35390",
      "NSN 6130014952839 SN 013252 Charger, Battery QTY 2",
    ],
  });
}

function wrongSectionBravoOutPdf(): Uint8Array {
  return buildMinimalPdf({
    title: "DA Form 2062 Bravo out",
    fields: {
      PARSE_PATH: "electronic",
      DIRECTION: "out",
      UIC: ODA.uic,
      ISSUER: PEOPLE.vargas.fullName,
      ISSUER_SECTION: "B",
      DESTINATION_KIND: "person",
      DESTINATION: PEOPLE.nguyen.fullName,
      RETURN_DATE: "2026-10-05",
    },
    lines: [
      "DA FORM 2062",
      "DIRECTION=out",
      `UIC=${ODA.uic}`,
      `ISSUER=${PEOPLE.vargas.fullName}`,
      "ISSUER_SECTION=B",
      "DESTINATION_KIND=person",
      `DESTINATION=${PEOPLE.nguyen.fullName}`,
      "RETURN_DATE=2026-10-05",
      "LINE|LIN=R95035|NSN=1005015997613|SERIAL=W1234567|NOMENCLATURE=Rifle, 5.56 Millimeter: M4A1|QTY=1",
    ],
  });
}

export function da2062OutFixture(name: Da2062OutFixtureName): Da2062OutFixture {
  switch (name) {
    case "electronic-echo-out":
      return {
        name,
        filename: "DA2062-electronic-Echo-out-W51HXC.pdf",
        label: "Electronic Echo temporary hand receipt",
        bytes: electronicEchoOutPdf({ returnDate: "2026-10-05" }),
      };
    case "ocr-echo-out":
      return {
        name,
        filename: "DA2062-scanned-OCR-Echo-out-W51HXC.pdf",
        label: "Scanned / OCR Echo temporary hand receipt",
        bytes: ocrEchoOutPdf(),
      };
    case "electronic-echo-out-org":
      return {
        name,
        filename: "DA2062-electronic-Echo-out-org-W51HXC.pdf",
        label: "Electronic Echo out to organization",
        bytes: electronicEchoOutPdf({
          returnDate: "2026-10-05",
          destinationKind: "organization",
          destination: "1st SFG (A) S-4",
        }),
      };
    case "past-due-echo-out":
      return {
        name,
        filename: "DA2062-past-due-Echo-out.pdf",
        label: "Past-due Echo out (warn only)",
        bytes: electronicEchoOutPdf({ returnDate: "2026-08-15" }),
      };
    case "missing-return-echo-out":
      return {
        name,
        filename: "DA2062-missing-return-Echo-out.pdf",
        label: "Echo out missing return date",
        bytes: electronicEchoOutPdf(),
      };
    case "wrong-section-bravo-out":
      return {
        name,
        filename: "DA2062-Bravo-out-wrong-section.pdf",
        label: "Bravo 2062 out (wrong section for Echo)",
        bytes: wrongSectionBravoOutPdf(),
      };
    case "cross-uic-out":
      return {
        name,
        filename: "DA2062-cross-UIC-out-W99XXX.pdf",
        label: "Cross-UIC 2062 out",
        bytes: electronicEchoOutPdf({
          returnDate: "2026-10-05",
          uic: "W99XXX",
        }),
      };
    case "invalid-destination-out":
      return {
        name,
        filename: "DA2062-invalid-destination-out.pdf",
        label: "Location destination (expect reject)",
        bytes: electronicEchoOutPdf({
          returnDate: "2026-10-05",
          destinationKind: "location",
          destination: "Building 12 cage",
        }),
      };
    default: {
      const _never: never = name;
      throw new Error(`Unknown fixture ${_never}`);
    }
  }
}

export const DA2062_OUT_FIXTURE_NAMES: Da2062OutFixtureName[] = [
  "electronic-echo-out",
  "ocr-echo-out",
  "electronic-echo-out-org",
  "past-due-echo-out",
  "missing-return-echo-out",
  "wrong-section-bravo-out",
  "cross-uic-out",
  "invalid-destination-out",
];
