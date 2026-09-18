'use client';
import { createBrowserClient } from '@supabase/ssr';

// Cliente para componentes do lado do navegador (respeita RLS, roda como o usuário logado).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
