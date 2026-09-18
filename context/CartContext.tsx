'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

type CartItem = {
  id: string; // cart_items.id
  variant_id: string;
  quantity: number;
  // dados denormalizados só para exibir no drawer, buscados junto
  product_name: string;
  variant_label: string | null;
  price: number;
  image_url: string | null;
  slug: string;
};

type CartContextType = {
  items: CartItem[];
  count: number;
  loading: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setItems([]); setLoading(false); return; }

    const { data: cart } = await supabase.from('carts').select('id').eq('user_id', user.id).maybeSingle();
    if (!cart) { setItems([]); setLoading(false); return; }

    const { data } = await supabase
      .from('cart_items')
      .select('id, variant_id, quantity, product_variants(price, pix_price, storage, color, product_id, products(name, slug, product_images(url, position)))')
      .eq('cart_id', cart.id);

    const mapped: CartItem[] = (data ?? []).map((row: any) => {
      const v = row.product_variants;
      const p = v?.products;
      const imgs = (p?.product_images ?? []).sort((a: any, b: any) => a.position - b.position);
      return {
        id: row.id,
        variant_id: row.variant_id,
        quantity: row.quantity,
        product_name: p?.name ?? 'Produto',
        variant_label: [v?.storage, v?.color].filter(Boolean).join(' · ') || null,
        price: v?.pix_price ?? v?.price ?? 0,
        image_url: imgs[0]?.url ?? null,
        slug: p?.slug ?? ''
      };
    });
    setItems(mapped);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { refresh(); }, [refresh]);

  const ensureCart = useCallback(async (userId: string) => {
    const { data: existing } = await supabase.from('carts').select('id').eq('user_id', userId).maybeSingle();
    if (existing) return existing.id;
    const { data: created, error } = await supabase.from('carts').insert({ user_id: userId }).select('id').single();
    if (error) throw error;
    return created.id;
  }, [supabase]);

  const addItem = useCallback(async (variantId: string, quantity = 1) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }
    const cartId = await ensureCart(user.id);
    const { data: existing } = await supabase.from('cart_items').select('id, quantity')
      .eq('cart_id', cartId).eq('variant_id', variantId).maybeSingle();
    if (existing) {
      await supabase.from('cart_items').update({ quantity: Math.min(existing.quantity + quantity, 10) }).eq('id', existing.id);
    } else {
      await supabase.from('cart_items').insert({ cart_id: cartId, variant_id: variantId, quantity });
    }
    await refresh();
    setOpen(true);
  }, [supabase, ensureCart, refresh]);

  const removeItem = useCallback(async (cartItemId: string) => {
    await supabase.from('cart_items').delete().eq('id', cartItemId);
    await refresh();
  }, [supabase, refresh]);

  const updateQuantity = useCallback(async (cartItemId: string, quantity: number) => {
    if (quantity < 1) return removeItem(cartItemId);
    await supabase.from('cart_items').update({ quantity }).eq('id', cartItemId);
    await refresh();
  }, [supabase, refresh, removeItem]);

  const count = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, count, loading, open, setOpen, addItem, removeItem, updateQuantity, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart deve ser usado dentro de CartProvider');
  return ctx;
}
