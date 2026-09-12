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
