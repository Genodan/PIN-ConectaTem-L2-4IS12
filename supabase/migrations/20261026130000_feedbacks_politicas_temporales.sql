-- UT 1099 (Dar feedback) · Permisos de la tabla «feedbacks» mientras la app funciona sin inicio de sesión.
-- Sin ellas, al enviar el feedback: «new row violates row-level security policy for table "feedbacks"».
-- La app crea la fila (insert), la sobrescribe si se reenvía (update, por el upsert sobre tarea_id),
-- la lee al guardarla (select) y la borra si el envío falla a mitad (delete).
-- Se puede ejecutar varias veces sin error.

alter table public.feedbacks enable row level security;

drop policy if exists feedbacks_crear_temporal on public.feedbacks;
drop policy if exists feedbacks_actualizar_temporal on public.feedbacks;
drop policy if exists feedbacks_leer_temporal on public.feedbacks;
drop policy if exists feedbacks_borrar_temporal on public.feedbacks;

-- TEMPORAL: quitar anon cuando haya login
create policy feedbacks_crear_temporal on public.feedbacks
  for insert to anon, authenticated
  with check (true);

-- TEMPORAL: quitar anon cuando haya login
create policy feedbacks_actualizar_temporal on public.feedbacks
  for update to anon, authenticated
  using (true)
  with check (true);

-- TEMPORAL: quitar anon cuando haya login
create policy feedbacks_leer_temporal on public.feedbacks
  for select to anon, authenticated
  using (true);

-- TEMPORAL: quitar anon cuando haya login
create policy feedbacks_borrar_temporal on public.feedbacks
  for delete to anon, authenticated
  using (true);

-- Con login, estas cuatro políticas se borran y se aplican las de base-de-datos/rls-politicas.sql
-- (la terapeuta solo crea y edita el feedback de sus prácticas; la familia solo lee el de su hijo/a).
