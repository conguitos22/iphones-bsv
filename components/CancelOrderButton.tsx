'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function CancelOrderButton({ orderId }: { orderId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function cancel() {
    if (!confirm('Cancelar este pedido?')) return;
    setLoading(true);
    const { error } = await supabase.rpc('cancel_my_order', { p_order_id: orderId });
    setLoading(false);
    if (error) { alert(error.message); return; }
    router.refresh();
  }

  return (
    <button onClick={cancel} disabled={loading} className="text-sm text-red-600 hover:underline disabled:opacity-60">
      {loading ? 'Cancelando…' : 'Cancelar pedido'}
    </button>
  );
}
