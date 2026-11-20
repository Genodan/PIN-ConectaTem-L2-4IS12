import { PracticaFamilia } from './panelFamiliaService';

// UT 1449 · Racha semanal e insignias automáticas de la familia.
// Se calculan a partir de las prácticas que ya carga el panel: no hay tablas nuevas.
// Idea de diseño: premiar la constancia sin presionar. La racha cuenta semanas con al menos una
// práctica enviada, se guarda el récord y nunca se muestra como algo que «se pierde».

export type ClaveInsignia = 'primer-paso' | 'constancia' | 'lo-volvemos-a-intentar';

export interface Insignia {
  clave: ClaveInsignia;
  titulo: string;
  descripcion: string;
}

// Insignia conseguida, con la práctica en la que se consiguió (para marcarla en el historial)
export interface InsigniaConseguida extends Insignia {
  practicaId: string;
}

export interface ResumenRacha {
  rachaActual: number; // semanas seguidas con alguna práctica enviada, hasta esta semana o la anterior
  mejorRacha: number;
  practicasEnviadas: number;
  insignias: InsigniaConseguida[]; // solo las conseguidas, en el orden en que se consiguieron
}

export const SEMANAS_CONSTANCIA = 4;

const INSIGNIAS: Record<ClaveInsignia, Insignia> = {
  'primer-paso': {
    clave: 'primer-paso',
    titulo: 'Primer paso',
    descripcion: 'Habéis enviado vuestra primera práctica.',
  },
  constancia: {
    clave: 'constancia',
    titulo: 'Constancia',
    descripcion: `Habéis practicado ${SEMANAS_CONSTANCIA} semanas seguidas.`,
  },
  'lo-volvemos-a-intentar': {
    clave: 'lo-volvemos-a-intentar',
    titulo: 'Lo volvemos a intentar',
    descripcion: 'Habéis repetido una práctica después de recibir el feedback.',
  },
};

// Lunes 00:00 (hora local) de la semana de una fecha, como clave «AAAA-MM-DD»
export const inicioDeSemana = (fecha: Date): Date => {
  const lunes = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const diasDesdeLunes = (lunes.getDay() + 6) % 7; // getDay: domingo = 0
  lunes.setDate(lunes.getDate() - diasDesdeLunes);
  return lunes;
};

const claveSemana = (fecha: Date) => {
  const lunes = inicioDeSemana(fecha);
  return `${lunes.getFullYear()}-${String(lunes.getMonth() + 1).padStart(2, '0')}-${String(lunes.getDate()).padStart(2, '0')}`;
};

const semanaAnterior = (lunes: Date) => new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() - 7);

// Prácticas que la familia ya ha enviado (con su fecha de envío)
const enviadas = (practicas: PracticaFamilia[]) =>
  practicas.filter((p) => (p.estado === 'completada' || p.estado === 'evaluada') && p.fecha_envio);

// Cuenta semanas seguidas con práctica hacia atrás desde «desde»
const contarHaciaAtras = (semanas: Set<string>, desde: Date) => {
  let total = 0;
  for (let lunes = inicioDeSemana(desde); semanas.has(claveSemana(lunes)); lunes = semanaAnterior(lunes)) total++;
  return total;
};

const tiempo = (fecha: string) => new Date(fecha).getTime();

// «Lo volvemos a intentar»: la primera práctica enviada de un módulo después del feedback de otra del mismo módulo
const practicaRepetidaTrasFeedback = (practicas: PracticaFamilia[]): PracticaFamilia | null => {
  const candidatas = practicas.filter((otra) =>
    practicas.some((conFeedback) => {
      const fechaFeedback = conFeedback.feedback?.enviado_en;
      return (
        !!fechaFeedback &&
        !!conFeedback.modulos?.id &&
        otra.id !== conFeedback.id &&
        otra.modulos?.id === conFeedback.modulos?.id &&
        tiempo(otra.fecha_envio as string) > tiempo(fechaFeedback)
      );
    }),
  );
  return candidatas.sort((a, b) => tiempo(a.fecha_envio as string) - tiempo(b.fecha_envio as string))[0] ?? null;
};

// «Constancia»: la primera práctica de la semana en que se llegó por primera vez a SEMANAS_CONSTANCIA seguidas
const practicaDeLaConstancia = (practicas: PracticaFamilia[]): PracticaFamilia | null => {
  const porSemana = new Map<string, PracticaFamilia[]>();
  for (const p of [...practicas].sort((a, b) => tiempo(a.fecha_envio as string) - tiempo(b.fecha_envio as string))) {
    const clave = claveSemana(new Date(p.fecha_envio as string));
    porSemana.set(clave, [...(porSemana.get(clave) ?? []), p]);
  }
  const semanas = new Set(porSemana.keys());
  for (const [clave, deEsaSemana] of porSemana) {
    const [anio, mes, dia] = clave.split('-').map(Number);
    if (contarHaciaAtras(semanas, new Date(anio, mes - 1, dia)) >= SEMANAS_CONSTANCIA) return deEsaSemana[0];
  }
  return null;
};

export const calcularRacha = (practicas: PracticaFamilia[], hoy: Date = new Date()): ResumenRacha => {
  const lista = enviadas(practicas);
  const semanas = new Set(lista.map((p) => claveSemana(new Date(p.fecha_envio as string))));

  // La racha sigue viva durante la semana en curso aunque aún no se haya enviado nada:
  // solo se cuenta desde la semana pasada hasta que se envíe la de esta
  const estaSemana = inicioDeSemana(hoy);
  const rachaActual = semanas.has(claveSemana(estaSemana))
    ? contarHaciaAtras(semanas, estaSemana)
    : contarHaciaAtras(semanas, semanaAnterior(estaSemana));

  const mejorRacha = Math.max(
    rachaActual,
    ...[...semanas].map((clave) => {
      const [anio, mes, dia] = clave.split('-').map(Number);
      return contarHaciaAtras(semanas, new Date(anio, mes - 1, dia));
    }),
    0,
  );

  const primera = [...lista].sort((a, b) => tiempo(a.fecha_envio as string) - tiempo(b.fecha_envio as string))[0];
  const conseguidas: { insignia: Insignia; practica: PracticaFamilia | null | undefined }[] = [
    { insignia: INSIGNIAS['primer-paso'], practica: primera },
    { insignia: INSIGNIAS.constancia, practica: practicaDeLaConstancia(lista) },
    { insignia: INSIGNIAS['lo-volvemos-a-intentar'], practica: practicaRepetidaTrasFeedback(lista) },
  ];
  const insignias: InsigniaConseguida[] = conseguidas
    .filter((c): c is { insignia: Insignia; practica: PracticaFamilia } => !!c.practica)
    .sort((a, b) => tiempo(a.practica.fecha_envio as string) - tiempo(b.practica.fecha_envio as string))
    .map(({ insignia, practica }) => ({ ...insignia, practicaId: practica.id }));

  return { rachaActual, mejorRacha, practicasEnviadas: lista.length, insignias };
};

// Insignias agrupadas por la práctica en la que se consiguieron
export const insigniasPorPractica = (resumen: ResumenRacha): Record<string, InsigniaConseguida[]> =>
  resumen.insignias.reduce<Record<string, InsigniaConseguida[]>>((porPractica, insignia) => {
    porPractica[insignia.practicaId] = [...(porPractica[insignia.practicaId] ?? []), insignia];
    return porPractica;
  }, {});
