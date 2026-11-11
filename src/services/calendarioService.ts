// Lógica pura del calendario del filtro «Por fecha» (UT 1585). Sin React: se prueba aparte.

export const NOMBRES_MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

// La semana empieza el lunes (como en España)
export const INICIALES_DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const dos = (n: number) => String(n).padStart(2, '0');

/** La misma fecha a las 00:00 (hora local), para comparar días sin fijarse en la hora. */
export const inicioDelDia = (fecha: Date): Date =>
  new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

export const diasEnMes = (anio: number, mes: number): number => new Date(anio, mes + 1, 0).getDate();

/**
 * Las semanas de un mes (mes: 0 = enero … 11 = diciembre) empezando en lunes.
 * Cada semana tiene 7 celdas: el número del día o null si la celda es de otro mes.
 * Solo salen los días que existen de verdad: febrero de 2026 no tiene 29, 30 ni 31.
 */
export const semanasDelMes = (anio: number, mes: number): (number | null)[][] => {
  const huecosAntes = (new Date(anio, mes, 1).getDay() + 6) % 7; // getDay: domingo = 0
  const celdas: (number | null)[] = [
    ...Array<null>(huecosAntes).fill(null),
    ...Array.from({ length: diasEnMes(anio, mes) }, (_, i) => i + 1),
  ];
  while (celdas.length % 7 !== 0) celdas.push(null);

  const semanas: (number | null)[][] = [];
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));
  return semanas;
};

/** dd/mm/aaaa: el formato que ve la familia en los campos. */
export const formatearFecha = (fecha: Date): string =>
  `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)}/${String(fecha.getFullYear()).padStart(4, '0')}`;

/** aaaa-mm-dd: el formato que entiende el filtro de `busquedaFeedbackService`. */
export const aTextoISO = (fecha: Date): string =>
  `${String(fecha.getFullYear()).padStart(4, '0')}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;

export const mismoDia = (a: Date | null | undefined, b: Date | null | undefined): boolean =>
  !!a &&
  !!b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Un día no se puede elegir si es anterior a `min` o posterior a `max` (ambos incluidos como válidos). */
export const diaDeshabilitado = (
  fecha: Date,
  min?: Date | null,
  max?: Date | null,
): boolean => {
  const t = inicioDelDia(fecha).getTime();
  if (min && t < inicioDelDia(min).getTime()) return true;
  if (max && t > inicioDelDia(max).getTime()) return true;
  return false;
};

/** «3 de noviembre de 2026»: para los lectores de pantalla. */
export const textoLargoDeFecha = (fecha: Date): string =>
  `${fecha.getDate()} de ${NOMBRES_MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`;
