import { obtenerTareasPendientes, enviarPractica } from '../src/services/tareasService';
import { supabase } from '../src/utils/supabase';

jest.mock('../src/utils/supabase', () => ({
  supabase: { from: jest.fn(), storage: { from: jest.fn() } },
}));

describe('Servicio de Tareas - Realizar Prácticas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe obtener las tareas en estado pendientes de un paciente', async () => {
    const mockEqEstado = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'tarea-1',
          estado: 'pendientes',
          modulos: {
            titulo: 'Pedir más',
            objetivo: 'Fomentar petición',
            video_guia_url: 'http://video.com',
            ideas_materiales: ['Burbujas']
          }
        }
      ],
      error: null
    });

    const mockEqPaciente = jest.fn().mockReturnValue({ eq: mockEqEstado });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEqPaciente });

    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    const resultado = await obtenerTareasPendientes('pac-123');

    expect(supabase.from).toHaveBeenCalledWith('tareas');
    expect(mockEqPaciente).toHaveBeenCalledWith('paciente_id', 'pac-123');
    expect(mockEqEstado).toHaveBeenCalledWith('estado', 'pendientes');
    expect((resultado[0].modulos as any).titulo).toBe('Pedir más');
  });
});

// enviarPractica: sube el vídeo al bucket «videos-practicas», pide su URL pública y la guarda en la tarea
describe('Servicio de Tareas - Enviar la práctica', () => {
  const URL_PUBLICA = 'https://storage.test/videos-practicas/clip.webm';
  const mockUpload = jest.fn();
  const mockGetPublicUrl = jest.fn();
  const mockUpdate = jest.fn();

  // La cadena de la actualización: update(...) -> eq('id') -> select()
  const simularActualizacion = (resultado: { data: unknown; error: unknown }) => {
    const mockSelect = jest.fn().mockResolvedValue(resultado);
    const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
    mockUpdate.mockReturnValue({ eq: mockEq });
    (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });
    return { mockEq };
  };

  const simularVideo = (tipo: string) => {
    const blob = { type: tipo };
    globalThis.fetch = jest.fn().mockResolvedValue({ blob: async () => blob }) as unknown as typeof fetch;
    return blob;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // enviarPractica escribe en la consola los errores que relanza: se silencia en las pruebas
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockUpload.mockResolvedValue({ data: { path: 'clip' }, error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: URL_PUBLICA } });
    (supabase.storage.from as jest.Mock).mockReturnValue({ upload: mockUpload, getPublicUrl: mockGetPublicUrl });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sube el vídeo al bucket con su tipo y su extensión, y guarda la URL pública en la tarea', async () => {
    const blob = simularVideo('video/webm;codecs=vp9');
    const { mockEq } = simularActualizacion({
      data: [{ id: 'tarea-1', estado: 'completada', video_url: URL_PUBLICA }],
      error: null,
    });

    const resultado = await enviarPractica('tarea-1', 'blob:http://localhost/clip');

    expect(globalThis.fetch).toHaveBeenCalledWith('blob:http://localhost/clip');
    expect(supabase.storage.from).toHaveBeenCalledWith('videos-practicas');
    // «video/webm;codecs=vp9» -> extensión «webm»
    expect(mockUpload).toHaveBeenCalledWith(expect.stringMatching(/^tarea_tarea-1_\d+\.webm$/), blob, {
      contentType: 'video/webm;codecs=vp9',
    });
    expect(supabase.from).toHaveBeenCalledWith('tareas');
    expect(mockUpdate).toHaveBeenCalledWith({
      estado: 'completada',
      video_url: URL_PUBLICA,
      fecha_envio: expect.any(String),
    });
    expect(mockEq).toHaveBeenCalledWith('id', 'tarea-1');
    expect(resultado.estado).toBe('completada');
  });

  it('si el archivo no indica su tipo, se sube como mp4', async () => {
    const blob = simularVideo('');
    simularActualizacion({ data: [{ id: 'tarea-1', estado: 'completada' }], error: null });

    await enviarPractica('tarea-1', 'file:///videos/clip');

    expect(mockUpload).toHaveBeenCalledWith(expect.stringMatching(/\.mp4$/), blob, { contentType: 'video/mp4' });
  });

  it('si falla la subida del vídeo, lanza el error y no toca la tarea', async () => {
    simularVideo('video/mp4');
    mockUpload.mockResolvedValue({ data: null, error: { message: 'sin espacio' } });

    await expect(enviarPractica('tarea-1', 'file:///videos/clip.mp4')).rejects.toThrow(
      'Fallo al subir el vídeo: sin espacio',
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('si Supabase devuelve un error al actualizar la tarea, lo lanza con su motivo', async () => {
    simularVideo('video/mp4');
    simularActualizacion({ data: null, error: { message: 'fallo de red' } });

    await expect(enviarPractica('tarea-1', 'file:///videos/clip.mp4')).rejects.toThrow(
      'Error al actualizar la tarea: fallo de red',
    );
  });

  it('si no se actualiza ninguna fila (permisos), lanza error', async () => {
    simularVideo('video/mp4');
    simularActualizacion({ data: [], error: null });

    await expect(enviarPractica('tarea-1', 'file:///videos/clip.mp4')).rejects.toThrow(
      'No se pudo actualizar la tarea en Supabase.',
    );
  });
});
