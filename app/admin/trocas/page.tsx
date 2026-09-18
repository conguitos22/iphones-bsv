'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const STATUS_OPTIONS = ['nova', 'em_analise', 'proposta_enviada', 'aceita', 'recusada', 'concluida'];

export default function AdminTrocasPage() {
  const supabase = createClient();
  const [requests, setRequests] = useState<any[]>([]);

  async function load() {
    const { data } = await supabase.from('trade_in_requests').select('*').order('created_at', { ascending: false });
    setRequests(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function update(id: string, fields: any) {
    await supabase.from('trade_in_requests').update(fields).eq('id', id);
    await load();
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-6">Solicitações de troca</h1>
      <div className="space-y-4">
        {requests.map((r) => (
          <div key={r.id} className="border border-brand-line rounded-lg p-4 text-sm">
            <div className="flex justify-between mb-2">
              <p className="font-medium">{r.name} — {r.model} {r.storage} {r.color}</p>
              <select defaultValue={r.status} onChange={(e) => update(r.id, { status: e.target.value })} className="input !py-1 !w-auto">
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <p className="text-slate-500">Tel: {r.phone} {r.email ? `· ${r.email}` : ''}</p>
            <p className="text-slate-500">Bateria: {r.battery_health ?? '—'}% · Face ID: {r.face_id} · Tela: {r.screen_condition ?? '—'} · Carcaça: {r.body_condition ?? '—'}</p>
            {r.notes && <p className="text-slate-500 mt-1">Obs: {r.notes}</p>}
            <div className="flex items-center gap-2 mt-3">
              <input type="number" step="0.01" placeholder="Valor ofertado (R$)" defaultValue={r.offered_value ?? ''}
                onBlur={(e) => update(r.id, { offered_value: e.target.value ? Number(e.target.value) : null })} className="input !w-40" />
              <input placeholder="Notas internas" defaultValue={r.admin_notes ?? ''}
                onBlur={(e) => update(r.id, { admin_notes: e.target.value || null })} className="input flex-1" />
            </div>
          </div>
        ))}
        {!requests.length && <p className="text-slate-500 text-sm">Nenhuma solicitação de troca ainda.</p>}
      </div>
    </div>
  );
}
