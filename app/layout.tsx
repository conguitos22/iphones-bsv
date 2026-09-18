import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WhatsappButton from '@/components/WhatsappButton';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'iPhone Brasília Store — iPhones novos e seminovos',
  description: 'Loja de iPhones novos e seminovos em Brasília. Garantia real, Pix com desconto e parcelamento no cartão.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans">
        <Providers>
          <Header />
          <main className="min-h-[60vh]">{children}</main>
          <Footer />
          <WhatsappButton />
        </Providers>
      </body>
    </html>
  );
}
