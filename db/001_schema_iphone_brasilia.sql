-- =====================================================================
-- iPhone Brasília Store — Etapa 1: banco de dados (Supabase / PostgreSQL)
-- Cole no SQL Editor do Supabase (ou use como migration).
--
-- Princípios:
--  * Todo item comprável é uma VARIANTE (modelo + capacidade + cor). Acessórios sem
--    variação têm 1 variante padrão.
--  * Preço, desconto, frete e estoque são calculados NO BANCO (nunca confiar no cliente).
--  * Pedidos só são criados pela função create_order() (não existe INSERT direto).
--  * Estoque: create_order RESERVA; ao aprovar o pedido o estoque é BAIXADO;
--    ao cancelar, a reserva/estoque volta. Linhas travadas com FOR UPDATE.
--  * IMEI / nº de série ficam em tabela separada, acessível SÓ por admin.
--  * Nada fictício: configurações da loja (WhatsApp, frete etc.) nascem vazias
--    e são preenchidas pelo admin.
--
-- Para criar o primeiro admin (rode manualmente, depois de se cadastrar no site):
--   insert into public.admin_users (user_id)
--   select id from auth.users where email = 'SEU_EMAIL_AQUI';
-- =====================================================================

-- ---------- utilidades ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- admin ----------
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

create policy admin_users_select_own on public.admin_users
  for select to authenticated using (user_id = auth.uid());
-- sem policies de escrita: admins só são criados via SQL Editor / service role.

-- ---------- perfis ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  cpf text,
  birth_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(new.raw_user_meta_data->>'full_name'), ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create policy profiles_select on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- ---------- configurações da loja ----------
create table public.store_settings (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger trg_settings_updated before update on public.store_settings
  for each row execute function public.set_updated_at();
alter table public.store_settings enable row level security;

create policy settings_public_read on public.store_settings
  for select using (is_public or public.is_admin());
create policy settings_admin_write on public.store_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Chaves nascem vazias: o admin preenche. Nada inventado.
insert into public.store_settings (key, value, is_public) values
  ('store_name',        to_jsonb('iPhone Brasília Store'::text), true),
  ('whatsapp_number',   'null'::jsonb, true),   -- somente dígitos com DDI, ex.: 55DDDNUMERO
  ('whatsapp_message',  'null'::jsonb, true),
  ('store_address',     'null'::jsonb, true),
  ('flat_shipping',     'null'::jsonb, false),  -- valor fixo de entrega; vazio = entrega desativada
  ('free_shipping_min', 'null'::jsonb, false),  -- subtotal (após desconto) que zera o frete
  ('pickup_enabled',    'true'::jsonb, true)
on conflict (key) do nothing;

create or replace function public.setting_numeric(p_key text)
returns numeric language sql stable security definer set search_path = public as $$
  select nullif(value #>> '{}', '')::numeric from public.store_settings where key = p_key;
$$;

-- ---------- catálogo ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  parent_id uuid references public.categories(id) on delete set null,
  image_url text,
  position int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;
create policy categories_read on public.categories
  for select using (active or public.is_admin());
create policy categories_admin on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  model text,
  brand text not null default 'Apple',
  category_id uuid references public.categories(id) on delete set null,
  product_type text not null check (product_type in ('iphone','accessory')),
  condition text not null default 'novo' check (condition in ('novo','seminovo')),
  description text,
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  -- ficha técnica para o comparador (tela, processador, câmeras, bateria, peso, recursos...).
  -- Só preencher o que for real/confirmado.
  specs jsonb not null default '{}'::jsonb,
  meta_title text,
  meta_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products(category_id);
create index products_status_idx on public.products(status, featured);
create index products_search_idx on public.products using gin
  (to_tsvector('portuguese', coalesce(name,'') || ' ' || coalesce(model,'')));
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();
alter table public.products enable row level security;
create policy products_read on public.products
  for select using (status = 'active' or public.is_admin());
create policy products_admin on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  storage text,          -- ex.: 128GB
  color text,
  price numeric(12,2) not null check (price >= 0),
  pix_price numeric(12,2) check (pix_price is null or (pix_price >= 0 and pix_price <= price)),
  old_price numeric(12,2) check (old_price is null or old_price >= 0),
  installments_max int not null default 1 check (installments_max between 1 and 24),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index variants_product_idx on public.product_variants(product_id);
create trigger trg_variants_updated before update on public.product_variants
  for each row execute function public.set_updated_at();
alter table public.product_variants enable row level security;
create policy variants_read on public.product_variants
  for select using (
    (active and exists (select 1 from public.products p where p.id = product_id and p.status = 'active'))
    or public.is_admin());
create policy variants_admin on public.product_variants
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- estoque (1 linha por variante)
create table public.inventory (
  variant_id uuid primary key references public.product_variants(id) on delete cascade,
  quantity int not null default 0 check (quantity >= 0),          -- físico disponível
  reserved int not null default 0 check (reserved >= 0),          -- em pedidos pendentes
  low_stock_threshold int not null default 2 check (low_stock_threshold >= 0),
  updated_at timestamptz not null default now(),
  constraint inventory_reserved_lte_quantity check (reserved <= quantity)
);
create trigger trg_inventory_updated before update on public.inventory
  for each row execute function public.set_updated_at();
alter table public.inventory enable row level security;
create policy inventory_admin on public.inventory
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- clientes NÃO leem a tabela; veem só disponibilidade via view abaixo.

create or replace function public.create_inventory_row()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.inventory (variant_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger trg_variant_inventory after insert on public.product_variants
  for each row execute function public.create_inventory_row();

-- detalhes de seminovo (por variante/unidade). NULL = não informado (nada é inventado).
create table public.iphone_details (
  variant_id uuid primary key references public.product_variants(id) on delete cascade,
  battery_health smallint check (battery_health between 0 and 100),
  screen_condition text,
  body_condition text,
  face_id text check (face_id in ('funcionando','com_defeito')),
  true_tone text check (true_tone in ('funcionando','com_defeito')),
  cameras text,
  microphone text check (microphone in ('funcionando','com_defeito')),
  speakers text check (speakers in ('funcionando','com_defeito')),
  connector text check (connector in ('funcionando','com_defeito')),
  replaced_parts text,
  warranty_months smallint check (warranty_months >= 0),
  notes text,
  updated_at timestamptz not null default now()
);
create trigger trg_details_updated before update on public.iphone_details
  for each row execute function public.set_updated_at();
alter table public.iphone_details enable row level security;
create policy details_read on public.iphone_details
  for select using (
    exists (select 1 from public.product_variants v join public.products p on p.id = v.product_id
            where v.id = variant_id and v.active and p.status = 'active')
    or public.is_admin());
create policy details_admin on public.iphone_details
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- IMEI / série: PRIVADO, somente admin (nenhuma policy pública)
create table public.device_identifiers (
  variant_id uuid primary key references public.product_variants(id) on delete cascade,
  imei text unique,
  serial_number text unique,
  updated_at timestamptz not null default now()
);
create trigger trg_devid_updated before update on public.device_identifiers
  for each row execute function public.set_updated_at();
alter table public.device_identifiers enable row level security;
create policy device_identifiers_admin on public.device_identifiers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  url text not null,
  alt text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_idx on public.product_images(product_id, position);
alter table public.product_images enable row level security;
create policy images_read on public.product_images
  for select using (
    exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
    or public.is_admin());
create policy images_admin on public.product_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- disponibilidade pública (sem expor quantidades exatas de reservas)
create view public.variant_availability as
select v.id as variant_id,
       greatest(i.quantity - i.reserved, 0) as available,
       (i.quantity - i.reserved) > 0 as in_stock
from public.product_variants v
join public.products p on p.id = v.product_id and p.status = 'active'
join public.inventory i on i.variant_id = v.id
where v.active;
grant select on public.variant_availability to anon, authenticated;

-- listagem para catálogo/home (preço "a partir de", capa, disponibilidade)
create view public.product_listing as
select p.id, p.slug, p.name, p.model, p.product_type, p.condition, p.featured, p.category_id,
       min(v.price) as min_price,
       min(coalesce(v.pix_price, v.price)) as min_pix_price,
       max(v.old_price) as old_price,
       max(v.installments_max) as installments_max,
       coalesce(bool_or(greatest(i.quantity - i.reserved, 0) > 0), false) as in_stock,
       (select url from public.product_images im where im.product_id = p.id
         order by im.position, im.created_at limit 1) as cover_url
from public.products p
join public.product_variants v on v.product_id = p.id and v.active
left join public.inventory i on i.variant_id = v.id
where p.status = 'active'
group by p.id;
grant select on public.product_listing to anon, authenticated;

-- ---------- carrinho, favoritos, endereços ----------
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  coupon_code text,
  updated_at timestamptz not null default now()
);
create trigger trg_carts_updated before update on public.carts
  for each row execute function public.set_updated_at();
alter table public.carts enable row level security;
create policy carts_own on public.carts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity int not null check (quantity between 1 and 10),
  unique (cart_id, variant_id)
);
alter table public.cart_items enable row level security;
create policy cart_items_own on public.cart_items
  for all to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
alter table public.favorites enable row level security;
create policy favorites_own on public.favorites
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  recipient text not null,
  cep text not null check (cep ~ '^[0-9]{8}$'),
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state char(2) not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses(user_id);
alter table public.addresses enable row level security;
create policy addresses_own on public.addresses
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- cupons ----------
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  description text,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  min_subtotal numeric(12,2) not null default 0,
  max_uses int check (max_uses is null or max_uses > 0),
  uses_count int not null default 0,
  starts_at timestamptz,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (discount_type <> 'percent' or discount_value <= 100)
);
alter table public.coupons enable row level security;
create policy coupons_admin on public.coupons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- clientes não listam cupons; validação acontece em validate_coupon()/create_order().

create or replace function public._coupon_discount(p_code text, p_subtotal numeric, p_lock boolean default false)
returns table (coupon_id uuid, discount numeric)
language plpgsql security definer set search_path = public as $$
declare c public.coupons%rowtype;
begin
  if p_lock then
    select * into c from public.coupons where code = upper(trim(p_code)) for update;
  else
    select * into c from public.coupons where code = upper(trim(p_code));
  end if;
  if not found or not c.active
     or (c.starts_at is not null and c.starts_at > now())
     or (c.expires_at is not null and c.expires_at < now())
     or (c.max_uses is not null and c.uses_count >= c.max_uses) then
    raise exception 'Cupom inválido ou expirado' using errcode = 'P0001';
  end if;
  if p_subtotal < c.min_subtotal then
    raise exception 'Pedido mínimo para este cupom: R$ %', to_char(c.min_subtotal, 'FM999G999D00') using errcode = 'P0001';
  end if;
  coupon_id := c.id;
  discount := case c.discount_type
                when 'percent' then round(p_subtotal * c.discount_value / 100, 2)
                else least(c.discount_value, p_subtotal) end;
  return next;
end $$;

create or replace function public.validate_coupon(p_code text, p_subtotal numeric)
returns numeric language plpgsql security definer set search_path = public as $$
declare d numeric;
begin
  if auth.uid() is null then raise exception 'Faça login' using errcode = '28000'; end if;
  select discount into d from public._coupon_discount(p_code, p_subtotal, false);
  return d;
end $$;

-- ---------- avaliações ----------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text,
  rating smallint not null check (rating between 1 and 5),
  title text,
  comment text,
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create index reviews_product_idx on public.reviews(product_id) where approved;
alter table public.reviews enable row level security;
create policy reviews_read on public.reviews
  for select using (approved or user_id = auth.uid() or public.is_admin());
-- (policy de INSERT criada mais abaixo, depois de orders/order_items existirem)
create policy reviews_admin on public.reviews
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- pedidos ----------
create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('IBS-' || nextval('public.order_number_seq')),
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pendente'
    check (status in ('pendente','aprovado','preparando','enviado','entregue','cancelado')),
  payment_method text not null check (payment_method in ('pix','cartao_credito','cartao_debito')),
  payment_status text not null default 'pendente'
    check (payment_status in ('pendente','pago','falhou','estornado')),
  installments int not null default 1 check (installments between 1 and 24),
  payment_provider text,       -- preenchido pela integração (nunca dados de cartão)
  payment_reference text,      -- id da cobrança no provedor
  delivery_method text not null check (delivery_method in ('entrega','retirada')),
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  shipping numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  coupon_id uuid references public.coupons(id) on delete set null,
  coupon_code text,
  customer_name text not null,
  customer_email text,
  customer_phone text not null,
  customer_cpf text,
  shipping_address jsonb,
  tracking_code text,
  stock_committed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz
);
create index orders_user_idx on public.orders(user_id, created_at desc);
create index orders_status_idx on public.orders(status, created_at desc);
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();
alter table public.orders enable row level security;
create policy orders_read on public.orders
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
-- SEM policies de insert/update/delete: tudo passa pelas funções abaixo.

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  variant_label text,
  sku text not null,
  unit_price numeric(12,2) not null,
  quantity int not null check (quantity > 0),
  total numeric(12,2) not null
);
create index order_items_order_idx on public.order_items(order_id);
alter table public.order_items enable row level security;
create policy order_items_read on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders o
            where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

-- avaliação: só quem RECEBEU o produto (pedido entregue) pode avaliar; entra pendente de moderação
create or replace function public.has_purchased(p_product_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.orders o join public.order_items oi on oi.order_id = o.id
    where o.user_id = auth.uid() and o.status = 'entregue' and oi.product_id = p_product_id);
$$;
revoke all on function public.has_purchased(uuid) from public, anon;
grant execute on function public.has_purchased(uuid) to authenticated;

create policy reviews_insert on public.reviews
  for insert to authenticated with check (
    user_id = auth.uid() and approved = false and public.has_purchased(product_id));

-- ---------- trocas ----------
create table public.trade_in_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  model text not null,
  storage text,
  color text,
  battery_health smallint check (battery_health between 0 and 100),
  screen_condition text,
  body_condition text,
  face_id text check (face_id in ('funcionando','com_defeito')),
  cameras text,
  notes text,
  photos text[] not null default '{}',   -- caminhos no bucket privado trade-in-photos
  status text not null default 'nova'
    check (status in ('nova','em_analise','proposta_enviada','aceita','recusada','concluida')),
  offered_value numeric(12,2),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_tradein_updated before update on public.trade_in_requests
  for each row execute function public.set_updated_at();
alter table public.trade_in_requests enable row level security;
create policy tradein_read on public.trade_in_requests
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy tradein_insert on public.trade_in_requests
  for insert to authenticated with check (
    user_id = auth.uid() and status = 'nova' and offered_value is null and admin_notes is null);
create policy tradein_admin on public.trade_in_requests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- criação de pedido (única porta de entrada) ----------
create or replace function public.create_order(
  p_items jsonb,                       -- [{"variant_id":"uuid","quantity":1}, ...]
  p_delivery_method text,              -- 'entrega' | 'retirada'
  p_payment_method text,               -- 'pix' | 'cartao_credito' | 'cartao_debito'
  p_installments int default 1,
  p_coupon_code text default null,
  p_customer jsonb default '{}'::jsonb,  -- {"name","phone","cpf"}
  p_address jsonb default null           -- {"recipient","cep","street","number","complement","neighborhood","city","state"}
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_order_id uuid;
  v_number text;
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_shipping numeric(12,2) := 0;
  v_total numeric(12,2);
  v_max_inst int := 24;
  v_inst int := 1;
  v_coupon_id uuid;
  v_coupon_code text;
  v_free_min numeric;
  v_price numeric(12,2);
  r record;
  v record;
  inv record;
begin
  if v_uid is null then raise exception 'Faça login para finalizar a compra' using errcode = '28000'; end if;
  if p_delivery_method not in ('entrega','retirada') then raise exception 'Forma de entrega inválida'; end if;
  if p_payment_method not in ('pix','cartao_credito','cartao_debito') then raise exception 'Forma de pagamento inválida'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Carrinho vazio';
  end if;
  if nullif(trim(p_customer->>'name'), '') is null or nullif(trim(p_customer->>'phone'), '') is null then
    raise exception 'Informe nome e telefone';
  end if;
  if p_delivery_method = 'entrega' then
    if p_address is null or coalesce(p_address->>'cep','') !~ '^[0-9]{8}$'
       or nullif(trim(p_address->>'street'),'') is null or nullif(trim(p_address->>'number'),'') is null
       or nullif(trim(p_address->>'city'),'') is null or nullif(trim(p_address->>'state'),'') is null then
      raise exception 'Endereço de entrega incompleto';
    end if;
  end if;
  if p_delivery_method = 'retirada'
     and coalesce((select (value)::boolean from public.store_settings where key = 'pickup_enabled'), false) = false then
    raise exception 'Retirada na loja indisponível';
  end if;

  insert into public.orders (user_id, payment_method, delivery_method, customer_name, customer_email,
                             customer_phone, customer_cpf, shipping_address)
  values (v_uid, p_payment_method, p_delivery_method,
          trim(p_customer->>'name'),
          (select email from auth.users where id = v_uid),
          trim(p_customer->>'phone'),
          nullif(regexp_replace(coalesce(p_customer->>'cpf',''), '\D', '', 'g'), ''),
          case when p_delivery_method = 'entrega' then p_address else null end)
  returning id, order_number into v_order_id, v_number;

  -- ordem fixa por variant_id evita deadlock entre pedidos concorrentes
  for r in
    select x.variant_id, sum(x.quantity)::int as quantity
    from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity int)
    group by x.variant_id order by x.variant_id
  loop
    if r.variant_id is null or r.quantity is null or r.quantity < 1 or r.quantity > 10 then
      raise exception 'Item ou quantidade inválida';
    end if;

    select pv.id, pv.sku, pv.storage, pv.color, pv.price, pv.pix_price, pv.installments_max, pv.active,
           p.id as product_id, p.name as product_name, p.status as product_status
      into v
      from public.product_variants pv join public.products p on p.id = pv.product_id
     where pv.id = r.variant_id;
    if not found or not v.active or v.product_status <> 'active' then
      raise exception 'Produto indisponível';
    end if;

    select quantity, reserved into inv from public.inventory where variant_id = r.variant_id for update;
    if inv.quantity - inv.reserved < r.quantity then
      raise exception 'Estoque insuficiente para %', v.product_name using errcode = 'P0001';
    end if;
    update public.inventory set reserved = reserved + r.quantity where variant_id = r.variant_id;

    v_price := case when p_payment_method = 'pix' then coalesce(v.pix_price, v.price) else v.price end;
    v_subtotal := v_subtotal + v_price * r.quantity;
    v_max_inst := least(v_max_inst, v.installments_max);

    insert into public.order_items (order_id, variant_id, product_id, product_name, variant_label, sku,
                                    unit_price, quantity, total)
    values (v_order_id, v.id, v.product_id, v.product_name,
            nullif(concat_ws(' · ', v.storage, v.color), ''), v.sku,
            v_price, r.quantity, v_price * r.quantity);
  end loop;

  if p_coupon_code is not null and trim(p_coupon_code) <> '' then
    select coupon_id, discount into v_coupon_id, v_discount
      from public._coupon_discount(p_coupon_code, v_subtotal, true);
    v_coupon_code := upper(trim(p_coupon_code));
    update public.coupons set uses_count = uses_count + 1 where id = v_coupon_id;
  end if;

  if p_delivery_method = 'entrega' then
    v_shipping := public.setting_numeric('flat_shipping');
    if v_shipping is null then
      raise exception 'Entrega ainda não configurada pela loja. Escolha retirada ou fale pelo WhatsApp.';
    end if;
    v_free_min := public.setting_numeric('free_shipping_min');
    if v_free_min is not null and (v_subtotal - v_discount) >= v_free_min then v_shipping := 0; end if;
  end if;

  if p_payment_method = 'cartao_credito' then
    v_inst := least(greatest(coalesce(p_installments, 1), 1), v_max_inst);
  end if;

  v_total := v_subtotal - v_discount + v_shipping;
  update public.orders
     set subtotal = v_subtotal, discount = v_discount, shipping = v_shipping, total = v_total,
         installments = v_inst, coupon_id = v_coupon_id, coupon_code = v_coupon_code
   where id = v_order_id;

  delete from public.cart_items where cart_id in (select id from public.carts where user_id = v_uid);
  update public.carts set coupon_code = null where user_id = v_uid;

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_number, 'total', v_total);
end $$;

-- ---------- máquina de estados do pedido + estoque ----------
create or replace function public._apply_order_status(p_order_id uuid, p_status text, p_tracking text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype; it record;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido não encontrado'; end if;

  if not ((o.status, p_status) in (
        ('pendente','aprovado'), ('pendente','cancelado'),
        ('aprovado','preparando'), ('aprovado','cancelado'),
        ('preparando','enviado'), ('preparando','cancelado'),
        ('enviado','entregue'))) then
    raise exception 'Transição inválida: % → %', o.status, p_status;
  end if;

  if p_status = 'aprovado' then
    for it in select variant_id, quantity from public.order_items where order_id = o.id order by variant_id loop
      update public.inventory
         set quantity = quantity - it.quantity, reserved = reserved - it.quantity
       where variant_id = it.variant_id;
    end loop;
    update public.orders set stock_committed = true, payment_status = 'pago', approved_at = now() where id = o.id;
  elsif p_status = 'cancelado' then
    for it in select variant_id, quantity from public.order_items where order_id = o.id order by variant_id loop
      if o.stock_committed then
        update public.inventory set quantity = quantity + it.quantity where variant_id = it.variant_id;
      else
        update public.inventory set reserved = greatest(reserved - it.quantity, 0) where variant_id = it.variant_id;
      end if;
    end loop;
    if o.coupon_id is not null then
      update public.coupons set uses_count = greatest(uses_count - 1, 0) where id = o.coupon_id;
    end if;
    update public.orders set cancelled_at = now() where id = o.id;
  elsif p_status = 'enviado' then
    update public.orders set shipped_at = now() where id = o.id;
  elsif p_status = 'entregue' then
    update public.orders set delivered_at = now() where id = o.id;
  end if;

  update public.orders
     set status = p_status, tracking_code = coalesce(p_tracking, tracking_code)
   where id = o.id;
end $$;
revoke all on function public._apply_order_status(uuid, text, text) from public, anon, authenticated;

-- admin (ou webhook de pagamento com service_role) altera status
create or replace function public.set_order_status(p_order_id uuid, p_status text, p_tracking text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_admin() or auth.role() = 'service_role') then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  perform public._apply_order_status(p_order_id, p_status, p_tracking);
end $$;

-- cliente cancela o próprio pedido enquanto estiver pendente
create or replace function public.cancel_my_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s text;
begin
  select status into s from public.orders
   where id = p_order_id and user_id = auth.uid() for update;
  if not found then raise exception 'Pedido não encontrado'; end if;
  if s <> 'pendente' then raise exception 'Só é possível cancelar pedidos pendentes'; end if;
  perform public._apply_order_status(p_order_id, 'cancelado');
end $$;

-- libera reservas de pedidos pendentes antigos (agendar com pg_cron ou Edge Function)
create or replace function public.cancel_expired_orders(p_hours int default 48)
returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; o record;
begin
  if not (public.is_admin() or auth.role() = 'service_role') then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  for o in select id from public.orders
            where status = 'pendente' and payment_status = 'pendente'
              and created_at < now() - make_interval(hours => p_hours) loop
    perform public._apply_order_status(o.id, 'cancelado');
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------- dashboard do admin ----------
create or replace function public.admin_dashboard()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Acesso negado' using errcode = '42501'; end if;
  return jsonb_build_object(
    'revenue_total', (select coalesce(sum(total),0) from public.orders where status in ('aprovado','preparando','enviado','entregue')),
    'revenue_30d',   (select coalesce(sum(total),0) from public.orders
                       where status in ('aprovado','preparando','enviado','entregue') and created_at >= now() - interval '30 days'),
    'orders_total',  (select count(*) from public.orders),
    'orders_pending',(select count(*) from public.orders where status = 'pendente'),
    'customers',     (select count(*) from public.profiles),
    'low_stock',     (select count(*) from public.inventory i
                        join public.product_variants v on v.id = i.variant_id
                       where v.active and (i.quantity - i.reserved) <= i.low_stock_threshold));
end $$;

-- ---------- permissões de execução ----------
revoke all on function public.create_order(jsonb,text,text,int,text,jsonb,jsonb) from public, anon;
revoke all on function public.validate_coupon(text,numeric) from public, anon;
revoke all on function public._coupon_discount(text,numeric,boolean) from public, anon, authenticated;
revoke all on function public.set_order_status(uuid,text,text) from public, anon;
revoke all on function public.cancel_my_order(uuid) from public, anon;
revoke all on function public.cancel_expired_orders(int) from public, anon;
revoke all on function public.admin_dashboard() from public, anon;
revoke all on function public.setting_numeric(text) from public, anon, authenticated;
grant execute on function public.create_order(jsonb,text,text,int,text,jsonb,jsonb) to authenticated;
grant execute on function public.validate_coupon(text,numeric) to authenticated;
grant execute on function public.set_order_status(uuid,text,text) to authenticated, service_role;
grant execute on function public.cancel_my_order(uuid) to authenticated;
grant execute on function public.cancel_expired_orders(int) to authenticated, service_role;
grant execute on function public.admin_dashboard() to authenticated;

-- ---------- storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-images',  'product-images',  true,  5242880, array['image/jpeg','image/png','image/webp']),
  ('trade-in-photos', 'trade-in-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "product-images leitura publica" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "product-images admin escreve" on storage.objects
  for all to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "trade-in cliente envia na propria pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'trade-in-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "trade-in dono ou admin le" on storage.objects
  for select to authenticated
  using (bucket_id = 'trade-in-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "trade-in admin gerencia" on storage.objects
  for all to authenticated
  using (bucket_id = 'trade-in-photos' and public.is_admin())
  with check (bucket_id = 'trade-in-photos' and public.is_admin());
