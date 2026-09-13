import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const handReceipts = sqliteTable("hand_receipts", {
  id: integer("id").primaryKey({ autoIncrement: true }), filename: text("filename").notNull(), receiptType: text("receipt_type").notNull(), uic: text("uic"), unitName: text("unit_name"), effectiveDate: text("effective_date"), importedAt: text("imported_at").notNull(), importedBy: text("imported_by").notNull(), sourceObjectKey: text("source_object_key"), status: text("status").notNull().default("draft"), totalQuantity: integer("total_quantity").notNull().default(0), lineGroupCount: integer("line_group_count").notNull().default(0), serializedCount: integer("serialized_count").notNull().default(0),
}, (t) => [index("idx_receipts_effective_date").on(t.effectiveDate), index("idx_receipts_status").on(t.status)]);

export const receiptLines = sqliteTable("receipt_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }), receiptId: integer("receipt_id").notNull().references(() => handReceipts.id), lin: text("lin"), nsn: text("nsn"), nomenclature: text("nomenclature").notNull(), quantity: integer("quantity").notNull().default(1), unitOfIssue: text("unit_of_issue"), accountabilityCode: text("accountability_code"),
}, (t) => [index("idx_receipt_lines_receipt").on(t.receiptId), index("idx_receipt_lines_nsn").on(t.nsn)]);

export const receiptSerials = sqliteTable("receipt_serials", {
  id: integer("id").primaryKey({ autoIncrement: true }), receiptLineId: integer("receipt_line_id").notNull().references(() => receiptLines.id), serialNumber: text("serial_number").notNull(),
}, (t) => [index("idx_receipt_serials_line").on(t.receiptLineId), index("idx_receipt_serials_serial").on(t.serialNumber)]);

export const propertyItems = sqliteTable("property_items", {
  id: integer("id").primaryKey({ autoIncrement: true }), nsn: text("nsn"), nomenclature: text("nomenclature").notNull(), serialNumber: text("serial_number"), quantity: integer("quantity").notNull().default(1), classification: text("classification"), currentCustodian: text("current_custodian"), currentLocation: text("current_location"), status: text("status").notNull().default("on_hand"), sourceReceiptId: integer("source_receipt_id").references(() => handReceipts.id), createdAt: text("created_at").notNull(), retiredAt: text("retired_at"),
}, (t) => [uniqueIndex("idx_property_serial").on(t.serialNumber), index("idx_property_nsn").on(t.nsn), index("idx_property_status").on(t.status)]);

export const custodyHistory = sqliteTable("custody_history", {
  id: integer("id").primaryKey({ autoIncrement: true }), propertyItemId: integer("property_item_id").notNull().references(() => propertyItems.id), custodian: text("custodian").notNull(), location: text("location"), documentReceiptId: integer("document_receipt_id").references(() => handReceipts.id), assignedAt: text("assigned_at").notNull(), returnedAt: text("returned_at"), notes: text("notes"),
}, (t) => [index("idx_custody_item_date").on(t.propertyItemId, t.assignedAt)]);

export const receiptReconciliation = sqliteTable("receipt_reconciliation", {
  id: integer("id").primaryKey({ autoIncrement: true }), receiptId: integer("receipt_id").notNull().references(() => handReceipts.id), propertyItemId: integer("property_item_id").references(() => propertyItems.id), serialNumber: text("serial_number"), nsn: text("nsn"), discrepancyType: text("discrepancy_type").notNull(), resolutionStatus: text("resolution_status").notNull().default("open"), resolutionNote: text("resolution_note"), resolvedBy: text("resolved_by"), resolvedAt: text("resolved_at"),
}, (t) => [index("idx_reconciliation_receipt").on(t.receiptId), index("idx_reconciliation_status").on(t.resolutionStatus)]);

export const propertyEvents = sqliteTable("property_events", {
  id: integer("id").primaryKey({ autoIncrement: true }), propertyItemId: integer("property_item_id").references(() => propertyItems.id), receiptId: integer("receipt_id").references(() => handReceipts.id), eventType: text("event_type").notNull(), occurredAt: text("occurred_at").notNull(), recordedBy: text("recorded_by").notNull(), details: text("details"),
}, (t) => [index("idx_property_events_item_date").on(t.propertyItemId, t.occurredAt), index("idx_property_events_receipt").on(t.receiptId)]);

export const shrSnapshots = sqliteTable("shr_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }), receiptId: integer("receipt_id").notNull().references(() => handReceipts.id), period: text("period").notNull(), effectiveDate: text("effective_date").notNull(), acceptedAt: text("accepted_at"), acceptedBy: text("accepted_by"), status: text("status").notNull().default("draft"), priorSnapshotId: integer("prior_snapshot_id"), addedCount: integer("added_count").notNull().default(0), removedCount: integer("removed_count").notNull().default(0), changedCount: integer("changed_count").notNull().default(0),
}, (t) => [uniqueIndex("idx_shr_snapshot_period").on(t.period), index("idx_shr_snapshot_status").on(t.status)]);

export const shrSnapshotItems = sqliteTable("shr_snapshot_items", {
  id: integer("id").primaryKey({ autoIncrement: true }), snapshotId: integer("snapshot_id").notNull().references(() => shrSnapshots.id), propertyItemId: integer("property_item_id").references(() => propertyItems.id), lin: text("lin"), nsn: text("nsn"), serialNumber: text("serial_number"), nomenclature: text("nomenclature").notNull(), quantity: integer("quantity").notNull().default(1), changeType: text("change_type").notNull().default("unchanged"), reconciliationNote: text("reconciliation_note"),
}, (t) => [index("idx_shr_items_snapshot").on(t.snapshotId), index("idx_shr_items_identity").on(t.serialNumber, t.nsn, t.lin)]);

export const propertyLoans = sqliteTable("property_loans", {
  id: integer("id").primaryKey({ autoIncrement: true }), receiptId: integer("receipt_id").references(() => handReceipts.id), direction: text("direction").notNull(), otherParty: text("other_party").notNull(), documentNumber: text("document_number"), signedDate: text("signed_date").notNull(), renewalDueDate: text("renewal_due_date").notNull(), closedDate: text("closed_date"), status: text("status").notNull().default("active"), notes: text("notes"),
}, (t) => [index("idx_loans_direction_status").on(t.direction, t.status), index("idx_loans_renewal").on(t.renewalDueDate)]);

export const loanItems = sqliteTable("loan_items", {
  id: integer("id").primaryKey({ autoIncrement: true }), loanId: integer("loan_id").notNull().references(() => propertyLoans.id), propertyItemId: integer("property_item_id").references(() => propertyItems.id), lin: text("lin"), nsn: text("nsn"), serialNumber: text("serial_number"), nomenclature: text("nomenclature").notNull(), quantity: integer("quantity").notNull().default(1),
}, (t) => [index("idx_loan_items_loan").on(t.loanId), index("idx_loan_items_serial").on(t.serialNumber)]);

export const billsOfMaterials = sqliteTable("bills_of_materials", {
  id: integer("id").primaryKey({ autoIncrement: true }), endItemNsn: text("end_item_nsn").notNull(), endItemLin: text("end_item_lin"), name: text("name").notNull(), revision: text("revision"), effectiveDate: text("effective_date"), sourceReceiptId: integer("source_receipt_id").references(() => handReceipts.id), status: text("status").notNull().default("active"),
}, (t) => [index("idx_bom_end_item").on(t.endItemNsn, t.endItemLin)]);

export const bomComponents = sqliteTable("bom_components", {
  id: integer("id").primaryKey({ autoIncrement: true }), bomId: integer("bom_id").notNull().references(() => billsOfMaterials.id), parentComponentId: integer("parent_component_id"), nsn: text("nsn"), partNumber: text("part_number"), nomenclature: text("nomenclature").notNull(), requiredQuantity: integer("required_quantity").notNull().default(1), serialized: integer("serialized", { mode: "boolean" }).notNull().default(false), notes: text("notes"),
}, (t) => [index("idx_bom_components_bom").on(t.bomId), index("idx_bom_components_parent").on(t.parentComponentId)]);

export const odaUnits = sqliteTable("oda_units", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  uic: text("uic").notNull(),
  name: text("name").notNull(),
  groupName: text("group_name").notNull(),
  installation: text("installation").notNull(),
  documentNumber: text("document_number").notNull(),
  phrhName: text("phrh_name").notNull(),
});

export const odaSections = sqliteTable("oda_sections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  unitId: integer("unit_id").notNull().references(() => odaUnits.id),
  letter: text("letter").notNull(),
  name: text("name").notNull(),
  mos: text("mos").notNull(),
  specialty: text("specialty").notNull(),
  shrHolderKey: text("shr_holder_key"),
}, (t) => [uniqueIndex("idx_oda_sections_letter").on(t.unitId, t.letter)]);

export const accountabilityLines = sqliteTable("accountability_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull(),
  unitId: integer("unit_id").notNull().references(() => odaUnits.id),
  lin: text("lin"),
  nsn: text("nsn").notNull(),
  officialNomenclature: text("official_nomenclature").notNull(),
  quantity: integer("quantity").notNull().default(1),
  serialNumber: text("serial_number"),
  accountabilityClass: text("accountability_class").notNull(),
  networkClassification: text("network_classification").notNull(),
  location: text("location"),
  status: text("status").notNull().default("on_hand"),
  sectionLetter: text("section_letter").notNull(),
  shrHolderKey: text("shr_holder_key"),
}, (t) => [
  uniqueIndex("idx_acct_line_key").on(t.key),
  index("idx_acct_line_section").on(t.sectionLetter),
  index("idx_acct_line_serial").on(t.serialNumber),
]);

export const componentFacts = sqliteTable("component_facts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lineKey: text("line_key").notNull(),
  kind: text("kind").notNull(),
  nomenclature: text("nomenclature").notNull(),
  requiredQuantity: integer("required_quantity").notNull().default(1),
  onHandQuantity: integer("on_hand_quantity").notNull().default(0),
  serialized: integer("serialized", { mode: "boolean" }).notNull().default(false),
}, (t) => [index("idx_component_facts_line").on(t.lineKey)]);

export const trackerFacts = sqliteTable("tracker_facts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull(),
  nsn: text("nsn").notNull(),
  serialNumber: text("serial_number"),
  nomenclature: text("nomenclature").notNull(),
  quantity: integer("quantity").notNull().default(1),
  trackerName: text("tracker_name").notNull(),
  sectionLetter: text("section_letter"),
});

export const packingFacts = sqliteTable("packing_facts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull(),
  nsn: text("nsn").notNull(),
  serialNumber: text("serial_number"),
  nomenclature: text("nomenclature").notNull(),
  quantity: integer("quantity").notNull().default(1),
  documentLabel: text("document_label").notNull(),
  sectionLetter: text("section_letter").notNull(),
});

export const pictureBookEntries = sqliteTable("picture_book_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountabilityLineKey: text("accountability_line_key").notNull(),
  officialName: text("official_name").notNull(),
  commonName: text("common_name").notNull(),
  photoKey: text("photo_key"),
  photoData: text("photo_data"),
  photoContentType: text("photo_content_type"),
  photoUpdatedAt: text("photo_updated_at"),
  photoUpdatedBy: text("photo_updated_by"),
}, (t) => [uniqueIndex("idx_picture_book_line").on(t.accountabilityLineKey)]);

export const shrInjects = sqliteTable("shr_injects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  unitId: integer("unit_id").notNull(),
  sectionLetter: text("section_letter"),
  label: text("label").notNull(),
  injectedAt: text("injected_at").notNull(),
  injectedBy: text("injected_by").notNull(),
  sourceKind: text("source_kind").notNull().default("electronic_shr"),
  priorInjectId: integer("prior_inject_id"),
  addedCount: integer("added_count").notNull().default(0),
  removedCount: integer("removed_count").notNull().default(0),
  changedCount: integer("changed_count").notNull().default(0),
  unchangedCount: integer("unchanged_count").notNull().default(0),
  notes: text("notes"),
}, (t) => [index("idx_shr_injects_section_date").on(t.sectionLetter, t.injectedAt)]);

export const shrInjectLines = sqliteTable("shr_inject_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  injectId: integer("inject_id").notNull().references(() => shrInjects.id),
  changeType: text("change_type").notNull(),
  lineKey: text("line_key"),
  lin: text("lin"),
  nsn: text("nsn"),
  serialNumber: text("serial_number"),
  nomenclature: text("nomenclature").notNull(),
  quantity: integer("quantity").notNull().default(1),
  priorNomenclature: text("prior_nomenclature"),
  priorQuantity: integer("prior_quantity"),
  priorSerial: text("prior_serial"),
  sectionLetter: text("section_letter"),
}, (t) => [index("idx_shr_inject_lines_inject").on(t.injectId)]);

export const sourceDiscrepancies = sqliteTable("source_discrepancies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  publicKey: text("public_key").notNull(),
  unitId: integer("unit_id").notNull(),
  identityKey: text("identity_key").notNull(),
  nsn: text("nsn"),
  serialNumber: text("serial_number"),
  lin: text("lin"),
  sectionLetter: text("section_letter"),
  sourceA: text("source_a").notNull(),
  sourceB: text("source_b").notNull(),
  factA: text("fact_a").notNull(),
  factB: text("fact_b").notNull(),
  issue: text("issue").notNull(),
  action: text("action").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull().default("open"),
  itemKey: text("item_key"),
  createdAt: text("created_at").notNull(),
  createdBy: text("created_by").notNull(),
}, (t) => [
  uniqueIndex("idx_source_disc_key").on(t.publicKey),
  index("idx_source_disc_section").on(t.sectionLetter, t.status),
]);

export const da2062Imports = sqliteTable("da2062_imports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  unitId: integer("unit_id").notNull(),
  publicKey: text("public_key").notNull(),
  direction: text("direction").notNull().default("in"),
  status: text("status").notNull().default("committed"),
  parsePath: text("parse_path").notNull(),
  destinationKind: text("destination_kind").notNull(),
  destinationSection: text("destination_section"),
  issuer: text("issuer").notNull(),
  gainingParty: text("gaining_party").notNull(),
  gainingSection: text("gaining_section"),
  uic: text("uic").notNull(),
  filename: text("filename").notNull(),
  sourcePdfData: text("source_pdf_data"),
  sourcePdfContentType: text("source_pdf_content_type"),
  importedAt: text("imported_at").notNull(),
  importedBy: text("imported_by").notNull(),
  priorImportId: integer("prior_import_id"),
  lineCount: integer("line_count").notNull().default(0),
  discrepancyCount: integer("discrepancy_count").notNull().default(0),
  notes: text("notes"),
}, (t) => [
  uniqueIndex("idx_da2062_public").on(t.publicKey),
  index("idx_da2062_section_date").on(t.destinationSection, t.importedAt),
]);

export const da2062ImportLines = sqliteTable("da2062_import_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  importId: integer("import_id").notNull().references(() => da2062Imports.id),
  lin: text("lin"),
  nsn: text("nsn"),
  serialNumber: text("serial_number"),
  nomenclature: text("nomenclature").notNull(),
  quantity: integer("quantity").notNull().default(1),
  officialName: text("official_name"),
  actualName: text("actual_name"),
  photoData: text("photo_data"),
  sectionLetter: text("section_letter"),
  lineKey: text("line_key"),
  confidence: text("confidence").notNull().default("high"),
}, (t) => [index("idx_da2062_lines_import").on(t.importId)]);

export const custodyInEvents = sqliteTable("custody_in_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  importId: integer("import_id").notNull().references(() => da2062Imports.id),
  lineKey: text("line_key"),
  nsn: text("nsn"),
  serialNumber: text("serial_number"),
  nomenclature: text("nomenclature").notNull(),
  quantity: integer("quantity").notNull().default(1),
  destinationKind: text("destination_kind").notNull(),
  destinationSection: text("destination_section"),
  gainingParty: text("gaining_party").notNull(),
  issuer: text("issuer").notNull(),
  occurredAt: text("occurred_at").notNull(),
  recordedBy: text("recorded_by").notNull(),
  factLayer: text("fact_layer").notNull().default("responsibility"),
}, (t) => [index("idx_custody_in_import").on(t.importId)]);
