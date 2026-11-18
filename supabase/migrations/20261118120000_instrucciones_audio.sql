-- UT 1406 (Leer en voz alta las instrucciones) · Audio generado con IA de las instrucciones de una práctica.
-- La Edge Function «generar-audio-instrucciones» crea el audio una sola vez, al guardar la práctica, y guarda
-- aquí su ruta. Si la práctica no tiene audio, la familia oye la voz del dispositivo (como antes).
-- Se puede ejecutar varias veces sin error (SQL Editor de Supabase o «supabase db push»).
--
-- IMPORTANTE: ejecutar ANTES de desplegar la versión de la app que lee esta columna; si no, la lista de
-- prácticas de la familia falla («column tareas.instrucciones_audio does not exist»).

-- 1. Ruta del audio dentro del bucket «audios-instrucciones» (por ejemplo «<id de la tarea>.wav»).
alter table public.tareas
  add column if not exists instrucciones_audio text;

comment on column public.tareas.instrucciones_audio is
  'Ruta del audio generado con IA a partir de tareas.instrucciones (UT 1406). Null si aún no existe o falló.';

-- 2. Bucket privado: los audios solo se leen con URL firmada, nunca con URL pública.
--    Límite de 10 MB por fichero. El audio es WAV (24 kHz, mono, ≈ 2,9 MB por minuto): unas instrucciones
--    del máximo que permite la app (1.500 caracteres, ≈ 100 s) ocupan unos 5 MB.
insert into storage.buckets (id, name, public, file_size_limit)
values ('audios-instrucciones', 'audios-instrucciones', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

-- 3. Política de Storage: la app solo necesita LEER (para pedir la URL firmada).
--    Quien sube el audio es la Edge Function con la clave de servicio, que no pasa por estas políticas.
drop policy if exists audios_instrucciones_leer_temporal on storage.objects;

-- TEMPORAL: quitar anon cuando haya login
create policy audios_instrucciones_leer_temporal on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'audios-instrucciones');

-- Con login, esta política deberá limitarse a la terapeuta y la familia del paciente de la práctica
-- (como en base-de-datos/rls-politicas.sql, con una carpeta por paciente).
