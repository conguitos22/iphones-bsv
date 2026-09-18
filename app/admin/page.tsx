import { createServerSupabase } from '@/lib/supabase/server';
import { formatBRL } from '@/lib/format';

export default async function AdminDashboard() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase.rpc('admin_dashboard');

  if (error) return <p className="text-red-600">{error.message}</p>;

  const cards = [
    ['Faturamento total', formatBRL(data.revenue_total)],
    ['Faturamento (30 dias)', formatBRL(data.revenue_30d)],
    ['Pedidos totais', data.orders_total],
    ['Pedidos pendentes', data.orders_pending],
    ['Clientes cadastrados', data.customers],
    ['Itens com estoque baixo', data.low_stock]
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-6">Dashboard</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        {cards.map(([label, value]) => (
          <div key={label} className="border border-brand-line rounded-lg p-5">
            <p className="text-slate-500 text-sm">{label}</p>
            <p className="font-display text-2xl font-semibold mt-1">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
