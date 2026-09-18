import { NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase/server';

// Configure esta URL como webhook no painel do Mercado Pago.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.data?.id) return NextResponse.json({ ok: true });

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: 'Provedor não configurado' }, { status: 500 });

  const paymentId = String(body.data.id);
  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const payment = await mpRes.json();
  if (!mpRes.ok) return NextResponse.json({ error: 'Falha ao consultar pagamento' }, { status: 400 });

  const statusMap: Record<string, string> = {
    approved: 'approved', pending: 'pending', in_process: 'pending',
    rejected: 'failed', cancelled: 'failed', refunded: 'refunded', charged_back: 'refunded'
  };
  const status = statusMap[payment.status] ?? 'pending';

  const service = createServiceSupabase();
  const { data: result, error } = await service.rpc('apply_payment_event', {
    p_provider: 'mercadopago',
    p_event_id: `${paymentId}-${payment.status}`,
    p_provider_payment_id: paymentId,
    p_status: status,
    p_payload: payment
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ result });
}
