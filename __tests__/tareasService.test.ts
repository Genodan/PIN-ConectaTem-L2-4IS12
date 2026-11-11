import { obtenerTareasPendientes, enviarPractica, obtenerUrlVideo } from '../src/services/tareasService';
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

// enviarPractica: sube el vídeo al bucket privado «videos-practicas» y guarda su RUTA en la tarea (no una URL)
describe('Servicio de Tareas - Enviar la práctica', () => {
  const mockUpload = jest.fn();
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
    (supabase.storage.from as jest.Mock).mockReturnValue({ upload: mockUpload });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sube el vídeo al bucket con su tipo y su extensión, y guarda su ruta (no una URL) en la tarea', async () => {
    const blob = simularVideo('video/webm;codecs=vp9');
    const { mockEq } = simularActualizacion({
      data: [{ id: 'tarea-1', estado: 'completada', video_url: 'tarea_tarea-1_1.webm' }],
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
    // La ruta guardada es el nombre con el que se ha subido el fichero
    const rutaSubida = mockUpload.mock.calls[0][0];
    expect(mockUpdate).toHaveBeenCalledWith({
      estado: 'completada',
      video_url: rutaSubida,
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


// obtenerUrlVideo: el bucket es privado, así que el vídeo se abre con una URL firmada que caduca
describe('Servicio de Tareas - Abrir el vídeo de una práctica', () => {
  const mockCreateSignedUrl = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.storage.from as jest.Mock).mockReturnValue({ createSignedUrl: mockCreateSignedUrl });
  });

  it('firma la ruta guardada con una validez de 1 hora', async () => {
    mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://storage.test/firmada?token=abc' }, error: null });

    const url = await obtenerUrlVideo('tarea_tarea-1_123.webm');

    expect(supabase.storage.from).toHaveBeenCalledWith('videos-practicas');
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('tarea_tarea-1_123.webm', 3600);
    expect(url).toBe('https://storage.test/firmada?token=abc');
  });

  it('si la ruta lleva el nombre del bucket delante, se lo quita antes de firmar', async () => {
    mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://storage.test/firmada' }, error: null });

    await obtenerUrlVideo('videos-practicas/tarea_tarea-1_123.webm');

    expect(mockCreateSignedUrl).toHaveBeenCalledWith('tarea_tarea-1_123.webm', 3600);
  });

  it('una práctica enviada antes del cambio guarda una URL completa: se devuelve tal cual', async () => {
    const urlAntigua = 'https://x.supabase.co/storage/v1/object/public/videos-practicas/clip.mp4';

    await expect(obtenerUrlVideo(urlAntigua)).resolves.toBe(urlAntigua);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it('si no se puede firmar, lanza un error con el motivo', async () => {
    mockCreateSignedUrl.mockResolvedValue({ data: null, error: { message: 'Object not found' } });

    await expect(obtenerUrlVideo('no-existe.mp4')).rejects.toThrow('No se pudo cargar el vídeo: Object not found');
  });
});
