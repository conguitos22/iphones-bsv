'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function CadastroPage() {
  const supabase = createClient();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name }, emailRedirectTo: `${location.origin}/auth/callback` }
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className="container-page py-16 max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold mb-3">Confirme seu e-mail</h1>
        <p className="text-slate-600">Enviamos um link de confirmação para {form.email}.</p>
      </div>
    );
  }

  return (
    <div className="container-page py-16 max-w-md">
      <h1 className="font-display text-2xl font-semibold mb-6">Criar conta</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Nome completo</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 w-full border border-brand-line rounded-md px-3 py-2" />
        </div>
        <div>
          <label className="text-sm font-medium">E-mail</label>
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 w-full border border-brand-line rounded-md px-3 py-2" />
        </div>
        <div>
          <label className="text-sm font-medium">Senha</label>
          <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="mt-1 w-full border border-brand-line rounded-md px-3 py-2" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="btn-cta w-full disabled:opacity-60">{loading ? 'Criando…' : 'Criar conta'}</button>
      </form>
      <p className="mt-4 text-sm text-slate-500">
        Já tem conta? <Link href="/login" className="text-brand-blue hover:underline">Entrar</Link>
      </p>
    </div>
  );
}
