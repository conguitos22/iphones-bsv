import Link from 'next/link';

const LINKS = [
  ['/admin', 'Dashboard'],
  ['/admin/produtos', 'Produtos'],
  ['/admin/pedidos', 'Pedidos'],
  ['/admin/trocas', 'Trocas']
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page py-10 grid md:grid-cols-[200px_1fr] gap-10">
      <aside className="space-y-1 text-sm">
        <p className="font-display font-semibold mb-4">Painel admin</p>
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} className="block py-1.5 text-slate-600 hover:text-brand-blue">{label}</Link>
        ))}
      </aside>
      <div>{children}</div>
    </div>
  );
}
