-- UT 1095 (Sistema de mensajería) · Mensajes entre la familia y su terapeuta, en tiempo real.
-- Se puede ejecutar varias veces sin error (SQL Editor de Supabase).

-- 1. TEMPORAL: la app aún no tiene login, así que con RLS activado no puede leer ni enviar mensajes.
--    Las políticas buenas (base-de-datos/rls-politicas.sql) se conservan y vuelven a aplicarse solas al reactivar:
--      alter table public.mensajes enable row level security;
alter table public.mensajes disable row level security;

-- 2. Tiempo real: la app se suscribe a los mensajes nuevos de cada conversación (Supabase Realtime)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mensajes'
  ) then
    alter publication supabase_realtime add table public.mensajes;
  end if;
end $$;

-- 3. Cargar rápido una conversación (paciente + terapeuta, por fecha)
create index if not exists mensajes_conversacion_idx
  on public.mensajes (paciente_id, terapeuta_id, fecha_envio);
