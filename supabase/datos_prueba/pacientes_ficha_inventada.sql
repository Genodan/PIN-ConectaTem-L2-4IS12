-- Datos de prueba INVENTADOS para la ficha del paciente (apellidos, nacimiento, contacto, tutores, objetivos).
-- Ejecutar DESPUÉS de la migración 20261127140000_pacientes_ficha.sql.
-- Solo rellena a los pacientes que aún no tienen apellidos, así que se puede ejecutar varias veces.

with datos as (
  select p.id,
         row_number() over (order by p.fecha_registro, p.id) as n
  from public.pacientes p
  where p.apellidos is null
)
update public.pacientes p
set apellidos = (array['García Soler', 'Martín Ferrer', 'López Navarro', 'Sánchez Vidal', 'Romero Gil', 'Torres Molina', 'Ruiz Castell', 'Ortega Pons'])[1 + ((d.n - 1) % 8)::int],
    fecha_nacimiento = date '2021-03-14' + (((d.n * 137) % 900)::int),
    email = 'familia' || d.n || '@correo.ejemplo',
    telefono = '600 000 ' || lpad(d.n::text, 3, '0'),
    telefono_fijo = case when d.n % 2 = 0 then '960 000 ' || lpad(d.n::text, 3, '0') end,
    tutor_1 = (array['Andrea Soler', 'Carlos Ferrer', 'Marina Navarro', 'Pablo Vidal', 'Irene Gil', 'Sergio Molina', 'Nuria Castell', 'Raúl Pons'])[1 + ((d.n - 1) % 8)::int],
    tutor_2 = case when d.n % 3 <> 0 then (array['Jorge García', 'Laura Martín', 'Diego López', 'Sara Sánchez', 'Álex Romero', 'Eva Torres', 'Marcos Ruiz', 'Clara Ortega'])[1 + ((d.n - 1) % 8)::int] end,
    necesidades_objetivos = (array[
      'Comunicación y autonomía cotidiana. Mejorar la comunicación y practicar rutinas diarias con apoyos visuales.',
      'Regulación emocional: anticipar los cambios de actividad y reducir las rabietas en las transiciones.',
      'Ampliar el vocabulario y empezar a combinar dos palabras para pedir lo que quiere.',
      'Motricidad fina y atención conjunta durante el juego compartido con la familia.'
    ])[1 + ((d.n - 1) % 4)::int]
from datos d
where p.id = d.id;
