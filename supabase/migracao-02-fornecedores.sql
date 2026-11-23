-- =====================================================================
--  MIGRAÇÃO 02 — Cadastro de fornecedores
--  Rodar UMA vez no SQL Editor (banco que já tem o schema.sql)
-- =====================================================================

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

-- Aproveita os nomes de fornecedor já digitados nas notas/lançamentos
insert into public.fornecedores (nome, cnpj_cpf)
select distinct on (lower(trim(fornecedor))) trim(fornecedor), max(cnpj_fornecedor) over (partition by lower(trim(fornecedor)))
from public.notas
where coalesce(trim(fornecedor), '') <> ''
  and not exists (select 1 from public.fornecedores f where lower(f.nome) = lower(trim(notas.fornecedor)));

insert into public.fornecedores (nome)
select distinct trim(fornecedor)
from public.lancamentos
where tipo = 'saida' and coalesce(trim(fornecedor), '') <> ''
  and not exists (select 1 from public.fornecedores f where lower(f.nome) = lower(trim(lancamentos.fornecedor)));

update public.notas n set fornecedor_id = f.id
from public.fornecedores f
where n.fornecedor_id is null and lower(f.nome) = lower(trim(n.fornecedor));

update public.lancamentos l set fornecedor_id = f.id
from public.fornecedores f
where l.fornecedor_id is null and l.tipo = 'saida' and lower(f.nome) = lower(trim(l.fornecedor));
