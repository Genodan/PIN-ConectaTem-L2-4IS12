import { supabase } from '../utils/supabase';

export const BUCKET_VIDEOS_GUIA = 'videos-guia';

export interface Modulo {
  id: string;
  titulo: string;
  objetivo: string;
  video_guia_url: string | null;
  ideas_materiales: string[] | null;
  terapeuta_id: string | null;
}

export interface DatosNuevoModulo {
  titulo: string;
  objetivo: string;
  ideas_materiales?: string[] | null;
  video_guia_url?: string | null;
  terapeuta_id: string;
}

export interface DatosActualizarModulo {
  titulo?: string;
  objetivo?: string;
  ideas_materiales?: string[] | null;
  video_guia_url?: string | null;
}

/**
 * Sube un archivo de vídeo al bucket 'videos guia'.
 * Devuelve el nombre/ruta asignado en el bucket.
 */
export const subirVideoGuia = async (
  uriArchivo: string,
  nombreOriginal?: string,
): Promise<string> => {
  try {
    const respuesta = await fetch(uriArchivo);
    const blob = await respuesta.blob();

    const mimeType = blob.type || 'video/mp4';
    let extension = mimeType.split('/')[1]?.split(';')[0] || 'mp4';
    extension = extension.replace(/[^a-zA-Z0-9]/g, '') || 'mp4';

    const baseNombre = nombreOriginal
      ? nombreOriginal.replace(/[^a-zA-Z0-9._-]/g, '_')
      : `video_${Date.now()}.${extension}`;

    const ruta = `guia_${Date.now()}_${baseNombre}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_VIDEOS_GUIA)
      .upload(ruta, blob, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      throw new Error('Fallo al subir el vídeo guía: ' + error.message);
    }

    return data?.path || ruta;
  } catch (error: any) {
    throw new Error('Error al procesar el vídeo guía: ' + error.message);
  }
};

/**
 * Obtiene solo los módulos personalizados creados por un terapeuta específico.
 */
export const obtenerModulosPropiosDeTerapeuta = async (
  terapeutaId: string,
): Promise<Modulo[]> => {
  const { data, error } = await supabase
    .from('modulos')
    .select('id, titulo, objetivo, video_guia_url, ideas_materiales, terapeuta_id')
    .eq('terapeuta_id', terapeutaId)
    .order('titulo');

  if (error) {
    throw new Error('Error al cargar módulos del terapeuta: ' + error.message);
  }

  return (data ?? []) as Modulo[];
};

/**
 * Crea un nuevo módulo personalizado para un terapeuta.
 */
export const crearModulo = async (datos: DatosNuevoModulo): Promise<Modulo> => {
  const tituloLimpio = datos.titulo?.trim();
  const objetivoLimpio = datos.objetivo?.trim();

  if (!tituloLimpio) {
    throw new Error('El título del módulo es obligatorio.');
  }
  if (!objetivoLimpio) {
    throw new Error('El objetivo del módulo es obligatorio.');
  }
  if (!datos.terapeuta_id) {
    throw new Error('Se requiere el ID del terapeuta creador.');
  }

  const { data, error } = await supabase
    .from('modulos')
    .insert({
      titulo: tituloLimpio,
      objetivo: objetivoLimpio,
      ideas_materiales: datos.ideas_materiales ?? [],
      video_guia_url: datos.video_guia_url?.trim() || null,
      terapeuta_id: datos.terapeuta_id,
    })
    .select()
    .single();

  if (error) {
    throw new Error('Error al crear el módulo: ' + error.message);
  }
  if (!data) {
    throw new Error('No se pudo guardar el módulo en la base de datos.');
  }

  return data as Modulo;
};

/**
 * Edita un módulo existente asignado al terapeuta.
 * Solo permite editar si terapeuta_id coincide.
 */
export const actualizarModulo = async (
  moduloId: string,
  terapeutaId: string,
  datos: DatosActualizarModulo,
): Promise<Modulo> => {
  if (datos.titulo !== undefined && !datos.titulo.trim()) {
    throw new Error('El título del módulo no puede estar vacío.');
  }
  if (datos.objetivo !== undefined && !datos.objetivo.trim()) {
    throw new Error('El objetivo del módulo no puede estar vacío.');
  }

  const payload: Record<string, any> = {};
  if (datos.titulo !== undefined) payload.titulo = datos.titulo.trim();
  if (datos.objetivo !== undefined) payload.objetivo = datos.objetivo.trim();
  if (datos.ideas_materiales !== undefined) payload.ideas_materiales = datos.ideas_materiales;
  if (datos.video_guia_url !== undefined) {
    payload.video_guia_url = datos.video_guia_url?.trim() || null;
  }

  const { data, error } = await supabase
    .from('modulos')
    .update(payload)
    .eq('id', moduloId)
    .eq('terapeuta_id', terapeutaId)
    .select()
    .single();

  if (error) {
    throw new Error('Error al actualizar el módulo: ' + error.message);
  }
  if (!data) {
    throw new Error('No se encontró el módulo o no tienes permiso para editarlo.');
  }

  return data as Modulo;
};
