// Datos de ejemplo del prototipo de Figma Make. Todo inventado (regla 1 del README).
// Se irán sustituyendo por datos de Supabase a medida que se programe cada UT.

export type Modulo = {
  id: number;
  emoji: string;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  duracionDemo: string;
};

export const MODULOS: Modulo[] = [
  {
    id: 1,
    emoji: '💬',
    titulo: 'Intención Comunicativa',
    subtitulo: '¿Qué quiero?',
    descripcion: 'Ayuda a Lucas a pedir lo que quiere en lugar de cogerlo directamente.',
    duracionDemo: '1:24',
  },
  {
    id: 2,
    emoji: '⏱️',
    titulo: 'El Reloj de la Calma',
    subtitulo: 'Tiempo de espera',
    descripcion: 'Practicad pausas breves para que Lucas tolere la espera sin frustrarse.',
    duracionDemo: '1:05',
  },
  {
    id: 3,
    emoji: '🪞',
    titulo: 'El Espejo',
    subtitulo: 'Imitación',
    descripcion: 'Juegos de imitación de gestos y sonidos cara a cara.',
    duracionDemo: '0:58',
  },
  {
    id: 4,
    emoji: '🧸',
    titulo: 'Manos a la Obra',
    subtitulo: 'Juego funcional',
    descripcion: 'Fomenta el uso funcional de juguetes cotidianos, más allá de alinearlos o girarlos.',
    duracionDemo: '1:12',
  },
  {
    id: 5,
    emoji: '🗣️',
    titulo: 'Mis Primeras Palabras',
    subtitulo: 'Vocabulario + gestos',
    descripcion: 'Combina palabras sencillas con gestos de apoyo en momentos cotidianos.',
    duracionDemo: '1:40',
  },
];

// Familia de ejemplo
export const FAMILIA = { nombre: 'Ana', inicial: 'A' };
export const NINO = {
  nombre: 'Lucas',
  apellidos: 'Martín G.',
  nombreCorto: 'Lucas M.',
  edad: '3 años 6 meses',
  fechaNacimiento: '15/03/2023',
  sexo: 'Niño',
  diagnostico: 'Retraso en el desarrollo del lenguaje',
  hitosEnProgreso: ['Intención Comunicativa', 'El Reloj de la Calma', 'El Espejo'],
  observaciones: 'Lucas muestra más interés por los pomperos. Esta semana ha señalado 2 veces hacia el estante.',
};
export const TERAPEUTA = { nombre: 'Marta', apellidos: 'Rodríguez', inicial: 'M' };
export const PRACTICAS_SEMANA = [true, true, false, false, false, false, false];

export type Feedback = {
  id: number;
  fecha: string;
  modulo: string;
  emoji: string;
  insignia: string;
  fuerte: string;
  mejorar: string;
  foco: string;
  audio: string;
  nuevo: boolean;
};

export const FEEDBACKS: Feedback[] = [
  {
    id: 1,
    fecha: 'Hoy, 12:10',
    modulo: 'Intención Comunicativa',
    emoji: '💬',
    insignia: '⭐ Familia Constante',
    fuerte: 'Lucas ha señalado el pompero de forma espontánea y ha mantenido la mirada mientras esperaba.',
    mejorar: 'Dadle unos segundos más antes de anticiparos a lo que quiere pedir.',
    foco: 'Practicar dos peticiones al día con objetos que le motiven.',
    audio: '1:18',
    nuevo: true,
  },
  {
    id: 2,
    fecha: '12 de septiembre',
    modulo: 'El Espejo',
    emoji: '🪞',
    insignia: '💪 Gran esfuerzo',
    fuerte: 'Ha imitado dos gestos nuevos y se ha mantenido en la actividad.',
    mejorar: 'Empezad con movimientos amplios antes de pasar a gestos pequeños.',
    foco: 'Repetir la canción de gestos tres veces esta semana.',
    audio: '0:52',
    nuevo: false,
  },
];

// ---- Terapeuta ----

export type Practica = {
  id: number;
  nino: string;
  modulo: string;
  fecha: string;
  nota: string;
  estado: 'pendiente' | 'respondido';
  avatar: string;
  resumenIa: string;
};

export const PRACTICAS: Practica[] = [
  {
    id: 1,
    nino: 'Lucas M.',
    modulo: '💬 Intención Comunicativa',
    fecha: 'Hoy, 10:23',
    nota: 'Tardó mucho en señalar, pero al final lo hizo. ¿Estamos haciéndolo bien?',
    estado: 'pendiente',
    avatar: 'L',
    resumenIa:
      'Lucas muestra avances al señalar y buscar la mirada del adulto. Se recomienda darle unos segundos más para responder antes de ayudarle y continuar practicando peticiones durante el juego con el pompero.',
  },
  {
    id: 2,
    nino: 'Sofía P.',
    modulo: '🪞 El Espejo',
    fecha: 'Ayer, 18:45',
    nota: '',
    estado: 'pendiente',
    avatar: 'S',
    resumenIa:
      'Sofía muestra interés por el juego frente al espejo. Se recomienda repetir gestos sencillos, respetar su ritmo y reforzar cada intento de imitación con una respuesta cálida.',
  },
  {
    id: 3,
    nino: 'Marco T.',
    modulo: '⏱️ El Reloj de la Calma',
    fecha: 'Lun, 09:10',
    nota: 'Usamos el columpio tal como indicaste.',
    estado: 'respondido',
    avatar: 'M',
    resumenIa:
      'Marco participa en la rutina del columpio. Se recomienda anticipar cada turno, acompañar los tiempos de espera y mantener una secuencia breve y predecible durante el juego.',
  },
];

export type Paciente = {
  id: number;
  nombre: string;
  apellidos: string;
  fechaNacimiento: string;
  sexo: string;
  diagnostico: string;
  hitosAsignados: number[];
  observacionesFamilia: string;
  avatar: string;
};

export const PACIENTES: Paciente[] = [
  {
    id: 1,
    nombre: 'Lucas',
    apellidos: 'Martín G.',
    fechaNacimiento: '2023-03-15',
    sexo: 'Niño',
    diagnostico: 'Retraso en el desarrollo del lenguaje',
    hitosAsignados: [1, 2, 3],
    observacionesFamilia: 'Lucas muestra más interés por los pomperos. Esta semana ha señalado 2 veces hacia el estante.',
    avatar: 'L',
  },
  {
    id: 2,
    nombre: 'Sofía',
    apellidos: 'P.',
    fechaNacimiento: '2022-10-02',
    sexo: 'Niña',
    diagnostico: 'Sospecha de TEA en valoración',
    hitosAsignados: [3],
    observacionesFamilia: '',
    avatar: 'S',
  },
  {
    id: 3,
    nombre: 'Marco',
    apellidos: 'T.',
    fechaNacimiento: '2021-08-20',
    sexo: 'Niño',
    diagnostico: 'Retraso psicomotor',
    hitosAsignados: [2, 4],
    observacionesFamilia: 'Usamos el columpio tal como indicaste.',
    avatar: 'M',
  },
];

export type Tarea = {
  id: number;
  titulo: string;
  modulo: string;
  pacientes: string;
  frecuencia: string;
  estado: 'activa' | 'completada';
};

export const TAREAS: Tarea[] = [
  { id: 1, titulo: 'Pedir el pompero', modulo: '💬 Intención Comunicativa', pacientes: 'Lucas M.', frecuencia: '3 veces esta semana', estado: 'activa' },
  { id: 2, titulo: 'Canción frente al espejo', modulo: '🪞 El Espejo', pacientes: 'Sofía P.', frecuencia: '2 veces esta semana', estado: 'activa' },
  { id: 3, titulo: 'Esperar antes del columpio', modulo: '⏱️ El Reloj de la Calma', pacientes: 'Marco T.', frecuencia: 'Completada', estado: 'completada' },
];

export const INSIGNIAS = ['🏅 ¡Excelente imitación!', '⭐ Familia Constante', '💪 Gran esfuerzo', '🌟 Progreso increíble'];
