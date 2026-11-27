import { supabase } from '../utils/supabase';
import { inicioDelDia } from './calendarioService';

// Nueva interfaz (KAIRÓS) · Sesiones de la terapeuta con cada familia y su nota (una por sesión).

export interface NotaDeSesion {
  id: string;
  texto: string;
  actualizadaEn: string;
}

export interface SesionDelDia {
  id: string;
  empiezaEn: string;
  duracionMin: number;
  pacienteId: string;
  nino: string;
  familia: string | null;
  nota: NotaDeSesion | null;
}

type Relacion<T> = T | T[] | null;
const unoSolo = <T,>(valor: Relacion<T> | undefined): T | null => (Array.isArray(valor) ? valor[0] ?? null : valor ?? null);

type FilaNota = { id: string; texto: string; actualizada_en: string };
const aNota = (f: FilaNota | null): NotaDeSesion | null => (f ? { id: f.id, texto: f.texto, actualizadaEn: f.actualizada_en } : null);

// Sesiones de la terapeuta en un día concreto (de 00:00 a 24:00, hora local), por orden de hora
export const obtenerSesionesDelDia = async (terapeutaId: string, dia: Date): Promise<SesionDelDia[]> => {
  const desde = inicioDelDia(dia);
  const hasta = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() + 1);

  const { data, error } = await supabase
    .from('sesiones')
    .select('id, empieza_en, duracion_min, paciente_id, pacientes ( nombre_nino, nombre_familia ), notas ( id, texto, actualizada_en )')
    .eq('terapeuta_id', terapeutaId)
    .gte('empieza_en', desde.toISOString())
    .lt('empieza_en', hasta.toISOString())
    .order('empieza_en', { ascending: true });

  if (error) throw new Error('No se pudieron cargar las sesiones: ' + error.message);

  type Fila = {
    id: string;
    empieza_en: string;
    duracion_min: number;
    paciente_id: string;
    pacientes: Relacion<{ nombre_nino: string; nombre_familia: string | null }>;
    notas: Relacion<FilaNota>;
  };
  return ((data ?? []) as Fila[]).map((f) => {
    const paciente = unoSolo(f.pacientes);
    return {
      id: f.id,
      empiezaEn: f.empieza_en,
      duracionMin: f.duracion_min,
      pacienteId: f.paciente_id,
      nino: paciente?.nombre_nino ?? 'Paciente',
      familia: paciente?.nombre_familia ?? null,
      nota: aNota(unoSolo(f.notas)),
    };
  });
};

// Guarda la nota de una sesión (la crea o la edita). Si se deja vacía, se borra.
export const guardarNotaDeSesion = async (sesionId: string, texto: string): Promise<NotaDeSesion | null> => {
  const limpio = texto.trim();

  if (!limpio) {
    const { error } = await supabase.from('notas').delete().eq('sesion_id', sesionId);
    if (error) throw new Error('No se pudo borrar la nota: ' + error.message);
    return null;
  }

  const { data, error } = await supabase
    .from('notas')
    .upsert({ sesion_id: sesionId, texto: limpio, actualizada_en: new Date().toISOString() }, { onConflict: 'sesion_id' })
    .select('id, texto, actualizada_en')
    .single();

  if (error) throw new Error('No se pudo guardar la nota: ' + error.message);
  return aNota(data as FilaNota);
};

const dos = (n: number) => String(n).padStart(2, '0');
const hora = (d: Date) => `${dos(d.getHours())}:${dos(d.getMinutes())}`;

// «10:00 – 10:45»
export const franjaDeSesion = (empiezaEn: string, duracionMin: number) => {
  const inicio = new Date(empiezaEn);
  return `${hora(inicio)} – ${hora(new Date(inicio.getTime() + duracionMin * 60_000))}`;
};

// «10:00»
export const horaDeSesion = (empiezaEn: string) => hora(new Date(empiezaEn));
