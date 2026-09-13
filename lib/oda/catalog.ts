import { ODA, sectionShrLabel } from "./org";
import { stencilSvg } from "./picture-book";
import type { ElectronicShrLine, SectionLetter, SourceConflict } from "./types";
import type {
  AccountabilityClass,
  AccountabilityStatus,
  ComponentLine,
  NetworkClassification,
  PropertyItem,
} from "@/lib/ledger/types";

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

export type CatalogLine = {
  key: string;
  lin: string | null;
  nsn: string;
  officialName: string;
  commonName: string;
  serial: string | null;
  quantity: number;
  accountabilityClass: AccountabilityClass;
  networkClassification: NetworkClassification;
  status: AccountabilityStatus;
  location: string;
  sectionLetter: SectionLetter;
  shrHolderId: string;
  components: ComponentLine[];
};

export type CatalogTrackerLine = {
  key: string;
  nsn: string;
  serial: string | null;
  nomenclature: string;
  quantity: number;
  trackerName: string;
  sectionLetter: SectionLetter | null;
};

export type CatalogPackingLine = {
  key: string;
  nsn: string;
  serial: string | null;
  nomenclature: string;
  quantity: number;
  documentLabel: string;
  sectionLetter: SectionLetter;
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

export const ACCOUNTABILITY_LINES: CatalogLine[] = [
  {
    key: "echo-router",
    lin: "A35318",
    nsn: "702501M007142",
    officialName: "Cisco IRS 1101 Integrated Services Router",
    commonName: "TacLAN router",
    serial: "FGL2344LR2M",
    quantity: 1,
    accountabilityClass: "Accountable",
    networkClassification: "Unclassified",
    status: "on_hand",
    location: "Echo cage",
    sectionLetter: "E",
    shrHolderId: PEOPLE.ryan.id,
    components: [
      {
        id: "echo-router-coei-1",
        kind: "COEI",
        nomenclature: "Power adapter, AC",
        requiredQuantity: 1,
        onHandQuantity: 1,
        serialized: false,
      },
      {
        id: "echo-router-bii-1",
        kind: "BII",
        nomenclature: "Console cable",
        requiredQuantity: 1,
        onHandQuantity: 1,
        serialized: false,
      },
    ],
  },
  {
    key: "echo-iridium",
    lin: "T05007",
    nsn: "580501C949317",
    officialName: "Telephone, Satellite: 9575A Iridium",
    commonName: "Iridium",
    serial: "300415040404300",
    quantity: 1,
    accountabilityClass: "Sensitive",
    networkClassification: "Unclassified",
    status: "signed_for",
    location: "Echo cage",
    sectionLetter: "E",
    shrHolderId: PEOPLE.ryan.id,
    components: [
      {
        id: "echo-iridium-bii-1",
        kind: "BII",
        nomenclature: "Holster / carry case",
        requiredQuantity: 1,
        onHandQuantity: 1,
        serialized: false,
      },
      {
        id: "echo-iridium-aal-1",
        kind: "AAL",
        nomenclature: "Spare battery",
        requiredQuantity: 2,
        onHandQuantity: 1,
        serialized: false,
      },
    ],
  },
  {
    key: "echo-charger",
    lin: null,
    nsn: "6130014952839",
    officialName: "Charger, Battery",
    commonName: "Iridium charger",
    serial: "013252",
    quantity: 1,
    accountabilityClass: "Durable",
    networkClassification: "Unclassified",
    status: "signed_for",
    location: "Echo cage",
    sectionLetter: "E",
    shrHolderId: PEOPLE.ryan.id,
    components: [],
  },
  {
    key: "echo-minisat",
    lin: "A35390",
    nsn: "589501D050302",
    officialName: "BHI Mini-SATCOM Antenna Kit",
    commonName: "Mini-SAT",
    serial: null,
    quantity: 1,
    accountabilityClass: "Accountable",
    networkClassification: "Unclassified",
    status: "needs_serial_check",
    location: "Echo cage",
    sectionLetter: "E",
    shrHolderId: PEOPLE.ryan.id,
    components: [
      {
        id: "echo-minisat-coei-1",
        kind: "COEI",
        nomenclature: "Antenna assembly",
        requiredQuantity: 1,
        onHandQuantity: 1,
        serialized: false,
      },
      {
        id: "echo-minisat-bii-1",
        kind: "BII",
        nomenclature: "Transit case",
        requiredQuantity: 1,
        onHandQuantity: 1,
        serialized: false,
      },
    ],
  },
  {
    key: "echo-laptop",
    lin: "C05017",
    nsn: "701001D054717",
    officialName: "Computer, Laptop: Latitude 7430",
    commonName: "NIPR laptop",
    serial: "J4RC6L3",
    quantity: 1,
    accountabilityClass: "Accountable",
    networkClassification: "NIPR",
    status: "signed_for",
    location: "Team room",
    sectionLetter: "E",
    shrHolderId: PEOPLE.ryan.id,
    components: [],
  },
  {
    key: "echo-163",
    lin: "R57655",
    nsn: "582001D163000",
    officialName: "Radio Set, AN/PRC-163",
    commonName: "163",
    serial: "10087231",
    quantity: 1,
    accountabilityClass: "Sensitive",
    networkClassification: "Unclassified",
    status: "signed_for",
    location: "Echo cage",
    sectionLetter: "E",
    shrHolderId: PEOPLE.ryan.id,
    components: [
      {
        id: "echo-163-bii-1",
        kind: "BII",
        nomenclature: "Handset / headset",
        requiredQuantity: 1,
        onHandQuantity: 1,
        serialized: false,
      },
    ],
  },
  {
    key: "bravo-m4",
    lin: "R95035",
    nsn: "1005015997613",
    officialName: "Rifle, 5.56 Millimeter: M4A1",
    commonName: "M4",
    serial: "W1234567",
    quantity: 1,
    accountabilityClass: "Sensitive",
    networkClassification: "Unclassified",
    status: "signed_for",
    location: "Arms room",
    sectionLetter: "B",
    shrHolderId: PEOPLE.vargas.id,
    components: [
      {
        id: "bravo-m4-bii-1",
        kind: "BII",
        nomenclature: "Sling, small arms",
        requiredQuantity: 1,
        onHandQuantity: 1,
        serialized: false,
      },
    ],
  },
  {
    key: "bravo-m320",
    lin: "L44595",
    nsn: "1010015986206",
    officialName: "Launcher, Grenade: M320",
    commonName: "M320",
    serial: "G3208841",
    quantity: 1,
    accountabilityClass: "Sensitive",
    networkClassification: "Unclassified",
    status: "signed_for",
    location: "Arms room",
    sectionLetter: "B",
    shrHolderId: PEOPLE.vargas.id,
    components: [],
  },
  {
    key: "bravo-peq",
    lin: "L67964",
    nsn: "5855015345940",
    officialName: "Illuminator, Infrared: AN/PEQ-15",
    commonName: "PEQ-15",
    serial: "PEQ15092",
    quantity: 1,
    accountabilityClass: "Sensitive",
    networkClassification: "Unclassified",
    status: "signed_for",
    location: "Arms room",
    sectionLetter: "B",
    shrHolderId: PEOPLE.vargas.id,
    components: [],
  },
  {
    key: "charlie-demo",
    lin: "W36848",
    nsn: "138501D018220",
    officialName: "Tool Kit, Explosive Ordnance Disposal",
    commonName: "Demo kit",
    serial: null,
    quantity: 1,
    accountabilityClass: "Accountable",
    networkClassification: "Unclassified",
    status: "needs_serial_check",
    location: "Charlie cage",
    sectionLetter: "C",
    shrHolderId: PEOPLE.nguyen.id,
    components: [],
  },
  {
    key: "charlie-pss",
    lin: "D03900",
    nsn: "6665015197315",
    officialName: "Detector, Mine: AN/PSS-14",
    commonName: "PSS-14",
    serial: "PSS14012",
    quantity: 1,
    accountabilityClass: "Sensitive",
    networkClassification: "Unclassified",
    status: "signed_for",
    location: "Charlie cage",
    sectionLetter: "C",
    shrHolderId: PEOPLE.nguyen.id,
    components: [],
  },
  {
    key: "delta-aid",
    lin: "M79048",
    nsn: "6545015862344",
    officialName: "Medical Equipment Set, Special Forces",
    commonName: "Aid bag",
    serial: null,
    quantity: 1,
    accountabilityClass: "Accountable",
    networkClassification: "Unclassified",
    status: "on_hand",
    location: "Delta cage",
    sectionLetter: "D",
    shrHolderId: PEOPLE.okonkwo.id,
    components: [
      {
        id: "delta-aid-aal-1",
        kind: "AAL",
        nomenclature: "Combat gauze / hemostatic",
        requiredQuantity: 6,
        onHandQuantity: 4,
        serialized: false,
      },
    ],
  },
  {
    key: "delta-monitor",
    lin: "M60450",
    nsn: "651501D088211",
    officialName: "Monitor, Patient Vital Signs",
    commonName: "Propaq",
    serial: "PM88211",
    quantity: 1,
    accountabilityClass: "Accountable",
    networkClassification: "Unclassified",
    status: "signed_for",
    location: "Delta cage",
    sectionLetter: "D",
    shrHolderId: PEOPLE.okonkwo.id,
    components: [],
  },
  {
    key: "fox-camera",
    lin: "C05520",
    nsn: "672001D044100",
    officialName: "Camera, Digital Still",
    commonName: "Team camera",
    serial: "CAM4410",
    quantity: 1,
    accountabilityClass: "Durable",
    networkClassification: "Unclassified",
    status: "signed_for",
    location: "Fox cage",
    sectionLetter: "F",
    shrHolderId: PEOPLE.alvarez.id,
    components: [],
  },
];

export const TRACKER_LINES: CatalogTrackerLine[] = [
  {
    key: "tracker-gpc",
    nsn: "7021016793258",
    serial: "GPC1902107",
    nomenclature: "Computer, Digital",
    quantity: 1,
    trackerName: "Computer tracker",
    sectionLetter: "F",
  },
  {
    key: "tracker-e5420",
    nsn: "702101C946392",
    serial: "HDSV3K3",
    nomenclature: "Computer, Personal Workstation: E5420",
    quantity: 1,
    trackerName: "Computer tracker",
    sectionLetter: "F",
  },
  {
    key: "tracker-laptop",
    nsn: "701001D054717",
    serial: "J4RC6L3",
    nomenclature: "Computer, Laptop: Latitude 7430",
    quantity: 1,
    trackerName: "Computer tracker",
    sectionLetter: "E",
  },
];

export const PACKING_LINES: CatalogPackingLine[] = [
  {
    key: "pack-163",
    nsn: "582001D163000",
    serial: "10087231",
    nomenclature: "Radio Set, AN/PRC-163",
    quantity: 2,
    documentLabel: "DA Form 1750 · team box (present, not a loadout package)",
    sectionLetter: "E",
  },
];

export const SEED_CONFLICTS: SourceConflict[] = [
  {
    identityKey: "sn:GPC1902107",
    nsn: "7021016793258",
    serial: "GPC1902107",
    lin: null,
    sectionLetter: "F",
    sourceA: "hand_receipt",
    sourceB: "tracker",
    factA: "absent",
    factB: "Computer, Digital · qty 1 SN GPC1902107",
    issue: "In computer tracker, absent from ODA hand receipt",
    action: "Verify gaining document. Do not flatten tracker into the hand receipt.",
    severity: "Review",
  },
  {
    identityKey: "sn:HDSV3K3",
    nsn: "702101C946392",
    serial: "HDSV3K3",
    lin: null,
    sectionLetter: "F",
    sourceA: "hand_receipt",
    sourceB: "tracker",
    factA: "absent",
    factB: "Computer, Personal Workstation: E5420 · qty 1 SN HDSV3K3",
    issue: "In computer tracker, absent from ODA hand receipt",
    action: "Locate transfer or Sub-hand receipt (SHR). Do not auto-merge.",
    severity: "Review",
  },
  {
    identityKey: "sn:10087231",
    nsn: "582001D163000",
    serial: "10087231",
    lin: "R57655",
    sectionLetter: "E",
    sourceA: "hand_receipt",
    sourceB: "packing_1750",
    factA: "Radio Set, AN/PRC-163 · qty 1 SN 10087231",
    factB: "Radio Set, AN/PRC-163 · qty 2 SN 10087231",
    issue: "Hand receipt quantity 1 disagrees with DA Form 1750 quantity 2",
    action: "Open a discrepancy. Packing is not accountability.",
    severity: "Shortage",
  },
  {
    identityKey: "nsn:589501D050302|lin:A35390",
    nsn: "589501D050302",
    serial: null,
    lin: "A35390",
    sectionLetter: "E",
    sourceA: "hand_receipt",
    sourceB: "sub_hand_receipt",
    factA: "BHI Mini-SATCOM Antenna Kit · qty 1 serial not recorded",
    factB: "BHI Mini-SATCOM Antenna Kit · qty 1 serial not recorded",
    issue: "Receipt quantity 1; serial field is blank",
    action: "Physically verify serial or mark non-serialized",
    severity: "Missing data",
  },
  {
    identityKey: "sn:300415040404300",
    nsn: "580501C949317",
    serial: "300415040404300",
    lin: "T05007",
    sectionLetter: "E",
    sourceA: "hand_receipt",
    sourceB: "sub_hand_receipt",
    factA: "AAL spare battery required 2",
    factB: "AAL spare battery on hand 1",
    issue: "AAL spare battery on hand 1 of 2 required",
    action: "Record shortage or replenish AAL. Component layer stays separate.",
    severity: "Shortage",
  },
];

export function personById(id: string): CatalogPerson | undefined {
  return Object.values(PEOPLE).find((person) => person.id === id);
}

export function lineByKey(key: string): CatalogLine | undefined {
  return ACCOUNTABILITY_LINES.find((line) => line.key === key);
}

export function electronicShrForSection(letter: SectionLetter): ElectronicShrLine[] {
  return ACCOUNTABILITY_LINES.filter((line) => line.sectionLetter === letter).map(
    (line) => ({
      key: line.key,
      lin: line.lin,
      nsn: line.nsn,
      serial: line.serial,
      nomenclature: line.officialName,
      quantity: line.quantity,
      sectionLetter: line.sectionLetter,
    }),
  );
}

/** Demo incoming Echo extract: add 158, drop 163, change charger qty. */
export function demoIncomingEchoShr(): ElectronicShrLine[] {
  return electronicShrForSection("E")
    .filter((line) => line.serial !== "10087231")
    .map((line) =>
      line.serial === "013252" ? { ...line, quantity: 2 } : line,
    )
    .concat([
      {
        key: "echo-158",
        lin: "R57640",
        nsn: "582001D158000",
        serial: "15800421",
        nomenclature: "Radio Set, AN/PRC-158",
        quantity: 1,
        sectionLetter: "E",
      },
    ]);
}

export function toPropertyItem(line: CatalogLine): PropertyItem {
  const holder = personById(line.shrHolderId);
  return {
    id: line.key,
    nsn: line.nsn,
    name: line.officialName,
    officialName: line.officialName,
    commonName: line.commonName,
    serial: line.serial,
    quantityRequired: line.quantity,
    quantityOnHand: line.status === "shortage_recorded" ? 0 : line.quantity,
    accountabilityClass: line.accountabilityClass,
    networkClassification: line.networkClassification,
    assignedToId: holder?.id ?? null,
    assignedToName: holder?.fullName ?? null,
    location: line.location,
    status: line.status,
    sourceReceipt: `${ODA.receiptLabel} · ${ODA.document}`,
    phrhId: PEOPLE.reyes.id,
    phrhName: ODA.phrhName,
    shrHolderId: holder?.id,
    shrHolderName: holder?.fullName,
    shrDocument: sectionShrLabel(line.sectionLetter),
    sectionLetter: line.sectionLetter,
    components: line.components,
    photoData: stencilSvg(line.commonName, line.officialName),
  };
}

export const CATALOG_ITEMS: PropertyItem[] = ACCOUNTABILITY_LINES.map(toPropertyItem);

export const BASELINE_INJECT_AT = "2026-09-01T12:00:00.000Z";
export const BASELINE_INJECT_LABEL = "Sub-hand receipt update · 01 Sep 26 baseline";
