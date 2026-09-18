import Link from 'next/link';
import { ProductListing } from '@/lib/types';
import { formatBRL } from '@/lib/format';

export default function ProductCard({ p }: { p: ProductListing }) {
  const hasDiscount = p.old_price && p.old_price > p.min_price;
  return (
    <Link
      href={`/iphone/${p.slug}`}
      className="group block bg-white rounded-lg border border-brand-line hover:border-brand-blue hover:shadow-card transition-all overflow-hidden"
    >
      <div className="aspect-square bg-brand-ice relative overflow-hidden">
        {p.cover_url ? (
          <img src={p.cover_url} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-slate-300 text-sm">Sem imagem</div>
        )}
        {p.condition === 'seminovo' && (
          <span className="absolute top-2 left-2 bg-brand-navy text-white text-[11px] font-medium px-2 py-1 rounded">Seminovo</span>
        )}
        {hasDiscount && (
          <span className="absolute top-2 right-2 bg-brand-cta text-white text-[11px] font-medium px-2 py-1 rounded">Oferta</span>
        )}
        {!p.in_stock && (
          <span className="absolute inset-x-0 bottom-0 bg-brand-navy/90 text-white text-[11px] text-center py-1">Fora de estoque</span>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm text-slate-500">{p.model ?? p.name}</p>
        <h3 className="font-medium text-brand-navy leading-snug line-clamp-2">{p.name}</h3>
        <div className="mt-2">
          {hasDiscount && <p className="text-xs text-slate-400 line-through">{formatBRL(p.old_price)}</p>}
          <p className="text-brand-blue font-display font-semibold">{formatBRL(p.min_pix_price)} <span className="text-xs font-normal text-slate-500">no Pix</span></p>
          {p.installments_max > 1 && (
            <p className="text-xs text-slate-500">ou {formatBRL(p.min_price)} em até {p.installments_max}x</p>
          )}
        </div>
      </div>
    </Link>
  );
}
