ALTER TABLE `da2062_imports` ADD `return_date` text;
--> statement-breakpoint
ALTER TABLE `da2062_imports` ADD `out_destination_kind` text;
--> statement-breakpoint
ALTER TABLE `da2062_imports` ADD `out_destination_label` text;
--> statement-breakpoint
ALTER TABLE `da2062_imports` ADD `issuer_section` text;
--> statement-breakpoint
CREATE TABLE `custody_out_events` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `import_id` integer NOT NULL,
  `line_key` text,
  `nsn` text,
  `serial_number` text,
  `nomenclature` text NOT NULL,
  `quantity` integer DEFAULT 1 NOT NULL,
  `out_destination_kind` text NOT NULL,
  `out_destination_label` text NOT NULL,
  `return_date` text NOT NULL,
  `issuer` text NOT NULL,
  `issuer_section` text,
  `occurred_at` text NOT NULL,
  `recorded_by` text NOT NULL,
  `fact_layer` text DEFAULT 'custody' NOT NULL,
  FOREIGN KEY (`import_id`) REFERENCES `da2062_imports`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_custody_out_import` ON `custody_out_events` (`import_id`);
