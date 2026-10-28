import { supabase } from '../utils/supabase';
import { BUCKET_FEEDBACK, ESTADO_PRACTICA_CON_FEEDBACK } from './feedbackService';

// Código de estado de una práctica que la familia ya ha enviado. En pantalla se muestra como «Enviada».
export const ESTADO_PRACTICA_ENVIADA = 'completada';

interface PracticaParaFeedback {
  id: string;
  terapeuta_id: string;
  paciente_id: string;
  modulo_id: string;
  estado: string;
}

// El feedback es una nota de voz o un texto escrito por la terapeuta
export type ContenidoFeedback = { uriAudio: string } | { texto: string };

export interface FeedbackGuardado {
  id: string;
  tarea_id: string;
  terapeuta_id: string;
  paciente_id: string;
  modulo_id: string;
  audio_url: string | null;
  transcripcion: string | null;
  fecha_evaluacion: string;
  enviado_en: string;
}

// Tipo de contenido de cada formato de audio, para que la familia (UT 1352) pueda reproducirlo
const TIPOS_AUDIO: Record<string, string> = {
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  '3gp': 'audio/3gpp',
  aac: 'audio/aac',
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
};

// Extensión del audio grabado. En el móvil viene en la ruta del fichero (…/grabacion.m4a);
// en web la URI es «blob:…» y se saca del tipo MIME («audio/webm;codecs=opus» -> «webm»).
export const extensionDeAudio = (uriAudio: string, tipoMime: string): string => {
  const enRuta = uriAudio.startsWith('blob:') ? undefined : uriAudio.split('?')[0].match(/\.([a-z0-9]+)$/i)?.[1];
  if (enRuta) return enRuta.toLowerCase();

  const subtipo = tipoMime.split(';')[0].split('/')[1]?.replace(/^x-/, '').replace(/[^a-z0-9]/gi, '');
  return subtipo ? subtipo.toLowerCase() : 'm4a';
};

const tipoDeContenido = (extension: string, tipoMime: string) =>
  TIPOS_AUDIO[extension] ?? (tipoMime.split(';')[0] || 'application/octet-stream');

// Deshacer lo ya hecho si un paso posterior falla, para no dejar la práctica a medias.
// Si deshacer también falla, se ignora: el error que se muestra es el del paso original.
const borrarAudio = async (ruta: string) => {
  try {
    await supabase.storage.from(BUCKET_FEEDBACK).remove([ruta]);
  } catch {
    // sin acción
  }
};

const borrarFilaFeedback = async (tareaId: string) => {
  try {
    await supabase.from('feedbacks').delete().eq('tarea_id', tareaId);
  } catch {
    // sin acción
  }
};

// Sube la nota de voz al bucket privado como «<id de la práctica>.<extensión>» (sobrescribe si ya existe)
// y devuelve su ruta dentro del bucket
const subirAudio = async (practicaId: string, uriAudio: string): Promise<string> => {
  let respuesta: Response;
  try {
    respuesta = await fetch(uriAudio);
  } catch {
    throw new Error('No se pudo leer la nota de voz grabada.');
  }
  const tipoMime = respuesta.headers.get('content-type') ?? '';
  // ArrayBuffer y no Blob: en iOS/Android un Blob de fetch se sube vacío a Supabase
  const audio = await respuesta.arrayBuffer();
  const extension = extensionDeAudio(uriAudio, tipoMime);
  const ruta = `${practicaId}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET_FEEDBACK)
    .upload(ruta, audio, { contentType: tipoDeContenido(extension, tipoMime), upsert: true });

  if (error) throw new Error('No se pudo subir la nota de voz: ' + error.message);
  return ruta;
};

// UT 1099 · La terapeuta da feedback (nota de voz o texto) sobre una práctica que la familia ya ha enviado.
// Orden: 1) subir el audio, si lo hay, 2) crear la fila de feedbacks, 3) pasar la práctica a «evaluada».
export const enviarFeedback = async (
  practicaId: string,
  contenido: ContenidoFeedback,
): Promise<FeedbackGuardado> => {
  const texto = 'texto' in contenido ? contenido.texto.trim() : null;
  if (texto === '') throw new Error('Escribe el feedback antes de enviarlo.');

  // 0. Datos de la práctica: terapeuta, paciente y módulo van también en la fila de feedback
  const { data: practica, error: errorPractica } = await supabase
    .from('tareas')
    .select('id, terapeuta_id, paciente_id, modulo_id, estado')
    .eq('id', practicaId)
    .single();

  if (errorPractica || !practica) {
    throw new Error('No se encontró la práctica: ' + (errorPractica?.message ?? 'sin respuesta'));
  }
  const { terapeuta_id, paciente_id, modulo_id, estado } = practica as PracticaParaFeedback;
  if (estado !== ESTADO_PRACTICA_ENVIADA) {
    throw new Error('Esta práctica no está pendiente de revisar.');
  }

  // 1. Nota de voz al bucket
  const ruta = 'uriAudio' in contenido ? await subirAudio(practicaId, contenido.uriAudio) : null;

  // 2. Fila de feedback. Una práctica tiene como máximo un feedback (tarea_id es único).
  // El texto escrito va en «transcripcion», que es lo que la familia ve como comentario escrito (UT 1352).
  // En una nota de voz la transcripción, el resumen y la insignia quedan vacíos: son del Sprint 2 (IA).
  const ahora = new Date().toISOString();
  const { data: filas, error: errorFila } = await supabase
    .from('feedbacks')
    .upsert(
      {
        tarea_id: practicaId,
        terapeuta_id,
        paciente_id,
        modulo_id,
        audio_url: ruta,
        fecha_evaluacion: ahora,
        enviado_en: ahora,
        transcripcion: texto,
        resumen_estructurado: null,
        insignia: null,
      },
      { onConflict: 'tarea_id' },
    )
    .select();

  if (errorFila || !filas || filas.length === 0) {
    if (ruta) await borrarAudio(ruta);
    throw new Error(
      'No se pudo guardar el feedback: ' + (errorFila?.message ?? 'posible bloqueo de permisos (RLS)'),
    );
  }

  // 3. La práctica pasa a «Con feedback». Solo si sigue «Enviada», por si otra pestaña ya la evaluó.
  const { data: actualizadas, error: errorEstado } = await supabase
    .from('tareas')
    .update({ estado: ESTADO_PRACTICA_CON_FEEDBACK })
    .eq('id', practicaId)
    .eq('estado', ESTADO_PRACTICA_ENVIADA)
    .select();

  if (errorEstado || !actualizadas || actualizadas.length === 0) {
    await borrarFilaFeedback(practicaId);
    if (ruta) await borrarAudio(ruta);
    throw new Error(
      'No se pudo marcar la práctica como «Con feedback»: ' +
        (errorEstado?.message ?? 'posible bloqueo de permisos (RLS)'),
    );
  }

  return filas[0] as FeedbackGuardado;
};
