# iPhone Brasília Store — e-commerce completo

Next.js 14 (App Router) + Supabase (Postgres, Auth, Storage). Frontend, backend
(route handlers) e banco de dados já ligados ao schema SQL que você forneceu
(001_schema + 002_payments).

## 1. Banco de dados

1. Crie um projeto em https://supabase.com
2. No SQL Editor, rode **001_schema_iphone_brasilia.sql** e depois **002_payments_provider_agnostic.sql** (os mesmos arquivos que você já tinha).
3. Cadastre-se no site (passo 4) e depois rode, com seu e-mail:
   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'seu@email.com';
   ```

## 2. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — em Project Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` — mesma tela (chave secreta, nunca exposta ao navegador)
- `MERCADOPAGO_ACCESS_TOKEN` — opcional no começo. Sem ela, o checkout cria o pedido
  normalmente mas registra o pagamento como pendente manual (você confirma o pagamento
  fora do site). Com ela, o Pix é gerado de verdade pela API do Mercado Pago.

## 3. Rodando localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

## 4. Deploy

Publique no Vercel (ou similar) e configure as mesmas variáveis de ambiente lá.
Configure o webhook do Mercado Pago para `https://SEU-DOMINIO/api/webhooks/mercadopago`.

## O que já está pronto

- Home, /iphones, /iphone/[slug], /ofertas, /acessorios, /troque-seu-iphone,
  /comparar, /login, /cadastro, /recuperar-senha, /minha-conta, /pedido/[id], /admin
- Autenticação real via Supabase Auth (cadastro, login, recuperação de senha, sessão via cookies)
- Carrinho persistido no banco (tabela carts/cart_items), por usuário logado
- Checkout chamando a função `create_order` (preço, frete, estoque e cupom validados no banco)
- Painel admin: dashboard (`admin_dashboard()`), CRUD de produtos/variantes/estoque/fotos,
  fluxo de status de pedidos (`set_order_status`), gestão de solicitações de troca
- Upload de fotos de produto e de trade-in para os buckets do Storage já criados no schema

## O que falta antes de ir 100% ao ar

- **Pagamento com cartão**: o schema já suporta (tabela `payments`, `register_payment`),
  mas a tokenização do cartão precisa do SDK JS do Mercado Pago (Card Form) no checkout —
  hoje o Pix já sai funcional assim que você configurar `MERCADOPAGO_ACCESS_TOKEN`.
- **Frete real**: hoje é frete fixo (`store_settings.flat_shipping`), configurável no admin
  via SQL/Supabase Studio. Uma tela de configurações no `/admin` para editar isso é o próximo passo natural.
- Tela de configurações da loja (WhatsApp, frete) direto no `/admin` — hoje edita-se via Supabase Studio.
- Moderação de avaliações (`reviews.approved`) — tabela e policy já existem, falta a tela admin.
