import { obtenerTareasPendientes, enviarPractica } from '../src/services/tareasService';
import { supabase } from '../src/utils/supabase';

jest.mock('../src/utils/supabase', () => ({
  supabase: { from: jest.fn() },
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
    expect(resultado[0].modulos.titulo).toBe('Pedir más');
  });

  it('debe cambiar el estado de la tarea a completada al enviar el vídeo', async () => {
    const mockSelect = jest.fn().mockResolvedValue({
      data: [{ id: 'tarea-1', estado: 'completada', video_url: 'http://clip.mp4' }],
      error: null
    });

    const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });

    (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

    const resultado = await enviarPractica('tarea-1', 'http://clip.mp4');

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: 'completada',
        video_url: 'http://clip.mp4'
      })
    );
    expect(resultado.estado).toBe('completada');
  });
});