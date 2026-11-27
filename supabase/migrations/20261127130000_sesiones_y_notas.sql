-- Nueva interfaz (KAIRÓS) · Sesiones (reuniones) de la terapeuta con cada familia y sus notas.
-- La terapeuta ve las notas del día elegido en el calendario («Notas rápidas») y las escribe en la ventana «Notas del día».
-- Una nota por sesión; se pueden escribir también para sesiones futuras (preparar la sesión).
-- Se puede ejecutar varias veces sin error (SQL Editor de Supabase).

create table if not exists public.sesiones (
  id uuid primary key default gen_random_uuid(),
  terapeuta_id uuid not null references public.terapeutas (id) on delete cascade,
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  empieza_en timestamptz not null,
  duracion_min integer not null default 45 check (duracion_min > 0)
);

create index if not exists sesiones_terapeuta_dia_idx on public.sesiones (terapeuta_id, empieza_en);

create table if not exists public.notas (
  id uuid primary key default gen_random_uuid(),
  -- Una sola nota por sesión: si ya existe, se edita
  sesion_id uuid not null unique references public.sesiones (id) on delete cascade,
  texto text not null check (length(trim(texto)) > 0),
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);

-- TEMPORAL: la app aún no tiene login, así que con RLS activado no podría leer ni escribir.
-- Cuando lo haya, activar RLS con políticas: la terapeuta solo ve y escribe sus sesiones y sus notas.
--   alter table public.sesiones enable row level security;
--   alter table public.notas enable row level security;
alter table public.sesiones disable row level security;
alter table public.notas disable row level security;
