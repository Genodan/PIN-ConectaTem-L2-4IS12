import { supabase } from '../utils/supabase';

// Trae los pacientes cuyo terapeuta_asignado_id sea NULL[cite: 6]
export const obtenerPacientesLibres = async () => {
  const { data, error } = await supabase
    .from('pacientes')
    .select('id, nombre_nino, nombre_familia')
    .is('terapeuta_asignado_id', null);

  if (error) throw new Error('Error al cargar pacientes libres: ' + error.message);
  return data;
};

// Asigna el terapeuta al paciente[cite: 6]
export const vincularPaciente = async (pacienteId: string, terapeutaId: string) => {
  const { data, error } = await supabase
    .from('pacientes')
    .update({ terapeuta_asignado_id: terapeutaId })
    .eq('id', pacienteId)
    .is('terapeuta_asignado_id', null) // Evita que dos terapeutas lo cojan a la vez
    .select();

  if (error) throw new Error('Error al asignar paciente en la base de datos.');
  if (!data || data.length === 0) throw new Error('El paciente ya ha sido asignado a otro terapeuta.');

  return data[0];
};