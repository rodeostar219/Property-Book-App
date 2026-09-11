CREATE TABLE `assets` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `asset_tag` text NOT NULL,
  `serial_number` text,
  `equipment_model` text NOT NULL,
  `nsn` text,
  `classification` text NOT NULL,
  `mission_profile` text,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_assets_asset_tag` ON `assets` (`asset_tag`);
--> statement-breakpoint
CREATE INDEX `idx_assets_baseline_context` ON `assets` (`equipment_model`,`nsn`,`classification`,`mission_profile`);
--> statement-breakpoint
CREATE TABLE `version_baselines` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `equipment_model` text,
  `nsn` text,
  `classification` text,
  `mission_profile` text,
  `component_name` text NOT NULL,
  `component_type` text NOT NULL,
  `approved_version` text NOT NULL,
  `required` integer DEFAULT true NOT NULL,
  `verification_interval_days` integer DEFAULT 30 NOT NULL,
  `effective_at` text NOT NULL,
  `retired_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_baselines_match` ON `version_baselines` (`equipment_model`,`nsn`,`classification`,`mission_profile`);
--> statement-breakpoint
CREATE INDEX `idx_baselines_component` ON `version_baselines` (`component_name`,`component_type`);
--> statement-breakpoint
CREATE TABLE `component_version_history` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `asset_id` integer NOT NULL,
  `baseline_id` integer,
  `component_name` text NOT NULL,
  `component_type` text NOT NULL,
  `installed_version` text,
  `approved_version_snapshot` text,
  `installation_date` text,
  `last_verified_date` text,
  `verification_method` text,
  `verified_by` text,
  `update_source` text,
  `applicability` text,
  `notes` text,
  `evidence_object_key` text,
  `evidence_filename` text,
  `status` text NOT NULL,
  `superseded_at` text,
  `recorded_at` text NOT NULL,
  `recorded_by` text NOT NULL,
  `batch_id` text,
  FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`baseline_id`) REFERENCES `version_baselines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_history_asset_component` ON `component_version_history` (`asset_id`,`component_name`,`recorded_at`);
--> statement-breakpoint
CREATE INDEX `idx_history_status` ON `component_version_history` (`status`);
--> statement-breakpoint
CREATE INDEX `idx_history_batch` ON `component_version_history` (`batch_id`);
--> statement-breakpoint
CREATE TABLE `deployment_version_decisions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `deployment_id` text NOT NULL,
  `asset_id` integer NOT NULL,
  `component_history_id` integer NOT NULL,
  `decision` text NOT NULL,
  `rationale` text NOT NULL,
  `decided_by` text NOT NULL,
  `decided_at` text NOT NULL,
  FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`component_history_id`) REFERENCES `component_version_history`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_deployment_component_decision` ON `deployment_version_decisions` (`deployment_id`,`component_history_id`);
--> statement-breakpoint
CREATE INDEX `idx_deployment_decisions_deployment` ON `deployment_version_decisions` (`deployment_id`);
--> statement-breakpoint
CREATE TABLE `deployment_configuration_snapshots` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `deployment_id` text NOT NULL,
  `asset_id` integer NOT NULL,
  `component_history_id` integer NOT NULL,
  `captured_at` text NOT NULL,
  FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`component_history_id`) REFERENCES `component_version_history`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_snapshots_deployment_asset` ON `deployment_configuration_snapshots` (`deployment_id`,`asset_id`);
