import { supabase } from '../utils/supabase';

// Nueva interfaz (KAIRÓS) · Datos del inicio de la terapeuta.

export interface EvidenciaPorRevisar {
  id: string;
  modulo: string;
  nino: string;
  fechaEnvio: string | null;
}

export interface PacienteConProgreso {
  id: string;
  nombreNino: string;
  completadas: number; // prácticas enviadas o con feedback
  total: number;
}

type Relacion<T> = T | T[] | null;
const unoSolo = <T,>(valor: Relacion<T> | undefined): T | null => (Array.isArray(valor) ? valor[0] ?? null : valor ?? null);

const ESTADOS_HECHOS = ['completada', 'evaluada'];

// Prácticas que las familias han enviado y esperan el visto bueno, la más reciente primero
export const obtenerEvidenciasPorRevisar = async (terapeutaId: string): Promise<EvidenciaPorRevisar[]> => {
  const { data, error } = await supabase
    .from('tareas')
    .select('id, fecha_envio, pacientes ( nombre_nino ), modulos ( titulo )')
    .eq('terapeuta_id', terapeutaId)
    .eq('estado', 'completada')
    .order('fecha_envio', { ascending: false });

  if (error) throw new Error('No se pudieron cargar las evidencias: ' + error.message);

  type Fila = { id: string; fecha_envio: string | null; pacientes: Relacion<{ nombre_nino: string }>; modulos: Relacion<{ titulo: string }> };
  return ((data ?? []) as Fila[]).map((f) => ({
    id: f.id,
    fechaEnvio: f.fecha_envio,
    nino: unoSolo(f.pacientes)?.nombre_nino ?? 'Paciente',
    modulo: unoSolo(f.modulos)?.titulo ?? 'Práctica',
  }));
};

// Pacientes de la terapeuta con cuántas de sus prácticas ya están hechas
export const obtenerPacientesConProgreso = async (terapeutaId: string): Promise<PacienteConProgreso[]> => {
  const { data: pacientes, error } = await supabase
    .from('pacientes')
    .select('id, nombre_nino')
    .eq('terapeuta_asignado_id', terapeutaId)
    .order('nombre_nino');
  if (error) throw new Error('No se pudieron cargar los pacientes: ' + error.message);

  const lista = (pacientes ?? []) as { id: string; nombre_nino: string }[];
  if (lista.length === 0) return [];

  const { data: tareas, error: errorTareas } = await supabase
    .from('tareas')
    .select('paciente_id, estado')
    .in('paciente_id', lista.map((p) => p.id));
  if (errorTareas) throw new Error('No se pudo calcular el progreso: ' + errorTareas.message);

  const cuenta = new Map<string, { completadas: number; total: number }>();
  for (const t of (tareas ?? []) as { paciente_id: string; estado: string }[]) {
    const c = cuenta.get(t.paciente_id) ?? { completadas: 0, total: 0 };
    c.total++;
    if (ESTADOS_HECHOS.includes(t.estado)) c.completadas++;
    cuenta.set(t.paciente_id, c);
  }

  return lista.map((p) => ({ id: p.id, nombreNino: p.nombre_nino, ...(cuenta.get(p.id) ?? { completadas: 0, total: 0 }) }));
};

// ---- Formatos de la pantalla ----

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const dos = (n: number) => String(n).padStart(2, '0');

// «Lunes, 9 de noviembre»
export const fechaLarga = (dia: Date) => `${DIAS[dia.getDay()]}, ${dia.getDate()} de ${MESES_LARGOS[dia.getMonth()]}`;

// «Lunes, 9 de noviembre.»
export const fechaDeHoy = (hoy: Date = new Date()) => `${fechaLarga(hoy)}.`;

// «Hoy, 12:30» · «Ayer, 09:05» · «5 nov, 18:40»
export const horaRelativa = (iso: string | null, hoy: Date = new Date()): string => {
  if (!iso) return '';
  const f = new Date(iso);
  const hora = `${dos(f.getHours())}:${dos(f.getMinutes())}`;
  const dia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diferencia = Math.round((dia(hoy) - dia(f)) / 86_400_000);
  if (diferencia === 0) return `Hoy, ${hora}`;
  if (diferencia === 1) return `Ayer, ${hora}`;
  return `${f.getDate()} ${MESES[f.getMonth()]}, ${hora}`;
};

// Porcentaje entero de prácticas hechas
export const porcentaje = (completadas: number, total: number) => (total === 0 ? 0 : Math.round((completadas / total) * 100));

// Patrón de cada módulo del catálogo (Design system de Figma, «Patrones»). Los módulos personalizados no tienen.
export type PatronModulo =
  | 'intencion-comunicativa'
  | 'reloj-de-la-calma'
  | 'el-espejo'
  | 'manos-a-la-obra'
  | 'mis-primeras-palabras';

const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

export const patronDeModulo = (titulo: string): PatronModulo | null => {
  const t = normalizar(titulo);
  if (t.includes('intencion comunicativa')) return 'intencion-comunicativa';
  if (t.includes('reloj de la calma')) return 'reloj-de-la-calma';
  if (t.includes('espejo')) return 'el-espejo';
  if (t.includes('manos a la obra')) return 'manos-a-la-obra';
  if (t.includes('primeras palabras')) return 'mis-primeras-palabras';
  return null;
};
