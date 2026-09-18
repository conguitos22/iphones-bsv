'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError('E-mail ou senha inválidos.'); return; }
    router.push(params.get('redirect') || '/minha-conta');
    router.refresh();
  }

  return (
    <div className="container-page py-16 max-w-md">
      <h1 className="font-display text-2xl font-semibold mb-6">Entrar</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">E-mail</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-brand-line rounded-md px-3 py-2" />
        </div>
        <div>
          <label className="text-sm font-medium">Senha</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-brand-line rounded-md px-3 py-2" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="btn-cta w-full disabled:opacity-60">{loading ? 'Entrando…' : 'Entrar'}</button>
      </form>
      <div className="mt-4 text-sm text-slate-500 flex justify-between">
        <Link href="/recuperar-senha" className="hover:text-brand-blue">Esqueci minha senha</Link>
        <Link href="/cadastro" className="hover:text-brand-blue">Criar conta</Link>
      </div>
    </div>
  );
}
