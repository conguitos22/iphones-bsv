import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-brand-navy text-white/80 mt-20">
      <div className="mx-auto max-w-7xl px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <h4 className="text-white font-display font-semibold mb-3">iPhone Brasília Store</h4>
          <p>Loja especializada em iPhones novos e seminovos, com garantia e suporte real.</p>
        </div>
        <div>
          <h4 className="text-white font-medium mb-3">Loja</h4>
          <ul className="space-y-2">
            <li><Link href="/iphones" className="hover:text-white">iPhones</Link></li>
            <li><Link href="/acessorios" className="hover:text-white">Acessórios</Link></li>
            <li><Link href="/ofertas" className="hover:text-white">Ofertas</Link></li>
            <li><Link href="/troque-seu-iphone" className="hover:text-white">Troque seu iPhone</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-medium mb-3">Conta</h4>
          <ul className="space-y-2">
            <li><Link href="/minha-conta" className="hover:text-white">Meus pedidos</Link></li>
            <li><Link href="/login" className="hover:text-white">Entrar</Link></li>
            <li><Link href="/cadastro" className="hover:text-white">Criar conta</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-medium mb-3">Atendimento</h4>
          <p>Segunda a sábado, 9h às 19h.</p>
          <p className="mt-2">Fale conosco pelo WhatsApp no botão flutuante.</p>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        © {new Date().getFullYear()} iPhone Brasília Store. CNPJ a definir. Todos os direitos reservados.
      </div>
    </footer>
  );
}
