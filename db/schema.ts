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
