/**
 * One-shot import: reads both Google Sheets CSVs and upserts into Supabase.
 *
 * Prerequisites:
 *   1. Run supabase/migrations/002_menu_quiz_tables.sql in the Supabase SQL editor first.
 *   2. Add your service role key to .env:
 *        SUPABASE_SERVICE_ROLE_KEY=your_key_here
 *      (Find it in Supabase dashboard → Project Settings → API → service_role key)
 *
 * Run:
 *   node scripts/importFromSheets.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env ─────────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = resolve(__dirname, '../.env');
  const content = readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
  return env;
}

const envVars = loadEnv();
const SUPABASE_URL = process.env.SUPABASE_URL ?? envVars.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? envVars.SUPABASE_SERVICE_ROLE_KEY;
const MENU_CSV_URL = process.env.EXPO_PUBLIC_MENU_CSV_URL ?? envVars.EXPO_PUBLIC_MENU_CSV_URL;
const QUIZ_CSV_URL = process.env.EXPO_PUBLIC_QUIZ_CSV_URL ?? envVars.EXPO_PUBLIC_QUIZ_CSV_URL;

if (!SERVICE_ROLE_KEY) {
  console.error('❌  Missing SUPABASE_SERVICE_ROLE_KEY.');
  console.error('    Add it to .env: SUPABASE_SERVICE_ROLE_KEY=your_key_here');
  console.error('    (Supabase dashboard → Project Settings → API → service_role)');
  process.exit(1);
}
if (!MENU_CSV_URL || !QUIZ_CSV_URL) {
  console.error('❌  Missing CSV URLs in .env (EXPO_PUBLIC_MENU_CSV_URL / EXPO_PUBLIC_QUIZ_CSV_URL).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Parsing helpers ───────────────────────────────────────────────────────────

const ALL_LOCATIONS = ['VD', 'NW', 'LG', 'GT', 'NT'];

function parseLocations(raw) {
  if (!raw) return [];
  return raw.split(/[,;]/)
    .map(t => t.trim().toUpperCase())
    .filter(t => ALL_LOCATIONS.includes(t));
}

function normaliseImageUrl(raw) {
  const url = (raw ?? '').trim();
  if (!url) return null;
  let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match?.[1]) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
  return url || null;
}

function djb2(parts) {
  const str = parts.join('|');
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = (hash * 33) ^ str.charCodeAt(i);
  return `row_${(hash >>> 0).toString(36)}`;
}

async function fetchCsv(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText} — ${url}`);
  const text = await res.text();

  // Minimal CSV parser: split into lines, parse header + rows
  const lines = text.split(/\r?\n/);
  const headers = parseCsvLine(lines[0] ?? '');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line?.trim()) continue;
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });
    rows.push(row);
  }
  return rows;
}

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

// ── Menu parsing ──────────────────────────────────────────────────────────────

function normaliseMenuHeader(raw) {
  return raw.trim().toLowerCase().replace(/\s+/g, '-');
}

function parseMenuRow(raw, rowIndex) {
  const row = {};
  for (const [k, v] of Object.entries(raw)) row[normaliseMenuHeader(k)] = (v ?? '').trim();

  const name = row.name?.trim();
  if (!name) return null;

  return {
    csv_id: row.id?.trim() || null,
    name,
    category:         row.category ?? '',
    sub_category:     row['sub-category'] ?? '',
    locations:        parseLocations(row.location),
    image_url:        normaliseImageUrl(row.image),
    related_csv_ids:  (row.related ?? '').split(',').map(s => s.trim()).filter(Boolean),
    e_ingredients:    row.e_ingredients ?? '',
    e_description:    row.e_description ?? '',
    e_presentation:   row.e_presentation ?? '',
    e_takeout:        row.e_takeout ?? '',
    e_facts:          row.e_facts ?? '',
    r_ingredients:    row.r_ingredients ?? '',
    r_description:    row.r_description ?? '',
    r_presentation:   row.r_presentation ?? '',
    r_takeout:        row.r_takeout ?? '',
    r_facts:          row.r_facts ?? '',
  };
}

// ── Quiz parsing ──────────────────────────────────────────────────────────────

const QUIZ_HEADER_MAP = {
  id: 'ID', format: 'Format', topics: 'Topics', positions: 'Positions',
  location: 'Location', item: 'Item', question: 'Question',
  optiona: 'OptionA', optionb: 'OptionB', optionc: 'OptionC', optiond: 'OptionD',
  correct: 'Correct', modelanswer: 'ModelAnswer', image: 'Image', status: 'Status',
};
const VALID_FORMATS = new Set(['CS', 'CM', 'CI', 'OA']);

function parseQuizRow(raw, rowIndex) {
  const canonical = {};
  for (const [k, v] of Object.entries(raw)) {
    const norm = k.toLowerCase().replace(/\s+/g, '');
    canonical[QUIZ_HEADER_MAP[norm] ?? k] = (v ?? '').trim();
  }

  const status = (canonical.Status ?? '').trim().toLowerCase();
  if (status !== 'published') return null;

  const question = (canonical.Question ?? canonical.Item ?? '').trim();
  if (!question) return null;

  const fmt = (canonical.Format ?? '').trim().toUpperCase();
  const id = canonical.ID?.trim() ||
    djb2([canonical.Format ?? '', canonical.Question ?? '', canonical.Item ?? '', String(rowIndex)]);

  return {
    id,
    format:       VALID_FORMATS.has(fmt) ? fmt : 'OA',
    topics:       (canonical.Topics ?? '').split(/[,;]/).map(t => t.trim()).filter(Boolean),
    positions:    (canonical.Positions ?? '').split(/[,;]/).map(t => t.trim().toLowerCase()).filter(Boolean),
    locations:    parseLocations(canonical.Location),
    item:         (canonical.Item ?? '').trim(),
    question,
    option_a:     canonical.OptionA || null,
    option_b:     canonical.OptionB || null,
    option_c:     canonical.OptionC || null,
    option_d:     canonical.OptionD || null,
    correct:      canonical.Correct || null,
    model_answer: canonical.ModelAnswer || null,
    image_url:    normaliseImageUrl(canonical.Image),
    status:       'published',
  };
}

// ── Upsert in chunks ──────────────────────────────────────────────────────────

async function upsertChunked(table, rows, conflictCol) {
  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict: conflictCol });
    if (error) {
      console.error(`❌  ${table} chunk ${i}–${i + CHUNK}:`, error.message);
      if (error.details) console.error('   ', error.details);
      process.exit(1);
    }
    process.stdout.write(`\r   ${Math.min(i + CHUNK, rows.length)} / ${rows.length}`);
  }
  process.stdout.write('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀  Starting import from Google Sheets…\n');

  console.log('📥  Fetching menu CSV…');
  const rawMenu = await fetchCsv(MENU_CSV_URL);
  console.log(`    ${rawMenu.length} raw rows`);

  console.log('📥  Fetching quiz CSV…');
  const rawQuiz = await fetchCsv(QUIZ_CSV_URL);
  console.log(`    ${rawQuiz.length} raw rows`);

  const menuItems = rawMenu.map((r, i) => parseMenuRow(r, i + 1)).filter(Boolean);
  console.log(`\n✔   Parsed ${menuItems.length} menu items`);

  const quizQuestions = rawQuiz.map((r, i) => parseQuizRow(r, i + 1)).filter(Boolean);
  console.log(`✔   Parsed ${quizQuestions.length} quiz questions`);

  console.log('\n📤  Inserting menu items…');
  await upsertChunked('menu_items', menuItems, 'csv_id');
  console.log('✔   Menu items done');

  console.log('\n📤  Inserting quiz questions…');
  await upsertChunked('quiz_questions', quizQuestions, 'id');
  console.log('✔   Quiz questions done');

  console.log('\n🎉  Import complete!');
  console.log('    Next steps:');
  console.log('    1. Remove EXPO_PUBLIC_QUIZ_CSV_URL and EXPO_PUBLIC_MENU_CSV_URL from .env');
  console.log('    2. Clear the menu-images storage bucket in Supabase dashboard (old files are orphaned)');
}

main().catch(err => { console.error('❌ ', err); process.exit(1); });
