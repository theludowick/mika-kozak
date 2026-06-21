# Kozak Training Hub — Mika

A React Native / Expo app for restaurant staff to learn the menu and complete quizzes.

## Stack

- **Expo SDK 56** (React Native 0.86, React 19)
- **Expo Router 56** — file-based navigation
- **Supabase** — auth, Postgres DB
- **TanStack Query 5** — data fetching, caching
- **Zod 4** — schema validation
- **PapaParse 5** — CSV parsing
- **expo-image** — optimised images

---

## Quick start

```bash
# 1. Clone and install
npm install

# 2. Configure environment
cp .env.example .env
# Fill in your Supabase URL + anon key

# 3. Start dev server
npx expo start
# Press i (iOS), a (Android), or w (web)
```

---

## Environment variables

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `EXPO_PUBLIC_QUIZ_CSV_URL` | Published Google Sheet CSV for quiz questions |
| `EXPO_PUBLIC_MENU_CSV_URL` | Published Google Sheet CSV for menu items |

All variables must be prefixed with `EXPO_PUBLIC_` so Expo inlines them at build time.

---

## Supabase setup

1. Create a new Supabase project at [supabase.com](https://supabase.com).
2. Copy your **Project URL** and **anon key** from **Settings → API**.
3. Open **SQL Editor** and paste the contents of `supabase/migrations/001_initial.sql`.
4. Click **Run**.

That creates:
- `profiles` — linked to `auth.users`, with position/location fields
- `quiz_attempts` — one row per completed quiz
- `quiz_answers` — individual question results
- `menu_item_progress` — which items each user has viewed / marked learned
- Row Level Security policies so users can only access their own data

---

## Google Sheets setup

### Quiz sheet

CSV columns (exact, case-insensitive):
```
ID | Format | Topics | Positions | Location | Item | Question |
OptionA | OptionB | OptionC | OptionD | Correct | ModelAnswer | Image | Status
```

- **Format**: `CS` (choose one) · `CM` (choose multiple) · `CI` (choose incorrect) · `OA` (open answer)
- **Status**: only rows with `Published` (case-insensitive) are shown
- **Correct**: `A`, `B`, `C`, or `D` for CS/CI; comma-separated for CM; blank for OA
- **Image**: Google Drive share URL or direct HTTPS URL

### Menu sheet

CSV columns (exact):
```
category | sub-category | name | location | e_ingredients | r_ingredients |
e_description | r_description | e_presentation | r_presentation |
e_takeout | r_takeout | e_facts | r_facts | image
```

- `e_` fields = Eatery (VD, NW)
- `r_` fields = Restaurant (LG, GT, NT)

To publish a sheet: **File → Share → Publish to web → Comma-separated values (CSV)**.

---

## Development commands

```bash
npm start          # Start Expo dev server
npm run ios        # iOS simulator
npm run android    # Android emulator / device
npm run web        # Web browser

npm run lint       # ESLint
npm run typecheck  # TypeScript check (no emit)
npm test           # Jest tests
npm run test:watch # Jest watch mode
```

---

## EAS Build (mobile)

```bash
npm install -g eas-cli
eas login
eas build:configure

# Development build
eas build --platform ios --profile development
eas build --platform android --profile development

# Production
eas build --platform all --profile production
```

---

## Web deployment (Expo Hosting)

```bash
# Preview
npx expo export --platform web
# Then deploy the dist/ folder to Vercel, Netlify, or:
npx eas-cli@latest deploy
```

For Vercel: point the root to `dist/` and set all `EXPO_PUBLIC_*` env vars in the Vercel dashboard.

---

## Folder structure

```
app/                    Expo Router screens
  _layout.tsx           Root layout (providers)
  index.tsx             Auth redirect
  (auth)/login.tsx      Login screen
  (tabs)/
    quiz.tsx            Quiz tab
    learning-menu.tsx   Learning Menu tab
  menu/[itemId].tsx     Menu item detail
  quiz/results.tsx      Redirect fallback
src/
  components/ui/        Reusable UI primitives
  constants/            Static data (topics, query keys)
  features/
    auth/               AuthContext
    quiz/               Quiz screens, session hook, storage
    menu/               Menu screens, filter hook
  hooks/                useSelectedLocation
  lib/                  supabase, queryClient, env
  services/             csvService, quizService, menuService, supabaseService
  types/                quiz.ts, menu.ts, profile.ts
  utils/                csvParser, locationParser, quizNormalizer, imageUtils, idGenerator
supabase/migrations/    SQL setup script
__tests__               Jest unit tests
assets/                 Icons and splash images
```

---

## Assumptions

1. Only `Published` (exact word, case-insensitive) rows are served as active questions.
2. The CSV separator for Topics, Positions, and Location is `,` or `;`.
3. Google Drive image links are converted to direct `uc?export=view&id=…` URLs automatically.
4. The default location is **GT** (Gastown) matching the original HTML app.
5. The quiz session is stored in AsyncStorage; it survives accidental app closes.
6. Open-answer (OA) questions are not auto-graded — the user reveals the model answer and self-assesses.
7. Auth is email + password only for the MVP; passwordless / invite flow is architecturally prepared.
8. The full sheet content is **not** stored in Supabase — Google Sheets remains the content source.

---

## Suggested next improvements

- [ ] Passwordless / magic link sign-in
- [ ] Admin dashboard (manage questions, view team progress)
- [ ] Push notifications for quiz reminders
- [ ] Offline mode with full local cache
- [ ] Image upload via Supabase Storage (remove Google Drive dependency)
- [ ] Leaderboard / streak tracking
- [ ] Per-item "mark as learned" button on menu detail screen
- [ ] AI-assisted grading for open-answer questions
- [ ] Export quiz results to PDF
- [ ] Multi-language support (EN / RU)
