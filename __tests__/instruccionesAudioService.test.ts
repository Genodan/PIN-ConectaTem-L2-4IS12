import { obtenerUrlAudioInstrucciones, solicitarAudioInstrucciones } from '../src/services/instruccionesAudioService';
import { supabase } from '../src/utils/supabase';

// UT 1406 «Leer en voz alta las instrucciones»: audio generado con IA (opción 3).
// La base de datos, Storage y la Edge Function se simulan: no se tocan datos reales ni se gasta cuota de IA.
jest.mock('../src/utils/supabase', () => ({
  supabase: { functions: { invoke: jest.fn() }, storage: { from: jest.fn() } },
}));

const invoke = supabase.functions.invoke as jest.Mock;

describe('Audio de las instrucciones - pedir que se genere', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('llama a la Edge Function con el id de la tarea', async () => {
    invoke.mockResolvedValue({ data: { ruta: 'tarea-1.wav' }, error: null });

    solicitarAudioInstrucciones('tarea-1');
    await Promise.resolve();

    expect(invoke).toHaveBeenCalledWith('generar-audio-instrucciones', { body: { tarea_id: 'tarea-1' } });
  });

  it('si la función devuelve un error, no lanza nada (la familia oirá la voz del dispositivo)', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'fallo de Gemini' } });

    expect(() => solicitarAudioInstrucciones('tarea-1')).not.toThrow();
    await new Promise<void>((resolver) => setImmediate(() => resolver()));

    expect(console.warn).toHaveBeenCalled();
  });

  it('si la llamada se rompe del todo (sin red), tampoco lanza nada', async () => {
    invoke.mockRejectedValue(new Error('sin red'));

    expect(() => solicitarAudioInstrucciones('tarea-1')).not.toThrow();
    await new Promise<void>((resolver) => setImmediate(() => resolver()));

    expect(console.warn).toHaveBeenCalled();
  });
});

describe('Audio de las instrucciones - abrirlo', () => {
  const createSignedUrl = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.storage.from as jest.Mock).mockReturnValue({ createSignedUrl });
  });

  it('firma la ruta guardada con una validez de 1 hora', async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://storage.test/firmada?token=abc' }, error: null });

    const url = await obtenerUrlAudioInstrucciones('tarea-1.wav');

    expect(supabase.storage.from).toHaveBeenCalledWith('audios-instrucciones');
    expect(createSignedUrl).toHaveBeenCalledWith('tarea-1.wav', 3600);
    expect(url).toBe('https://storage.test/firmada?token=abc');
  });

  it('si la ruta lleva el nombre del bucket delante, se lo quita antes de firmar', async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://storage.test/firmada' }, error: null });

    await obtenerUrlAudioInstrucciones('audios-instrucciones/tarea-1.wav');

    expect(createSignedUrl).toHaveBeenCalledWith('tarea-1.wav', 3600);
  });

  it('si no se puede firmar, lanza un error con el motivo', async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: { message: 'Object not found' } });

    await expect(obtenerUrlAudioInstrucciones('no-existe.wav')).rejects.toThrow(
      'No se pudo cargar el audio de las instrucciones: Object not found',
    );
  });
});
