'use client';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LogoutButton() {
  const supabase = createClient();
  const router = useRouter();
  return (
    <button
      onClick={async () => { await supabase.auth.signOut(); router.push('/'); router.refresh(); }}
      className="text-slate-500 hover:text-red-600"
    >
      Sair da conta
    </button>
  );
}
