import { supabase } from '../utils/supabase';
import { inicioDelDia } from './calendarioService';
import { porcentaje } from './inicioTerapeutaService';

// Nueva interfaz (KAIRÓS) · Pestaña «Pacientes» de la terapeuta: listado con progreso semanal y ficha del niño.

const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ESTADOS_HECHOS = ['completada', 'evaluada'];
const DIA_MS = 86_400_000;

type Relacion<T> = T | T[] | null;
const unoSolo = <T,>(valor: Relacion<T> | undefined): T | null => (Array.isArray(valor) ? valor[0] ?? null : valor ?? null);
const variosDe = <T,>(valor: Relacion<T> | undefined): T[] => (Array.isArray(valor) ? valor : valor ? [valor] : []);

// ---------- Listado ----------

export interface UltimaActividad {
  tipo: 'tarea' | 'nota';
  fecha: string;
}

export interface PacienteDelListado {
  id: string;
  nombre: string; // nombre y primer apellido: «Lucas Martín»
  identificador: string;
  progresoSemanal: number; // %
  ultimaActividad: UltimaActividad | null;
}

// Lunes 00:00 de la semana de «hoy» y lunes siguiente
export const limitesDeLaSemana = (hoy: Date = new Date()) => {
  const dia = inicioDelDia(hoy);
  const lunes = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() - ((dia.getDay() + 6) % 7));
  return { desde: lunes, hasta: new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 7) };
};

type FilaTareaListado = { paciente_id: string; estado: string; fecha_asignacion: string | null; fecha_envio: string | null };

// Progreso semanal: de las prácticas asignadas esta semana, cuántas están hechas (enviadas o con feedback)
export const progresoSemanal = (tareas: Pick<FilaTareaListado, 'estado' | 'fecha_asignacion'>[], hoy: Date = new Date()) => {
  const { desde, hasta } = limitesDeLaSemana(hoy);
  const deLaSemana = tareas.filter((t) => {
    if (!t.fecha_asignacion) return false;
    const f = new Date(t.fecha_asignacion).getTime();
    return f >= desde.getTime() && f < hasta.getTime();
  });
  return porcentaje(deLaSemana.filter((t) => ESTADOS_HECHOS.includes(t.estado)).length, deLaSemana.length);
};

const masReciente = (a: UltimaActividad | null, b: UltimaActividad | null) => {
  if (!a) return b;
  if (!b) return a;
  return new Date(b.fecha).getTime() > new Date(a.fecha).getTime() ? b : a;
};

const nombreCorto = (nombre: string, apellidos: string | null) => {
  const primerApellido = apellidos?.trim().split(/\s+/)[0];
  return primerApellido ? `${nombre} ${primerApellido}` : nombre;
};

export const obtenerListadoPacientes = async (terapeutaId: string, hoy: Date = new Date()): Promise<PacienteDelListado[]> => {
  const { data: pacientes, error } = await supabase
    .from('pacientes')
    .select('id, nombre_nino, apellidos, identificador')
    .eq('terapeuta_asignado_id', terapeutaId)
    .order('nombre_nino');
  if (error) throw new Error('No se pudieron cargar los pacientes: ' + error.message);

  const lista = (pacientes ?? []) as { id: string; nombre_nino: string; apellidos: string | null; identificador: string | null }[];
  if (lista.length === 0) return [];
  const ids = lista.map((p) => p.id);

  const [tareas, sesiones] = await Promise.all([
    supabase.from('tareas').select('paciente_id, estado, fecha_asignacion, fecha_envio').in('paciente_id', ids),
    supabase.from('sesiones').select('paciente_id, notas ( creada_en )').in('paciente_id', ids),
  ]);
  if (tareas.error) throw new Error('No se pudo calcular el progreso: ' + tareas.error.message);
  if (sesiones.error) throw new Error('No se pudieron cargar las notas: ' + sesiones.error.message);

  const tareasPorPaciente = new Map<string, FilaTareaListado[]>();
  for (const t of (tareas.data ?? []) as FilaTareaListado[]) {
    tareasPorPaciente.set(t.paciente_id, [...(tareasPorPaciente.get(t.paciente_id) ?? []), t]);
  }

  const ultimaNota = new Map<string, UltimaActividad | null>();
  type FilaSesion = { paciente_id: string; notas: Relacion<{ creada_en: string }> };
  for (const s of (sesiones.data ?? []) as FilaSesion[]) {
    for (const n of variosDe(s.notas)) {
      ultimaNota.set(s.paciente_id, masReciente(ultimaNota.get(s.paciente_id) ?? null, { tipo: 'nota', fecha: n.creada_en }));
    }
  }

  return lista.map((p) => {
    const suyas = tareasPorPaciente.get(p.id) ?? [];
    const ultimaTarea = suyas
      .filter((t) => t.fecha_envio)
      .reduce<UltimaActividad | null>((acc, t) => masReciente(acc, { tipo: 'tarea', fecha: t.fecha_envio as string }), null);
    return {
      id: p.id,
      nombre: nombreCorto(p.nombre_nino, p.apellidos),
      identificador: p.identificador ?? '',
      progresoSemanal: progresoSemanal(suyas, hoy),
      ultimaActividad: masReciente(ultimaTarea, ultimaNota.get(p.id) ?? null),
    };
  });
};

// «Tarea enviada · Hoy» · «Nota enviada · Hace 3 días» · «Tarea enviada · 2 de noviembre»
export const textoUltimaActividad = (actividad: UltimaActividad | null, hoy: Date = new Date()) => {
  if (!actividad) return 'Sin actividad todavía';
  const que = actividad.tipo === 'tarea' ? 'Tarea enviada' : 'Nota enviada';
  const f = new Date(actividad.fecha);
  const dias = Math.round((inicioDelDia(hoy).getTime() - inicioDelDia(f).getTime()) / DIA_MS);
  if (dias <= 0) return `${que} · Hoy`;
  if (dias === 1) return `${que} · Hace 1 día`;
  if (dias < 7) return `${que} · Hace ${dias} días`;
  return `${que} · ${f.getDate()} de ${MESES_LARGOS[f.getMonth()]}`;
};

// Busca por identificador («#0683…» o sin «#») o por nombre, sin tener en cuenta mayúsculas ni tildes
const normalizar = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
export const filtrarPacientes = <T extends { nombre: string; identificador: string }>(lista: T[], busqueda: string): T[] => {
  const q = normalizar(busqueda).replace(/^#/, '');
  if (!q) return lista;
  return lista.filter((p) => p.identificador.includes(q) || normalizar(p.nombre).includes(q));
};

// ---------- Ficha ----------

export interface DatosPaciente {
  id: string;
  nombreNino: string;
  apellidos: string | null;
  fechaNacimiento: string | null; // «2023-06-23»
  identificador: string;
  email: string | null;
  telefono: string | null;
  telefonoFijo: string | null;
  tutor1: string | null;
  tutor2: string | null;
  necesidadesObjetivos: string | null;
}

export type EstadoHistorial = 'Pendiente' | 'Por revisar' | 'Completada';

export interface TareaDelHistorial {
  id: string;
  titulo: string; // las prácticas no tienen título propio: se muestra el módulo
  estado: EstadoHistorial;
}

export interface NotaDelPaciente {
  id: string;
  fechaSesion: string;
  texto: string;
}

export interface FichaPaciente {
  datos: DatosPaciente;
  completadas: number;
  pendientes: number;
  sesionesAtendidas: number;
  historial: TareaDelHistorial[]; // de la más reciente a la más antigua
  notas: NotaDelPaciente[]; // de la sesión más reciente a la más antigua
}

export const ESTADO_EN_HISTORIAL: Record<string, EstadoHistorial> = {
  pendientes: 'Pendiente',
  completada: 'Por revisar',
  evaluada: 'Completada',
};

type FilaPaciente = {
  id: string;
  nombre_nino: string;
  apellidos: string | null;
  fecha_nacimiento: string | null;
  identificador: string | null;
  email: string | null;
  telefono: string | null;
  telefono_fijo: string | null;
  tutor_1: string | null;
  tutor_2: string | null;
  necesidades_objetivos: string | null;
};

const COLUMNAS_PACIENTE =
  'id, nombre_nino, apellidos, fecha_nacimiento, identificador, email, telefono, telefono_fijo, tutor_1, tutor_2, necesidades_objetivos';

const aDatos = (f: FilaPaciente): DatosPaciente => ({
  id: f.id,
  nombreNino: f.nombre_nino,
  apellidos: f.apellidos,
  fechaNacimiento: f.fecha_nacimiento,
  identificador: f.identificador ?? '',
  email: f.email,
  telefono: f.telefono,
  telefonoFijo: f.telefono_fijo,
  tutor1: f.tutor_1,
  tutor2: f.tutor_2,
  necesidadesObjetivos: f.necesidades_objetivos,
});

export const obtenerFichaPaciente = async (pacienteId: string, ahora: Date = new Date()): Promise<FichaPaciente> => {
  const [paciente, tareas, sesiones] = await Promise.all([
    supabase.from('pacientes').select(COLUMNAS_PACIENTE).eq('id', pacienteId).single(),
    supabase
      .from('tareas')
      .select('id, estado, fecha_asignacion, modulos ( titulo )')
      .eq('paciente_id', pacienteId)
      .order('fecha_asignacion', { ascending: false }),
    supabase
      .from('sesiones')
      .select('id, empieza_en, notas ( id, texto )')
      .eq('paciente_id', pacienteId)
      .order('empieza_en', { ascending: false }),
  ]);
  if (paciente.error) throw new Error('No se pudo cargar la ficha del paciente: ' + paciente.error.message);
  if (tareas.error) throw new Error('No se pudo cargar el historial de tareas: ' + tareas.error.message);
  if (sesiones.error) throw new Error('No se pudieron cargar las sesiones: ' + sesiones.error.message);

  type FilaTarea = { id: string; estado: string; modulos: Relacion<{ titulo: string }> };
  const listaTareas = (tareas.data ?? []) as FilaTarea[];

  type FilaSesion = { id: string; empieza_en: string; notas: Relacion<{ id: string; texto: string }> };
  const listaSesiones = (sesiones.data ?? []) as FilaSesion[];

  return {
    datos: aDatos(paciente.data as FilaPaciente),
    completadas: listaTareas.filter((t) => ESTADOS_HECHOS.includes(t.estado)).length,
    pendientes: listaTareas.filter((t) => t.estado === 'pendientes').length,
    sesionesAtendidas: listaSesiones.filter((s) => new Date(s.empieza_en).getTime() < ahora.getTime()).length,
    historial: listaTareas.map((t) => ({
      id: t.id,
      titulo: unoSolo(t.modulos)?.titulo ?? 'Práctica',
      estado: ESTADO_EN_HISTORIAL[t.estado] ?? 'Pendiente',
    })),
    notas: listaSesiones.flatMap((s) => variosDe(s.notas).map((n) => ({ id: n.id, fechaSesion: s.empieza_en, texto: n.texto }))),
  };
};

// «3 años · 23 de junio de 2023» (o «8 meses · …» para los menores de un año)
export const edadYNacimiento = (fechaNacimiento: string | null, hoy: Date = new Date()) => {
  if (!fechaNacimiento) return null;
  const [a, m, d] = fechaNacimiento.split('-').map(Number);
  let meses = (hoy.getFullYear() - a) * 12 + (hoy.getMonth() - (m - 1));
  if (hoy.getDate() < d) meses--;
  const edad = meses >= 12 ? `${Math.floor(meses / 12)} ${Math.floor(meses / 12) === 1 ? 'año' : 'años'}` : `${Math.max(meses, 0)} ${meses === 1 ? 'mes' : 'meses'}`;
  return `${edad} · ${d} de ${MESES_LARGOS[m - 1]} de ${a}`;
};

// «11 de noviembre de 2026»
export const fechaDeNota = (iso: string) => {
  const f = new Date(iso);
  return `${f.getDate()} de ${MESES_LARGOS[f.getMonth()]} de ${f.getFullYear()}`;
};

// ---------- Editar los datos de la ficha ----------

export interface CambiosPaciente {
  nombreNino: string;
  apellidos: string;
  fechaNacimiento: string; // «23/06/2023» o vacío
  email: string;
  telefono: string;
  telefonoFijo: string;
  tutor1: string;
  tutor2: string;
  necesidadesObjetivos: string;
}

// «23/06/2023» → «2023-06-23». Devuelve null si está vacío y lanza error si no es una fecha válida.
export const fechaDeFormulario = (texto: string, hoy: Date = new Date()): string | null => {
  const t = texto.trim();
  if (!t) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  const fecha = m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
  if (!m || !fecha || fecha.getDate() !== Number(m[1]) || fecha.getMonth() !== Number(m[2]) - 1) {
    throw new Error('La fecha de nacimiento debe tener el formato DD/MM/AAAA.');
  }
  if (fecha.getTime() > hoy.getTime()) throw new Error('La fecha de nacimiento no puede ser futura.');
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
};

// «2023-06-23» → «23/06/2023»
export const fechaParaFormulario = (iso: string | null) => {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
};

const vacioANull = (t: string) => (t.trim() ? t.trim() : null);

export const actualizarDatosPaciente = async (pacienteId: string, cambios: CambiosPaciente): Promise<DatosPaciente> => {
  const nombre = cambios.nombreNino.trim();
  if (!nombre) throw new Error('El nombre del niño es obligatorio.');
  const email = cambios.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('El correo electrónico no es válido.');

  const { data, error } = await supabase
    .from('pacientes')
    .update({
      nombre_nino: nombre,
      apellidos: vacioANull(cambios.apellidos),
      fecha_nacimiento: fechaDeFormulario(cambios.fechaNacimiento),
      email: vacioANull(email),
      telefono: vacioANull(cambios.telefono),
      telefono_fijo: vacioANull(cambios.telefonoFijo),
      tutor_1: vacioANull(cambios.tutor1),
      tutor_2: vacioANull(cambios.tutor2),
      necesidades_objetivos: vacioANull(cambios.necesidadesObjetivos),
    })
    .eq('id', pacienteId)
    .select(COLUMNAS_PACIENTE)
    .single();

  if (error) throw new Error('No se pudieron guardar los datos: ' + error.message);
  return aDatos(data as FilaPaciente);
};

// ---------- Módulos (carrusel de la ficha) ----------

// Subtítulos cortos de los módulos del catálogo (Figma). Los módulos propios muestran su objetivo.
const SUBTITULOS: Record<string, string> = {
  'intencion-comunicativa': 'Expresar deseos y necesidades',
  'reloj-de-la-calma': 'Autorregulación emocional',
  'el-espejo': 'Reconocimiento corporal y conciencia propia',
  'manos-a-la-obra': 'Motricidad, coordinación y autonomía',
  'mis-primeras-palabras': 'Estimulación y ampliación del lenguaje',
};
export const subtituloDeModulo = (clavePatron: string | null, objetivo: string) => (clavePatron && SUBTITULOS[clavePatron]) || objetivo;

// ---------- Traspasos y «Archivados» ----------

export interface TerapeutaResumen {
  id: string;
  nombre: string;
}

export interface PacienteArchivado {
  id: string;
  nombre: string; // nombre y primer apellido
  identificador: string;
  traspasadoA: string;
  fecha: string;
}

// Terapeutas a las que se puede traspasar un niño (todas menos una misma)
export const obtenerOtrasTerapeutas = async (terapeutaId: string): Promise<TerapeutaResumen[]> => {
  const { data, error } = await supabase.from('terapeutas').select('id, nombre').neq('id', terapeutaId).order('nombre');
  if (error) throw new Error('No se pudieron cargar las terapeutas: ' + error.message);
  return (data ?? []) as TerapeutaResumen[];
};

// Pasa el niño a otra terapeuta y lo apunta en el historial (función de la base de datos, en un solo paso)
export const traspasarPaciente = async (pacienteId: string, terapeutaActual: string, terapeutaNueva: string): Promise<void> => {
  if (!terapeutaNueva) throw new Error('Elige a qué terapeuta quieres traspasarlo.');
  const { error } = await supabase.rpc('traspasar_paciente_sin_login', {
    p_paciente: pacienteId,
    p_terapeuta_actual: terapeutaActual,
    p_terapeuta_nueva: terapeutaNueva,
  });
  if (error) throw new Error('No se pudo traspasar el paciente: ' + error.message);
};

// Niños que la terapeuta traspasó y que ya no son suyos (si se los devuelven, vuelven a «Principales»)
export const obtenerArchivados = async (terapeutaId: string): Promise<PacienteArchivado[]> => {
  const { data, error } = await supabase
    .from('traspasos')
    .select(
      'fecha, pacientes ( id, nombre_nino, apellidos, identificador, terapeuta_asignado_id ), destino:terapeutas!traspasos_terapeuta_destino_id_fkey ( nombre )',
    )
    .eq('terapeuta_origen_id', terapeutaId)
    .order('fecha', { ascending: false });
  if (error) throw new Error('No se pudieron cargar los archivados: ' + error.message);

  type Fila = {
    fecha: string;
    pacientes: Relacion<{ id: string; nombre_nino: string; apellidos: string | null; identificador: string | null; terapeuta_asignado_id: string | null }>;
    destino: Relacion<{ nombre: string }>;
  };
  const vistos = new Set<string>();
  const archivados: PacienteArchivado[] = [];
  for (const f of (data ?? []) as Fila[]) {
    const p = unoSolo(f.pacientes);
    if (!p || vistos.has(p.id)) continue; // de cada niño, solo su último traspaso
    vistos.add(p.id);
    if (p.terapeuta_asignado_id === terapeutaId) continue; // se lo han devuelto
    archivados.push({
      id: p.id,
      nombre: nombreCorto(p.nombre_nino, p.apellidos),
      identificador: p.identificador ?? '',
      traspasadoA: unoSolo(f.destino)?.nombre ?? 'otra terapeuta',
      fecha: f.fecha,
    });
  }
  return archivados;
};

// «Traspasado a Javier Ortega · 20 de noviembre»
export const textoTraspaso = (a: Pick<PacienteArchivado, 'traspasadoA' | 'fecha'>) => {
  const f = new Date(a.fecha);
  return `Traspasado a ${a.traspasadoA} · ${f.getDate()} de ${MESES_LARGOS[f.getMonth()]}`;
};
