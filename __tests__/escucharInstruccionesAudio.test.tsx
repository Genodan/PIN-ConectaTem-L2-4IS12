import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Speech from 'expo-speech';

import { EscucharInstrucciones } from '../src/components/EscucharInstrucciones';

// Prueba de aceptación de la UT 1406 con audio generado con IA: la familia oye el audio si existe y,
// si no, las instrucciones se leen con la voz del dispositivo. Todo se simula: no suena nada ni se toca la red.
const TEXTO = 'Poneos los dos frente al espejo. Haz un gesto sencillo y espera a que Hugo te imite.';

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(async () => undefined),
}));

const mockReproductor = { play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(async () => undefined) };
let mockEstado = { playing: false, didJustFinish: false, currentTime: 0, duration: 20 };
const mockUseAudioPlayer = jest.fn((_uri?: string) => mockReproductor);

jest.mock('expo-audio', () => ({
  useAudioPlayer: (uri?: string) => mockUseAudioPlayer(uri),
  useAudioPlayerStatus: () => mockEstado,
}));

const mockObtenerUrl = jest.fn();
jest.mock('../src/services/instruccionesAudioService', () => ({
  obtenerUrlAudioInstrucciones: (...args: unknown[]) => mockObtenerUrl(...args),
}));

describe('UT 1406 · Escuchar las instrucciones con el audio generado', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEstado = { playing: false, didJustFinish: false, currentTime: 0, duration: 20 };
  });

  it('Escenario: la práctica tiene audio -> se reproduce ese audio y no la voz del dispositivo', async () => {
    mockObtenerUrl.mockResolvedValue('https://storage.test/firmada?token=abc');

    await render(<EscucharInstrucciones texto={TEXTO} audioRuta="tarea-1.wav" />);
    await fireEvent.press(await screen.findByText('Escuchar instrucciones'));

    expect(mockObtenerUrl).toHaveBeenCalledWith('tarea-1.wav');
    expect(mockUseAudioPlayer).toHaveBeenCalledWith('https://storage.test/firmada?token=abc');
    expect(mockReproductor.play).toHaveBeenCalledTimes(1);
    expect(Speech.speak).not.toHaveBeenCalled();
    // El texto sigue a la vista
    expect(screen.getByText(TEXTO)).toBeOnTheScreen();
  });

  it('mientras se reproduce, el botón sirve para parar', async () => {
    mockObtenerUrl.mockResolvedValue('https://storage.test/firmada');
    mockEstado = { ...mockEstado, playing: true };

    await render(<EscucharInstrucciones texto={TEXTO} audioRuta="tarea-1.wav" />);
    await fireEvent.press(await screen.findByText('Parar'));

    expect(mockReproductor.pause).toHaveBeenCalledTimes(1);
    expect(mockReproductor.seekTo).toHaveBeenCalledWith(0);
  });

  it('Escenario: la práctica todavía no tiene audio -> se lee con la voz del dispositivo', async () => {
    await render(<EscucharInstrucciones texto={TEXTO} audioRuta={null} />);
    await fireEvent.press(screen.getByText('Escuchar instrucciones'));

    expect(mockObtenerUrl).not.toHaveBeenCalled();
    expect(Speech.speak).toHaveBeenCalledTimes(1);
    expect((Speech.speak as jest.Mock).mock.calls[0][0]).toBe(TEXTO);
  });

  it('si el audio no se puede cargar, también se lee con la voz del dispositivo', async () => {
    mockObtenerUrl.mockRejectedValue(new Error('No se pudo cargar el audio de las instrucciones: Object not found'));

    await render(<EscucharInstrucciones texto={TEXTO} audioRuta="tarea-1.wav" />);
    await fireEvent.press(await screen.findByText('Escuchar instrucciones'));

    expect(Speech.speak).toHaveBeenCalledTimes(1);
    expect(mockReproductor.play).not.toHaveBeenCalled();
  });
});
