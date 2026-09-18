import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatBRL } from '@/lib/format';

export default async function AdminProdutosPage() {
  const supabase = createServerSupabase();
  const { data: products } = await supabase
    .from('products')
    .select('id, name, product_type, condition, status, product_variants(price, inventory(quantity, reserved))')
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">Produtos</h1>
        <Link href="/admin/produtos/novo" className="btn-cta">Novo produto</Link>
      </div>

      <div className="border border-brand-line rounded-lg divide-y divide-brand-line">
        {products?.map((p: any) => {
          const stock = (p.product_variants ?? []).reduce((s: number, v: any) => s + ((v.inventory?.quantity ?? 0) - (v.inventory?.reserved ?? 0)), 0);
          const minPrice = Math.min(...(p.product_variants ?? []).map((v: any) => v.price ?? Infinity));
          return (
            <Link key={p.id} href={`/admin/produtos/${p.id}`} className="flex items-center justify-between p-4 hover:bg-brand-ice text-sm">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-slate-500 text-xs">{p.product_type === 'iphone' ? 'iPhone' : 'Acessório'} · {p.condition} · {p.status}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">{Number.isFinite(minPrice) ? formatBRL(minPrice) : '—'}</p>
                <p className="text-xs text-slate-500">{stock} em estoque</p>
              </div>
            </Link>
          );
        })}
        {!products?.length && <p className="p-6 text-slate-500 text-sm">Nenhum produto cadastrado ainda.</p>}
      </div>
    </div>
  );
}
