-- ── 006: standalone sub_categories table ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sub_categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  category    text        NOT NULL,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(name, category)
);

ALTER TABLE public.sub_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sub_categories"
  ON public.sub_categories FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can manage sub_categories"
  ON public.sub_categories FOR ALL TO authenticated USING (true);

-- Seed from distinct (sub_category, category) pairs that exist on menu_items
INSERT INTO public.sub_categories (name, category, sort_order)
SELECT sub_category, category,
  (ROW_NUMBER() OVER (PARTITION BY category ORDER BY sub_category) - 1)::integer
FROM (
  SELECT DISTINCT sub_category, category
  FROM public.menu_items
  WHERE sub_category IS NOT NULL AND sub_category <> ''
) AS distinct_pairs
ON CONFLICT (name, category) DO NOTHING;
