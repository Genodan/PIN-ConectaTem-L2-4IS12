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

// 3. Enviar la práctica y cambiar el estado a 'completada'
export const enviarPractica = async (tareaId: string, videoUrl: string) => {
  const { data, error } = await supabase
    .from('tareas')
    .update({ 
      estado: 'completada', 
      video_url: videoUrl,
      fecha_envio: new Date().toISOString()
    })
    .eq('id', tareaId)
    .select();

  if (error) {
    console.error('Error al enviar práctica:', error);
    throw new Error('Error al enviar la práctica: ' + error.message);
  }

  if (!data || data.length === 0) {
    throw new Error('No se pudo actualizar la tarea en Supabase.');
  }

  return data[0];
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