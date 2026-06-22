-- ═══════════════════════════════════════════════════════════════════════════
-- MIKA — Trash Recovery Queries
-- Run these manually in Supabase SQL editor when restoring deleted items.
-- Items are never hard-deleted; they live in menu_items_trash.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1. LIST ALL ITEMS IN TRASH ───────────────────────────────────────────────
--    Run first to find the original_id you want to restore.

SELECT
  id              AS trash_row_id,
  original_id,
  name,
  category,
  sub_category,
  deleted_at,
  deleted_by
FROM menu_items_trash
ORDER BY deleted_at DESC;


-- ── 2. RESTORE A SINGLE ITEM BY original_id ──────────────────────────────────
--    Replace '<original_id_here>' with the UUID from column original_id above.
--    The item is restored with its original UUID so photo FK references still work.

DO $$
DECLARE
  target_id UUID := '<original_id_here>';
BEGIN
  IF EXISTS (SELECT 1 FROM menu_items WHERE id = target_id) THEN
    RAISE EXCEPTION 'Item % already exists in menu_items — no action taken.', target_id;
  END IF;

  INSERT INTO menu_items (
    id, csv_id, name, category, sub_category, locations,
    image_url, related_csv_ids,
    ingredients, description, presentation, takeout, facts, upsell, overrides
  )
  SELECT
    original_id, csv_id, name, category, sub_category, locations,
    image_url, related_csv_ids,
    ingredients, description, presentation, takeout, facts, upsell, overrides
  FROM menu_items_trash
  WHERE original_id = target_id;

  -- Remove from trash after successful restore
  DELETE FROM menu_items_trash WHERE original_id = target_id;

  RAISE NOTICE 'Restored item % successfully.', target_id;
END $$;


-- ── 3. RESTORE MULTIPLE ITEMS BY NAME (fuzzy) ────────────────────────────────
--    Useful when you don't know the UUID. Replace '%search%' with part of the name.
--    Preview first (SELECT), then uncomment the INSERT + DELETE block.

SELECT original_id, name, category, deleted_at
FROM menu_items_trash
WHERE name ILIKE '%search%'
ORDER BY deleted_at DESC;

-- After confirming the rows above are correct, run:
/*
INSERT INTO menu_items (
  id, csv_id, name, category, sub_category, locations,
  image_url, related_csv_ids,
  ingredients, description, presentation, takeout, facts, upsell, overrides
)
SELECT
  original_id, csv_id, name, category, sub_category, locations,
  image_url, related_csv_ids,
  ingredients, description, presentation, takeout, facts, upsell, overrides
FROM menu_items_trash
WHERE name ILIKE '%search%'
  AND NOT EXISTS (SELECT 1 FROM menu_items WHERE id = original_id);

DELETE FROM menu_items_trash
WHERE name ILIKE '%search%'
  AND NOT EXISTS (SELECT 1 FROM menu_items WHERE id = original_id);
*/


-- ── 4. RESTORE ALL ITEMS DELETED ON A SPECIFIC DATE ──────────────────────────
--    Replace '2026-06-22' with the date shown in deleted_at.

/*
INSERT INTO menu_items (
  id, csv_id, name, category, sub_category, locations,
  image_url, related_csv_ids,
  ingredients, description, presentation, takeout, facts, upsell, overrides
)
SELECT
  original_id, csv_id, name, category, sub_category, locations,
  image_url, related_csv_ids,
  ingredients, description, presentation, takeout, facts, upsell, overrides
FROM menu_items_trash
WHERE deleted_at::date = '2026-06-22'
  AND NOT EXISTS (SELECT 1 FROM menu_items WHERE id = original_id);

DELETE FROM menu_items_trash
WHERE deleted_at::date = '2026-06-22';
*/


-- ── 5. PERMANENTLY DELETE FROM TRASH (no recovery after this) ───────────────
--    Only run if you are sure you don't need the item.

/*
DELETE FROM menu_items_trash WHERE original_id = '<original_id_here>';
*/


-- ── 6. EMPTY ENTIRE TRASH ────────────────────────────────────────────────────
--    Nuclear option. Uncomment only when intentional.

/*
DELETE FROM menu_items_trash;
*/
