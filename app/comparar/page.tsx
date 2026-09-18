import { createServerSupabase } from '@/lib/supabase/server';
import { formatBRL } from '@/lib/format';

export const revalidate = 30;

export default async function CompararPage({ searchParams }: { searchParams: { a?: string; b?: string } }) {
  const supabase = createServerSupabase();
  const { data: all } = await supabase.from('product_listing').select('id, slug, name').eq('product_type', 'iphone').order('name');

  const slugs = [searchParams.a, searchParams.b].filter(Boolean) as string[];
  let products: any[] = [];
  if (slugs.length) {
    const { data } = await supabase.from('products').select('id, slug, name, model, specs, product_variants(price, pix_price)').in('slug', slugs);
    products = data ?? [];
  }

  const specKeys = Array.from(new Set(products.flatMap((p) => Object.keys(p.specs ?? {}))));

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-2xl font-semibold mb-2">Comparar iPhones</h1>
      <p className="text-slate-500 mb-6">Escolha dois modelos para comparar a ficha técnica lado a lado.</p>

      <form className="grid sm:grid-cols-2 gap-4 mb-10 max-w-xl">
        <select name="a" defaultValue={searchParams.a} className="input">
          <option value="">Selecione o primeiro</option>
          {all?.map((p) => <option key={p.id} value={p.slug}>{p.name}</option>)}
        </select>
        <select name="b" defaultValue={searchParams.b} className="input">
          <option value="">Selecione o segundo</option>
          {all?.map((p) => <option key={p.id} value={p.slug}>{p.name}</option>)}
        </select>
        <button className="btn-cta sm:col-span-2">Comparar</button>
      </form>

      {products.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left p-3 border-b border-brand-line">Especificação</th>
                {products.map((p) => (
                  <th key={p.id} className="text-left p-3 border-b border-brand-line font-display">{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border-b border-brand-line text-slate-500">Preço a partir de (Pix)</td>
                {products.map((p) => {
                  const min = Math.min(...(p.product_variants ?? []).map((v: any) => v.pix_price ?? v.price ?? Infinity));
                  return <td key={p.id} className="p-3 border-b border-brand-line font-medium">{formatBRL(Number.isFinite(min) ? min : null)}</td>;
                })}
              </tr>
              {specKeys.map((key) => (
                <tr key={key}>
                  <td className="p-3 border-b border-brand-line text-slate-500">{key}</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-3 border-b border-brand-line">{p.specs?.[key] ?? '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
