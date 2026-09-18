import { ProductListing } from '@/lib/types';
import ProductCard from './ProductCard';

export default function ProductGrid({ products, emptyLabel }: { products: ProductListing[]; emptyLabel?: string }) {
  if (!products.length) {
    return <p className="text-slate-500 py-12 text-center">{emptyLabel ?? 'Nenhum produto encontrado.'}</p>;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((p) => <ProductCard key={p.id} p={p} />)}
    </div>
  );
}
