'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCart } from '@/context/CartContext';
import CartDrawer from './CartDrawer';

const NAV = [
  { href: '/iphones', label: 'iPhones' },
  { href: '/acessorios', label: 'Acessórios' },
  { href: '/ofertas', label: 'Ofertas' },
  { href: '/troque-seu-iphone', label: 'Troque seu iPhone' },
  { href: '/comparar', label: 'Comparar' }
];

export default function Header() {
  const { count, setOpen } = useCart();
  const [q, setQ] = useState('');
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) window.location.href = `/iphones?busca=${encodeURIComponent(q.trim())}`;
  }

  return (
    <header className="sticky top-0 z-40 bg-brand-navy text-white">
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 flex items-center gap-6 h-16">
          <Link href="/" className="font-display font-bold text-lg tracking-tight shrink-0">
            iPhone <span className="text-brand-cta">Brasília</span> Store
          </Link>

          <form onSubmit={onSearch} className="hidden md:flex flex-1 max-w-xl">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar iPhone, capinha, AirPods…"
              className="w-full rounded-l-md px-3 py-2 text-sm text-brand-navy placeholder:text-slate-400 outline-none"
            />
            <button className="rounded-r-md bg-brand-cta px-4 text-sm font-medium hover:bg-brand-ctaDark transition-colors">
              Buscar
            </button>
          </form>

          <div className="flex items-center gap-4 ml-auto text-sm">
            <Link href="/minha-conta?tab=favoritos" className="hidden sm:inline hover:text-brand-cta">Favoritos</Link>
            <Link href={user ? '/minha-conta' : '/login'} className="hover:text-brand-cta">
              {user ? 'Minha conta' : 'Entrar'}
            </Link>
            <button onClick={() => setOpen(true)} className="relative hover:text-brand-cta">
              Carrinho
              {count > 0 && (
                <span className="absolute -top-2 -right-3 bg-brand-cta text-white text-[11px] rounded-full h-4 w-4 flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
      <nav className="mx-auto max-w-7xl px-4 flex gap-6 h-11 items-center text-sm overflow-x-auto">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="whitespace-nowrap text-white/80 hover:text-white transition-colors">
            {item.label}
          </Link>
        ))}
      </nav>
      <CartDrawer />
    </header>
  );
}
