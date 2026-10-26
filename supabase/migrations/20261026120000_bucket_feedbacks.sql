-- UT 1099 (Dar feedback) y UT 1352 (Ver feedback) · Bucket de las notas de voz de la terapeuta.
-- Ruta de cada fichero: «<id de la práctica>.<extensión>» (m4a en el móvil; webm o mp4 en web).
-- Se puede ejecutar varias veces sin error (SQL Editor de Supabase o «supabase db push»).

-- 1. Bucket privado: los audios solo se leen con URL firmada, nunca con URL pública.
--    Límite de 20 MB por fichero (una nota de voz de varios minutos ocupa menos de 5 MB).
insert into storage.buckets (id, name, public, file_size_limit)
values ('feedbacks', 'feedbacks', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

-- 2. Políticas de Storage del bucket «feedbacks».
--    La terapeuta sube (insert) y, si reenvía, sobrescribe (update); si el envío falla a mitad,
--    la app borra el audio (delete). La familia lo lee con una URL firmada de 1 hora (select).

drop policy if exists feedbacks_subir on storage.objects;
drop policy if exists feedbacks_sobrescribir on storage.objects;
drop policy if exists feedbacks_leer on storage.objects;
drop policy if exists feedbacks_borrar on storage.objects;

-- TEMPORAL: quitar anon cuando haya login
create policy feedbacks_subir on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'feedbacks');

-- TEMPORAL: quitar anon cuando haya login
create policy feedbacks_sobrescribir on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'feedbacks')
  with check (bucket_id = 'feedbacks');

-- TEMPORAL: quitar anon cuando haya login
create policy feedbacks_leer on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'feedbacks');

-- TEMPORAL: quitar anon cuando haya login
create policy feedbacks_borrar on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'feedbacks');

-- Con login, estas políticas deberán limitarse: subir/sobrescribir/borrar solo la terapeuta de la
-- práctica, y leer solo esa terapeuta y la familia del paciente (como en base-de-datos/rls-politicas.sql).
