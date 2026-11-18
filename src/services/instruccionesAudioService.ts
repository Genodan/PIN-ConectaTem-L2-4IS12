import { supabase } from '../utils/supabase';

// UT 1406 · Audio de las instrucciones de una práctica, generado con IA al guardarla.
// El bucket es privado: el audio se abre con una URL firmada que caduca.
const BUCKET_AUDIO_INSTRUCCIONES = 'audios-instrucciones';
const SEGUNDOS_VALIDEZ_AUDIO = 3600;

// Pide a la Edge Function que genere el audio de una práctica. No espera a que termine y NUNCA lanza:
// el audio es una mejora, y si falla la familia oye las instrucciones con la voz del dispositivo.
export const solicitarAudioInstrucciones = (tareaId: string): void => {
  void (async () => {
    try {
      const { error } = await supabase.functions.invoke('generar-audio-instrucciones', {
        body: { tarea_id: tareaId },
      });
      if (error) console.warn('No se pudo generar el audio de las instrucciones:', error.message);
    } catch (error) {
      console.warn('No se pudo generar el audio de las instrucciones:', error);
    }
  })();
};

// Convierte la ruta guardada en tareas.instrucciones_audio en una URL para reproducir el audio
export const obtenerUrlAudioInstrucciones = async (ruta: string): Promise<string> => {
  if (/^https?:\/\//.test(ruta)) return ruta;
  const rutaEnBucket = ruta.replace(new RegExp(`^${BUCKET_AUDIO_INSTRUCCIONES}/`), '');
  const { data, error } = await supabase.storage
    .from(BUCKET_AUDIO_INSTRUCCIONES)
    .createSignedUrl(rutaEnBucket, SEGUNDOS_VALIDEZ_AUDIO);
  if (error || !data) {
    throw new Error('No se pudo cargar el audio de las instrucciones: ' + (error?.message ?? 'sin respuesta'));
  }
  return data.signedUrl;
};
