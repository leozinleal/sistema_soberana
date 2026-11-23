-- =====================================================================
--  SOBERANA OBRAS — Estrutura do banco (Supabase / PostgreSQL)
--  Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- CLIENTES
-- ---------------------------------------------------------------------
create table if not exists public.clientes (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  cpf_cnpj     text,
  telefone     text,
  email        text,
  endereco     text,
  observacoes  text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- OBRAS
-- ---------------------------------------------------------------------
create table if not exists public.obras (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  endereco          text,
  cliente_id        uuid references public.clientes(id) on delete set null,
  status            text not null default 'em_andamento'
                    check (status in ('planejamento','em_andamento','pausada','concluida','entregue')),
  valor_contrato    numeric(14,2) default 0,   -- valor de venda / contrato com o cliente
  orcamento_previsto numeric(14,2) default 0,  -- quanto se espera gastar
  data_inicio       date,
  previsao_entrega  date,
  data_entrega      date,
  observacoes       text,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- FUNCIONÁRIOS (cadastro geral) + vínculo com cada obra
-- ---------------------------------------------------------------------
create table if not exists public.funcionarios (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  cpf           text,
  funcao        text,                       -- pedreiro, servente, eletricista...
  tipo_vinculo  text default 'diarista'
                check (tipo_vinculo in ('diarista','empreiteiro','clt','autonomo','outro')),
  valor_diaria  numeric(14,2),
  telefone      text,
  chave_pix     text,
  ativo         boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.obra_funcionarios (
  obra_id         uuid not null references public.obras(id) on delete cascade,
  funcionario_id  uuid not null references public.funcionarios(id) on delete cascade,
  funcao_na_obra  text,
  data_inicio     date default current_date,
  data_fim        date,
  created_at      timestamptz not null default now(),
  primary key (obra_id, funcionario_id)
);

-- ---------------------------------------------------------------------
-- NOTAS (notas fiscais / recibos de compra anexados à obra)
-- ---------------------------------------------------------------------
create table if not exists public.notas (
  id              uuid primary key default gen_random_uuid(),
  obra_id         uuid not null references public.obras(id) on delete cascade,
  numero          text,
  fornecedor      text,
  cnpj_fornecedor text,
  descricao       text,
  valor           numeric(14,2) not null check (valor >= 0),
  data_emissao    date not null default current_date,
  arquivo_path    text,
  arquivo_nome    text,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- LANÇAMENTOS (toda entrada e saída de dinheiro da obra)
--   - pagamento de funcionário  -> saida + categoria mao_de_obra + funcionario_id
--   - compra com nota           -> saida + nota_id
--   - recebimento do cliente    -> entrada + categoria recebimento_cliente
-- ---------------------------------------------------------------------
create table if not exists public.lancamentos (
  id               uuid primary key default gen_random_uuid(),
  obra_id          uuid not null references public.obras(id) on delete cascade,
  tipo             text not null check (tipo in ('entrada','saida')),
  categoria        text not null,
  descricao        text not null,
  valor            numeric(14,2) not null check (valor > 0),
  data             date not null default current_date,
  status           text not null default 'pago' check (status in ('pago','pendente')),
  vencimento       date,
  forma_pagamento  text,
  fornecedor       text,
  funcionario_id   uuid references public.funcionarios(id) on delete set null,
  nota_id          uuid references public.notas(id) on delete set null,
  comprovante_path text,
  comprovante_nome text,
  created_by       uuid default auth.uid(),
  created_at       timestamptz not null default now()
);

create index if not exists lancamentos_obra_data_idx on public.lancamentos (obra_id, data);
create index if not exists lancamentos_funcionario_idx on public.lancamentos (funcionario_id);
create index if not exists notas_obra_idx on public.notas (obra_id);

-- ---------------------------------------------------------------------
-- DOCUMENTOS (plantas, escritura, matrícula, contrato...)
-- ---------------------------------------------------------------------
create table if not exists public.documentos (
  id            uuid primary key default gen_random_uuid(),
  obra_id       uuid not null references public.obras(id) on delete cascade,
  tipo          text not null default 'outros'
                check (tipo in ('planta','escritura','matricula','contrato','doc_pessoal',
                                'memorial_descritivo','carta_entrega','alvara','outros')),
  nome          text not null,
  arquivo_path  text not null,
  arquivo_nome  text,
  observacoes   text,
  created_at    timestamptz not null default now()
);

create index if not exists documentos_obra_idx on public.documentos (obra_id);

-- ---------------------------------------------------------------------
-- RESUMO FINANCEIRO DE CADA OBRA (usado no painel)
-- ---------------------------------------------------------------------
create or replace view public.obras_resumo
with (security_invoker = true) as
select
  o.id,
  o.nome,
  o.status,
  o.valor_contrato,
  o.orcamento_previsto,
  coalesce(sum(l.valor) filter (where l.tipo = 'entrada' and l.status = 'pago'), 0)   as entradas_pagas,
  coalesce(sum(l.valor) filter (where l.tipo = 'saida'   and l.status = 'pago'), 0)   as saidas_pagas,
  coalesce(sum(l.valor) filter (where l.tipo = 'entrada' and l.status = 'pendente'), 0) as a_receber,
  coalesce(sum(l.valor) filter (where l.tipo = 'saida'   and l.status = 'pendente'), 0) as a_pagar,
  coalesce(sum(l.valor) filter (where l.tipo = 'entrada' and l.status = 'pago'), 0)
  - coalesce(sum(l.valor) filter (where l.tipo = 'saida' and l.status = 'pago'), 0)   as saldo
from public.obras o
left join public.lancamentos l on l.obra_id = o.id
group by o.id;

-- ---------------------------------------------------------------------
-- SEGURANÇA (RLS): só usuários logados acessam.
-- Desative o cadastro público em Authentication > Sign In / Providers
-- e crie os usuários manualmente (Authentication > Users > Add user).
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['clientes','obras','funcionarios','obra_funcionarios','notas','lancamentos','documentos']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "acesso_autenticado" on public.%I', t);
    execute format('create policy "acesso_autenticado" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Permissões de acesso pela API para usuários logados
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.obras_resumo to authenticated;

-- ---------------------------------------------------------------------
-- STORAGE: bucket privado para notas, comprovantes e documentos
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('arquivos', 'arquivos', false)
on conflict (id) do nothing;

drop policy if exists "arquivos_autenticado_select" on storage.objects;
drop policy if exists "arquivos_autenticado_insert" on storage.objects;
drop policy if exists "arquivos_autenticado_update" on storage.objects;
drop policy if exists "arquivos_autenticado_delete" on storage.objects;

create policy "arquivos_autenticado_select" on storage.objects
  for select to authenticated using (bucket_id = 'arquivos');
create policy "arquivos_autenticado_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'arquivos');
create policy "arquivos_autenticado_update" on storage.objects
  for update to authenticated using (bucket_id = 'arquivos');
create policy "arquivos_autenticado_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'arquivos');

-- ---------------------------------------------------------------------
-- FORNECEDORES
-- ---------------------------------------------------------------------
create table if not exists public.fornecedores (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  cnpj_cpf     text,
  ramo         text,            -- ex.: material de construção, elétrica, locação
  telefone     text,
  email        text,
  chave_pix    text,
  endereco     text,
  observacoes  text,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table public.notas
  add column if not exists fornecedor_id uuid references public.fornecedores(id) on delete set null;
alter table public.lancamentos
  add column if not exists fornecedor_id uuid references public.fornecedores(id) on delete set null;

create index if not exists notas_fornecedor_idx on public.notas (fornecedor_id);
create index if not exists lancamentos_fornecedor_idx on public.lancamentos (fornecedor_id);

-- Segurança
alter table public.fornecedores enable row level security;
drop policy if exists "acesso_autenticado" on public.fornecedores;
create policy "acesso_autenticado" on public.fornecedores
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.fornecedores to authenticated;
