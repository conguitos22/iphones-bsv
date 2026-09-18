-- =====================================================================
-- iPhone Brasília Store — Etapa 2a: pagamentos independentes de provedor
-- Rode DEPOIS do 001. Nada aqui é específico do Mercado Pago: o adaptador
-- (código do servidor) traduz cada provedor para 4 status padrão:
--   pending | approved | failed | refunded
--
-- Regras de segurança:
--  * Nenhum dado de cartão entra no banco (o cartão é tokenizado no navegador
--    pelo SDK do provedor; só guardamos ids e status).
--  * O valor cobrado é validado contra orders.total (nunca vem do cliente).
--  * Webhooks são idempotentes (payment_events com chave única).
--  * As funções abaixo só executam com service_role (backend/webhook).
-- =====================================================================

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,                       -- 'mercadopago', 'pagarme', 'stripe'...
  provider_payment_id text,
  method text not null check (method in ('pix','cartao_credito','cartao_debito')),
  status text not null default 'pending'
    check (status in ('pending','approved','failed','refunded')),
  amount numeric(12,2) not null check (amount >= 0),
  pix_qr_code text,                             -- "copia e cola"
  pix_qr_code_base64 text,
  pix_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);
create index payments_order_idx on public.payments(order_id);
create trigger trg_payments_updated before update on public.payments
  for each row execute function public.set_updated_at();
alter table public.payments enable row level security;
create policy payments_read on public.payments
  for select to authenticated using (
    public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
-- sem policies de escrita: só as funções abaixo (service_role).

create table public.payment_events (
  provider text not null,
  event_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (provider, event_id)
);
alter table public.payment_events enable row level security;
create policy payment_events_admin on public.payment_events
  for select to authenticated using (public.is_admin());

-- Registra a cobrança criada no provedor (chamada pelo backend logo após criar o Pix/cartão)
create or replace function public.register_payment(
  p_order_id uuid,
  p_provider text,
  p_provider_payment_id text,
  p_method text,
  p_amount numeric,
  p_pix_qr_code text default null,
  p_pix_qr_code_base64 text default null,
  p_pix_expires_at timestamptz default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype; v_id uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'Acesso negado' using errcode = '42501'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido não encontrado'; end if;
  if o.status <> 'pendente' then raise exception 'Pedido não está pendente'; end if;
  if o.payment_method <> p_method then raise exception 'Método difere do pedido'; end if;
  if p_amount <> o.total then raise exception 'Valor da cobrança difere do total do pedido'; end if;

  insert into public.payments (order_id, provider, provider_payment_id, method, amount,
                               pix_qr_code, pix_qr_code_base64, pix_expires_at)
  values (p_order_id, p_provider, p_provider_payment_id, p_method, p_amount,
          p_pix_qr_code, p_pix_qr_code_base64, p_pix_expires_at)
  returning id into v_id;

  update public.orders set payment_provider = p_provider, payment_reference = p_provider_payment_id
   where id = p_order_id;
  return v_id;
end $$;

-- Aplica o resultado de um webhook (idempotente). Retorna:
--  'applied' | 'duplicate' | 'ignored' | 'needs_review' (pago mas pedido já cancelado: estornar manualmente)
create or replace function public.apply_payment_event(
  p_provider text,
  p_event_id text,
  p_provider_payment_id text,
  p_status text,                       -- pending | approved | failed | refunded
  p_payload jsonb default '{}'::jsonb
) returns text
language plpgsql security definer set search_path = public as $$
declare pay public.payments%rowtype; o public.orders%rowtype; v_rows int;
begin
  if auth.role() <> 'service_role' then raise exception 'Acesso negado' using errcode = '42501'; end if;
  if p_status not in ('pending','approved','failed','refunded') then raise exception 'Status inválido'; end if;

  insert into public.payment_events (provider, event_id, payload)
  values (p_provider, p_event_id, coalesce(p_payload, '{}'::jsonb))
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return 'duplicate'; end if;

  select * into pay from public.payments
   where provider = p_provider and provider_payment_id = p_provider_payment_id for update;
  if not found then return 'ignored'; end if;

  update public.payments set status = p_status where id = pay.id;
  select * into o from public.orders where id = pay.order_id for update;

  if p_status = 'approved' then
    if o.status = 'pendente' then
      perform public._apply_order_status(o.id, 'aprovado');
    elsif o.status = 'cancelado' then
      return 'needs_review';
    end if;
  elsif p_status = 'failed' then
    update public.orders set payment_status = 'falhou'
     where id = o.id and status = 'pendente' and payment_status <> 'pago';
  elsif p_status = 'refunded' then
    update public.orders set payment_status = 'estornado' where id = o.id;
  end if;
  return 'applied';
end $$;

revoke all on function public.register_payment(uuid,text,text,text,numeric,text,text,timestamptz) from public, anon, authenticated;
revoke all on function public.apply_payment_event(text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.register_payment(uuid,text,text,text,numeric,text,text,timestamptz) to service_role;
grant execute on function public.apply_payment_event(text,text,text,text,jsonb) to service_role;
