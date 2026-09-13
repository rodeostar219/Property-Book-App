export const ODA_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS oda_units (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  uic text NOT NULL,
  name text NOT NULL,
  group_name text NOT NULL,
  installation text NOT NULL,
  document_number text NOT NULL,
  phrh_name text NOT NULL
);
CREATE TABLE IF NOT EXISTS oda_sections (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  unit_id integer NOT NULL,
  letter text NOT NULL,
  name text NOT NULL,
  mos text NOT NULL,
  specialty text NOT NULL,
  shr_holder_key text,
  FOREIGN KEY (unit_id) REFERENCES oda_units(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_oda_sections_letter ON oda_sections (unit_id, letter);
CREATE TABLE IF NOT EXISTS accountability_lines (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  key text NOT NULL,
  unit_id integer NOT NULL,
  lin text,
  nsn text NOT NULL,
  official_nomenclature text NOT NULL,
  quantity integer DEFAULT 1 NOT NULL,
  serial_number text,
  accountability_class text NOT NULL,
  network_classification text NOT NULL,
  location text,
  status text DEFAULT 'on_hand' NOT NULL,
  section_letter text NOT NULL,
  shr_holder_key text,
  FOREIGN KEY (unit_id) REFERENCES oda_units(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_acct_line_key ON accountability_lines (key);
CREATE INDEX IF NOT EXISTS idx_acct_line_section ON accountability_lines (section_letter);
CREATE INDEX IF NOT EXISTS idx_acct_line_serial ON accountability_lines (serial_number);
CREATE TABLE IF NOT EXISTS component_facts (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  line_key text NOT NULL,
  kind text NOT NULL,
  nomenclature text NOT NULL,
  required_quantity integer DEFAULT 1 NOT NULL,
  on_hand_quantity integer DEFAULT 0 NOT NULL,
  serialized integer DEFAULT 0 NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_component_facts_line ON component_facts (line_key);
CREATE TABLE IF NOT EXISTS tracker_facts (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  key text NOT NULL,
  nsn text NOT NULL,
  serial_number text,
  nomenclature text NOT NULL,
  quantity integer DEFAULT 1 NOT NULL,
  tracker_name text NOT NULL,
  section_letter text
);
CREATE TABLE IF NOT EXISTS packing_facts (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  key text NOT NULL,
  nsn text NOT NULL,
  serial_number text,
  nomenclature text NOT NULL,
  quantity integer DEFAULT 1 NOT NULL,
  document_label text NOT NULL,
  section_letter text NOT NULL
);
CREATE TABLE IF NOT EXISTS picture_book_entries (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  accountability_line_key text NOT NULL,
  official_name text NOT NULL,
  common_name text NOT NULL,
  photo_key text,
  photo_data text,
  photo_content_type text,
  photo_updated_at text,
  photo_updated_by text
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_picture_book_line ON picture_book_entries (accountability_line_key);
CREATE TABLE IF NOT EXISTS shr_injects (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  unit_id integer NOT NULL,
  section_letter text,
  label text NOT NULL,
  injected_at text NOT NULL,
  injected_by text NOT NULL,
  source_kind text DEFAULT 'electronic_shr' NOT NULL,
  prior_inject_id integer,
  added_count integer DEFAULT 0 NOT NULL,
  removed_count integer DEFAULT 0 NOT NULL,
  changed_count integer DEFAULT 0 NOT NULL,
  unchanged_count integer DEFAULT 0 NOT NULL,
  notes text
);
CREATE INDEX IF NOT EXISTS idx_shr_injects_section_date ON shr_injects (section_letter, injected_at);
CREATE TABLE IF NOT EXISTS shr_inject_lines (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  inject_id integer NOT NULL,
  change_type text NOT NULL,
  line_key text,
  lin text,
  nsn text,
  serial_number text,
  nomenclature text NOT NULL,
  quantity integer DEFAULT 1 NOT NULL,
  prior_nomenclature text,
  prior_quantity integer,
  prior_serial text,
  section_letter text,
  FOREIGN KEY (inject_id) REFERENCES shr_injects(id)
);
CREATE INDEX IF NOT EXISTS idx_shr_inject_lines_inject ON shr_inject_lines (inject_id);
CREATE TABLE IF NOT EXISTS source_discrepancies (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  public_key text NOT NULL,
  unit_id integer NOT NULL,
  identity_key text NOT NULL,
  nsn text,
  serial_number text,
  lin text,
  section_letter text,
  source_a text NOT NULL,
  source_b text NOT NULL,
  fact_a text NOT NULL,
  fact_b text NOT NULL,
  issue text NOT NULL,
  action text NOT NULL,
  severity text NOT NULL,
  status text DEFAULT 'open' NOT NULL,
  item_key text,
  created_at text NOT NULL,
  created_by text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_source_disc_key ON source_discrepancies (public_key);
CREATE INDEX IF NOT EXISTS idx_source_disc_section ON source_discrepancies (section_letter, status);
`.trim();
