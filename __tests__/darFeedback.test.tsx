import { fireEvent, render, screen } from '@testing-library/react-native';

import { RevisionTareas } from '../src/components/RevisionTareas';

// Prueba de aceptación de la UT 1099 «Dar feedback a una práctica» (Worki), con el flujo actual:
// la terapeuta graba una nota de voz, la IA la transcribe y la resume (UT 1122) y la terapeuta revisa el
// resumen antes de enviarlo (UT 1353). La base de datos, la IA y el micrófono se simulan: no se tocan datos
// reales ni se graba voz real.
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

// Al enviar el feedback definitivo, la práctica pasa a «Con feedback» y sale de la bandeja
jest.mock('../src/services/feedbackService', () => ({
  crearFeedbackInicial: jest.fn(async () => 'feedback-1'),
  procesarAudioConIA: jest.fn(async () => ({
    transcripcion: 'Muy bien. A mejorar: esperar un poco antes de darle el objeto.',
    resumen_estructurado: {
      punto_fuerte: 'Ha pedido el objeto señalando.',
      a_mejorar: 'Esperar un poco antes de dárselo.',
      foco_semana: 'Practicar tres veces al día.',
    },
  })),
  actualizarFeedbackFinal: jest.fn(async (_feedbackId: string, practicaId: string) => {
    const practica = mockPracticas.find((p) => p.id === practicaId);
    if (practica) practica.estado = 'evaluada';
  }),
}));

const { crearFeedbackInicial, procesarAudioConIA, actualizarFeedbackFinal } = jest.requireMock(
  '../src/services/feedbackService',
);

// Un elemento nuevo cada vez: con el mismo, rerender no vuelve a pintar
const bandeja = () => <RevisionTareas terapeutaIdActual="terapeuta-1" />;

// Graba una nota de voz y la detiene; queda lista para transcribir
const grabarNotaDeVoz = async (rerender: (ui: React.ReactElement) => Promise<void> | void) => {
  await fireEvent.press(screen.getByText('Grabar nota de voz'));
  expect(mockGrabadora.record).toHaveBeenCalled();
  mockGrabando = true;
  await rerender(bandeja());
  await fireEvent.press(screen.getByText('Detener'));
  mockGrabando = false;
  await rerender(bandeja());
};

describe('UT 1099 · Dar feedback a una práctica', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGrabadora.uri = null;
    mockGrabando = false;
    mockPermiso = true;
    // Condición: la terapeuta tiene pendiente de revisar una práctica «Enviada» de un paciente
    mockPracticas = [
      {
        id: 'practica-1',
        estado: 'completada',
        video_url: 'https://ejemplo.test/clip.mp4',
        fecha_envio: '2026-10-25T10:00:00Z',
        pacientes: { nombre_nino: 'Paciente de prueba', nombre_familia: 'Familia de prueba' },
        modulos: { titulo: 'Pedir más' },
      },
    ];
  });

  it('la terapeuta graba una nota de voz, la escucha, aprueba el resumen y la práctica sale de sus pendientes', async () => {
    const { rerender } = await render(bandeja());
    expect(await screen.findByText('Módulo: Pedir más')).toBeOnTheScreen();
    expect(screen.getByText('▶️ Ver vídeo de la práctica')).toBeOnTheScreen();

    // Pasos: grabar una nota de voz…
    await grabarNotaDeVoz(rerender);

    // La terapeuta puede escuchar su nota antes de enviarla
    await fireEvent.press(await screen.findByText('Escuchar grabación'));
    expect(mockReproductor.play).toHaveBeenCalled();
    expect(screen.getByText('0:00 / 0:05')).toBeOnTheScreen();

    // …la IA la transcribe y la resume…
    await fireEvent.press(screen.getByText('Transcribir y Analizar con IA'));
    expect(await screen.findByText('Aprobar y enviar resumen')).toBeOnTheScreen();
    expect(crearFeedbackInicial).toHaveBeenCalledWith('practica-1', 'file:///cache/grabacion.m4a');
    expect(procesarAudioConIA).toHaveBeenCalledWith('feedback-1');

    // …y la terapeuta aprueba el resumen y lo envía
    await fireEvent.press(screen.getByText('Aprobar y enviar resumen'));

    // Resultado: la práctica pasa a «Con feedback» y desaparece de sus pendientes de revisar
    expect(actualizarFeedbackFinal).toHaveBeenCalledWith(
      'feedback-1',
      'practica-1',
      expect.objectContaining({ resumen_aprobado: true, resumen_escrito: null }),
    );
    expect(mockPracticas[0].estado).toBe('evaluada');
    expect(await screen.findByText('Feedback enviado. La práctica pasa a «Con feedback».')).toBeOnTheScreen();
    expect(screen.queryByText('Módulo: Pedir más')).not.toBeOnTheScreen();
    expect(screen.getByText('No tienes tareas pendientes de revisar.')).toBeOnTheScreen();
  });

  it('la terapeuta prefiere no usar el resumen de la IA: escribe el suyo, lo envía y la práctica sale de sus pendientes', async () => {
    const { rerender } = await render(bandeja());
    await screen.findByText('Módulo: Pedir más');
    await grabarNotaDeVoz(rerender);
    await fireEvent.press(screen.getByText('Transcribir y Analizar con IA'));

    await fireEvent.changeText(
      await screen.findByLabelText('Resumen escrito'),
      'Muy bien. Espera un poco más antes de darle el objeto.',
    );
    await fireEvent.press(screen.getByText('Enviar con mi resumen escrito'));

    expect(actualizarFeedbackFinal).toHaveBeenCalledWith(
      'feedback-1',
      'practica-1',
      expect.objectContaining({
        resumen_aprobado: false,
        resumen_estructurado: null,
        resumen_escrito: 'Muy bien. Espera un poco más antes de darle el objeto.',
      }),
    );
    expect(await screen.findByText('Feedback enviado. La práctica pasa a «Con feedback».')).toBeOnTheScreen();
    expect(screen.queryByText('Módulo: Pedir más')).not.toBeOnTheScreen();
  });

  it('si no se da permiso al micrófono, avisa en pantalla y no graba', async () => {
    mockPermiso = false;
    await render(bandeja());

    await fireEvent.press(await screen.findByText('Grabar nota de voz'));

    expect(await screen.findByText('Permite el uso del micrófono.')).toBeOnTheScreen();
    expect(mockGrabadora.record).not.toHaveBeenCalled();
  });
});
