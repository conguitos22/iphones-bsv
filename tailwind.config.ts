import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './context/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Identidade iPhone Brasília Store
        brand: {
          navy: '#0A1628',      // preto/azul-escuro (fundo, header, footer)
          blue: '#0B4FDB',      // azul principal (marca, links, bordas ativas)
          blueDark: '#083AA8',
          cta: '#1E6BFF',       // azul vibrante (CTAs, ofertas, botão comprar)
          ctaDark: '#0F52D6',
          ice: '#F5F8FF',       // branco levemente azulado (fundo de seções)
          line: '#E3E9F5'       // bordas sutis
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Sora"', '"Inter"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px rgba(10,22,40,0.06), 0 1px 8px rgba(10,22,40,0.05)'
      }
    }
  },
  plugins: []
};
export default config;
