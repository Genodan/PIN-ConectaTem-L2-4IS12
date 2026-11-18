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

// UT 1354 · Alta de un paciente por la terapeuta. Sin registro ni código de invitación (aún no hay inicio de sesión):
// el paciente nace ya asignado a la terapeuta que lo da de alta.
export const LIMITE_NOMBRE_PACIENTE = 80;

export interface DatosNuevoPaciente {
  nombreNino: string;
  nombreFamilia: string;
  terapeutaId: string;
}

export interface PacienteCreado {
  id: string;
  nombre_nino: string;
  nombre_familia: string;
  terapeuta_asignado_id: string;
}

// Para comparar nombres: sin mayúsculas ni espacios sobrantes
const normalizarNombre = (texto: string) => texto.trim().replace(/\s+/g, ' ').toLowerCase();

export const crearPaciente = async (datos: DatosNuevoPaciente): Promise<PacienteCreado> => {
  const nombreNino = datos.nombreNino?.trim() ?? '';
  const nombreFamilia = datos.nombreFamilia?.trim() ?? '';

  if (!nombreNino) throw new Error('El nombre del paciente es obligatorio.');
  if (!nombreFamilia) throw new Error('El nombre de la familia es obligatorio.');
  if (nombreNino.length > LIMITE_NOMBRE_PACIENTE) {
    throw new Error(`El nombre del paciente no puede tener más de ${LIMITE_NOMBRE_PACIENTE} caracteres.`);
  }
  if (nombreFamilia.length > LIMITE_NOMBRE_PACIENTE) {
    throw new Error(`El nombre de la familia no puede tener más de ${LIMITE_NOMBRE_PACIENTE} caracteres.`);
  }
  if (!datos.terapeutaId) throw new Error('Se requiere la terapeuta que da de alta al paciente.');

  // No se repite un paciente (mismo nombre y misma familia) dentro de la cartera de la terapeuta
  const { data: existentes, error: errorLeer } = await supabase
    .from('pacientes')
    .select('id, nombre_nino, nombre_familia')
    .eq('terapeuta_asignado_id', datos.terapeutaId);

  if (errorLeer) throw new Error('Error al comprobar los pacientes: ' + errorLeer.message);

  const repetido = (existentes ?? []).some(
    (p: { nombre_nino: string; nombre_familia: string }) =>
      normalizarNombre(p.nombre_nino ?? '') === normalizarNombre(nombreNino) &&
      normalizarNombre(p.nombre_familia ?? '') === normalizarNombre(nombreFamilia),
  );
  if (repetido) throw new Error('Ya tienes un paciente con ese nombre y esa familia.');

  const { data, error } = await supabase
    .from('pacientes')
    .insert({
      nombre_nino: nombreNino,
      nombre_familia: nombreFamilia,
      terapeuta_asignado_id: datos.terapeutaId,
    })
    .select()
    .single();

  if (error) throw new Error('Error al crear el paciente: ' + error.message);
  if (!data) throw new Error('No se pudo guardar el paciente en la base de datos.');

  return data as PacienteCreado;
};
