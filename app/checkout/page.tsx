'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCart } from '@/context/CartContext';
import { formatBRL } from '@/lib/format';

type Address = {
  recipient: string; cep: string; street: string; number: string;
  complement: string; neighborhood: string; city: string; state: string;
};

export default function CheckoutPage() {
  const supabase = createClient();
  const router = useRouter();
  const { items, refresh } = useCart();

  const [deliveryMethod, setDeliveryMethod] = useState<'entrega' | 'retirada'>('entrega');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao_credito' | 'cartao_debito'>('pix');
  const [installments, setInstallments] = useState(1);
  const [customer, setCustomer] = useState({ name: '', phone: '', cpf: '' });
  const [address, setAddress] = useState<Address>({ recipient: '', cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' });
  const [coupon, setCoupon] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('profiles').select('full_name, phone, cpf').single().then(({ data }) => {
      if (data) setCustomer({ name: data.full_name ?? '', phone: data.phone ?? '', cpf: data.cpf ?? '' });
    });
  }, [supabase]);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc('create_order', {
        p_items: items.map((i) => ({ variant_id: i.variant_id, quantity: i.quantity })),
        p_delivery_method: deliveryMethod,
        p_payment_method: paymentMethod,
        p_installments: installments,
        p_coupon_code: coupon || null,
        p_customer: customer,
        p_address: deliveryMethod === 'entrega' ? address : null
      });
      if (error) throw error;

      // Cria a cobrança no provedor de pagamento (rota de servidor, usa service_role)
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: data.order_id, paymentMethod, total: data.total })
      });
      if (!res.ok) throw new Error('Não foi possível iniciar o pagamento. Seu pedido foi criado, tente novamente na página do pedido.');

      await refresh();
      router.push(`/pedido/${data.order_id}`);
    } catch (err: any) {
      setError(err.message ?? 'Erro ao finalizar pedido.');
      setLoading(false);
    }
  }

  if (!items.length) {
    return <div className="container-page py-16 text-center text-slate-500">Seu carrinho está vazio.</div>;
  }

  return (
    <div className="container-page py-10 grid md:grid-cols-[1fr_360px] gap-10">
      <form onSubmit={onSubmit} className="space-y-8">
        <section>
          <h2 className="font-display font-semibold text-lg mb-3">Seus dados</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <input required placeholder="Nome completo" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className="input" />
            <input required placeholder="Telefone/WhatsApp" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} className="input" />
            <input placeholder="CPF" value={customer.cpf} onChange={(e) => setCustomer({ ...customer, cpf: e.target.value })} className="input sm:col-span-2" />
          </div>
        </section>

        <section>
          <h2 className="font-display font-semibold text-lg mb-3">Entrega</h2>
          <div className="flex gap-3 mb-4">
            {(['entrega', 'retirada'] as const).map((m) => (
              <button type="button" key={m} onClick={() => setDeliveryMethod(m)}
                className={`px-4 py-2 rounded-md border text-sm ${deliveryMethod === m ? 'border-brand-blue text-brand-blue bg-brand-blue/5' : 'border-brand-line'}`}>
                {m === 'entrega' ? 'Entregar no endereço' : 'Retirar na loja'}
              </button>
            ))}
          </div>
          {deliveryMethod === 'entrega' && (
            <div className="grid sm:grid-cols-2 gap-4">
              <input required placeholder="Destinatário" value={address.recipient} onChange={(e) => setAddress({ ...address, recipient: e.target.value })} className="input sm:col-span-2" />
              <input required placeholder="CEP (só números)" value={address.cep} onChange={(e) => setAddress({ ...address, cep: e.target.value })} className="input" />
              <input required placeholder="Cidade" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} className="input" />
              <input required placeholder="Rua" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} className="input sm:col-span-2" />
              <input required placeholder="Número" value={address.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} className="input" />
              <input placeholder="Complemento" value={address.complement} onChange={(e) => setAddress({ ...address, complement: e.target.value })} className="input" />
              <input required placeholder="Bairro" value={address.neighborhood} onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })} className="input" />
              <input required placeholder="UF" maxLength={2} value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase() })} className="input" />
            </div>
          )}
        </section>

        <section>
          <h2 className="font-display font-semibold text-lg mb-3">Pagamento</h2>
          <div className="flex gap-3 mb-4 flex-wrap">
            {([['pix', 'Pix'], ['cartao_credito', 'Cartão de crédito'], ['cartao_debito', 'Cartão de débito']] as const).map(([v, label]) => (
              <button type="button" key={v} onClick={() => setPaymentMethod(v)}
                className={`px-4 py-2 rounded-md border text-sm ${paymentMethod === v ? 'border-brand-blue text-brand-blue bg-brand-blue/5' : 'border-brand-line'}`}>
                {label}
              </button>
            ))}
          </div>
          {paymentMethod === 'cartao_credito' && (
            <select value={installments} onChange={(e) => setInstallments(Number(e.target.value))} className="input max-w-xs">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}x</option>)}
            </select>
          )}
        </section>

        <input placeholder="Cupom de desconto (opcional)" value={coupon} onChange={(e) => setCoupon(e.target.value)} className="input max-w-xs" />

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="btn-cta w-full disabled:opacity-60">{loading ? 'Processando…' : 'Confirmar pedido'}</button>
      </form>

      <aside className="border border-brand-line rounded-lg p-5 h-fit space-y-3">
        <h3 className="font-display font-semibold mb-2">Resumo</h3>
        {items.map((i) => (
          <div key={i.id} className="flex justify-between text-sm">
            <span className="text-slate-600">{i.quantity}x {i.product_name}</span>
            <span>{formatBRL(i.price * i.quantity)}</span>
          </div>
        ))}
        <div className="border-t border-brand-line pt-3 flex justify-between font-semibold">
          <span>Subtotal</span>
          <span>{formatBRL(subtotal)}</span>
        </div>
        <p className="text-xs text-slate-500">Frete e desconto de cupom são calculados na confirmação do pedido.</p>
      </aside>
    </div>
  );
}
