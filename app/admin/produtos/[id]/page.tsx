'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function EditarProdutoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [product, setProduct] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);

  async function load() {
    const { data } = await supabase.from('products')
      .select('*, product_variants(*, inventory(*)), product_images(*)')
      .eq('id', params.id).single();
    setProduct(data);
  }
  useEffect(() => { load(); }, [params.id]);

  async function saveProduct(fields: Partial<any>) {
    setSaving(true);
    await supabase.from('products').update(fields).eq('id', params.id);
    await load();
    setSaving(false);
  }

  async function saveVariant(variantId: string, fields: Partial<any>) {
    await supabase.from('product_variants').update(fields).eq('id', variantId);
    await load();
  }

  async function saveStock(variantId: string, quantity: number) {
    await supabase.from('inventory').update({ quantity }).eq('variant_id', variantId);
    await load();
  }

  async function addVariant() {
    const sku = prompt('SKU da nova variante:');
    if (!sku) return;
    await supabase.from('product_variants').insert({ product_id: params.id, sku, price: 0 });
    await load();
  }

  async function uploadImages() {
    if (!files) return;
    for (const file of Array.from(files)) {
      const path = `${params.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file);
      if (error) { alert(error.message); continue; }
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      await supabase.from('product_images').insert({ product_id: params.id, url: data.publicUrl, position: (product.product_images?.length ?? 0) });
    }
    setFiles(null);
    await load();
  }

  if (!product) return <p className="text-slate-500">Carregando…</p>;

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="font-display text-2xl font-semibold mb-6">{product.name}</h1>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm font-medium">
            Nome
            <input defaultValue={product.name} onBlur={(e) => saveProduct({ name: e.target.value })} className="input mt-1" />
          </label>
          <label className="text-sm font-medium">
            Status
            <select defaultValue={product.status} onChange={(e) => saveProduct({ status: e.target.value })} className="input mt-1">
              <option value="draft">Rascunho</option>
              <option value="active">Ativo</option>
              <option value="archived">Arquivado</option>
            </select>
          </label>
        </div>
        <label className="text-sm font-medium block mt-4">
          Descrição
          <textarea defaultValue={product.description ?? ''} onBlur={(e) => saveProduct({ description: e.target.value })} className="input mt-1 min-h-24" />
        </label>
        <label className="flex items-center gap-2 text-sm mt-4">
          <input type="checkbox" defaultChecked={product.featured} onChange={(e) => saveProduct({ featured: e.target.checked })} />
          Produto em destaque
        </label>
        {saving && <p className="text-xs text-slate-400 mt-2">Salvando…</p>}
      </div>

      <div>
        <h2 className="font-display font-semibold mb-3">Fotos</h2>
        <div className="flex flex-wrap gap-3 mb-3">
          {product.product_images?.map((img: any) => (
            <img key={img.id} src={img.url} className="h-20 w-20 object-cover rounded border border-brand-line" />
          ))}
        </div>
        <input type="file" multiple accept="image/*" onChange={(e) => setFiles(e.target.files)} className="text-sm" />
        {files && <button onClick={uploadImages} className="ml-3 text-sm text-brand-blue hover:underline">Enviar fotos</button>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold">Variantes e estoque</h2>
          <button onClick={addVariant} className="text-sm text-brand-blue hover:underline">+ Adicionar variante</button>
        </div>
        <div className="border border-brand-line rounded-lg divide-y divide-brand-line">
          {product.product_variants?.map((v: any) => (
            <div key={v.id} className="grid grid-cols-2 sm:grid-cols-6 gap-2 p-3 items-center text-sm">
              <span className="col-span-2 font-medium">{v.sku}</span>
              <input defaultValue={v.storage ?? ''} placeholder="Armaz." onBlur={(e) => saveVariant(v.id, { storage: e.target.value })} className="input" />
              <input defaultValue={v.color ?? ''} placeholder="Cor" onBlur={(e) => saveVariant(v.id, { color: e.target.value })} className="input" />
              <input type="number" step="0.01" defaultValue={v.price} placeholder="Preço" onBlur={(e) => saveVariant(v.id, { price: Number(e.target.value) })} className="input" />
              <input type="number" defaultValue={v.inventory?.quantity ?? 0} placeholder="Estoque" onBlur={(e) => saveStock(v.id, Number(e.target.value))} className="input" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
