'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const initial = {
  name: '', phone: '', email: '', model: '', storage: '', color: '',
  battery_health: '', screen_condition: '', body_condition: '', face_id: 'funcionando', cameras: '', notes: ''
};

export default function TrocaPage() {
  const supabase = createClient();
  const [form, setForm] = useState(initial);
  const [files, setFiles] = useState<FileList | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function set<K extends keyof typeof initial>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/login?redirect=/troque-seu-iphone';
      return;
    }

    try {
      const photoPaths: string[] = [];
      if (files) {
        for (const file of Array.from(files).slice(0, 6)) {
          const path = `${user.id}/${Date.now()}-${file.name}`;
          const { error } = await supabase.storage.from('trade-in-photos').upload(path, file);
          if (error) throw error;
          photoPaths.push(path);
        }
      }

      const { error } = await supabase.from('trade_in_requests').insert({
        user_id: user.id,
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        model: form.model,
        storage: form.storage || null,
        color: form.color || null,
        battery_health: form.battery_health ? Number(form.battery_health) : null,
        screen_condition: form.screen_condition || null,
        body_condition: form.body_condition || null,
        face_id: form.face_id,
        cameras: form.cameras || null,
        notes: form.notes || null,
        photos: photoPaths
      });
      if (error) throw error;
      setStatus('done');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message ?? 'Não foi possível enviar sua solicitação.');
    }
  }

  if (status === 'done') {
    return (
      <div className="container-page py-16 max-w-lg text-center">
        <h1 className="font-display text-2xl font-semibold mb-3">Recebemos seu pedido de avaliação</h1>
        <p className="text-slate-600">Nossa equipe vai analisar as informações e entrar em contato pelo telefone informado com uma proposta.</p>
      </div>
    );
  }

  return (
    <div className="container-page py-12 max-w-2xl">
      <h1 className="font-display text-2xl font-semibold mb-2">Troque seu iPhone</h1>
      <p className="text-slate-500 mb-8">Preencha as informações do seu aparelho. Você recebe uma proposta de valor para abater na compra.</p>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Seu nome"><input required value={form.name} onChange={(e) => set('name', e.target.value)} className="input" /></Field>
          <Field label="Telefone/WhatsApp"><input required value={form.phone} onChange={(e) => set('phone', e.target.value)} className="input" /></Field>
        </div>
        <Field label="E-mail (opcional)"><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="input" /></Field>

        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Modelo"><input required placeholder="iPhone 13" value={form.model} onChange={(e) => set('model', e.target.value)} className="input" /></Field>
          <Field label="Armazenamento"><input placeholder="128GB" value={form.storage} onChange={(e) => set('storage', e.target.value)} className="input" /></Field>
          <Field label="Cor"><input value={form.color} onChange={(e) => set('color', e.target.value)} className="input" /></Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Saúde da bateria (%)"><input type="number" min={0} max={100} value={form.battery_health} onChange={(e) => set('battery_health', e.target.value)} className="input" /></Field>
          <Field label="Face ID">
            <select value={form.face_id} onChange={(e) => set('face_id', e.target.value)} className="input">
              <option value="funcionando">Funcionando</option>
              <option value="com_defeito">Com defeito</option>
            </select>
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Estado da tela"><input placeholder="Sem riscos" value={form.screen_condition} onChange={(e) => set('screen_condition', e.target.value)} className="input" /></Field>
          <Field label="Estado da carcaça"><input placeholder="Poucos sinais de uso" value={form.body_condition} onChange={(e) => set('body_condition', e.target.value)} className="input" /></Field>
        </div>

        <Field label="Câmeras"><input placeholder="Funcionando normalmente" value={form.cameras} onChange={(e) => set('cameras', e.target.value)} className="input" /></Field>
        <Field label="Observações"><textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} className="input min-h-24" /></Field>

        <div>
          <label className="text-sm font-medium">Fotos do aparelho (até 6)</label>
          <input type="file" multiple accept="image/*" onChange={(e) => setFiles(e.target.files)} className="mt-1 block text-sm" />
        </div>

        {status === 'error' && <p className="text-sm text-red-600">{errorMsg}</p>}
        <button disabled={status === 'sending'} className="btn-cta w-full disabled:opacity-60">
          {status === 'sending' ? 'Enviando…' : 'Enviar para avaliação'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
