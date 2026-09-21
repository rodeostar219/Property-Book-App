CREATE TABLE `da2062_imports` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `unit_id` integer NOT NULL,
  `public_key` text NOT NULL,
  `direction` text DEFAULT 'in' NOT NULL,
  `status` text DEFAULT 'committed' NOT NULL,
  `parse_path` text NOT NULL,
  `destination_kind` text NOT NULL,
  `destination_section` text,
  `issuer` text NOT NULL,
  `gaining_party` text NOT NULL,
  `gaining_section` text,
  `uic` text NOT NULL,
  `filename` text NOT NULL,
  `source_pdf_data` text,
  `source_pdf_content_type` text,
  `imported_at` text NOT NULL,
  `imported_by` text NOT NULL,
  `prior_import_id` integer,
  `line_count` integer DEFAULT 0 NOT NULL,
  `discrepancy_count` integer DEFAULT 0 NOT NULL,
  `notes` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_da2062_public` ON `da2062_imports` (`public_key`);
--> statement-breakpoint
CREATE INDEX `idx_da2062_section_date` ON `da2062_imports` (`destination_section`,`imported_at`);
--> statement-breakpoint
CREATE TABLE `da2062_import_lines` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `import_id` integer NOT NULL,
  `lin` text,
  `nsn` text,
  `serial_number` text,
  `nomenclature` text NOT NULL,
  `quantity` integer DEFAULT 1 NOT NULL,
  `official_name` text,
  `actual_name` text,
  `photo_data` text,
  `section_letter` text,
  `line_key` text,
  `confidence` text DEFAULT 'high' NOT NULL,
  `disposition` text DEFAULT 'accept' NOT NULL,
  FOREIGN KEY (`import_id`) REFERENCES `da2062_imports`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_da2062_lines_import` ON `da2062_import_lines` (`import_id`);
--> statement-breakpoint
CREATE TABLE `custody_in_events` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `import_id` integer NOT NULL,
  `line_key` text,
  `nsn` text,
  `serial_number` text,
  `nomenclature` text NOT NULL,
  `quantity` integer DEFAULT 1 NOT NULL,
  `destination_kind` text NOT NULL,
  `destination_section` text,
  `gaining_party` text NOT NULL,
  `issuer` text NOT NULL,
  `occurred_at` text NOT NULL,
  `recorded_by` text NOT NULL,
  `fact_layer` text DEFAULT 'responsibility' NOT NULL,
  FOREIGN KEY (`import_id`) REFERENCES `da2062_imports`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_custody_in_import` ON `custody_in_events` (`import_id`);
