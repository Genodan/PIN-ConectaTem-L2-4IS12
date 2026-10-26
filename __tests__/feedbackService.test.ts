import {
  ESTADO_PRACTICA_CON_FEEDBACK,
  obtenerPracticasConFeedback,
  obtenerUrlAudio,
} from '../src/services/feedbackService';
import { supabase } from '../src/utils/supabase';

jest.mock('../src/utils/supabase', () => ({
  supabase: { from: jest.fn(), storage: { from: jest.fn() } },
}));

const from = supabase.from as jest.Mock;
const storageFrom = supabase.storage.from as jest.Mock;

// Cadena de la consulta: select -> eq(paciente) -> eq(estado) -> order
const simularConsulta = (resultado: { data: unknown; error: unknown }) => {
  const mockOrder = jest.fn().mockResolvedValue(resultado);
  const mockEqEstado = jest.fn().mockReturnValue({ order: mockOrder });
  const mockEqPaciente = jest.fn().mockReturnValue({ eq: mockEqEstado });
  const mockSelect = jest.fn().mockReturnValue({ eq: mockEqPaciente });
  from.mockReturnValue({ select: mockSelect });
  return { mockEqPaciente, mockEqEstado, mockOrder };
};

describe('Servicio de Feedback - Ver feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pide las prácticas del paciente con estado «evaluada», de la más reciente a la más antigua', async () => {
    const { mockEqPaciente, mockEqEstado, mockOrder } = simularConsulta({ data: [], error: null });

    await obtenerPracticasConFeedback('pac-1');

    expect(from).toHaveBeenCalledWith('tareas');
    expect(mockEqPaciente).toHaveBeenCalledWith('paciente_id', 'pac-1');
    expect(mockEqEstado).toHaveBeenCalledWith('estado', ESTADO_PRACTICA_CON_FEEDBACK);
    expect(mockOrder).toHaveBeenCalledWith('fecha_envio', { ascending: false });
  });

  it('devuelve módulo, terapeuta, insignia y audio, tanto si Supabase manda objetos como si manda listas', async () => {
    simularConsulta({
      data: [
        {
          id: 't1',
          modulos: { titulo: 'El Espejo' },
          terapeutas: { nombre: 'Elena Ferrer' },
          feedbacks: {
            audio_url: 't1.m4a',
            enviado_en: '2026-10-20T10:00:00Z',
            fecha_evaluacion: null,
            insignia: 'Familia Constante',
            transcripcion: 'Marta, muy bien.',
            resumen_estructurado: { punto_fuerte: 'Hugo mira antes de pedir.' },
            terapeutas: { nombre: 'Elena Ferrer' },
          },
        },
        {
          id: 't2',
          modulos: [{ titulo: 'El Reloj de la Calma' }],
          terapeutas: [{ nombre: 'Javier Ortega' }],
          feedbacks: [
            {
              audio_url: 't2.m4a',
              enviado_en: null,
              fecha_evaluacion: '2026-10-21T10:00:00Z',
              insignia: null,
              terapeutas: [{ nombre: 'Javier Ortega' }],
            },
          ],
        },
      ],
      error: null,
    });

    const resultado = await obtenerPracticasConFeedback('pac-1');

    expect(resultado[0].modulo).toBe('El Espejo');
    expect(resultado[0].terapeuta).toBe('Elena Ferrer');
    expect(resultado[0].feedback).toEqual({
      audio_url: 't1.m4a',
      enviado_en: '2026-10-20T10:00:00Z',
      fecha_evaluacion: null,
      insignia: 'Familia Constante',
      transcripcion: 'Marta, muy bien.',
      resumen_estructurado: { punto_fuerte: 'Hugo mira antes de pedir.' },
    });
    expect(resultado[1].modulo).toBe('El Reloj de la Calma');
    expect(resultado[1].terapeuta).toBe('Javier Ortega');
    expect(resultado[1].feedback?.audio_url).toBe('t2.m4a');
    expect(resultado[1].feedback?.insignia).toBeNull();
    // Si el feedback no trae texto, los campos quedan en null (no undefined)
    expect(resultado[1].feedback?.transcripcion).toBeNull();
    expect(resultado[1].feedback?.resumen_estructurado).toBeNull();
  });

  it('si el feedback no indica terapeuta, usa la de la práctica', async () => {
    simularConsulta({
      data: [
        {
          id: 't4',
          modulos: { titulo: 'El Espejo' },
          terapeutas: { nombre: 'Elena Ferrer' },
          feedbacks: { audio_url: 't4.m4a', enviado_en: null, fecha_evaluacion: null, insignia: null, terapeutas: null },
        },
      ],
      error: null,
    });

    const resultado = await obtenerPracticasConFeedback('pac-1');

    expect(resultado[0].terapeuta).toBe('Elena Ferrer');
  });

  it('no falla si la práctica aún no tiene fila de feedback', async () => {
    simularConsulta({ data: [{ id: 't3', modulos: null, terapeutas: null, feedbacks: null }], error: null });

    const resultado = await obtenerPracticasConFeedback('pac-1');

    expect(resultado[0].modulo).toBe('Módulo asignado');
    expect(resultado[0].terapeuta).toBeNull();
    expect(resultado[0].feedback).toBeNull();
  });

  it('lanza error si Supabase devuelve un error', async () => {
    simularConsulta({ data: null, error: { message: 'sin conexión' } });

    await expect(obtenerPracticasConFeedback('pac-1')).rejects.toThrow('Error al cargar el feedback: sin conexión');
  });
});

describe('Servicio de Feedback - URL del audio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pide una URL firmada de 1 hora en el bucket privado «feedbacks»', async () => {
    const mockCreate = jest.fn().mockResolvedValue({ data: { signedUrl: 'https://firmada/audio' }, error: null });
    storageFrom.mockReturnValue({ createSignedUrl: mockCreate });

    const url = await obtenerUrlAudio('t1.m4a');

    expect(storageFrom).toHaveBeenCalledWith('feedbacks');
    expect(mockCreate).toHaveBeenCalledWith('t1.m4a', 3600);
    expect(url).toBe('https://firmada/audio');
  });

  it('quita el prefijo «feedbacks/» si la ruta lo incluye', async () => {
    const mockCreate = jest.fn().mockResolvedValue({ data: { signedUrl: 'https://firmada/audio' }, error: null });
    storageFrom.mockReturnValue({ createSignedUrl: mockCreate });

    await obtenerUrlAudio('feedbacks/t1.m4a');

    expect(mockCreate).toHaveBeenCalledWith('t1.m4a', 3600);
  });

  it('usa tal cual una URL completa', async () => {
    const url = await obtenerUrlAudio('https://ejemplo.org/audio.mp3');

    expect(url).toBe('https://ejemplo.org/audio.mp3');
    expect(storageFrom).not.toHaveBeenCalled();
  });

  it('lanza error si el audio no existe', async () => {
    const mockCreate = jest.fn().mockResolvedValue({ data: null, error: { message: 'Object not found' } });
    storageFrom.mockReturnValue({ createSignedUrl: mockCreate });

    await expect(obtenerUrlAudio('no-existe.m4a')).rejects.toThrow('No se pudo cargar el audio: Object not found');
  });
});
