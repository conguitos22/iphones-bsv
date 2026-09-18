'use client';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { formatBRL } from '@/lib/format';

export default function CartDrawer() {
  const { items, open, setOpen, removeItem, updateQuantity, loading } = useCart();
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />}
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white text-brand-navy z-50 shadow-2xl transition-transform duration-300 flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-brand-line">
          <h3 className="font-display font-semibold">Seu carrinho</h3>
          <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-brand-navy">Fechar</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && <p className="text-sm text-slate-500">Carregando…</p>}
          {!loading && items.length === 0 && <p className="text-sm text-slate-500">Seu carrinho está vazio.</p>}
          {items.map((item) => (
            <div key={item.id} className="flex gap-3">
              <div className="h-16 w-16 shrink-0 rounded-md bg-brand-ice border border-brand-line overflow-hidden">
                {item.image_url && <img src={item.image_url} alt={item.product_name} className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.product_name}</p>
                {item.variant_label && <p className="text-xs text-slate-500">{item.variant_label}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="h-6 w-6 border border-brand-line rounded text-xs">−</button>
                  <span className="text-xs w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="h-6 w-6 border border-brand-line rounded text-xs">+</button>
                  <button onClick={() => removeItem(item.id)} className="text-xs text-slate-400 hover:text-red-600 ml-2">remover</button>
                </div>
              </div>
              <p className="text-sm font-medium whitespace-nowrap">{formatBRL(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-brand-line p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Subtotal no Pix</span>
            <span className="font-semibold">{formatBRL(subtotal)}</span>
          </div>
          <Link
            href="/checkout"
            onClick={() => setOpen(false)}
            className={`block text-center rounded-md py-3 font-medium text-white transition-colors ${
              items.length ? 'bg-brand-cta hover:bg-brand-ctaDark' : 'bg-slate-300 pointer-events-none'
            }`}
          >
            Finalizar compra
          </Link>
        </div>
      </aside>
    </>
  );
}
