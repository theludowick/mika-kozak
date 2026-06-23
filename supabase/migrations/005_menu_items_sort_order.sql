-- ── 005: add sort_order to menu_items ────────────────────────────────────────

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Seed sort_order from alphabetical order within each category
WITH ranked AS (
  SELECT id,
    (ROW_NUMBER() OVER (PARTITION BY category ORDER BY name) - 1) AS rn
  FROM public.menu_items
)
UPDATE public.menu_items m
SET sort_order = r.rn
FROM ranked r
WHERE m.id = r.id;

CREATE INDEX IF NOT EXISTS menu_items_category_sort_idx
  ON public.menu_items (category, sort_order);
