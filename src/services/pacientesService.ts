import { supabase } from '../utils/supabase';

// Trae todos los pacientes EXCEPTO los que ya pertenecen al terapeuta actual
export const obtenerPacientesParaAsignar = async (terapeutaIdActual: string) => {
  const { data, error } = await supabase
    .from('pacientes')
    .select('id, nombre_nino, nombre_familia')
    .or(`terapeuta_asignado_id.neq.${terapeutaIdActual},terapeuta_asignado_id.is.null`);

  if (error) throw new Error('Error al cargar pacientes: ' + error.message);
  return data;
};

export const vincularPaciente = async (pacienteId: string, terapeutaId: string) => {
  // 1. Imprimimos por consola lo que estamos intentando enviar
  console.log("Intentando vincular -> Paciente:", pacienteId, "con Terapeuta:", terapeutaId);

  const { data, error } = await supabase
    .from('pacientes')
    .update({ terapeuta_asignado_id: terapeutaId })
    .eq('id', pacienteId)
    .select();

  // 2. Imprimimos la respuesta exacta de Supabase
  console.log("Respuesta de Supabase ->", { data, error });

  if (error) {
    throw new Error('Error al asignar paciente: ' + error.message);
  }
  
  // Si data viene vacío (length === 0), es el fallo silencioso
  if (!data || data.length === 0) {
    throw new Error('Supabase no actualizó nada. Posible bloqueo de permisos (RLS).');
  }

  return data[0];
};