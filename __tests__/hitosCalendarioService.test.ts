import {
  hitoDeLaPractica,
  hitosPorDia,
  marcasPorDia,
  rangoDeHitos,
} from '../src/services/hitosCalendarioService';
import { PracticaFamilia } from '../src/services/panelFamiliaService';

// Horas a mediodía UTC para que el día local sea el mismo en cualquier zona horaria habitual
const practica = (id: string, estado: string, envio: string | null, evaluacion?: string | null): PracticaFamilia => ({
  id,
  estado,
  fecha_asignacion: '2026-09-01T12:00:00Z',
  fecha_envio: envio,
  modulos: { id: `m-${id}`, titulo: `Módulo ${id}`, objetivo: null, video_guia_url: null, ideas_materiales: null },
  feedback:
    evaluacion === undefined
      ? null
      : {
          id: `f-${id}`,
          transcripcion: null,
          resumen_estructurado: null,
          fecha_evaluacion: evaluacion,
          enviado_en: evaluacion,
        },
});

describe('hitoDeLaPractica', () => {
  it('una práctica «Con feedback» cuenta el día de la evaluación, no el del envío', () => {
    const hito = hitoDeLaPractica(practica('a', 'evaluada', '2026-10-30T12:00:00Z', '2026-11-03T12:00:00Z'));
    expect(hito?.tipo).toBe('feedback');
    expect(hito?.fecha.toISOString()).toBe('2026-11-03T12:00:00.000Z');
  });

  it('una práctica «Enviada» cuenta el día del envío', () => {
    const hito = hitoDeLaPractica(practica('b', 'completada', '2026-11-05T12:00:00Z'));
    expect(hito?.tipo).toBe('enviada');
    expect(hito?.fecha.toISOString()).toBe('2026-11-05T12:00:00.000Z');
  });

  it('una «Enviada» con un borrador de feedback sigue contando el día del envío', () => {
    const hito = hitoDeLaPractica(practica('c', 'completada', '2026-11-05T12:00:00Z', '2026-11-06T12:00:00Z'));
    expect(hito?.tipo).toBe('enviada');
    expect(hito?.fecha.toISOString()).toBe('2026-11-05T12:00:00.000Z');
  });

  it('una práctica «Pendiente» no es un hito, tenga o no fecha de envío', () => {
    expect(hitoDeLaPractica(practica('d', 'pendientes', null))).toBeNull();
    expect(hitoDeLaPractica(practica('e', 'pendientes', '2026-11-05T12:00:00Z'))).toBeNull();
  });

  it('sin fecha válida no se puede colocar en el calendario', () => {
    expect(hitoDeLaPractica(practica('f', 'completada', null))).toBeNull();
    expect(hitoDeLaPractica(practica('g', 'completada', 'no es una fecha'))).toBeNull();
  });

  it('una «Con feedback» sin fecha de evaluación usa el envío del feedback y, si no, el de la práctica', () => {
    const sinEvaluacion = practica('h', 'evaluada', '2026-10-30T12:00:00Z', null);
    expect(hitoDeLaPractica(sinEvaluacion)?.fecha.toISOString()).toBe('2026-10-30T12:00:00.000Z');
    if (sinEvaluacion.feedback) sinEvaluacion.feedback.enviado_en = '2026-11-01T12:00:00Z';
    expect(hitoDeLaPractica(sinEvaluacion)?.fecha.toISOString()).toBe('2026-11-01T12:00:00.000Z');
  });

  it('una «Con feedback» sin feedback no es un hito', () => {
    expect(hitoDeLaPractica(practica('i', 'evaluada', '2026-10-30T12:00:00Z'))).toBeNull();
  });
});

describe('hitosPorDia y marcasPorDia', () => {
  const practicas = [
    practica('1', 'evaluada', '2026-09-27T12:00:00Z', '2026-09-28T12:00:00Z'),
    practica('2', 'evaluada', '2026-11-01T08:00:00Z', '2026-11-03T10:00:00Z'),
    practica('3', 'evaluada', '2026-11-02T08:00:00Z', '2026-11-03T13:00:00Z'),
    practica('4', 'evaluada', '2026-11-02T09:00:00Z', '2026-11-03T11:00:00Z'),
    practica('5', 'completada', '2026-11-03T12:00:00Z'),
    practica('6', 'pendientes', null),
  ];
  const dias = hitosPorDia(practicas);

  it('agrupa por día y deja fuera las pendientes', () => {
    expect([...dias.keys()].sort()).toEqual(['2026-09-28', '2026-11-03']);
    expect(dias.get('2026-09-28')).toHaveLength(1);
    expect(dias.get('2026-11-03')).toHaveLength(4);
  });

  it('dentro de un día, el hito más reciente va primero', () => {
    expect(dias.get('2026-11-03')?.map((h) => h.practica.id)).toEqual(['3', '5', '4', '2']);
  });

  it('cada práctica sale en un solo día', () => {
    const total = [...dias.values()].reduce((suma, lista) => suma + lista.length, 0);
    expect(total).toBe(5);
  });

  it('las marcas no se repiten y el hito va antes que la práctica enviada', () => {
    expect(marcasPorDia(dias)).toEqual({
      '2026-09-28': ['feedback'],
      '2026-11-03': ['feedback', 'enviada'],
    });
  });

  it('el rango va del primer al último día con hitos', () => {
    const rango = rangoDeHitos(dias);
    expect(rango?.primero.getMonth()).toBe(8);
    expect(rango?.primero.getDate()).toBe(28);
    expect(rango?.ultimo.getMonth()).toBe(10);
    expect(rango?.ultimo.getDate()).toBe(3);
  });

  it('sin prácticas no hay días, ni marcas, ni rango', () => {
    const vacio = hitosPorDia([]);
    expect(vacio.size).toBe(0);
    expect(marcasPorDia(vacio)).toEqual({});
    expect(rangoDeHitos(vacio)).toBeNull();
  });
});
