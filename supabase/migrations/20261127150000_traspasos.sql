-- Nueva interfaz (KAIRÓS) · Traspasar un paciente a otra terapeuta y «Archivados».
-- Decisión del equipo (base-de-datos/transferir-paciente.sql): la terapeuta actual pasa el niño a otra;
-- el niño nunca se queda sin terapeuta. Aquí se guarda además el historial de traspasos, para que la
-- terapeuta anterior lo vea en «Archivados» (ficha en solo lectura).
-- Se puede ejecutar varias veces sin error (SQL Editor de Supabase).

create table if not exists public.traspasos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  terapeuta_origen_id uuid not null references public.terapeutas (id) on delete cascade,
  terapeuta_destino_id uuid not null references public.terapeutas (id) on delete cascade,
  fecha timestamptz not null default now(),
  check (terapeuta_origen_id <> terapeuta_destino_id)
);

create index if not exists traspasos_origen_idx on public.traspasos (terapeuta_origen_id, fecha desc);

-- TEMPORAL: la app aún no tiene login. Cuando lo haya, activar RLS (la terapeuta solo ve sus traspasos):
--   alter table public.traspasos enable row level security;
alter table public.traspasos disable row level security;

-- TEMPORAL (sin login): traspasa y lo apunta en un solo paso. Recibe la terapeuta actual como parámetro
-- porque todavía no hay auth.uid(). Cuando haya login, borrar esta función y usar transferir_paciente()
-- del equipo, añadiéndole el insert en «traspasos»:
--   drop function public.traspasar_paciente_sin_login(uuid, uuid, uuid);
create or replace function public.traspasar_paciente_sin_login(p_paciente uuid, p_terapeuta_actual uuid, p_terapeuta_nueva uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_terapeuta_nueva = p_terapeuta_actual then
    raise exception 'El paciente ya es tuyo';
  end if;
  if not exists (select 1 from terapeutas t where t.id = p_terapeuta_nueva) then
    raise exception 'Terapeuta no encontrada';
  end if;

  update pacientes set terapeuta_asignado_id = p_terapeuta_nueva
   where id = p_paciente and terapeuta_asignado_id = p_terapeuta_actual;
  if not found then
    raise exception 'Paciente no encontrado';
  end if;

  -- Los códigos de invitación aún sin usar pasan a la nueva terapeuta (como en transferir_paciente)
  update codigos_invitacion set terapeuta_id = p_terapeuta_nueva
   where paciente_id = p_paciente and usado_en is null;

  insert into traspasos (paciente_id, terapeuta_origen_id, terapeuta_destino_id)
  values (p_paciente, p_terapeuta_actual, p_terapeuta_nueva);
end $$;

revoke execute on function public.traspasar_paciente_sin_login(uuid, uuid, uuid) from public;
grant execute on function public.traspasar_paciente_sin_login(uuid, uuid, uuid) to anon, authenticated;
