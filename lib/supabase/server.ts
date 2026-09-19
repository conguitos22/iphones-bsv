import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Cliente para Server Components / Route Handlers (lê a sessão via cookies).
export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: any[]) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado de um Server Component sem permissão de escrita — ok, o middleware cuida do refresh
          }
        }
      }
    }
  );
}

// Cliente admin (service_role) — SÓ em código de servidor (route handlers), nunca no navegador.
// Usado para chamar register_payment / apply_payment_event, que exigem service_role.
export function createServiceSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
