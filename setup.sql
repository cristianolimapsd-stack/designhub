-- DesignHub — Setup das tabelas no Supabase
-- Cole todo este conteúdo no SQL Editor do Supabase e clique em "Run"

-- 1. Leads / CRM
create table if not exists leads (
  id        bigint primary key,
  name      text,
  company   text,
  email     text,
  value     numeric default 0,
  status    text default 'novo',
  date      text,
  tag       text
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
  id        bigint primary key,
  title     text,
  url       text,
  tag       text,
  year      text,
  month     text,
  value     numeric default 0,
  cover     text default '🎨',
  description text
);

-- 4. Notas
create table if not exists notes (
  id        bigint primary key,
  title     text,
  content   text,
  date      text
);

-- 5. Histórico de horas trabalhadas
create table if not exists timer_history (
  date      text primary key,
  seconds   integer default 0
);

-- Permissões: permite leitura e escrita sem autenticação (app pessoal)
alter table leads          enable row level security;
alter table tasks          enable row level security;
alter table portfolio      enable row level security;
alter table notes          enable row level security;
alter table timer_history  enable row level security;

create policy "allow all leads"         on leads         for all using (true) with check (true);
create policy "allow all tasks"         on tasks         for all using (true) with check (true);
create policy "allow all portfolio"     on portfolio     for all using (true) with check (true);
create policy "allow all notes"         on notes         for all using (true) with check (true);
create policy "allow all timer_history" on timer_history for all using (true) with check (true);
