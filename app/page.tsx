import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import ProductGrid from '@/components/ProductGrid';
import { ProductListing, Category } from '@/lib/types';

export const revalidate = 60;

export default async function HomePage() {
  const supabase = createServerSupabase();

  const [{ data: featured }, { data: offers }, { data: categories }] = await Promise.all([
    supabase.from('product_listing').select('*').eq('featured', true).limit(8),
    supabase.from('product_listing').select('*').not('old_price', 'is', null).limit(8),
    supabase.from('categories').select('*').eq('active', true).order('position').limit(8)
  ]);

  return (
    <div>
      {/* HERO */}
      <section className="bg-brand-navy text-white">
        <div className="container-page py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-brand-cta font-medium mb-3">Loja física e online em Brasília</p>
            <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight">
              iPhone novo ou seminovo, com garantia de verdade.
            </h1>
            <p className="mt-4 text-white/70 max-w-md">
              Cada seminovo é vistoriado peça por peça — bateria, tela, câmeras — e vendido com a ficha
              técnica completa. Pague no Pix com desconto ou parcele no cartão.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/iphones" className="btn-cta">Ver iPhones</Link>
              <Link href="/troque-seu-iphone" className="btn-outline !text-white !border-white hover:!bg-white hover:!text-brand-navy">
                Troque seu iPhone
              </Link>
            </div>
          </div>
          <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-white/40 text-sm">
            Espaço para foto da loja / iPhones em destaque
          </div>
        </div>
      </section>

      {/* CATEGORIAS */}
      {!!categories?.length && (
        <section className="container-page py-12">
          <h2 className="font-display text-2xl font-semibold mb-6">Categorias</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(categories as Category[]).map((c) => (
              <Link key={c.id} href={`/iphones?categoria=${c.slug}`} className="group rounded-lg border border-brand-line bg-brand-ice p-6 text-center hover:border-brand-blue transition-colors">
                <span className="font-medium group-hover:text-brand-blue">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* DESTAQUES */}
      <section className="container-page py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-semibold">iPhones em destaque</h2>
          <Link href="/iphones" className="text-brand-blue text-sm font-medium hover:underline">Ver todos</Link>
        </div>
        <ProductGrid products={(featured as ProductListing[]) ?? []} emptyLabel="Cadastre produtos com destaque = true no admin." />
      </section>

      {/* OFERTAS */}
      <section className="bg-brand-ice py-12">
        <div className="container-page">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-semibold">Ofertas</h2>
            <Link href="/ofertas" className="text-brand-blue text-sm font-medium hover:underline">Ver todas</Link>
          </div>
          <ProductGrid products={(offers as ProductListing[]) ?? []} emptyLabel="Nenhuma oferta ativa no momento." />
        </div>
      </section>

      {/* TROCA */}
      <section className="container-page py-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="font-display text-2xl font-semibold mb-3">Troque seu iPhone usado</h2>
          <p className="text-slate-600 mb-6">
            Avaliamos seu aparelho pelo WhatsApp ou pelo site e abatemos o valor na compra de um iPhone novo ou seminovo.
          </p>
          <Link href="/troque-seu-iphone" className="btn-cta">Avaliar meu iPhone</Link>
        </div>
        <div className="aspect-video rounded-xl bg-brand-ice border border-brand-line" />
      </section>

      {/* DIFERENCIAIS */}
      <section className="bg-brand-navy text-white py-16">
        <div className="container-page grid sm:grid-cols-3 gap-8 text-center">
          {[
            ['Garantia real', 'Todo aparelho sai com garantia da loja, documentada na nota.'],
            ['Vistoria completa', 'Seminovos passam por checagem de bateria, tela e câmeras antes de anunciar.'],
            ['Pix com desconto', 'Preço menor à vista, e parcelamento sem juros no cartão.']
          ].map(([title, desc]) => (
            <div key={title}>
              <h3 className="font-display font-semibold text-lg mb-2">{title}</h3>
              <p className="text-white/60 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
