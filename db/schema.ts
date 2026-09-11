import { integer, sqliteTable, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const assets = sqliteTable("assets", {
  id: integer("id").primaryKey({ autoIncrement: true }), assetTag: text("asset_tag").notNull(), serialNumber: text("serial_number"), equipmentModel: text("equipment_model").notNull(), nsn: text("nsn"), classification: text("classification").notNull(), missionProfile: text("mission_profile"), createdAt: text("created_at").notNull(),
}, (t) => [uniqueIndex("idx_assets_asset_tag").on(t.assetTag), index("idx_assets_baseline_context").on(t.equipmentModel, t.nsn, t.classification, t.missionProfile)]);

export const baselines = sqliteTable("version_baselines", {
  id: integer("id").primaryKey({ autoIncrement: true }), name: text("name").notNull(), equipmentModel: text("equipment_model"), nsn: text("nsn"), classification: text("classification"), missionProfile: text("mission_profile"), componentName: text("component_name").notNull(), componentType: text("component_type").notNull(), approvedVersion: text("approved_version").notNull(), required: integer("required", { mode: "boolean" }).notNull().default(true), verificationIntervalDays: integer("verification_interval_days").notNull().default(30), effectiveAt: text("effective_at").notNull(), retiredAt: text("retired_at"),
}, (t) => [index("idx_baselines_match").on(t.equipmentModel, t.nsn, t.classification, t.missionProfile), index("idx_baselines_component").on(t.componentName, t.componentType)]);

export const componentHistory = sqliteTable("component_version_history", {
  id: integer("id").primaryKey({ autoIncrement: true }), assetId: integer("asset_id").notNull().references(() => assets.id), baselineId: integer("baseline_id").references(() => baselines.id), componentName: text("component_name").notNull(), componentType: text("component_type").notNull(), installedVersion: text("installed_version"), approvedVersionSnapshot: text("approved_version_snapshot"), installationDate: text("installation_date"), lastVerifiedDate: text("last_verified_date"), verificationMethod: text("verification_method"), verifiedBy: text("verified_by"), updateSource: text("update_source"), applicability: text("applicability"), notes: text("notes"), evidenceObjectKey: text("evidence_object_key"), evidenceFilename: text("evidence_filename"), status: text("status").notNull(), supersededAt: text("superseded_at"), recordedAt: text("recorded_at").notNull(), recordedBy: text("recorded_by").notNull(), batchId: text("batch_id"),
}, (t) => [index("idx_history_asset_component").on(t.assetId, t.componentName, t.recordedAt), index("idx_history_status").on(t.status), index("idx_history_batch").on(t.batchId)]);

export const deploymentVersionDecisions = sqliteTable("deployment_version_decisions", {
  id: integer("id").primaryKey({ autoIncrement: true }), deploymentId: text("deployment_id").notNull(), assetId: integer("asset_id").notNull().references(() => assets.id), componentHistoryId: integer("component_history_id").notNull().references(() => componentHistory.id), decision: text("decision").notNull(), rationale: text("rationale").notNull(), decidedBy: text("decided_by").notNull(), decidedAt: text("decided_at").notNull(),
}, (t) => [uniqueIndex("idx_deployment_component_decision").on(t.deploymentId, t.componentHistoryId), index("idx_deployment_decisions_deployment").on(t.deploymentId)]);

export const deploymentSnapshots = sqliteTable("deployment_configuration_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }), deploymentId: text("deployment_id").notNull(), assetId: integer("asset_id").notNull().references(() => assets.id), componentHistoryId: integer("component_history_id").notNull().references(() => componentHistory.id), capturedAt: text("captured_at").notNull(),
}, (t) => [index("idx_snapshots_deployment_asset").on(t.deploymentId, t.assetId)]);
