'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatBRL, STATUS_LABEL } from '@/lib/format';

const NEXT_STATUS: Record<string, string[]> = {
  pendente: ['aprovado', 'cancelado'],
  aprovado: ['preparando', 'cancelado'],
  preparando: ['enviado', 'cancelado'],
  enviado: ['entregue'],
  entregue: [],
  cancelado: []
};

export default function AdminPedidosPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(100);
    setOrders(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function updateStatus(orderId: string, status: string) {
    let tracking: string | undefined;
    if (status === 'enviado') tracking = prompt('Código de rastreio (opcional):') ?? undefined;
    const { error } = await supabase.rpc('set_order_status', { p_order_id: orderId, p_status: status, p_tracking: tracking ?? null });
    if (error) { alert(error.message); return; }
    await load();
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-6">Pedidos</h1>
      {loading && <p className="text-slate-500">Carregando…</p>}
      <div className="border border-brand-line rounded-lg divide-y divide-brand-line">
        {orders.map((o) => (
          <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div>
              <p className="font-medium">{o.order_number} — {o.customer_name}</p>
              <p className="text-slate-500 text-xs">{new Date(o.created_at).toLocaleString('pt-BR')} · {o.payment_method} · pagamento: {o.payment_status}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium">{formatBRL(o.total)}</span>
              <span className="px-2 py-1 rounded-full bg-brand-ice text-xs">{STATUS_LABEL[o.status] ?? o.status}</span>
              {NEXT_STATUS[o.status]?.map((s) => (
                <button key={s} onClick={() => updateStatus(o.id, s)} className="text-xs text-brand-blue hover:underline">
                  → {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
        ))}
        {!loading && !orders.length && <p className="p-6 text-slate-500 text-sm">Nenhum pedido ainda.</p>}
      </div>
    </div>
  );
}
