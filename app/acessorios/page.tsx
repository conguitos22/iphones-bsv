import { getListing } from '@/lib/queries';
import ProductGrid from '@/components/ProductGrid';
import { ProductListing } from '@/lib/types';

export const revalidate = 30;

export default async function AcessoriosPage({ searchParams }: { searchParams: { categoria?: string; busca?: string } }) {
  const products = await getListing({ productType: 'accessory', categorySlug: searchParams.categoria, search: searchParams.busca });

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-2xl font-semibold mb-2">Acessórios</h1>
      <p className="text-slate-500 mb-6">Capinhas, películas, AirPods, Apple Watch, cabos e carregadores.</p>
      <ProductGrid products={products as ProductListing[]} />
    </div>
  );
}
