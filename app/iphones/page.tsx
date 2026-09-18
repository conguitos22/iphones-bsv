import { getListing } from '@/lib/queries';
import ProductGrid from '@/components/ProductGrid';
import { ProductListing } from '@/lib/types';

export const revalidate = 30;

export default async function IphonesPage({ searchParams }: { searchParams: { categoria?: string; busca?: string; condicao?: string } }) {
  const products = await getListing({
    productType: 'iphone',
    categorySlug: searchParams.categoria,
    search: searchParams.busca,
    condition: searchParams.condicao === 'seminovo' ? 'seminovo' : searchParams.condicao === 'novo' ? 'novo' : undefined
  });

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-2xl font-semibold mb-2">iPhones</h1>
      <p className="text-slate-500 mb-6">Novos e seminovos, com garantia da loja.</p>

      <div className="flex gap-2 mb-6 text-sm">
        {[
          ['Todos', '/iphones'],
          ['Novos', '/iphones?condicao=novo'],
          ['Seminovos', '/iphones?condicao=seminovo']
        ].map(([label, href]) => (
          <a key={href} href={href} className="px-3 py-1.5 rounded-full border border-brand-line hover:border-brand-blue hover:text-brand-blue transition-colors">
            {label}
          </a>
        ))}
      </div>

      <ProductGrid products={products as ProductListing[]} />
    </div>
  );
}
