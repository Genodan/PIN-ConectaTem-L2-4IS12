import { supabase } from '../utils/supabase';
import { ModuloResumen, obtenerModulos } from './practicasService';

export const TABLA_MODULO_PACIENTE = 'modulo_paciente';

/**
 * Obtiene los IDs de los módulos asignados a un paciente específico.
 */
export const obtenerModulosAsignadosAPaciente = async (
  pacienteId: string,
): Promise<string[]> => {
  const { data, error } = await supabase
    .from(TABLA_MODULO_PACIENTE)
    .select('modulo_id')
    .eq('paciente_id', pacienteId);

  if (error) {
    throw new Error('Error al obtener los módulos del paciente: ' + error.message);
  }

  return (data || []).map((fila: { modulo_id: string }) => fila.modulo_id);
};

/**
 * Asigna un módulo específico a un paciente.
 */
export const asignarModuloAPaciente = async (
  pacienteId: string,
  moduloId: string,
): Promise<void> => {
  const { error } = await supabase
    .from(TABLA_MODULO_PACIENTE)
    .insert({ paciente_id: pacienteId, modulo_id: moduloId });

  if (error) {
    // Si ya existe la relación (clave primaria duplicada), no es un error
    if (error.code === '23505') return;
    throw new Error('Error al asignar el módulo al paciente: ' + error.message);
  }
};

/**
 * Desasigna un módulo específico de un paciente.
 */
export const desasignarModuloDePaciente = async (
  pacienteId: string,
  moduloId: string,
): Promise<void> => {
  const { error } = await supabase
    .from(TABLA_MODULO_PACIENTE)
    .delete()
    .eq('paciente_id', pacienteId)
    .eq('modulo_id', moduloId);

  if (error) {
    throw new Error('Error al desasignar el módulo del paciente: ' + error.message);
  }
};

/**
 * Obtiene la lista de módulos que se pueden asignar a las tareas de un paciente dado.
 * Reglas de negocio (UT Elegir los módulos que trabaja cada paciente):
 * 1. Solo módulos asignables por el terapeuta (comunes y propios de su terapeuta_id).
 * 2. Si el paciente tiene módulos específicos asignados, devuelve solo esos.
 * 3. Si el paciente no tiene módulos específicos asignados (o se le han desasignado todos),
 *    devuelve TODOS los módulos asignables por el terapeuta.
 */
export const obtenerModulosParaPaciente = async (
  pacienteId: string,
  terapeutaId: string,
): Promise<ModuloResumen[]> => {
  const [todosModulos, asignadosIds] = await Promise.all([
    obtenerModulos(terapeutaId),
    obtenerModulosAsignadosAPaciente(pacienteId),
  ]);

  if (!asignadosIds || asignadosIds.length === 0) {
    return todosModulos;
  }

  const asignadosSet = new Set(asignadosIds);
  return todosModulos.filter((m) => asignadosSet.has(m.id));
};
