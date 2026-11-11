import { Linking } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { RevisionTareas } from '../src/components/RevisionTareas';

// Prueba de aceptación: la terapeuta abre el vídeo que ha enviado la familia.
// El vídeo está en un bucket privado: al pulsar «Ver vídeo» se pide una URL temporal y se abre esa.
const mockObtenerUrlVideo = jest.fn();

jest.mock('../src/services/tareasService', () => ({
  obtenerTareasCompletadas: jest.fn(async () => [
    {
      id: 'tarea-1',
      estado: 'completada',
      video_url: 'tarea_tarea-1_123.webm',
      fecha_envio: '2026-11-10T10:00:00Z',
      pacientes: { nombre_nino: 'Leo', nombre_familia: 'García' },
      modulos: { titulo: 'El Espejo' },
    },
  ]),
  obtenerUrlVideo: (...args: unknown[]) => mockObtenerUrlVideo(...args),
}));

// El feedback no es lo que se prueba aquí
jest.mock('../src/components/DarFeedback', () => ({ DarFeedback: () => null }));

describe('Bandeja de la terapeuta - Ver el vídeo de la práctica', () => {
  let abrirUrl: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    abrirUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Escenario: la terapeuta abre un vídeo recibido -> se abre una URL temporal, no la ruta guardada', async () => {
    mockObtenerUrlVideo.mockResolvedValue('https://storage.test/firmada?token=abc');

    await render(<RevisionTareas terapeutaIdActual="terap-1" />);
    fireEvent.press(await screen.findByText('▶️ Ver vídeo de la práctica'));

    await waitFor(() => expect(abrirUrl).toHaveBeenCalledWith('https://storage.test/firmada?token=abc'));
    expect(mockObtenerUrlVideo).toHaveBeenCalledWith('tarea_tarea-1_123.webm');
  });

  it('Escenario: si no se puede obtener la URL, no se abre nada', async () => {
    mockObtenerUrlVideo.mockRejectedValue(new Error('No se pudo cargar el vídeo: Object not found'));
    const alerta = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => undefined);

    await render(<RevisionTareas terapeutaIdActual="terap-1" />);
    fireEvent.press(await screen.findByText('▶️ Ver vídeo de la práctica'));

    await waitFor(() => expect(alerta).toHaveBeenCalledWith('Error', 'No se pudo cargar el vídeo: Object not found'));
    expect(abrirUrl).not.toHaveBeenCalled();
  });
});
