import { supabase } from '../utils/supabase';

// Código de estado que guarda la base de datos. En pantalla se muestra como «Pendiente».
export const ESTADO_PRACTICA_PENDIENTE = 'pendientes';

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
