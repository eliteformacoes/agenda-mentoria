import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error(
    'Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local',
  );
}

export const supabase = createClient(url, anon, {
  db: { schema: 'agenda' },
  auth: { persistSession: true, autoRefreshToken: true },
});
