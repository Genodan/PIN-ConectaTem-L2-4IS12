// Pacientes de la terapeuta: alta con código de invitación y lista de sus fichas.
// Regla del equipo: la terapeuta da de alta al paciente y queda asignado a ella
// (función crear_paciente_con_codigo de base-de-datos/desacoplar-paciente-familia.sql).
import { supabase } from '../lib/supabase';

export type PacienteBd = {
  id: string;
  nombre_nino: string;
  nombre_familia: string;
  familia_id: string | null; // null hasta que la familia se registra con el código
  fecha_registro: string | null;
};

function cliente() {
  if (!supabase) throw new Error('Supabase sin configurar: copia .env.example a .env.local.');
  return supabase;
}

// Pacientes asignados a la terapeuta, del más reciente al más antiguo.
// El filtro por terapeuta es explícito para no depender solo de las políticas RLS.
export const obtenerMisPacientes = async (terapeutaId: string): Promise<PacienteBd[]> => {
  const { data, error } = await cliente()
    .from('pacientes')
    .select('id, nombre_nino, nombre_familia, familia_id, fecha_registro')
    .eq('terapeuta_asignado_id', terapeutaId)
    .order('fecha_registro', { ascending: false });

  if (error) throw new Error('Error al cargar tus pacientes: ' + error.message);
  return data ?? [];
};

// Crea el paciente asignado a la terapeuta con sesión iniciada y devuelve el código para la familia
export const darDeAltaPaciente = async (nombreNino: string, nombreFamilia: string): Promise<string> => {
  const nino = nombreNino.trim();
  const familia = nombreFamilia.trim();
  if (!nino || !familia) throw new Error('Escribe el nombre del niño/a y el de la familia.');

  const { data, error } = await cliente().rpc('crear_paciente_con_codigo', {
    p_nombre_nino: nino,
    p_nombre_familia: familia,
  });

  if (error) throw new Error('No se pudo dar de alta al paciente: ' + error.message);
  return data as string;
};

// ---- Cambio de terapeuta (base-de-datos/transferir-paciente.sql) ----

export type Terapeuta = { id: string; nombre: string };

// Terapeutas a las que se puede transferir un paciente (todas menos la que tiene la sesión)
export const obtenerOtrasTerapeutas = async (): Promise<Terapeuta[]> => {
  const { data, error } = await cliente().rpc('otras_terapeutas');
  if (error) throw new Error('Error al cargar las terapeutas: ' + error.message);
  return (data as Terapeuta[] | null) ?? [];
};

// La terapeuta actual pasa su paciente a otra (baja, cambio de centro...).
// El paciente nunca se queda sin terapeuta.
export const transferirPaciente = async (pacienteId: string, terapeutaNuevaId: string): Promise<void> => {
  const { error } = await cliente().rpc('transferir_paciente', {
    p_paciente: pacienteId,
    p_terapeuta_nueva: terapeutaNuevaId,
  });
  if (error) throw new Error('No se pudo transferir al paciente: ' + error.message);
};
