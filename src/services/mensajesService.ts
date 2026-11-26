import { supabase } from '../utils/supabase';

// UT 1095 · Mensajes de texto entre la familia y su terapeuta.
// Una conversación es la pareja (paciente, terapeuta). La familia solo escribe a su terapeuta actual;
// las conversaciones con terapeutas anteriores quedan de solo lectura.

// Quién escribe cada mensaje (restricción mensajes_enviado_por_check de la base de datos)
export type AutorMensaje = 'terapeuta' | 'paciente';

export interface Mensaje {
  id: string;
  terapeuta_id: string;
  paciente_id: string;
  enviado_por: AutorMensaje;
  texto: string;
  fecha_envio: string;
  leido: boolean | null;
}

export interface NuevoMensaje {
  pacienteId: string;
  terapeutaId: string;
  autor: AutorMensaje;
  texto: string;
}

export interface TerapeutaDeConversacion {
  terapeutaId: string;
  nombre: string;
}

export interface ConversacionesDeLaFamilia {
  actual: TerapeutaDeConversacion | null; // con la que se puede escribir
  anteriores: TerapeutaDeConversacion[]; // solo lectura
}

export interface ConversacionDeLaTerapeuta {
  pacienteId: string;
  nombreNino: string;
  nombreFamilia: string;
  ultimoMensaje: Mensaje | null;
}

const COLUMNAS = 'id, terapeuta_id, paciente_id, enviado_por, texto, fecha_envio, leido';

// Mensajes de una conversación, del más antiguo al más reciente
export const obtenerMensajes = async (pacienteId: string, terapeutaId: string): Promise<Mensaje[]> => {
  const { data, error } = await supabase
    .from('mensajes')
    .select(COLUMNAS)
    .eq('paciente_id', pacienteId)
    .eq('terapeuta_id', terapeutaId)
    .order('fecha_envio', { ascending: true });

  if (error) throw new Error('No se pudieron cargar los mensajes: ' + error.message);
  return (data ?? []) as Mensaje[];
};

export const enviarMensaje = async ({ pacienteId, terapeutaId, autor, texto }: NuevoMensaje): Promise<Mensaje> => {
  const limpio = texto.trim();
  if (!limpio) throw new Error('Escribe un mensaje antes de enviarlo.');

  const { data, error } = await supabase
    .from('mensajes')
    .insert({
      paciente_id: pacienteId,
      terapeuta_id: terapeutaId,
      enviado_por: autor,
      texto: limpio,
      fecha_envio: new Date().toISOString(),
      leido: false,
    })
    .select(COLUMNAS)
    .single();

  if (error || !data) throw new Error('No se pudo enviar el mensaje: ' + (error?.message ?? 'sin respuesta'));
  return data as Mensaje;
};

// Tiempo real: avisa de cada mensaje nuevo de la conversación. Devuelve la función para dejar de escuchar.
// Supabase solo filtra por una columna: se filtra por paciente y aquí se descarta lo de otras terapeutas.
export const suscribirseAMensajes = (
  pacienteId: string,
  terapeutaId: string,
  alRecibir: (mensaje: Mensaje) => void,
): (() => void) => {
  const canal = supabase
    .channel(`mensajes-${pacienteId}-${terapeutaId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `paciente_id=eq.${pacienteId}` },
      (cambio: { new: Mensaje }) => {
        if (cambio.new?.terapeuta_id === terapeutaId) alRecibir(cambio.new);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(canal);
  };
};

// Une mensajes sin repetir (el propio llega dos veces: al enviarlo y por tiempo real) y los ordena por fecha
export const unirMensajes = (actuales: Mensaje[], nuevos: Mensaje[]): Mensaje[] => {
  const porId = new Map(actuales.map((m) => [m.id, m]));
  for (const m of nuevos) porId.set(m.id, m);
  return [...porId.values()].sort((a, b) => new Date(a.fecha_envio).getTime() - new Date(b.fecha_envio).getTime());
};

const nombresDeTerapeutas = async (ids: string[]): Promise<Map<string, string>> => {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase.from('terapeutas').select('id, nombre').in('id', ids);
  if (error) throw new Error('No se pudieron cargar las terapeutas: ' + error.message);
  return new Map(((data ?? []) as { id: string; nombre: string }[]).map((t) => [t.id, t.nombre]));
};

// Familia: su terapeuta actual (puede escribirle) y las terapeutas anteriores con las que hubo mensajes (solo lectura)
export const obtenerConversacionesDeLaFamilia = async (pacienteId: string): Promise<ConversacionesDeLaFamilia> => {
  const { data: paciente, error: errorPaciente } = await supabase
    .from('pacientes')
    .select('terapeuta_asignado_id')
    .eq('id', pacienteId)
    .single();
  if (errorPaciente) throw new Error('No se pudo cargar el paciente: ' + errorPaciente.message);

  const { data: mensajes, error: errorMensajes } = await supabase
    .from('mensajes')
    .select('terapeuta_id')
    .eq('paciente_id', pacienteId);
  if (errorMensajes) throw new Error('No se pudieron cargar los mensajes: ' + errorMensajes.message);

  const actualId = (paciente as { terapeuta_asignado_id: string | null } | null)?.terapeuta_asignado_id ?? null;
  const anterioresIds = [
    ...new Set(((mensajes ?? []) as { terapeuta_id: string }[]).map((m) => m.terapeuta_id)),
  ].filter((id) => id !== actualId);

  const nombres = await nombresDeTerapeutas([...(actualId ? [actualId] : []), ...anterioresIds]);
  const conNombre = (id: string): TerapeutaDeConversacion => ({ terapeutaId: id, nombre: nombres.get(id) ?? 'Terapeuta' });

  return { actual: actualId ? conNombre(actualId) : null, anteriores: anterioresIds.map(conNombre) };
};

// Terapeuta: una conversación por cada paciente asignado, con el último mensaje (las más recientes primero)
export const obtenerConversacionesDeLaTerapeuta = async (terapeutaId: string): Promise<ConversacionDeLaTerapeuta[]> => {
  const { data: pacientes, error: errorPacientes } = await supabase
    .from('pacientes')
    .select('id, nombre_nino, nombre_familia')
    .eq('terapeuta_asignado_id', terapeutaId)
    .order('nombre_nino');
  if (errorPacientes) throw new Error('No se pudieron cargar los pacientes: ' + errorPacientes.message);

  const { data: mensajes, error: errorMensajes } = await supabase
    .from('mensajes')
    .select(COLUMNAS)
    .eq('terapeuta_id', terapeutaId)
    .order('fecha_envio', { ascending: false });
  if (errorMensajes) throw new Error('No se pudieron cargar los mensajes: ' + errorMensajes.message);

  const ultimo = new Map<string, Mensaje>();
  for (const m of (mensajes ?? []) as Mensaje[]) if (!ultimo.has(m.paciente_id)) ultimo.set(m.paciente_id, m);

  const tiempo = (c: ConversacionDeLaTerapeuta) => (c.ultimoMensaje ? new Date(c.ultimoMensaje.fecha_envio).getTime() : 0);
  return ((pacientes ?? []) as { id: string; nombre_nino: string; nombre_familia: string }[])
    .map((p) => ({
      pacienteId: p.id,
      nombreNino: p.nombre_nino,
      nombreFamilia: p.nombre_familia,
      ultimoMensaje: ultimo.get(p.id) ?? null,
    }))
    .sort((a, b) => tiempo(b) - tiempo(a));
};
