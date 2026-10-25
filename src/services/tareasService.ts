import { supabase } from '../utils/supabase';

// 1. Obtener todos los pacientes para el desplegable de la familia
export const obtenerTodosLosPacientes = async () => {
  const { data, error } = await supabase
    .from('pacientes')
    .select('id, nombre_nino, nombre_familia');

  if (error) {
    console.error('Error cargando pacientes:', error);
    throw new Error('Error al cargar pacientes: ' + error.message);
  }
  return data;
};

// 2. Obtener las tareas en estado 'pendientes'
export const obtenerTareasPendientes = async (pacienteId: string) => {
  const { data, error } = await supabase
    .from('tareas')
    .select(`
      id,
      estado,
      modulo_id,
      modulos (
        id,
        titulo,
        objetivo,
        video_guia_url,
        ideas_materiales
      )
    `)
    .eq('paciente_id', pacienteId)
    .eq('estado', 'pendientes');

  if (error) {
    console.error('Error cargando tareas pendientes:', error);
    throw new Error('Error al cargar tareas pendientes: ' + error.message);
  }
  return data;
};

// 3. Subir el archivo a Storage y luego actualizar la tarea a 'completada'
export const enviarPractica = async (tareaId: string, archivoUri: string) => {
  try {
    // 1. Transformar el archivo local (o de la web) en un formato Blob
    const response = await fetch(archivoUri);
    const blob = await response.blob();

    // 2. Extraer la extensión de forma segura desde el "tipo" real del archivo (MIME type)
    const mimeType = blob.type || 'video/mp4';
    
    // Si es "video/webm;codecs=vp9", nos quedamos solo con la palabra "webm"
    let extension = mimeType.split('/')[1]?.split(';')[0] || 'mp4';
    
    // Limpiamos cualquier carácter raro de la extensión por seguridad
    extension = extension.replace(/[^a-zA-Z0-9]/g, '');

    // 3. Crear un nombre de archivo completamente limpio
    const nombreArchivo = `tarea_${tareaId}_${Date.now()}.${extension}`;

    // 4. Subir el archivo al bucket 'videos-practicas' de Supabase
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos-practicas')
      .upload(nombreArchivo, blob, {
        contentType: mimeType, // Le decimos a Supabase el tipo exacto de vídeo
      });

    if (uploadError) throw new Error('Fallo al subir el vídeo: ' + uploadError.message);

    // 5. Obtener la URL pública y accesible desde cualquier dispositivo
    const { data: publicUrlData } = supabase.storage
      .from('videos-practicas')
      .getPublicUrl(nombreArchivo);

    const videoUrlPublica = publicUrlData.publicUrl;

    // 6. Guardar la URL pública en la tabla tareas
    const { data, error } = await supabase
      .from('tareas')
      .update({ 
        estado: 'completada', 
        video_url: videoUrlPublica,
        fecha_envio: new Date().toISOString()
      })
      .eq('id', tareaId)
      .select();

    if (error) throw new Error('Error al actualizar la tarea: ' + error.message);
    if (!data || data.length === 0) throw new Error('No se pudo actualizar la tarea en Supabase.');

    return data[0];
  } catch (error: any) {
    console.error("Error en enviarPractica:", error);
    throw error;
  }
};

// 4. Obtener las tareas completadas (Bandeja de entrada del terapeuta)
export const obtenerTareasCompletadas = async (terapeutaId: string) => {
  const { data, error } = await supabase
    .from('tareas')
    .select(`
      id,
      estado,
      video_url,
      fecha_envio,
      pacientes (
        nombre_nino,
        nombre_familia
      ),
      modulos (
        titulo
      )
    `)
    .eq('terapeuta_id', terapeutaId)
    .eq('estado', 'completada');

  if (error) {
    console.error('Error cargando bandeja del terapeuta:', error);
    throw new Error('Error al cargar la bandeja: ' + error.message);
  }
  return data;
};