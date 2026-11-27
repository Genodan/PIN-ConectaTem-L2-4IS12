-- Nueva interfaz (KAIRÓS) · Datos de la ficha del paciente (Figma: «PACIENTES - TERAPEUTA»).
-- Se puede ejecutar varias veces sin error (SQL Editor de Supabase).

alter table public.pacientes
  add column if not exists apellidos text,
  add column if not exists fecha_nacimiento date,
  -- «#06837261»: identificador de 8 cifras para buscar al niño; a los pacientes que ya existen se les genera uno
  add column if not exists identificador text not null default lpad(floor(random() * 100000000)::int::text, 8, '0'),
  add column if not exists email text,
  add column if not exists telefono text,
  add column if not exists telefono_fijo text,
  add column if not exists tutor_1 text,
  add column if not exists tutor_2 text,
  add column if not exists necesidades_objetivos text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pacientes_identificador_unico') then
    alter table public.pacientes add constraint pacientes_identificador_unico unique (identificador);
  end if;
end $$;

-- Permisos para editar la ficha desde la app (base-de-datos/rls-politicas.sql quita el UPDATE de «pacientes»
-- y solo deja nombre_nino y nombre_familia). Solo las columnas de la ficha: familia_id y terapeuta_asignado_id siguen protegidas.
grant update (nombre_nino, apellidos, fecha_nacimiento, email, telefono, telefono_fijo, tutor_1, tutor_2, necesidades_objetivos)
  on public.pacientes to authenticated;

-- TEMPORAL: la app aún no tiene login y entra como «anon». Quitar cuando lo haya:
--   revoke update on public.pacientes from anon;
grant update (nombre_nino, apellidos, fecha_nacimiento, email, telefono, telefono_fijo, tutor_1, tutor_2, necesidades_objetivos)
  on public.pacientes to anon;
