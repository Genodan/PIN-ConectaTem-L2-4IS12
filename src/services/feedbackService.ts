import { supabase } from '../utils/supabase';

// Código de estado de una práctica con feedback. En pantalla se muestra como «Con feedback».
export const ESTADO_PRACTICA_CON_FEEDBACK = 'evaluada';

// Bucket privado de Storage donde la terapeuta (UT 1099) guarda las notas de voz
export const BUCKET_FEEDBACK = 'feedbacks';
const SEGUNDOS_URL_FIRMADA = 3600;

export interface FeedbackResumen {
  audio_url: string | null;
  enviado_en: string | null;
  fecha_evaluacion: string | null;
  insignia: string | null;
}

export interface PracticaConFeedback {
  id: string;
  modulo: string;
  terapeuta: string | null;
  feedback: FeedbackResumen | null;
}

interface NombreTerapeuta {
  nombre: string;
}

interface FilaFeedback extends FeedbackResumen {
  terapeutas: NombreTerapeuta | NombreTerapeuta[] | null;
}

interface FilaPractica {
  id: string;
  modulos: { titulo: string } | { titulo: string }[] | null;
  terapeutas: NombreTerapeuta | NombreTerapeuta[] | null;
  feedbacks: FilaFeedback | FilaFeedback[] | null;
}

// Supabase devuelve un objeto, una lista o null según la relación: se normaliza a un único valor
function unoSolo<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

// Prácticas del paciente que ya tienen feedback de la terapeuta, de la más reciente a la más antigua
export const obtenerPracticasConFeedback = async (pacienteId: string): Promise<PracticaConFeedback[]> => {
  const { data, error } = await supabase
    .from('tareas')
    .select(
      `
      id,
      modulos ( titulo ),
      terapeutas ( nombre ),
      feedbacks ( audio_url, enviado_en, fecha_evaluacion, insignia, terapeutas ( nombre ) )
    `,
    )
    .eq('paciente_id', pacienteId)
    .eq('estado', ESTADO_PRACTICA_CON_FEEDBACK)
    .order('fecha_envio', { ascending: false });

  if (error) throw new Error('Error al cargar el feedback: ' + error.message);

  return ((data ?? []) as FilaPractica[]).map((fila) => {
    const fb = unoSolo(fila.feedbacks);
    return {
      id: fila.id,
      modulo: unoSolo(fila.modulos)?.titulo ?? 'Módulo asignado',
      // Quien grabó el feedback; si no consta, la terapeuta de la práctica
      terapeuta: unoSolo(fb?.terapeutas)?.nombre ?? unoSolo(fila.terapeutas)?.nombre ?? null,
      feedback: fb
        ? {
            audio_url: fb.audio_url,
            enviado_en: fb.enviado_en,
            fecha_evaluacion: fb.fecha_evaluacion,
            insignia: fb.insignia,
          }
        : null,
    };
  });
};

// El audio está en un bucket privado: se pide una URL temporal (1 hora) a partir de su ruta.
// La ruta es la del fichero dentro del bucket; si empieza por «feedbacks/» se quita ese prefijo.
export const obtenerUrlAudio = async (rutaAudio: string): Promise<string> => {
  // Si ya es una URL completa (por ejemplo, en pruebas con un audio público), se usa tal cual
  if (/^https?:\/\//.test(rutaAudio)) return rutaAudio;

  const ruta = rutaAudio.replace(new RegExp(`^${BUCKET_FEEDBACK}/`), '');
  const { data, error } = await supabase.storage
    .from(BUCKET_FEEDBACK)
    .createSignedUrl(ruta, SEGUNDOS_URL_FIRMADA);

  if (error || !data) {
    throw new Error('No se pudo cargar el audio: ' + (error?.message ?? 'sin respuesta'));
  }
  return data.signedUrl;
};
