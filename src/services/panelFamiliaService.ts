import { supabase } from '../utils/supabase';
import { FeedbackResumen } from './feedbackService';

// Códigos de estado de una práctica y cómo se muestran en pantalla
const TEXTO_ESTADO: Record<string, string> = {
  pendientes: 'Pendiente',
  completada: 'Enviada',
  evaluada: 'Con feedback',
};

export const textoEstado = (estado: string) => TEXTO_ESTADO[estado] ?? estado;

export interface ModuloPractica {
  id: string;
  titulo: string;
  objetivo: string | null;
  video_guia_url: string | null;
  ideas_materiales: string[] | string | null;
}

export interface PracticaFamilia {
  id: string;
  estado: string;
  fecha_asignacion: string | null;
  fecha_envio: string | null;
  modulos: ModuloPractica | null;
  feedback: FeedbackResumen | null;
}

export interface GrupoModulo {
  moduloId: string;
  titulo: string;
  practicas: PracticaFamilia[];
}

interface FilaPractica extends Omit<PracticaFamilia, 'modulos' | 'feedback'> {
  modulos: ModuloPractica | ModuloPractica[] | null;
  feedbacks: FeedbackResumen | FeedbackResumen[] | null;
}

// Supabase devuelve un objeto, una lista o null según la relación: se normaliza a un único valor
function unoSolo<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

// UT 1141 · Todas las prácticas del paciente (pendientes, enviadas y con feedback), la más reciente primero
export const obtenerPracticasDelPaciente = async (pacienteId: string): Promise<PracticaFamilia[]> => {
  const { data, error } = await supabase
    .from('tareas')
    .select(
      `
      id,
      estado,
      fecha_asignacion,
      fecha_envio,
      modulos ( id, titulo, objetivo, video_guia_url, ideas_materiales ),
      feedbacks ( audio_url, enviado_en, fecha_evaluacion, insignia, transcripcion, resumen_estructurado )
    `,
    )
    .eq('paciente_id', pacienteId)
    .order('fecha_asignacion', { ascending: false });

  if (error) throw new Error('Error al cargar las prácticas: ' + error.message);

  return ((data ?? []) as FilaPractica[]).map(({ feedbacks, modulos, ...practica }) => ({
    ...practica,
    modulos: unoSolo(modulos),
    feedback: unoSolo(feedbacks),
  }));
};

// Agrupa las prácticas por módulo, en el orden del catálogo de módulos.
// Dentro de cada módulo se mantiene el orden recibido (la más reciente primero).
export const agruparPorModulo = (practicas: PracticaFamilia[]): GrupoModulo[] => {
  const grupos = new Map<string, GrupoModulo>();
  for (const practica of practicas) {
    const moduloId = practica.modulos?.id ?? 'sin-modulo';
    const grupo = grupos.get(moduloId) ?? {
      moduloId,
      titulo: practica.modulos?.titulo ?? 'Módulo asignado',
      practicas: [],
    };
    grupo.practicas.push(practica);
    grupos.set(moduloId, grupo);
  }
  return [...grupos.values()].sort((a, b) => a.moduloId.localeCompare(b.moduloId));
};

const fechaFeedback = (practica: PracticaFamilia) =>
  practica.feedback?.enviado_en ?? practica.feedback?.fecha_evaluacion ?? '';

// La práctica con el feedback más reciente: es la que la familia ve arriba del todo y marcada como nueva
export const practicaConFeedbackMasReciente = (practicas: PracticaFamilia[]): PracticaFamilia | null =>
  practicas
    .filter((p) => p.feedback)
    .reduce<PracticaFamilia | null>(
      (masReciente, p) => (!masReciente || fechaFeedback(p) > fechaFeedback(masReciente) ? p : masReciente),
      null,
    );
