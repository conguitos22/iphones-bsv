import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import ProductBuyBox from '@/components/ProductBuyBox';
import { ProductFull } from '@/lib/types';

export const revalidate = 30;

async function getProduct(slug: string) {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from('products')
    .select('*, product_variants(*), product_images(*)')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle();
  return data as ProductFull | null;
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product) return notFound();

  const images = (product.product_images ?? []).sort((a, b) => a.position - b.position);
  const activeVariants = (product.product_variants ?? []).filter((v) => v.active);
  const specs = product.specs ?? {};

  return (
    <div className="container-page py-10 grid md:grid-cols-2 gap-10">
      <div>
        <div className="aspect-square rounded-lg bg-brand-ice border border-brand-line overflow-hidden mb-3">
          {images[0] ? <img src={images[0].url} alt={images[0].alt ?? product.name} className="h-full w-full object-cover" /> : null}
        </div>
        {images.length > 1 && (
          <div className="grid grid-cols-5 gap-2">
            {images.slice(1, 6).map((img) => (
              <div key={img.id} className="aspect-square rounded-md bg-brand-ice border border-brand-line overflow-hidden">
                <img src={img.url} alt={img.alt ?? ''} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-slate-500">{product.model ?? product.brand}</p>
        <h1 className="font-display text-2xl md:text-3xl font-semibold mb-4">{product.name}</h1>

        <ProductBuyBox variants={activeVariants} />

        {product.description && (
          <div className="mt-8">
            <h2 className="font-display font-semibold mb-2">Descrição</h2>
            <p className="text-slate-600 whitespace-pre-line">{product.description}</p>
          </div>
        )}

        {Object.keys(specs).length > 0 && (
          <div className="mt-8">
            <h2 className="font-display font-semibold mb-2">Ficha técnica</h2>
            <dl className="text-sm divide-y divide-brand-line border-t border-b border-brand-line">
              {Object.entries(specs).map(([k, v]) => (
                <div key={k} className="flex justify-between py-2">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="font-medium text-right">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {product.condition === 'seminovo' && (
          <p className="mt-6 text-sm text-slate-500">
            Este é um aparelho seminovo vistoriado. Bateria, tela e câmeras conferidas — detalhes completos disponíveis com o vendedor pelo WhatsApp.
          </p>
        )}
      </div>
    </div>
  );
}
