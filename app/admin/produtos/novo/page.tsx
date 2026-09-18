'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function NovoProdutoPage() {
  const supabase = createClient();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '', model: '', product_type: 'iphone', condition: 'novo', description: '',
    featured: false, status: 'draft',
    sku: '', storage: '', color: '', price: '', pix_price: '', old_price: '', quantity: '0'
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data: product, error: pErr } = await supabase.from('products').insert({
        slug: slugify(form.name) + '-' + Date.now().toString(36),
        name: form.name,
        model: form.model || null,
        product_type: form.product_type,
        condition: form.condition,
        description: form.description || null,
        featured: form.featured,
        status: form.status
      }).select('id').single();
      if (pErr) throw pErr;

      const { data: variant, error: vErr } = await supabase.from('product_variants').insert({
        product_id: product.id,
        sku: form.sku,
        storage: form.storage || null,
        color: form.color || null,
        price: Number(form.price),
        pix_price: form.pix_price ? Number(form.pix_price) : null,
        old_price: form.old_price ? Number(form.old_price) : null
      }).select('id').single();
      if (vErr) throw vErr;

      if (Number(form.quantity) > 0) {
        await supabase.from('inventory').update({ quantity: Number(form.quantity) }).eq('variant_id', variant.id);
      }

      router.push(`/admin/produtos/${product.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-semibold mb-6">Novo produto</h1>
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <input required placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          <input placeholder="Modelo" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="input" />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <select value={form.product_type} onChange={(e) => setForm({ ...form, product_type: e.target.value })} className="input">
            <option value="iphone">iPhone</option>
            <option value="accessory">Acessório</option>
          </select>
          <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="input">
            <option value="novo">Novo</option>
            <option value="seminovo">Seminovo</option>
          </select>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input">
            <option value="draft">Rascunho</option>
            <option value="active">Ativo (visível na loja)</option>
          </select>
        </div>
        <textarea placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input min-h-24" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
          Produto em destaque na home
        </label>

        <fieldset className="border border-brand-line rounded-lg p-4 space-y-4">
          <legend className="text-sm font-medium px-1">Primeira variante</legend>
          <div className="grid sm:grid-cols-3 gap-4">
            <input required placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input" />
            <input placeholder="Armazenamento (ex.: 128GB)" value={form.storage} onChange={(e) => setForm({ ...form, storage: e.target.value })} className="input" />
            <input placeholder="Cor" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="input" />
          </div>
          <div className="grid sm:grid-cols-4 gap-4">
            <input required type="number" step="0.01" placeholder="Preço" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input" />
            <input type="number" step="0.01" placeholder="Preço Pix" value={form.pix_price} onChange={(e) => setForm({ ...form, pix_price: e.target.value })} className="input" />
            <input type="number" step="0.01" placeholder="Preço antigo (oferta)" value={form.old_price} onChange={(e) => setForm({ ...form, old_price: e.target.value })} className="input" />
            <input type="number" placeholder="Estoque" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="input" />
          </div>
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="btn-cta disabled:opacity-60">{loading ? 'Salvando…' : 'Criar produto'}</button>
      </form>
      <p className="text-xs text-slate-500 mt-4">
        Depois de criar, adicione fotos e variantes extras (outras cores/capacidades) na tela de edição do produto.
      </p>
    </div>
  );
}
