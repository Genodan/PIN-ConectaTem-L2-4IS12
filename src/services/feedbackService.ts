import { supabase } from '../utils/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Platform } from 'react-native';

export const BUCKET_FEEDBACK = 'feedbacks';
export const ESTADO_PRACTICA_CON_FEEDBACK = 'evaluada'; 
export const ESTADO_PRACTICA_ENVIADA = 'completada';

// 1. INTERFACES ACTUALIZADAS (UT 1353)
export interface ResumenEstructurado {
  punto_fuerte?: string | null;
  a_mejorar?: string | null;
  foco_semana?: string | null;
  foco_proxima_semana?: string | null;
}

export interface FeedbackResumen {
  id?: string;
  transcripcion: string | null;
  resumen_estructurado: ResumenEstructurado | null;
  insignia?: string | null;
  fecha_evaluacion?: string | null;
  enviado_en?: string | null;
  audio_url?: string | null;
  resumen_aprobado?: boolean | null;
  resumen_escrito?: string | null;
}

export interface PracticaConFeedback {
  id: string;
  modulo: string;
  terapeuta: string | null;
  feedback: FeedbackResumen | null;
}

export interface ContenidoFeedback {
  uriAudio?: string | null;
  texto?: string;
  transcripcion?: string;
  resumen_estructurado?: ResumenEstructurado | null;
  resumen_aprobado?: boolean;
}

interface FilaPractica {
  id: string;
  modulos: any;
  terapeutas: any;
  feedbacks: any;
}

const unoSolo = <T,>(item: T | T[] | null): T | null => {
  if (Array.isArray(item)) return item.length > 0 ? item[0] : null;
  return item;
};

// 2. FUNCIONES DEL SERVICIO

export const obtenerPracticasConFeedback = async (pacienteId: string): Promise<PracticaConFeedback[]> => {
  const { data, error } = await supabase
    .from('tareas')
    .select(`
      id,
      modulos ( titulo ),
      terapeutas ( nombre ),
      feedbacks (
        id,
        audio_url,
        enviado_en,
        fecha_evaluacion,
        insignia,
        transcripcion,
        resumen_estructurado,
        resumen_aprobado,
        resumen_escrito,
        terapeutas ( nombre )
      )
    `)
    .eq('paciente_id', pacienteId)
    .eq('estado', ESTADO_PRACTICA_CON_FEEDBACK)
    .order('fecha_envio', { ascending: false });

  if (error) {
    throw new Error('Error al cargar el feedback: ' + error.message);
  }

  return ((data ?? []) as unknown as FilaPractica[]).map((fila) => {
    const fb = unoSolo(fila.feedbacks);
    
    const feedbackFormateado: FeedbackResumen | null = fb ? {
      audio_url: fb.audio_url ?? null,
      enviado_en: fb.enviado_en ?? null,
      fecha_evaluacion: fb.fecha_evaluacion ?? null,
      insignia: fb.insignia ?? null,
      transcripcion: fb.transcripcion ?? null,
      resumen_estructurado: fb.resumen_estructurado ?? null,
      ...(fb.id !== undefined ? { id: fb.id } : {}),
      ...(fb.resumen_aprobado !== undefined ? { resumen_aprobado: fb.resumen_aprobado } : {}),
      ...(fb.resumen_escrito !== undefined ? { resumen_escrito: fb.resumen_escrito } : {}),
    } : null;

    return {
      id: fila.id,
      modulo: unoSolo(fila.modulos)?.titulo ?? 'Módulo asignado',
      terapeuta: unoSolo(fb?.terapeutas)?.nombre ?? unoSolo(fila.terapeutas)?.nombre ?? null,
      feedback: feedbackFormateado
    };
  });
};

export const obtenerUrlAudio = async (rutaAudio: string): Promise<string> => {
  if (/^https?:\/\//.test(rutaAudio)) return rutaAudio;
  const ruta = rutaAudio.replace(new RegExp(`^${BUCKET_FEEDBACK}/`), '');
  const { data, error } = await supabase.storage.from(BUCKET_FEEDBACK).createSignedUrl(ruta, 3600);
  if (error || !data) {
    throw new Error('No se pudo cargar el audio: ' + (error?.message ?? 'sin respuesta'));
  }
  return data.signedUrl;
};

export const enviarFeedback = async (practicaId: string, contenido: ContenidoFeedback) => {
  console.log('Enviando feedback...', { practicaId, contenido });
};

// 1. Crear el registro base y subir el audio a Storage
export const crearFeedbackInicial = async (practicaId: string, uriAudio: string): Promise<string> => {
  const ruta = `${practicaId}-${Date.now()}.m4a`;

  try {
    let datosParaSubir;
    let mimeType = 'audio/m4a';

    // BIFURCACIÓN DE PLATAFORMAS (WEB vs MÓVIL)
    if (Platform.OS === 'web') {
      // 1. Entorno Web (Navegadores, react-native-web)
      const respuesta = await fetch(uriAudio);
      datosParaSubir = await respuesta.arrayBuffer();
      mimeType = respuesta.headers.get('content-type') ?? mimeType;
    } else {
      // 2. Entorno Móvil Nativo (iOS / Android)
      const base64Audio = await FileSystem.readAsStringAsync(uriAudio, {
        encoding: FileSystem.EncodingType.Base64,
      });
      datosParaSubir = decode(base64Audio);
    }

    // Subimos los datos directamente a Supabase
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_FEEDBACK)
      .upload(ruta, datosParaSubir, { 
        contentType: mimeType, 
        upsert: true 
      });

    if (uploadError) throw uploadError;

    // Crear el registro inicial en la base de datos
    const { data: dbData, error: dbError } = await supabase
      .from('feedbacks')
      .insert({
        tarea_id: practicaId,
        audio_url: uploadData.path,
      })
      .select('id')
      .single();

    if (dbError) throw dbError;

    return dbData.id;

  } catch (error: any) {
    throw new Error('Error al subir el audio: ' + (error.message || 'Error desconocido'));
  }
};

// 2. Invocar a la Edge Function de Gemini (UT 1122)
export const procesarAudioConIA = async (feedbackId: string) => {
  const { data, error } = await supabase.functions.invoke('procesar-feedback', {
    body: { feedback_id: feedbackId },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  return data as { transcripcion: string; resumen_estructurado: ResumenEstructurado };
};

// Lo que decide la terapeuta al enviar (UT 1353): el resumen de la IA revisado y aprobado,
// o un resumen escrito por ella en lugar del de la IA
export interface DecisionFeedback {
  transcripcion: string | null;
  resumen_aprobado: boolean;
  resumen_estructurado: ResumenEstructurado | null;
  resumen_escrito: string | null;
}

// 3. Confirmar y guardar la decisión del terapeuta
export const actualizarFeedbackFinal = async (feedbackId: string, tareaId: string, contenido: DecisionFeedback) => {
  // 1. Obtenemos los IDs originales de la tarea
  const { data: tarea, error: tareaLecturaError } = await supabase
    .from('tareas')
    .select('terapeuta_id, paciente_id, modulo_id')
    .eq('id', tareaId)
    .single();

  if (tareaLecturaError || !tarea) {
    throw new Error('No se encontró la práctica: ' + (tareaLecturaError?.message ?? 'sin respuesta'));
  }

  // 2. Guardamos el feedback definitivo con todos los IDs correctos y la fecha de envío
  // (la familia ve arriba del todo el feedback enviado más reciente)
  const ahora = new Date().toISOString();
  const { error: feedbackError } = await supabase
    .from('feedbacks')
    .update({
      transcripcion: contenido.transcripcion,
      resumen_estructurado: contenido.resumen_estructurado,
      resumen_aprobado: contenido.resumen_aprobado,
      resumen_escrito: contenido.resumen_escrito,
      terapeuta_id: tarea.terapeuta_id,
      paciente_id: tarea.paciente_id,
      modulo_id: tarea.modulo_id,
      fecha_evaluacion: ahora,
      enviado_en: ahora,
    })
    .eq('id', feedbackId);

  if (feedbackError) throw new Error('Error al guardar el feedback: ' + feedbackError.message);

  // 3. ¡LA CLAVE! Cambiamos el estado de la tarea para que desaparezca del panel del terapeuta
  const { error: tareaError } = await supabase
    .from('tareas')
    .update({ estado: 'evaluada' })
    .eq('id', tareaId);

  if (tareaError) throw new Error('Error al actualizar la tarea: ' + tareaError.message);
};
