-- Datos de prueba INVENTADOS para ver «Notas rápidas» y la ventana «Notas del día».
-- Crea, para cada paciente con terapeuta asignada, una sesión esta semana y otra la semana que viene
-- (de lunes a viernes, entre las 9:00 y las 17:00 hora de Madrid), más dos sesiones hoy,
-- y escribe una nota en algunas de las sesiones que ya han pasado.
-- Ejecutar DESPUÉS de la migración 20261127130000_sesiones_y_notas.sql. Si se ejecuta dos veces, duplica las sesiones.

with lunes as (
  select (date_trunc('week', now() at time zone 'Europe/Madrid')) as dia -- lunes 00:00 de esta semana (hora de Madrid)
)
insert into public.sesiones (terapeuta_id, paciente_id, empieza_en, duracion_min)
select p.terapeuta_asignado_id,
       p.id,
       ((select dia from lunes)
         + ((s.semana * 7) + ((abs(hashtext(p.id::text)) + s.semana) % 5)) * interval '1 day'
         + (9 + (abs(hashtext(p.id::text)) % 8)) * interval '1 hour') at time zone 'Europe/Madrid',
       45
from public.pacientes p
cross join generate_series(0, 1) as s(semana)
where p.terapeuta_asignado_id is not null;

-- Dos sesiones hoy (a las 10:00 y a las 12:30) con los dos primeros pacientes de cada terapeuta
insert into public.sesiones (terapeuta_id, paciente_id, empieza_en, duracion_min)
select terapeuta_asignado_id, id,
       (date_trunc('day', now() at time zone 'Europe/Madrid')
         + case when orden = 1 then interval '10 hours' else interval '12 hours 30 minutes' end) at time zone 'Europe/Madrid',
       45
from (
  select p.*, row_number() over (partition by p.terapeuta_asignado_id order by p.fecha_registro) as orden
  from public.pacientes p
  where p.terapeuta_asignado_id is not null
) t
where orden <= 2;

-- Notas en algunas sesiones que ya han pasado
insert into public.notas (sesion_id, texto)
select s.id,
       (array[
         'Ha pedido el juego él solo varias veces. La familia nota más intención de comunicarse en casa.',
         'Sesión corta: llegaba cansado. Repetir la rutina de inicio la próxima vez.',
         'La familia pregunta cómo seguir con la práctica cuando se frustra al principio. Darles pautas por escrito.'
       ])[1 + (row_number() over (order by s.empieza_en) % 3)::int]
from public.sesiones s
where s.empieza_en < now()
  and not exists (select 1 from public.notas n where n.sesion_id = s.id)
  and abs(hashtext(s.id::text)) % 3 <> 0;
