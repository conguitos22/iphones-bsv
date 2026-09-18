import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatBRL, STATUS_LABEL } from '@/lib/format';
import CancelOrderButton from '@/components/CancelOrderButton';

export default async function PedidoPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: order } = await supabase.from('orders').select('*, order_items(*)').eq('id', params.id).maybeSingle();
  if (!order) return notFound();

  const { data: payment } = await supabase.from('payments').select('*').eq('order_id', order.id).order('created_at', { ascending: false }).limit(1).maybeSingle();

  return (
    <div className="container-page py-10 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Pedido {order.order_number}</h1>
          <p className="text-slate-500 text-sm">{new Date(order.created_at).toLocaleString('pt-BR')}</p>
        </div>
        <span className="px-3 py-1.5 rounded-full bg-brand-ice border border-brand-line text-sm font-medium">
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      {payment?.status === 'pending' && payment.pix_qr_code && (
        <div className="border border-brand-line rounded-lg p-5 mb-6">
          <h2 className="font-display font-semibold mb-2">Pagar com Pix</h2>
          {payment.pix_qr_code_base64 && (
            <img src={`data:image/png;base64,${payment.pix_qr_code_base64}`} alt="QR Code Pix" className="h-48 w-48" />
          )}
          <p className="text-xs text-slate-500 mt-2 break-all">{payment.pix_qr_code}</p>
        </div>
      )}

      <div className="border border-brand-line rounded-lg divide-y divide-brand-line mb-6">
        {order.order_items.map((item: any) => (
          <div key={item.id} className="flex justify-between p-4 text-sm">
            <div>
              <p className="font-medium">{item.product_name}</p>
              {item.variant_label && <p className="text-slate-500">{item.variant_label}</p>}
              <p className="text-slate-500">Qtd: {item.quantity}</p>
            </div>
            <p className="font-medium">{formatBRL(item.total)}</p>
          </div>
        ))}
      </div>

      <div className="border border-brand-line rounded-lg p-5 space-y-1 text-sm mb-6">
        <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatBRL(order.subtotal)}</span></div>
        {order.discount > 0 && <div className="flex justify-between"><span className="text-slate-500">Desconto</span><span>-{formatBRL(order.discount)}</span></div>}
        <div className="flex justify-between"><span className="text-slate-500">Frete</span><span>{order.shipping > 0 ? formatBRL(order.shipping) : 'Grátis'}</span></div>
        <div className="flex justify-between font-semibold text-base pt-2 border-t border-brand-line mt-2"><span>Total</span><span>{formatBRL(order.total)}</span></div>
      </div>

      {order.delivery_method === 'entrega' && order.shipping_address && (
        <div className="border border-brand-line rounded-lg p-5 mb-6 text-sm">
          <h2 className="font-display font-semibold mb-2">Endereço de entrega</h2>
          <p>{order.shipping_address.street}, {order.shipping_address.number} {order.shipping_address.complement}</p>
          <p>{order.shipping_address.neighborhood} — {order.shipping_address.city}/{order.shipping_address.state}</p>
        </div>
      )}

      {order.status === 'pendente' && <CancelOrderButton orderId={order.id} />}
    </div>
  );
}
