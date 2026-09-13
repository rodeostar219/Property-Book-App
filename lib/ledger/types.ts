import type { ActorScope, DemoIdentity, SectionLetter } from "@/lib/oda/types";

export type AppRole = "soldier" | "pm";
export type { ActorScope, DemoIdentity, SectionLetter };

export type AccountabilityClass =
  | "Accountable"
  | "Sensitive"
  | "Durable"
  | "Expendable";

export type NetworkClassification = "SIPR" | "NIPR" | "Unclassified";

export type AccountabilityStatus =
  | "signed_for"
  | "on_hand"
  | "needs_serial_check"
  | "shortage_recorded";

export type UnitTrackingFlag = "assigned" | "tdy";

export type ComponentKind = "COEI" | "BII" | "AAL";

export type ReceiptKind = "hand_receipt" | "sub_hand_receipt" | "da_2062" | "external";

export type Actor = {
  id: string;
  displayName: string;
  fullName: string;
  initials: string;
  role: AppRole;
  email: string;
  grade?: string;
  mos?: string;
  sectionLetter?: SectionLetter;
  scope: ActorScope;
  identity: DemoIdentity;
};

export type ComponentLine = {
  id: string;
  kind: ComponentKind;
  nomenclature: string;
  nsn?: string;
  requiredQuantity: number;
  onHandQuantity: number;
  serialized: boolean;
  serial?: string;
};

export type PropertyItem = {
  id: string;
  nsn: string;
  name: string;
  officialName?: string;
  commonName?: string;
  serial: string | null;
  quantityRequired: number;
  quantityOnHand: number;
  accountabilityClass: AccountabilityClass;
  networkClassification: NetworkClassification;
  assignedToId: string | null;
  assignedToName: string | null;
  location: string;
  status: AccountabilityStatus;
  unitTracking?: UnitTrackingFlag;
  sourceReceipt: string;
  phrhId: string;
  phrhName: string;
  shrHolderId?: string;
  shrHolderName?: string;
  shrDocument?: string;
  sectionLetter?: SectionLetter;
  components: ComponentLine[];
  photoData?: string | null;
};

export type LedgerException = {
  id: string;
  itemId: string | null;
  serial: string | null;
  item: string;
  issue: string;
  action: string;
  severity: "Review" | "Missing data" | "Shortage";
  assignedToId: string | null;
  sectionLetter?: SectionLetter | null;
  sourceA?: string;
  sourceB?: string;
  factA?: string;
  factB?: string;
};

export type ReceiptRecord = {
  id: string;
  filename: string;
  kind: ReceiptKind;
  kindLabel: string;
  uic: string;
  effectiveDate: string;
  lineGroups: number;
  totalQuantity: number;
  status: "Current" | "Superseded" | "Analyzed" | "Draft";
  phrhName: string;
  shrHolderName?: string;
};

export type ReceiptPeriod = {
  id: string;
  period: string;
  effective: string;
  items: number;
  added: number;
  removed: number;
  unchanged: number;
  status: "Current" | "Reconciled";
};

export type LoanRecord = {
  id: string;
  direction: "Incoming" | "Outgoing";
  document: string;
  item: string;
  serial: string;
  party: string;
  signed: string;
  renewsOn: string;
  daysRemaining: number;
  status: "Active" | "Renew soon";
};

export type LedgerDocument = {
  id: string;
  filename: string;
  kindLabel: string;
  date: string;
  notes: string;
};
