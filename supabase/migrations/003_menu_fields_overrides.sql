-- =====================================================================
-- Kozak Training Hub — replace e_/r_ field split with base + overrides
-- Run this in the Supabase SQL editor
-- =====================================================================

-- ── Step 1: Add new base columns and overrides ────────────────────────

ALTER TABLE public.menu_items
  ADD COLUMN ingredients  text NOT NULL DEFAULT '',
  ADD COLUMN description  text NOT NULL DEFAULT '',
  ADD COLUMN presentation text NOT NULL DEFAULT '',
  ADD COLUMN takeout      text NOT NULL DEFAULT '',
  ADD COLUMN facts        text NOT NULL DEFAULT '',
  ADD COLUMN upsell       text NOT NULL DEFAULT '',
  ADD COLUMN overrides    jsonb NOT NULL DEFAULT '{}';

-- ── Step 2: Migrate base values (eatery as base, fallback to restaurant) ─

UPDATE public.menu_items SET
  ingredients  = COALESCE(NULLIF(e_ingredients,  ''), r_ingredients,  ''),
  description  = COALESCE(NULLIF(e_description,  ''), r_description,  ''),
  presentation = COALESCE(NULLIF(e_presentation, ''), r_presentation, ''),
  takeout      = COALESCE(NULLIF(e_takeout,      ''), r_takeout,      ''),
  facts        = COALESCE(NULLIF(e_facts,        ''), r_facts,        '');

-- ── Step 3: Build restaurant overrides where they differ from eatery base ─
-- LG, GT, NT each get an override for any field where r_ != base value.

DO $$
DECLARE
  rec           RECORD;
  base_ing      text;
  base_desc     text;
  base_pres     text;
  base_take     text;
  base_fact     text;
  rest_override jsonb;
BEGIN
  FOR rec IN SELECT * FROM public.menu_items LOOP
    base_ing  := COALESCE(NULLIF(rec.e_ingredients,  ''), rec.r_ingredients,  '');
    base_desc := COALESCE(NULLIF(rec.e_description,  ''), rec.r_description,  '');
    base_pres := COALESCE(NULLIF(rec.e_presentation, ''), rec.r_presentation, '');
    base_take := COALESCE(NULLIF(rec.e_takeout,      ''), rec.r_takeout,      '');
    base_fact := COALESCE(NULLIF(rec.e_facts,        ''), rec.r_facts,        '');

    rest_override := jsonb_strip_nulls(jsonb_build_object(
      'ingredients',  CASE WHEN rec.r_ingredients  != '' AND rec.r_ingredients  != base_ing  THEN rec.r_ingredients  END,
      'description',  CASE WHEN rec.r_description  != '' AND rec.r_description  != base_desc THEN rec.r_description  END,
      'presentation', CASE WHEN rec.r_presentation != '' AND rec.r_presentation != base_pres THEN rec.r_presentation END,
      'takeout',      CASE WHEN rec.r_takeout      != '' AND rec.r_takeout      != base_take THEN rec.r_takeout      END,
      'facts',        CASE WHEN rec.r_facts        != '' AND rec.r_facts        != base_fact THEN rec.r_facts        END
    ));

    IF rest_override != '{}' THEN
      UPDATE public.menu_items
      SET overrides = jsonb_build_object(
        'LG', rest_override,
        'GT', rest_override,
        'NT', rest_override
      )
      WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;

-- ── Step 4: Drop old e_/r_ columns ───────────────────────────────────

ALTER TABLE public.menu_items
  DROP COLUMN e_ingredients,
  DROP COLUMN e_description,
  DROP COLUMN e_presentation,
  DROP COLUMN e_takeout,
  DROP COLUMN e_facts,
  DROP COLUMN r_ingredients,
  DROP COLUMN r_description,
  DROP COLUMN r_presentation,
  DROP COLUMN r_takeout,
  DROP COLUMN r_facts;
