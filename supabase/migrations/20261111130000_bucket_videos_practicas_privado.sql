-- Vídeos de las prácticas que graba la familia · Bucket privado + URL firmadas.
-- Antes: el bucket era público y la app guardaba la URL pública en tareas.video_url.
-- Ahora: el bucket es privado y tareas.video_url guarda la RUTA del fichero; la terapeuta lo abre con una
-- URL firmada que caduca en 1 hora (obtenerUrlVideo en src/services/tareasService.ts).
--
-- IMPORTANTE: ejecutar DESPUÉS de desplegar la versión de la app que usa obtenerUrlVideo.
-- Con la versión anterior, un bucket privado deja los vídeos sin poder abrirse.
-- Se puede ejecutar varias veces sin error (SQL Editor de Supabase o «supabase db push»).

-- 1. Bucket privado (si no existía, se crea; si existía público, pasa a privado).
--    No se toca su límite de tamaño.
insert into storage.buckets (id, name, public)
values ('videos-practicas', 'videos-practicas', false)
on conflict (id) do update set public = false;

-- 2. Políticas de Storage del bucket «videos-practicas».
--    La familia sube el vídeo (insert) y, para firmar una URL, hace falta poder leer el fichero (select).
--    La app no sobrescribe ni borra vídeos, así que no hay políticas de update ni de delete.
drop policy if exists videos_practicas_subir_temporal on storage.objects;
drop policy if exists videos_practicas_leer_temporal on storage.objects;

-- TEMPORAL: quitar anon cuando haya login
create policy videos_practicas_subir_temporal on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'videos-practicas');

-- TEMPORAL: quitar anon cuando haya login
create policy videos_practicas_leer_temporal on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'videos-practicas');

-- 3. Las prácticas ya enviadas guardan la URL pública completa: se convierten en rutas.
--    Ejemplo: https://xxx.supabase.co/storage/v1/object/public/videos-practicas/tarea_1_123.webm
--             pasa a tarea_1_123.webm
update public.tareas
set video_url = regexp_replace(video_url, '^.*/videos-practicas/', '')
where video_url like 'http%/videos-practicas/%';

-- Con login, estas políticas deberán limitarse: subir solo la familia del paciente y leer solo esa familia
-- y la terapeuta del paciente (como en base-de-datos/rls-politicas.sql, con una carpeta por paciente).
