import { PracticaFamilia } from './panelFamiliaService';

export interface ModuloFiltro {
  id: string;
  titulo: string;
  cantidad: number;
}

/**
 * Normaliza un texto eliminando tildes/diacríticos y pasándolo a minúsculas
 * para que las búsquedas sean tolerantes a mayúsculas y acentos.
 */
export const normalizarTexto = (texto: string | null | undefined): string => {
  if (!texto) return '';
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

/**
 * Filtra solo las prácticas que tienen un feedback asociado y evaluado.
 */
export const obtenerPracticasConFeedbackFamilia = (
  practicas: PracticaFamilia[],
): PracticaFamilia[] => {
  return practicas.filter((p) => p.estado === 'evaluada' && Boolean(p.feedback));
};

/**
 * Comprueba si una práctica con feedback coincide con un término de búsqueda.
 * Busca en:
 * - Nombre del módulo
 * - Objetivo del módulo
 * - Transcripción del audio
 * - Resumen estructurado (punto fuerte, a mejorar, foco de la semana)
 * - Resumen escrito
 * - Insignia
 */
export const coincideConPalabra = (practica: PracticaFamilia, palabra: string): boolean => {
  const termino = normalizarTexto(palabra);
  if (!termino) return true;

  // 1. Nombre y objetivo del módulo
  if (normalizarTexto(practica.modulos?.titulo).includes(termino)) {
    return true;
  }
  if (normalizarTexto(practica.modulos?.objetivo).includes(termino)) {
    return true;
  }

  const fb = practica.feedback;
  if (!fb) return false;

  // 2. Transcripción de la nota de voz
  if (normalizarTexto(fb.transcripcion).includes(termino)) {
    return true;
  }

  // 3. Resumen estructurado (punto fuerte, a mejorar, foco de la semana)
  if (fb.resumen_estructurado) {
    let re = fb.resumen_estructurado as any;
    if (typeof re === 'string') {
      try {
        re = JSON.parse(re);
      } catch {
        // En caso de que sea string simple
      }
    }
    if (typeof re === 'object' && re !== null) {
      for (const valor of Object.values(re)) {
        if (typeof valor === 'string' && normalizarTexto(valor).includes(termino)) {
          return true;
        }
      }
    } else if (typeof re === 'string' && normalizarTexto(re).includes(termino)) {
      return true;
    }
  }

  // 4. Resumen escrito
  if (normalizarTexto(fb.resumen_escrito).includes(termino)) {
    return true;
  }

  // 5. Insignia
  if (normalizarTexto(fb.insignia).includes(termino)) {
    return true;
  }

  return false;
};

/**
 * Filtra la lista de prácticas con feedback según una palabra/término.
 */
export const filtrarPorPalabra = (
  practicas: PracticaFamilia[],
  palabra: string,
): PracticaFamilia[] => {
  const soloConFeedback = obtenerPracticasConFeedbackFamilia(practicas);
  if (!palabra || !palabra.trim()) return soloConFeedback;
  return soloConFeedback.filter((p) => coincideConPalabra(p, palabra));
};

/**
 * Extrae la lista de módulos únicos presentes entre todos los feedbacks evaluados.
 */
export const obtenerModulosDeFeedbacks = (practicas: PracticaFamilia[]): ModuloFiltro[] => {
  const soloConFeedback = obtenerPracticasConFeedbackFamilia(practicas);
  const mapa = new Map<string, ModuloFiltro>();

  for (const p of soloConFeedback) {
    const moduloId = p.modulos?.id ?? 'sin-modulo';
    const titulo = p.modulos?.titulo ?? 'Módulo asignado';
    const actual = mapa.get(moduloId) ?? { id: moduloId, titulo, cantidad: 0 };
    actual.cantidad += 1;
    mapa.set(moduloId, actual);
  }

  return Array.from(mapa.values()).sort((a, b) => a.titulo.localeCompare(b.titulo));
};

/**
 * Filtra las prácticas según los IDs de módulos seleccionados en los checkboxes.
 */
export const filtrarPorModulos = (
  practicas: PracticaFamilia[],
  modulosSeleccionados: string[],
): PracticaFamilia[] => {
  const soloConFeedback = obtenerPracticasConFeedbackFamilia(practicas);
  if (!modulosSeleccionados || modulosSeleccionados.length === 0) {
    return [];
  }
  const setSeleccionados = new Set(modulosSeleccionados);
  return soloConFeedback.filter((p) => {
    const moduloId = p.modulos?.id ?? 'sin-modulo';
    return setSeleccionados.has(moduloId);
  });
};

/**
 * Parsea una fecha en texto en formatos DD/MM/AAAA, DD-MM-AAAA, AAAA-MM-DD o ISO.
 */
export const parsearFecha = (fechaStr: string | null | undefined): Date | null => {
  if (!fechaStr || !fechaStr.trim()) return null;
  const str = fechaStr.trim();

  // Formato DD/MM/AAAA o DD-MM-AAAA
  const partesDMY = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (partesDMY) {
    const dia = parseInt(partesDMY[1], 10);
    const mes = parseInt(partesDMY[2], 10) - 1;
    const anio = parseInt(partesDMY[3], 10);
    const d = new Date(anio, mes, dia);
    return isNaN(d.getTime()) ? null : d;
  }

  // Formato AAAA/MM/DD o AAAA-MM-DD
  const partesYMD = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (partesYMD) {
    const anio = parseInt(partesYMD[1], 10);
    const mes = parseInt(partesYMD[2], 10) - 1;
    const dia = parseInt(partesYMD[3], 10);
    const d = new Date(anio, mes, dia);
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback con Date.parse
  const timestamp = Date.parse(str);
  if (!isNaN(timestamp)) {
    return new Date(timestamp);
  }

  return null;
};

/**
 * Obtiene la fecha de evaluación de una práctica (fecha_evaluacion o enviado_en o fecha_envio).
 */
export const obtenerFechaEvaluacion = (practica: PracticaFamilia): Date | null => {
  const fb = practica.feedback;
  const fechaStr = fb?.fecha_evaluacion || fb?.enviado_en || practica.fecha_envio;
  if (!fechaStr) return null;
  const d = new Date(fechaStr);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Filtra los feedbacks cuyas tareas hayan sido evaluadas dentro del periodo indicado [fechaInicio, fechaFin].
 */
export const filtrarPorPeriodoFecha = (
  practicas: PracticaFamilia[],
  fechaInicioStr: string | null | undefined,
  fechaFinStr: string | null | undefined,
): PracticaFamilia[] => {
  const soloConFeedback = obtenerPracticasConFeedbackFamilia(practicas);

  const dInicio = parsearFecha(fechaInicioStr);
  const dFin = parsearFecha(fechaFinStr);

  if (!dInicio && !dFin) {
    return soloConFeedback;
  }

  if (dInicio) {
    dInicio.setHours(0, 0, 0, 0);
  }
  if (dFin) {
    dFin.setHours(23, 59, 59, 999);
  }

  return soloConFeedback.filter((p) => {
    const fechaEval = obtenerFechaEvaluacion(p);
    if (!fechaEval) return false;

    if (dInicio && fechaEval.getTime() < dInicio.getTime()) {
      return false;
    }
    if (dFin && fechaEval.getTime() > dFin.getTime()) {
      return false;
    }
    return true;
  });
};

