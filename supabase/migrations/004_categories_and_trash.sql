-- ── Categories table (ordering, rename, delete) ──────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT    NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Seed from distinct categories already in menu_items
INSERT INTO categories (name, sort_order)
SELECT DISTINCT category,
       (ROW_NUMBER() OVER (ORDER BY category) - 1)::int
FROM   menu_items
WHERE  category IS NOT NULL AND category <> ''
ON CONFLICT (name) DO NOTHING;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_all"   ON categories FOR SELECT USING (true);
CREATE POLICY "categories_insert_admin" ON categories FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "categories_update_admin" ON categories FOR UPDATE TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "categories_delete_admin" ON categories FOR DELETE TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── Trash table ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items_trash (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id     UUID        NOT NULL,
  csv_id          TEXT,
  name            TEXT        NOT NULL DEFAULT '',
  category        TEXT        DEFAULT '',
  sub_category    TEXT        DEFAULT '',
  locations       TEXT[]      DEFAULT '{}',
  image_url       TEXT,
  related_csv_ids TEXT[]      DEFAULT '{}',
  ingredients     TEXT        NOT NULL DEFAULT '',
  description     TEXT        NOT NULL DEFAULT '',
  presentation    TEXT        NOT NULL DEFAULT '',
  takeout         TEXT        NOT NULL DEFAULT '',
  facts           TEXT        NOT NULL DEFAULT '',
  upsell          TEXT        NOT NULL DEFAULT '',
  overrides       JSONB       NOT NULL DEFAULT '{}',
  deleted_at      TIMESTAMPTZ DEFAULT now(),
  deleted_by      UUID        REFERENCES auth.users(id)
);

ALTER TABLE menu_items_trash ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trash_admin_all" ON menu_items_trash FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
