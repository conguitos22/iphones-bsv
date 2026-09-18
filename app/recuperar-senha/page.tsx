'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function RecuperarSenhaPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/minha-conta?resetPassword=1`
    });
    if (error) { setError(error.message); return; }
    setSent(true);
  }

  return (
    <div className="container-page py-16 max-w-md">
      <h1 className="font-display text-2xl font-semibold mb-6">Recuperar senha</h1>
      {sent ? (
        <p className="text-slate-600">Se o e-mail existir na nossa base, você vai receber um link para redefinir a senha.</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">E-mail</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-brand-line rounded-md px-3 py-2" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-cta w-full">Enviar link</button>
        </form>
      )}
    </div>
  );
}
