'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function WhatsappButton() {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('store_settings').select('key, value').in('key', ['whatsapp_number', 'whatsapp_message']).then(({ data }) => {
      const number = data?.find((d) => d.key === 'whatsapp_number')?.value;
      const message = data?.find((d) => d.key === 'whatsapp_message')?.value;
      if (number) {
        const text = encodeURIComponent(typeof message === 'string' ? message : 'Olá! Vim pelo site.');
        setHref(`https://wa.me/${number}?text=${text}`);
      }
    });
  }, []);

  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-50 bg-[#25D366] text-white rounded-full h-14 w-14 flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      aria-label="Falar no WhatsApp"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.42-1.35a9.9 9.9 0 0 0 4.62 1.14h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.03c-.24.68-1.4 1.3-1.93 1.36-.5.06-1.02.28-3.42-.74-2.9-1.24-4.77-4.25-4.92-4.45-.14-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.27-.29.58-.36.78-.36l.55.01c.18.01.42-.07.65.5.24.58.82 2 .89 2.15.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.31.39-.44.52-.15.15-.3.31-.13.6.17.29.75 1.24 1.62 2.01 1.11 1 2.05 1.3 2.34 1.45.29.15.46.13.63-.07.17-.2.72-.84.91-1.13.19-.29.38-.24.63-.14.26.1 1.65.78 1.94.92.29.14.48.21.55.33.07.12.07.68-.17 1.35z"/>
      </svg>
    </a>
  );
}
