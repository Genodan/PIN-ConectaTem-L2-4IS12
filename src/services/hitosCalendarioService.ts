// UT 1404 · Calendario de hitos. Lógica pura: en qué día cae cada práctica y cómo se marca. Sin React.
import type { PracticaFamilia } from './panelFamiliaService';
import { aTextoISO, inicioDelDia } from './calendarioService';

// Estados de la práctica (los mismos códigos que `textoEstado` del panel de la familia)
const ESTADO_CON_FEEDBACK = 'evaluada';
const ESTADO_ENVIADA = 'completada';

/**
 * 'feedback': hito alcanzado (práctica «Con feedback»).
 * 'enviada': práctica enviada que espera el feedback de la terapeuta.
 */
export type TipoHito = 'feedback' | 'enviada';

export interface HitoDelDia {
  practica: PracticaFamilia;
  tipo: TipoHito;
  /** Momento exacto del hito: la evaluación del feedback o el envío de la práctica. */
  fecha: Date;
}

const comoFecha = (texto?: string | null): Date | null => {
  if (!texto) return null;
  const fecha = new Date(texto);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

/**
 * Cada práctica cuenta en un solo día, el del último paso que ha dado:
 * - «Con feedback» → el día de la evaluación (como en «Buscar feedbacks»).
 * - «Enviada» → el día del envío.
 * Las «Pendiente» no se han enviado y no salen. Sin fecha válida tampoco salen.
 */
export const hitoDeLaPractica = (practica: PracticaFamilia): HitoDelDia | null => {
  if (practica.estado === ESTADO_CON_FEEDBACK && practica.feedback) {
    const fecha =
      comoFecha(practica.feedback.fecha_evaluacion) ??
      comoFecha(practica.feedback.enviado_en) ??
      comoFecha(practica.fecha_envio);
    return fecha ? { practica, tipo: 'feedback', fecha } : null;
  }
  if (practica.estado === ESTADO_ENVIADA) {
    const fecha = comoFecha(practica.fecha_envio);
    return fecha ? { practica, tipo: 'enviada', fecha } : null;
  }
  return null;
};

/** Hitos agrupados por día local (clave `aaaa-mm-dd`). Dentro de un día, el más reciente primero. */
export const hitosPorDia = (practicas: PracticaFamilia[]): Map<string, HitoDelDia[]> => {
  const dias = new Map<string, HitoDelDia[]>();
  for (const practica of practicas) {
    const hito = hitoDeLaPractica(practica);
    if (!hito) continue;
    const clave = aTextoISO(hito.fecha);
    dias.set(clave, [...(dias.get(clave) ?? []), hito]);
  }
  for (const lista of dias.values()) lista.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  return dias;
};

/** Tipos de marca de cada día (sin repetir; el hito alcanzado antes que la práctica enviada). */
export const marcasPorDia = (dias: Map<string, HitoDelDia[]>): Record<string, TipoHito[]> => {
  const marcas: Record<string, TipoHito[]> = {};
  for (const [clave, hitos] of dias) {
    const tipos = new Set(hitos.map((h) => h.tipo));
    marcas[clave] = (['feedback', 'enviada'] as TipoHito[]).filter((t) => tipos.has(t));
  }
  return marcas;
};

/** Primer y último día (a las 00:00) con hitos, o null si no hay ninguno. */
export const rangoDeHitos = (
  dias: Map<string, HitoDelDia[]>,
): { primero: Date; ultimo: Date } | null => {
  const tiempos = [...dias.values()].flat().map((h) => inicioDelDia(h.fecha).getTime());
  if (tiempos.length === 0) return null;
  return { primero: new Date(Math.min(...tiempos)), ultimo: new Date(Math.max(...tiempos)) };
};
