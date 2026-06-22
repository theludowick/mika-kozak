-- =====================================================================
-- Kozak Training Hub — menu items, quiz questions, rebuilt photos table
-- Run this in the Supabase SQL editor
-- =====================================================================

-- ── menu_items ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.menu_items (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  csv_id            text        UNIQUE,
  name              text        NOT NULL,
  category          text        NOT NULL DEFAULT '',
  sub_category      text        NOT NULL DEFAULT '',
  locations         text[]      NOT NULL DEFAULT '{}',
  image_url         text,
  related_csv_ids   text[]      NOT NULL DEFAULT '{}',
  e_ingredients     text        NOT NULL DEFAULT '',
  e_description     text        NOT NULL DEFAULT '',
  e_presentation    text        NOT NULL DEFAULT '',
  e_takeout         text        NOT NULL DEFAULT '',
  e_facts           text        NOT NULL DEFAULT '',
  r_ingredients     text        NOT NULL DEFAULT '',
  r_description     text        NOT NULL DEFAULT '',
  r_presentation    text        NOT NULL DEFAULT '',
  r_takeout         text        NOT NULL DEFAULT '',
  r_facts           text        NOT NULL DEFAULT '',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS menu_items_category_idx ON public.menu_items (category);
CREATE INDEX IF NOT EXISTS menu_items_name_idx ON public.menu_items (name);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read menu items"
  ON public.menu_items FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage menu items"
  ON public.menu_items FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── quiz_questions ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id            text        PRIMARY KEY,
  format        text        NOT NULL,
  topics        text[]      NOT NULL DEFAULT '{}',
  positions     text[]      NOT NULL DEFAULT '{}',
  locations     text[]      NOT NULL DEFAULT '{}',
  item          text        NOT NULL DEFAULT '',
  question      text        NOT NULL DEFAULT '',
  option_a      text,
  option_b      text,
  option_c      text,
  option_d      text,
  correct       text,
  model_answer  text,
  image_url     text,
  status        text        NOT NULL DEFAULT 'published',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read quiz questions"
  ON public.quiz_questions FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage quiz questions"
  ON public.quiz_questions FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── menu_item_photos (rebuild — wipes test data) ──────────────────────
-- Safe to run: the old table had no production data.

DROP TABLE IF EXISTS public.menu_item_photos;

CREATE TABLE public.menu_item_photos (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id  uuid        NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  image_url     text        NOT NULL,
  locations     text[]      NOT NULL,
  note          text,
  sort_order    integer     NOT NULL DEFAULT 0,
  uploaded_by   uuid        REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT photos_has_location CHECK (array_length(locations, 1) > 0)
);

CREATE INDEX ON public.menu_item_photos (menu_item_id);

ALTER TABLE public.menu_item_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read photo metadata"
  ON public.menu_item_photos FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage photo metadata"
  ON public.menu_item_photos FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
