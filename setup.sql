-- ══════════════════════════════════════════════════════════════
-- FluxioHUB v2.0 — Setup completo das tabelas no Supabase
-- Cole tudo no SQL Editor e clique em "Run"
-- ══════════════════════════════════════════════════════════════

-- 1. Leads / CRM
create table if not exists leads (
  id                bigint primary key,
  name              text,
  company           text,
  email             text,
  value             numeric default 0,
  status            text default 'novo',
  date              text,
  tag               text,
  categoria         text default 'lead',
  briefing_padrao   text default '',
  cores             text default '',
  fontes            text default '',
  redes             text default '',
  telefone          text default '',
  notas_internas    text default '',
  projeto_ids       jsonb default '[]',
  avatar_url        text default ''
);

-- 2. Tarefas da Agenda
create table if not exists tasks (
  id        bigint primary key,
  title     text,
  time      text,
  date      text,
  done      boolean default false,
  priority  text default 'media',
  type      text default 'tarefa'
);

-- 3. Portfólio
create table if not exists portfolio (
  id          bigint primary key,
  title       text,
  url         text,
  tag         text,
  year        text,
  month       text,
  value       numeric default 0,
  cover       text default '🎨',
  description text
);

-- 4. Notas
create table if not exists notes (
  id      bigint primary key,
  title   text,
  content text,
  date    text
);

-- 5. Histórico de horas trabalhadas
create table if not exists timer_history (
  date     text primary key,
  seconds  integer default 0
);

-- 6. Demandas / Kanban
create table if not exists demandas (
  id                bigint primary key,
  titulo            text,
  descricao         text default '',
  prazo             text default '',
  valor             numeric default 0,
  status            text default 'triagem',
  cliente_id        bigint,
  tag               text default '',
  task_id           bigint,
  obs_interna       text default '',
  data_criacao      text default '',
  historico         jsonb default '[]',
  comentarios       jsonb default '[]',
  approve_token     text default '',
  approve_status    text default '',
  approve_obs       text default '',
  solicitacao_id    bigint,
  status_desde      text default ''
);

-- 7. Solicitações dos clientes (via link público)
create table if not exists solicitacoes (
  id                  bigint primary key,
  cliente_id          text,
  cliente_nome        text default '',
  tipo                text default '',
  descricao           text default '',
  prazo               text default '',
  referencias         text default '',
  observacoes         text default '',
  status              text default 'pendente',
  resposta_designer   text default '',
  created_at          text
);

-- 8. Sync cross-device (usado pelo useSyncedStorage)
create table if not exists designer_data (
  key        text primary key,
  value      jsonb,
  updated_at text
);

-- 9. Config geral (meta mensal etc)
create table if not exists config (
  key    text primary key,
  value  text
);

-- ══════════════════════════════════════════════════════════════
-- PERMISSÕES — Row Level Security
-- ══════════════════════════════════════════════════════════════

alter table leads           enable row level security;
alter table tasks           enable row level security;
alter table portfolio       enable row level security;
alter table notes           enable row level security;
alter table timer_history   enable row level security;
alter table demandas        enable row level security;
alter table solicitacoes    enable row level security;
alter table designer_data   enable row level security;
alter table config          enable row level security;

create policy "allow all leads"          on leads          for all using (true) with check (true);
create policy "allow all tasks"          on tasks          for all using (true) with check (true);
create policy "allow all portfolio"      on portfolio      for all using (true) with check (true);
create policy "allow all notes"          on notes          for all using (true) with check (true);
create policy "allow all timer_history"  on timer_history  for all using (true) with check (true);
create policy "allow all demandas"       on demandas       for all using (true) with check (true);
create policy "allow all solicitacoes"   on solicitacoes   for all using (true) with check (true);
create policy "allow all designer_data"  on designer_data  for all using (true) with check (true);
create policy "allow all config"         on config         for all using (true) with check (true);
