import { Platform } from 'react-native';
import { crearFeedbackInicial } from '../src/services/feedbackService';
import { supabase } from '../src/utils/supabase';

jest.mock('../src/utils/supabase', () => ({
  supabase: { from: jest.fn(), storage: { from: jest.fn() } },
}));
jest.mock('expo-file-system/legacy', () => ({ readAsStringAsync: jest.fn(), EncodingType: { Base64: 'base64' } }));
jest.mock('base64-arraybuffer', () => ({ decode: jest.fn() }));

const from = supabase.from as jest.Mock;
const storageFrom = supabase.storage.from as jest.Mock;

const mockUpload = jest.fn();
const mockRemove = jest.fn();
const mockInsert = jest.fn();
const mockUpsert = jest.fn();

// Simula la tabla «feedbacks»: la lectura del borrador anterior y el upsert de la fila nueva
const simularTabla = ({
  borradorAnterior,
  resultadoUpsert = { data: { id: 'fb-1' }, error: null },
}: {
  borradorAnterior: { audio_url: string } | null;
  resultadoUpsert?: { data: unknown; error: unknown };
}) => {
  const mockMaybeSingle = jest.fn().mockResolvedValue({ data: borradorAnterior, error: null });
  const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
  const mockSelectLectura = jest.fn().mockReturnValue({ eq: mockEq });
  const mockSingle = jest.fn().mockResolvedValue(resultadoUpsert);
  const mockSelectUpsert = jest.fn().mockReturnValue({ single: mockSingle });
  mockUpsert.mockReturnValue({ select: mockSelectUpsert });
  from.mockReturnValue({ select: mockSelectLectura, upsert: mockUpsert, insert: mockInsert });
  return { mockEq };
};

describe('crearFeedbackInicial · borrador de feedback con nota de voz (UT 1122 / 1353)', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });
    globalThis.fetch = jest.fn().mockResolvedValue({
      headers: { get: () => 'audio/webm' },
      arrayBuffer: async () => new ArrayBuffer(8),
    }) as unknown as typeof fetch;
    mockUpload.mockResolvedValue({ data: { path: 'pr-1-nuevo.m4a' }, error: null });
    mockRemove.mockResolvedValue({ data: [], error: null });
    storageFrom.mockReturnValue({ upload: mockUpload, remove: mockRemove });
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => originalOS });
  });

  it('primera vez: crea la fila con el audio y devuelve su id', async () => {
    simularTabla({ borradorAnterior: null });

    const id = await crearFeedbackInicial('pr-1', 'blob:http://localhost/audio');

    expect(id).toBe('fb-1');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ tarea_id: 'pr-1', audio_url: 'pr-1-nuevo.m4a' }),
      { onConflict: 'tarea_id' },
    );
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('segunda vez sobre la misma práctica: reutiliza la fila (no usa insert) y no da «duplicate key»', async () => {
    simularTabla({ borradorAnterior: { audio_url: 'pr-1-viejo.m4a' } });

    const id = await crearFeedbackInicial('pr-1', 'blob:http://localhost/audio');

    expect(id).toBe('fb-1');
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalledWith(expect.anything(), { onConflict: 'tarea_id' });
  });

  it('al reutilizar la fila vacía transcripción y resumen, para que la IA no devuelva los del audio anterior', async () => {
    simularTabla({ borradorAnterior: { audio_url: 'pr-1-viejo.m4a' } });

    await crearFeedbackInicial('pr-1', 'blob:http://localhost/audio');

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        transcripcion: null,
        resumen_estructurado: null,
        resumen_aprobado: null,
        resumen_escrito: null,
      }),
      expect.anything(),
    );
  });

  it('borra del bucket el audio del borrador anterior', async () => {
    simularTabla({ borradorAnterior: { audio_url: 'pr-1-viejo.m4a' } });

    await crearFeedbackInicial('pr-1', 'blob:http://localhost/audio');

    expect(mockRemove).toHaveBeenCalledWith(['pr-1-viejo.m4a']);
  });

  it('si borrar el audio antiguo falla, el envío sigue adelante', async () => {
    simularTabla({ borradorAnterior: { audio_url: 'pr-1-viejo.m4a' } });
    mockRemove.mockRejectedValue(new Error('sin red'));

    await expect(crearFeedbackInicial('pr-1', 'blob:http://localhost/audio')).resolves.toBe('fb-1');
  });

  it('si Supabase rechaza la fila, el error empieza por «Error al subir el audio»', async () => {
    simularTabla({
      borradorAnterior: null,
      resultadoUpsert: { data: null, error: new Error('permiso denegado') },
    });

    await expect(crearFeedbackInicial('pr-1', 'blob:http://localhost/audio')).rejects.toThrow(
      'Error al subir el audio: permiso denegado',
    );
  });
});
