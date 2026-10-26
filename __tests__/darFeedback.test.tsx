import { fireEvent, render, screen } from '@testing-library/react-native';

import { RevisionTareas } from '../src/components/RevisionTareas';

// Prueba de aceptación de la UT 1099 "Dar feedback a una práctica" (Worki).
// La base de datos y el micrófono se simulan: no se tocan datos reales ni se graba voz real.
type Practica = {
  id: string;
  estado: string;
  video_url: string | null;
  fecha_envio: string;
  pacientes: { nombre_nino: string; nombre_familia: string };
  modulos: { titulo: string };
};
let mockPracticas: Practica[] = [];
const mockGrabadora = {
  uri: null as string | null,
  prepareToRecordAsync: jest.fn(async () => undefined),
  record: jest.fn(),
  stop: jest.fn(async () => {
    mockGrabadora.uri = 'file:///cache/grabacion.m4a';
  }),
};
let mockGrabando = false;
let mockPermiso = true;
const mockReproductor = { play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(async () => undefined) };

jest.mock('expo-audio', () => ({
  RecordingPresets: { HIGH_QUALITY: {} },
  requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: mockPermiso })),
  setAudioModeAsync: jest.fn(async () => undefined),
  useAudioRecorder: () => mockGrabadora,
  useAudioRecorderState: () => ({ isRecording: mockGrabando, durationMillis: 5000 }),
  useAudioPlayer: () => mockReproductor,
  useAudioPlayerStatus: () => ({ playing: false, didJustFinish: false, currentTime: 0, duration: 5 }),
}));

jest.mock('../src/services/tareasService', () => ({
  obtenerTareasCompletadas: jest.fn(async () => mockPracticas.filter((p) => p.estado === 'completada')),
}));

jest.mock('../src/services/darFeedbackService', () => ({
  enviarFeedback: jest.fn(async (practicaId: string) => {
    const practica = mockPracticas.find((p) => p.id === practicaId);
    if (practica) practica.estado = 'evaluada';
    return { id: 'fb-1', tarea_id: practicaId };
  }),
}));

const { enviarFeedback } = jest.requireMock('../src/services/darFeedbackService');

describe('UT 1099 · Dar feedback a una práctica', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGrabadora.uri = null;
    mockGrabando = false;
    mockPermiso = true;
    // Condición: Elena tiene pendiente de revisar la práctica «Pedir más» de Hugo
    mockPracticas = [
      {
        id: 'practica-hugo',
        estado: 'completada',
        video_url: 'https://ejemplo.test/clip.mp4',
        fecha_envio: '2026-10-25T10:00:00Z',
        pacientes: { nombre_nino: 'Hugo', nombre_familia: 'Marta Sanchis' },
        modulos: { titulo: 'Pedir más' },
      },
    ];
  });

  it('Elena graba una nota de voz para «Pedir más» de Hugo, la envía y la práctica sale de sus pendientes', async () => {
    const { rerender } = await render(<RevisionTareas terapeutaIdActual="elena" />);
    expect(await screen.findByText('Módulo: Pedir más')).toBeOnTheScreen();
    expect(screen.getByText('▶️ Ver vídeo de la práctica')).toBeOnTheScreen();

    // Pasos: grabar una nota de voz…
    await fireEvent.press(screen.getByText('Grabar nota de voz'));
    expect(mockGrabadora.record).toHaveBeenCalled();
    mockGrabando = true;
    await rerender(<RevisionTareas terapeutaIdActual="elena" />);
    await fireEvent.press(screen.getByText('Detener'));
    mockGrabando = false;
    await rerender(<RevisionTareas terapeutaIdActual="elena" />);

    // La terapeuta puede escuchar su nota antes de enviarla
    await fireEvent.press(await screen.findByText('Escuchar grabación'));
    expect(mockReproductor.play).toHaveBeenCalled();
    expect(screen.getByText('0:00 / 0:05')).toBeOnTheScreen();

    // …y enviar
    await fireEvent.press(await screen.findByText('Enviar feedback'));

    // Resultado: la práctica pasa a «Con feedback» y desaparece de sus pendientes de revisar
    expect(enviarFeedback).toHaveBeenCalledWith('practica-hugo', { uriAudio: 'file:///cache/grabacion.m4a' });
    expect(mockPracticas[0].estado).toBe('evaluada');
    expect(await screen.findByText('Feedback enviado. La práctica pasa a «Con feedback».')).toBeOnTheScreen();
    expect(screen.queryByText('Módulo: Pedir más')).not.toBeOnTheScreen();
    expect(screen.getByText('No tienes tareas pendientes de revisar.')).toBeOnTheScreen();
  });

  it('Elena escribe el feedback en vez de grabarlo, lo envía y la práctica sale de sus pendientes', async () => {
    await render(<RevisionTareas terapeutaIdActual="elena" />);

    await fireEvent.press(await screen.findByText('Escribir'));
    await fireEvent.changeText(
      screen.getByPlaceholderText('Escribe tu feedback para la familia…'),
      'Muy bien, Marta. Espera un poco más antes de darle el pompero.',
    );
    await fireEvent.press(screen.getByText('Enviar feedback'));

    expect(enviarFeedback).toHaveBeenCalledWith('practica-hugo', {
      texto: 'Muy bien, Marta. Espera un poco más antes de darle el pompero.',
    });
    expect(await screen.findByText('Feedback enviado. La práctica pasa a «Con feedback».')).toBeOnTheScreen();
    expect(screen.queryByText('Módulo: Pedir más')).not.toBeOnTheScreen();
  });

  it('si no se da permiso al micrófono, avisa en pantalla y no graba', async () => {
    mockPermiso = false;
    await render(<RevisionTareas terapeutaIdActual="elena" />);

    await fireEvent.press(await screen.findByText('Grabar nota de voz'));

    expect(
      await screen.findByText('Para grabar la nota de voz hay que permitir el uso del micrófono.'),
    ).toBeOnTheScreen();
    expect(mockGrabadora.record).not.toHaveBeenCalled();
  });
});
