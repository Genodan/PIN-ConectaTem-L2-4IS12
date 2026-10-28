import { enviarFeedback, extensionDeAudio } from '../src/services/darFeedbackService';
import { supabase } from '../src/utils/supabase';

jest.mock('../src/utils/supabase', () => ({
  supabase: { from: jest.fn(), storage: { from: jest.fn() } },
}));

const from = supabase.from as jest.Mock;
const storageFrom = supabase.storage.from as jest.Mock;

const PRACTICA = {
  id: '50000000-0000-0000-0000-000000000002',
  terapeuta_id: 'elena',
  paciente_id: 'hugo',
  modulo_id: 'pedir-mas',
  estado: 'completada',
};
const URI_MOVIL = 'file:///data/user/0/cache/Audio/grabacion.m4a';
const URI_WEB = 'blob:http://localhost:8081/0f6c1d2e';

type Resultado = { data: unknown; error: { message: string } | null };
const ok = (data: unknown): Resultado => ({ data, error: null });
const fallo = (message: string): Resultado => ({ data: null, error: { message } });

// Simula Supabase y apunta el orden en que se llama a cada paso
const simular = ({
  practica = ok(PRACTICA),
  subida = ok({ path: 'x' }),
  fila = ok([{ id: 'fb-1', tarea_id: PRACTICA.id }]),
  estado = ok([{ id: PRACTICA.id, estado: 'evaluada' }]),
}: Partial<Record<'practica' | 'subida' | 'fila' | 'estado', Resultado>> = {}) => {
  const orden: string[] = [];

  const mockSingle = jest.fn().mockResolvedValue(practica);
  const mockEqPractica = jest.fn().mockReturnValue({ single: mockSingle });
  const mockSelectPractica = jest.fn().mockReturnValue({ eq: mockEqPractica });

  const mockSelectEstado = jest.fn(async () => {
    orden.push('estado');
    return estado;
  });
  const mockEqEstadoAnterior = jest.fn().mockReturnValue({ select: mockSelectEstado });
  const mockEqId = jest.fn().mockReturnValue({ eq: mockEqEstadoAnterior });
  const mockUpdate = jest.fn().mockReturnValue({ eq: mockEqId });

  const mockSelectFila = jest.fn(async () => {
    orden.push('fila');
    return fila;
  });
  const mockUpsert = jest.fn().mockReturnValue({ select: mockSelectFila });
  const mockEqBorrarFila = jest.fn().mockResolvedValue(ok(null));
  const mockDelete = jest.fn().mockReturnValue({ eq: mockEqBorrarFila });

  from.mockImplementation((tabla: string) =>
    tabla === 'tareas'
      ? { select: mockSelectPractica, update: mockUpdate }
      : { upsert: mockUpsert, delete: mockDelete },
  );

  const mockUpload = jest.fn(async () => {
    orden.push('subida');
    return subida;
  });
  const mockRemove = jest.fn().mockResolvedValue(ok(null));
  storageFrom.mockReturnValue({ upload: mockUpload, remove: mockRemove });

  return { orden, mockEqPractica, mockUpload, mockRemove, mockUpsert, mockDelete, mockUpdate, mockEqId, mockEqEstadoAnterior };
};

// El audio grabado: fetch(uri) devuelve los bytes y, en web, el tipo MIME
const simularAudio = (tipoMime: string | null) => {
  globalThis.fetch = jest.fn().mockResolvedValue({
    headers: { get: () => tipoMime },
    arrayBuffer: async () => new ArrayBuffer(8),
  }) as unknown as typeof fetch;
};

describe('Servicio Dar feedback (UT 1099) - enviar la nota de voz', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    simularAudio(null);
  });

  it('sube el audio, crea la fila de feedback y pasa la práctica a «evaluada», en ese orden', async () => {
    const s = simular();

    await enviarFeedback(PRACTICA.id, { uriAudio: URI_MOVIL });

    expect(s.orden).toEqual(['subida', 'fila', 'estado']);
    expect(storageFrom).toHaveBeenCalledWith('feedbacks');
    expect(s.mockUpload).toHaveBeenCalledWith(`${PRACTICA.id}.m4a`, expect.any(ArrayBuffer), {
      contentType: 'audio/mp4',
      upsert: true,
    });
    expect(s.mockUpsert).toHaveBeenCalledWith(
      {
        tarea_id: PRACTICA.id,
        terapeuta_id: 'elena',
        paciente_id: 'hugo',
        modulo_id: 'pedir-mas',
        audio_url: `${PRACTICA.id}.m4a`,
        fecha_evaluacion: expect.any(String),
        enviado_en: expect.any(String),
        transcripcion: null,
        resumen_estructurado: null,
        insignia: null,
      },
      { onConflict: 'tarea_id' },
    );
    expect(s.mockUpdate).toHaveBeenCalledWith({ estado: 'evaluada' });
    expect(s.mockEqId).toHaveBeenCalledWith('id', PRACTICA.id);
    expect(s.mockEqEstadoAnterior).toHaveBeenCalledWith('estado', 'completada');
  });

  it('en web guarda el audio como .webm a partir del tipo MIME del navegador', async () => {
    simularAudio('audio/webm;codecs=opus');
    const s = simular();

    await enviarFeedback(PRACTICA.id, { uriAudio: URI_WEB });

    expect(s.mockUpload).toHaveBeenCalledWith(`${PRACTICA.id}.webm`, expect.any(ArrayBuffer), {
      contentType: 'audio/webm',
      upsert: true,
    });
  });

  it('no hace nada si la práctica no está pendiente de revisar', async () => {
    const s = simular({ practica: ok({ ...PRACTICA, estado: 'evaluada' }) });

    await expect(enviarFeedback(PRACTICA.id, { uriAudio: URI_MOVIL })).rejects.toThrow('no está pendiente de revisar');
    expect(s.mockUpload).not.toHaveBeenCalled();
  });

  it('si falla la subida del audio, no crea la fila ni cambia el estado', async () => {
    const s = simular({ subida: fallo('sin conexión') });

    await expect(enviarFeedback(PRACTICA.id, { uriAudio: URI_MOVIL })).rejects.toThrow('No se pudo subir la nota de voz: sin conexión');
    expect(s.mockUpsert).not.toHaveBeenCalled();
    expect(s.mockUpdate).not.toHaveBeenCalled();
  });

  it('si falla la fila de feedback, borra el audio subido y no cambia el estado', async () => {
    const s = simular({ fila: fallo('violates row-level security') });

    await expect(enviarFeedback(PRACTICA.id, { uriAudio: URI_MOVIL })).rejects.toThrow('No se pudo guardar el feedback');
    expect(s.mockRemove).toHaveBeenCalledWith([`${PRACTICA.id}.m4a`]);
    expect(s.mockUpdate).not.toHaveBeenCalled();
  });

  it('si no puede cambiar el estado, deshace la fila y el audio para no dejar la práctica a medias', async () => {
    const s = simular({ estado: ok([]) });

    await expect(enviarFeedback(PRACTICA.id, { uriAudio: URI_MOVIL })).rejects.toThrow('No se pudo marcar la práctica');
    expect(s.mockDelete).toHaveBeenCalled();
    expect(s.mockRemove).toHaveBeenCalledWith([`${PRACTICA.id}.m4a`]);
  });
});

describe('Servicio Dar feedback (UT 1099) - feedback escrito', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('guarda el texto en «transcripcion», sin audio, y pasa la práctica a «evaluada»', async () => {
    const s = simular();

    await enviarFeedback(PRACTICA.id, { texto: '  Muy bien, Marta. Espera un poco más antes de darle el pompero.  ' });

    expect(s.orden).toEqual(['fila', 'estado']);
    expect(s.mockUpload).not.toHaveBeenCalled();
    expect(s.mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tarea_id: PRACTICA.id,
        audio_url: null,
        transcripcion: 'Muy bien, Marta. Espera un poco más antes de darle el pompero.',
      }),
      { onConflict: 'tarea_id' },
    );
    expect(s.mockUpdate).toHaveBeenCalledWith({ estado: 'evaluada' });
  });

  it('no envía un texto vacío', async () => {
    const s = simular();

    await expect(enviarFeedback(PRACTICA.id, { texto: '   ' })).rejects.toThrow('Escribe el feedback');
    expect(s.mockUpsert).not.toHaveBeenCalled();
  });

  it('si no puede cambiar el estado, borra la fila y no intenta borrar ningún audio', async () => {
    const s = simular({ estado: ok([]) });

    await expect(enviarFeedback(PRACTICA.id, { texto: 'Muy bien.' })).rejects.toThrow('No se pudo marcar la práctica');
    expect(s.mockDelete).toHaveBeenCalled();
    expect(s.mockRemove).not.toHaveBeenCalled();
  });
});

describe('Servicio Dar feedback (UT 1099) - formato del audio', () => {
  it('toma la extensión de la ruta en el móvil', () => {
    expect(extensionDeAudio(URI_MOVIL, '')).toBe('m4a');
  });

  it('toma la extensión del tipo MIME en web', () => {
    expect(extensionDeAudio(URI_WEB, 'audio/webm;codecs=opus')).toBe('webm');
    expect(extensionDeAudio(URI_WEB, 'audio/mp4')).toBe('mp4');
  });
});
