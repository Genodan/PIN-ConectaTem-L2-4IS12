import { supabase } from '../utils/supabase';

// Código de estado que guarda la base de datos. En pantalla se muestra como «Pendiente».
export const ESTADO_PRACTICA_PENDIENTE = 'pendientes';
// Estados de una práctica que la familia ya ha enviado: «Enviada» (completada) y «Con feedback» (evaluada)
const ESTADOS_PRACTICA_ENVIADA = ['completada', 'evaluada'];

export interface PacienteResumen {
  id: string;
  nombre_nino: string;
  nombre_familia: string;
}

export interface ModuloResumen {
  id: string;
  titulo: string;
  objetivo: string;
  video_guia_url: string | null;
}

export interface NuevaPractica {
  terapeutaId: string;
  pacienteId: string;
  moduloId: string;
}

// Los módulos son el catálogo de prácticas: título, objetivo y vídeo guía.
export const obtenerModulos = async (): Promise<ModuloResumen[]> => {
  const { data, error } = await supabase
    .from('modulos')
    .select('id, titulo, objetivo, video_guia_url')
    .order('id');

  if (error) throw new Error('Error al cargar los módulos: ' + error.message);
  return (data ?? []) as ModuloResumen[];
};

// Solo los pacientes asignados a esta terapeuta
export const obtenerPacientesDeTerapeuta = async (terapeutaId: string): Promise<PacienteResumen[]> => {
  const { data, error } = await supabase
    .from('pacientes')
    .select('id, nombre_nino, nombre_familia')
    .eq('terapeuta_asignado_id', terapeutaId)
    .order('nombre_nino');

  if (error) throw new Error('Error al cargar los pacientes: ' + error.message);
  return (data ?? []) as PacienteResumen[];
};

// Crea una práctica: asigna un módulo a un paciente, en estado pendiente
export const crearPractica = async ({ terapeutaId, pacienteId, moduloId }: NuevaPractica) => {
  const { data, error } = await supabase
    .from('tareas')
    .insert({
      terapeuta_id: terapeutaId,
      paciente_id: pacienteId,
      modulo_id: moduloId,
      estado: ESTADO_PRACTICA_PENDIENTE,
      fecha_asignacion: new Date().toISOString(),
    })
    .select();

  if (error) throw new Error('Error al crear la práctica: ' + error.message);

  // Si no vuelve ninguna fila, la base de datos no la ha guardado (p. ej. por permisos RLS)
  if (!data || data.length === 0) {
    throw new Error('No se pudo crear la práctica. Posible bloqueo de permisos (RLS).');
  }

  return data[0];
};

// UT 1401 · La familia repite una práctica que ya ha enviado (con o sin feedback): se crea otra «Pendiente»
// del mismo módulo, con la misma terapeuta y el mismo paciente, para grabar un clip nuevo y enviarlo.
// La práctica anterior no se toca: sigue en el historial con su feedback.
export const repetirPractica = async (practicaId: string) => {
  const fallo = (motivo: string) => new Error('No se ha podido repetir la práctica: ' + motivo);

  const { data: original, error: errorOriginal } = await supabase
    .from('tareas')
    .select('id, terapeuta_id, paciente_id, modulo_id, estado')
    .eq('id', practicaId)
    .single();

  if (errorOriginal || !original) throw fallo(errorOriginal?.message ?? 'no se encontró la práctica.');

  if (!ESTADOS_PRACTICA_ENVIADA.includes(original.estado)) {
    throw new Error('Solo se puede repetir una práctica que ya has enviado.');
  }

  // Si ya hay otra pendiente de ese módulo no se crea una segunda
  const { data: pendientes, error: errorPendientes } = await supabase
    .from('tareas')
    .select('id')
    .eq('paciente_id', original.paciente_id)
    .eq('modulo_id', original.modulo_id)
    .eq('estado', ESTADO_PRACTICA_PENDIENTE)
    .limit(1);

  if (errorPendientes) throw fallo(errorPendientes.message);
  if (pendientes && pendientes.length > 0) {
    throw new Error('Ya tienes una práctica pendiente de este módulo. Envíala antes de repetirla.');
  }

  try {
    return await crearPractica({
      terapeutaId: original.terapeuta_id,
      pacienteId: original.paciente_id,
      moduloId: original.modulo_id,
    });
  } catch (e) {
    throw fallo(e instanceof Error ? e.message : 'error desconocido');
  }
};
