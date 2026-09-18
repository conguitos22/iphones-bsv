import { getListing } from '@/lib/queries';
import ProductGrid from '@/components/ProductGrid';
import { ProductListing } from '@/lib/types';

export const revalidate = 30;

export default async function OfertasPage() {
  const products = await getListing({ onlyOffers: true });

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-2xl font-semibold mb-2">Ofertas</h1>
      <p className="text-slate-500 mb-6">Produtos com desconto ativo (preço antigo cadastrado no admin).</p>
      <ProductGrid products={products as ProductListing[]} emptyLabel="Nenhuma oferta ativa. Cadastre old_price nas variantes pelo admin." />
    </div>
  );
}
