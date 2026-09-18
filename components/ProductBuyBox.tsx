'use client';
import { useMemo, useState } from 'react';
import { ProductVariant } from '@/lib/types';
import { formatBRL, parcelaBRL } from '@/lib/format';
import { useCart } from '@/context/CartContext';

export default function ProductBuyBox({ variants }: { variants: ProductVariant[] }) {
  const { addItem } = useCart();
  const storages = Array.from(new Set(variants.map((v) => v.storage).filter(Boolean)));
  const colors = Array.from(new Set(variants.map((v) => v.color).filter(Boolean)));

  const [storage, setStorage] = useState(storages[0] ?? null);
  const [color, setColor] = useState(colors[0] ?? null);
  const [adding, setAdding] = useState(false);

  const selected = useMemo(
    () => variants.find((v) => (storage ? v.storage === storage : true) && (color ? v.color === color : true)) ?? variants[0],
    [variants, storage, color]
  );

  async function handleAdd() {
    if (!selected) return;
    setAdding(true);
    try { await addItem(selected.id, 1); } finally { setAdding(false); }
  }

  if (!selected) return <p className="text-slate-500">Produto sem variantes disponíveis.</p>;

  const pix = selected.pix_price ?? selected.price;
  const parcelamento = parcelaBRL(selected.price, selected.installments_max);

  return (
    <div className="border border-brand-line rounded-lg p-5 space-y-5">
      {storages.length > 1 && (
        <div>
          <p className="text-sm font-medium mb-2">Armazenamento</p>
          <div className="flex gap-2 flex-wrap">
            {storages.map((s) => (
              <button key={s} onClick={() => setStorage(s)} className={`px-3 py-1.5 rounded-md border text-sm ${storage === s ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-brand-line'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
      {colors.length > 1 && (
        <div>
          <p className="text-sm font-medium mb-2">Cor</p>
          <div className="flex gap-2 flex-wrap">
            {colors.map((c) => (
              <button key={c} onClick={() => setColor(c)} className={`px-3 py-1.5 rounded-md border text-sm ${color === c ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-brand-line'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        {selected.old_price && selected.old_price > selected.price && (
          <p className="text-sm text-slate-400 line-through">{formatBRL(selected.old_price)}</p>
        )}
        <p className="font-display text-3xl font-semibold text-brand-blue">{formatBRL(pix)}</p>
        <p className="text-sm text-slate-500">no Pix (SKU {selected.sku})</p>
        {parcelamento && <p className="text-sm text-slate-600 mt-1">ou {parcelamento} no cartão</p>}
      </div>

      <button
        onClick={handleAdd}
        disabled={adding}
        className="btn-cta w-full disabled:opacity-60"
      >
        {adding ? 'Adicionando…' : 'Adicionar ao carrinho'}
      </button>
    </div>
  );
}
