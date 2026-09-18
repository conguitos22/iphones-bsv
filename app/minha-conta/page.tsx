import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatBRL } from '@/lib/format';
import { STATUS_LABEL } from '@/lib/format';
import LogoutButton from '@/components/LogoutButton';

export default async function MinhaContaPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null; // middleware já redireciona

  const [{ data: profile }, { data: orders }, { data: favorites }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('orders').select('id, order_number, status, total, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('favorites').select('products(id, slug, name)').eq('user_id', user.id)
  ]);

  return (
    <div className="container-page py-10 grid md:grid-cols-[240px_1fr] gap-10">
      <aside className="space-y-1 text-sm">
        <p className="font-display font-semibold text-lg mb-4">{profile?.full_name || 'Minha conta'}</p>
        <p className="text-slate-500 mb-6">{user.email}</p>
        <LogoutButton />
      </aside>

      <div className="space-y-12">
        <section>
          <h2 className="font-display text-xl font-semibold mb-4">Meus pedidos</h2>
          {!orders?.length && <p className="text-slate-500 text-sm">Você ainda não fez nenhum pedido.</p>}
          <div className="space-y-3">
            {orders?.map((o) => (
              <Link key={o.id} href={`/pedido/${o.id}`} className="flex items-center justify-between border border-brand-line rounded-lg p-4 hover:border-brand-blue transition-colors">
                <div>
                  <p className="font-medium">{o.order_number}</p>
                  <p className="text-xs text-slate-500">{new Date(o.created_at).toLocaleDateString('pt-BR')} · {STATUS_LABEL[o.status] ?? o.status}</p>
                </div>
                <p className="font-medium">{formatBRL(o.total)}</p>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-4">Favoritos</h2>
          {!favorites?.length && <p className="text-slate-500 text-sm">Nenhum produto favoritado ainda.</p>}
          <div className="flex flex-wrap gap-3">
            {favorites?.map((f: any) => (
              <Link key={f.products.id} href={`/iphone/${f.products.slug}`} className="px-3 py-1.5 rounded-full border border-brand-line hover:border-brand-blue text-sm">
                {f.products.name}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
