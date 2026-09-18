import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';

// Cria a cobrança no provedor de pagamento e grava em public.payments via register_payment().
// Hoje integrado com Mercado Pago (Pix + Checkout Transparente). Troque este arquivo para usar
// outro provedor — o schema (register_payment/apply_payment_event) já é agnóstico de provedor.
export async function POST(req: Request) {
  const { orderId, paymentMethod, total } = await req.json();

  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).eq('user_id', user.id).maybeSingle();
  if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });

  const service = createServiceSupabase();
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;

  // Sem credenciais configuradas ainda: registra o pagamento como pendente para não travar o
  // checkout, mas SEM dados de cobrança reais. Configure MERCADOPAGO_ACCESS_TOKEN no .env para
  // ativar a cobrança de verdade (Pix ou cartão) antes de ir para produção.
  if (!token) {
    const { error } = await service.rpc('register_payment', {
      p_order_id: orderId,
      p_provider: 'manual',
      p_provider_payment_id: `MANUAL-${orderId}`,
      p_method: paymentMethod,
      p_amount: total
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ provider: 'manual', status: 'pending' });
  }

  if (paymentMethod === 'pix') {
    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Idempotency-Key': orderId
      },
      body: JSON.stringify({
        transaction_amount: total,
        description: `Pedido ${order.order_number} - iPhone Brasília Store`,
        payment_method_id: 'pix',
        payer: { email: order.customer_email ?? 'cliente@iphonebrasiliastore.com.br' }
      })
    });
    const mp = await mpRes.json();
    if (!mpRes.ok) return NextResponse.json({ error: mp.message ?? 'Falha ao criar cobrança Pix' }, { status: 400 });

    const { error } = await service.rpc('register_payment', {
      p_order_id: orderId,
      p_provider: 'mercadopago',
      p_provider_payment_id: String(mp.id),
      p_method: 'pix',
      p_amount: total,
      p_pix_qr_code: mp.point_of_interaction?.transaction_data?.qr_code ?? null,
      p_pix_qr_code_base64: mp.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
      p_pix_expires_at: mp.date_of_expiration ?? null
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ provider: 'mercadopago', status: 'pending' });
  }

  // Cartão: o token do cartão deve ser gerado NO NAVEGADOR pelo SDK do Mercado Pago
  // (nunca envie número de cartão para este endpoint). Aqui só criamos o registro base;
  // plugue o card_token recebido do front no corpo da cobrança abaixo.
  const { error } = await service.rpc('register_payment', {
    p_order_id: orderId,
    p_provider: 'mercadopago',
    p_provider_payment_id: `PENDING-${orderId}`,
    p_method: paymentMethod,
    p_amount: total
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ provider: 'mercadopago', status: 'pending', needsCardToken: true });
}
