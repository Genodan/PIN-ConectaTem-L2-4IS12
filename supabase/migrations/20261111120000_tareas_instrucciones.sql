-- UT 1406 (Leer en voz alta las instrucciones de una práctica)
-- Instrucciones que la terapeuta escribe para la familia al crear cada práctica.
-- Son opcionales: si están vacías, la familia no ve el botón «Escuchar instrucciones».
-- Se puede ejecutar varias veces sin error.

alter table public.tareas
  add column if not exists instrucciones text;

comment on column public.tareas.instrucciones is
  'Instrucciones de la terapeuta para la familia (UT 1406). La app las lee en voz alta tal cual, sin cambiarlas.';
