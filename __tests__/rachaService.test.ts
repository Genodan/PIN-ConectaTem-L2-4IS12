import { PracticaFamilia } from '../src/services/panelFamiliaService';
import { calcularRacha, inicioDeSemana, insigniasPorPractica } from '../src/services/rachaService';

// UT 1449 · Racha semanal e insignias. Fechas fijas en hora local; «hoy» es el viernes 20/11/2026.
const HOY = new Date(2026, 10, 20, 12);
const dia = (mes: number, d: number) => new Date(2026, mes - 1, d, 10).toISOString();

const ESPEJO = { id: 'espejo', titulo: 'El Espejo', objetivo: null, video_guia_url: null, ideas_materiales: null };
const INTENCION = { id: 'intencion', titulo: 'Intención Comunicativa', objetivo: null, video_guia_url: null, ideas_materiales: null };

let n = 0;
const enviada = (fechaEnvio: string, modulo = ESPEJO, feedbackEn: string | null = null): PracticaFamilia => ({
  id: `p${++n}`,
  estado: feedbackEn ? 'evaluada' : 'completada',
  fecha_asignacion: null,
  fecha_envio: fechaEnvio,
  modulos: modulo,
  feedback: feedbackEn
    ? { transcripcion: null, resumen_estructurado: null, enviado_en: feedbackEn, audio_url: null }
    : null,
});
const pendiente = (): PracticaFamilia => ({
  id: `p${++n}`,
  estado: 'pendientes',
  fecha_asignacion: dia(11, 19),
  fecha_envio: null,
  modulos: ESPEJO,
  feedback: null,
});

describe('UT 1449 · rachaService - semanas', () => {
  it('la semana empieza el lunes', () => {
    expect(inicioDeSemana(HOY)).toEqual(new Date(2026, 10, 16));
    expect(inicioDeSemana(new Date(2026, 10, 22, 23))).toEqual(new Date(2026, 10, 16)); // domingo
  });

  it('cuenta las semanas seguidas con alguna práctica enviada, aunque haya varias en la misma semana', () => {
    const resumen = calcularRacha(
      [enviada(dia(11, 18)), enviada(dia(11, 17)), enviada(dia(11, 11)), enviada(dia(11, 3))],
      HOY,
    );

    expect(resumen.rachaActual).toBe(3);
    expect(resumen.practicasEnviadas).toBe(4);
  });

  it('si esta semana aún no han enviado nada, la racha de la semana pasada sigue viva', () => {
    expect(calcularRacha([enviada(dia(11, 12)), enviada(dia(11, 5))], HOY).rachaActual).toBe(2);
  });

  it('tras una semana sin prácticas la racha actual es 0, pero se conserva la mejor racha', () => {
    const resumen = calcularRacha(
      [enviada(dia(11, 2)), enviada(dia(10, 26)), enviada(dia(10, 19)), enviada(dia(10, 12)), enviada(dia(10, 5))],
      HOY,
    );

    expect(resumen.rachaActual).toBe(0);
    expect(resumen.mejorRacha).toBe(5);
  });

  it('las prácticas pendientes no cuentan', () => {
    const resumen = calcularRacha([pendiente(), pendiente()], HOY);

    expect(resumen).toEqual({ rachaActual: 0, mejorRacha: 0, practicasEnviadas: 0, insignias: [] });
  });
});

describe('UT 1449 · rachaService - insignias', () => {
  const claves = (practicas: PracticaFamilia[]) => calcularRacha(practicas, HOY).insignias.map((i) => i.clave);

  it('«Primer paso» con la primera práctica enviada', () => {
    expect(claves([enviada(dia(11, 18))])).toEqual(['primer-paso']);
  });

  it('«Constancia» al llegar a 4 semanas seguidas, y se mantiene aunque luego se pare', () => {
    const cuatroSemanas = [enviada(dia(10, 26)), enviada(dia(10, 19)), enviada(dia(10, 12)), enviada(dia(10, 5))];

    expect(claves(cuatroSemanas)).toContain('constancia');
    expect(claves(cuatroSemanas.slice(0, 3))).not.toContain('constancia');
  });

  it('«Lo volvemos a intentar» al enviar otra práctica del mismo módulo después de su feedback', () => {
    const conFeedback = enviada(dia(11, 2), ESPEJO, dia(11, 4));

    expect(claves([conFeedback, enviada(dia(11, 10), ESPEJO)])).toContain('lo-volvemos-a-intentar');
    // Otro módulo, o enviada antes del feedback, no cuenta
    expect(claves([conFeedback, enviada(dia(11, 10), INTENCION)])).not.toContain('lo-volvemos-a-intentar');
    expect(claves([conFeedback, enviada(dia(11, 3), ESPEJO)])).not.toContain('lo-volvemos-a-intentar');
  });
});

describe('UT 1449 · rachaService - dónde se consiguió cada insignia (para el historial)', () => {
  it('marca la práctica de cada insignia, en orden de cuándo se consiguió', () => {
    const primera = enviada(dia(10, 6), ESPEJO, dia(10, 8));
    const semana2 = enviada(dia(10, 13), INTENCION);
    const repetida = enviada(dia(10, 14), ESPEJO); // mismo módulo, después del feedback de «primera»
    const semana3 = enviada(dia(10, 20), INTENCION);
    const cuartaSemana = enviada(dia(10, 27), INTENCION);
    const otraDeLaCuarta = enviada(dia(10, 29), INTENCION);

    const resumen = calcularRacha([otraDeLaCuarta, cuartaSemana, semana3, repetida, semana2, primera], HOY);

    expect(resumen.insignias.map((i) => [i.clave, i.practicaId])).toEqual([
      ['primer-paso', primera.id],
      ['lo-volvemos-a-intentar', repetida.id],
      ['constancia', cuartaSemana.id],
    ]);
    expect(insigniasPorPractica(resumen)[primera.id].map((i) => i.clave)).toEqual(['primer-paso']);
    expect(insigniasPorPractica(resumen)[semana2.id]).toBeUndefined();
  });
});
