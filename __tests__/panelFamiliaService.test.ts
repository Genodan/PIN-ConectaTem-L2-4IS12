import {
  PracticaFamilia,
  agruparPorModulo,
  obtenerPracticasDelPaciente,
  practicaConFeedbackMasReciente,
  textoEstado,
} from '../src/services/panelFamiliaService';
import { supabase } from '../src/utils/supabase';

jest.mock('../src/utils/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const from = supabase.from as jest.Mock;

// Cadena de la consulta: select -> eq(paciente) -> order
const simularConsulta = (resultado: { data: unknown; error: { message: string } | null }) => {
  const mockOrder = jest.fn().mockResolvedValue(resultado);
  const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
  from.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: mockEq }) });
  return { mockEq, mockOrder };
};

const INTENCION = { id: 'mod-1', titulo: 'Intención Comunicativa', objetivo: null, video_guia_url: null, ideas_materiales: null };
const ESPEJO = { id: 'mod-3', titulo: 'El Espejo', objetivo: null, video_guia_url: null, ideas_materiales: null };

const practica = (id: string, modulos: PracticaFamilia['modulos'], enviadoEn: string | null = null): PracticaFamilia => ({
  id,
  estado: enviadoEn ? 'evaluada' : 'pendientes',
  fecha_asignacion: '2026-10-20T10:00:00Z',
  fecha_envio: null,
  modulos,
  feedback: enviadoEn
    ? {
        audio_url: null,
        enviado_en: enviadoEn,
        fecha_evaluacion: null,
        insignia: null,
        transcripcion: 'Muy bien.',
        resumen_estructurado: null,
      }
    : null,
});

describe('Servicio Panel de la familia (UT 1141) - prácticas del paciente', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pide todas las prácticas del paciente, la más reciente primero', async () => {
    const { mockEq, mockOrder } = simularConsulta({ data: [], error: null });

    await obtenerPracticasDelPaciente('hugo');

    expect(from).toHaveBeenCalledWith('tareas');
    expect(mockEq).toHaveBeenCalledWith('paciente_id', 'hugo');
    expect(mockOrder).toHaveBeenCalledWith('fecha_asignacion', { ascending: false });
  });

  it('devuelve el módulo y el feedback como un único objeto aunque Supabase mande listas', async () => {
    simularConsulta({
      data: [
        {
          id: 't1',
          estado: 'evaluada',
          fecha_asignacion: null,
          fecha_envio: null,
          modulos: [INTENCION],
          feedbacks: [{ audio_url: 't1.m4a', enviado_en: '2026-10-25T10:00:00Z' }],
        },
        { id: 't2', estado: 'pendientes', fecha_asignacion: null, fecha_envio: null, modulos: ESPEJO, feedbacks: [] },
      ],
      error: null,
    });

    const [conFeedback, sinFeedback] = await obtenerPracticasDelPaciente('hugo');

    expect(conFeedback.modulos?.titulo).toBe('Intención Comunicativa');
    expect(conFeedback.feedback?.audio_url).toBe('t1.m4a');
    expect(sinFeedback.modulos?.titulo).toBe('El Espejo');
    expect(sinFeedback.feedback).toBeNull();
  });

  it('lanza error si Supabase devuelve un error', async () => {
    simularConsulta({ data: null, error: { message: 'sin conexión' } });

    await expect(obtenerPracticasDelPaciente('hugo')).rejects.toThrow('Error al cargar las prácticas: sin conexión');
  });
});

describe('Servicio Panel de la familia (UT 1141) - agrupar y marcar', () => {
  it('agrupa por módulo en el orden del catálogo, manteniendo el orden dentro de cada módulo', () => {
    const grupos = agruparPorModulo([
      practica('espejo-1', ESPEJO),
      practica('intencion-1', INTENCION),
      practica('intencion-2', INTENCION),
    ]);

    expect(grupos.map((g) => g.titulo)).toEqual(['Intención Comunicativa', 'El Espejo']);
    expect(grupos[0].practicas.map((p) => p.id)).toEqual(['intencion-1', 'intencion-2']);
    expect(grupos[1].practicas.map((p) => p.id)).toEqual(['espejo-1']);
  });

  it('elige la práctica con el feedback más reciente', () => {
    const masReciente = practicaConFeedbackMasReciente([
      practica('antigua', ESPEJO, '2026-10-01T10:00:00Z'),
      practica('sin-feedback', INTENCION),
      practica('nueva', INTENCION, '2026-10-25T10:00:00Z'),
    ]);

    expect(masReciente?.id).toBe('nueva');
  });

  it('no marca ninguna si todavía no hay feedback', () => {
    expect(practicaConFeedbackMasReciente([practica('p1', INTENCION)])).toBeNull();
  });

  it('muestra los estados con el texto de pantalla', () => {
    expect(textoEstado('pendientes')).toBe('Pendiente');
    expect(textoEstado('completada')).toBe('Enviada');
    expect(textoEstado('evaluada')).toBe('Con feedback');
  });
});
