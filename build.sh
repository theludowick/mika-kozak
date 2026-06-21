#!/bin/bash
set -e

echo "--- Checking env vars ---"
[ -n "$EXPO_PUBLIC_SUPABASE_URL" ]      && echo "SUPABASE_URL: SET"      || echo "SUPABASE_URL: EMPTY"
[ -n "$EXPO_PUBLIC_SUPABASE_ANON_KEY" ] && echo "SUPABASE_ANON_KEY: SET" || echo "SUPABASE_ANON_KEY: EMPTY"
[ -n "$EXPO_PUBLIC_QUIZ_CSV_URL" ]      && echo "QUIZ_CSV_URL: SET"      || echo "QUIZ_CSV_URL: EMPTY"
[ -n "$EXPO_PUBLIC_MENU_CSV_URL" ]      && echo "MENU_CSV_URL: SET"      || echo "MENU_CSV_URL: EMPTY"
echo "-------------------------"

cat > .env <<EOF
EXPO_PUBLIC_SUPABASE_URL=${EXPO_PUBLIC_SUPABASE_URL}
EXPO_PUBLIC_SUPABASE_ANON_KEY=${EXPO_PUBLIC_SUPABASE_ANON_KEY}
EXPO_PUBLIC_QUIZ_CSV_URL=${EXPO_PUBLIC_QUIZ_CSV_URL}
EXPO_PUBLIC_MENU_CSV_URL=${EXPO_PUBLIC_MENU_CSV_URL}
EOF

npx expo export -p web --clear
