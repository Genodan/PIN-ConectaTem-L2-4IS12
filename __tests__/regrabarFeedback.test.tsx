import { fireEvent, render, screen } from '@testing-library/react-native';

import { DarFeedback } from '../src/components/DarFeedback';

// Volver a grabar la nota de voz después de transcribirla (UT 1122 / 1353).
// La base de datos, la IA y el micrófono se simulan: no se tocan datos reales ni se graba voz real.
const mockGrabadora = {
  uri: null as string | null,
  prepareToRecordAsync: jest.fn(async () => undefined),
  record: jest.fn(),
  stop: jest.fn(async () => {
    mockGrabadora.uri = 'file:///cache/nota.m4a';
  }),
};
let mockGrabando = false;

jest.mock('expo-audio', () => ({
  RecordingPresets: { HIGH_QUALITY: {} },
  requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setAudioModeAsync: jest.fn(async () => undefined),
  useAudioRecorder: () => mockGrabadora,
  useAudioRecorderState: () => ({ isRecording: mockGrabando, durationMillis: 3000 }),
  useAudioPlayer: () => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn() }),
  useAudioPlayerStatus: () => ({ playing: false, didJustFinish: false, currentTime: 0, duration: 40 }),
}));

jest.mock('../src/services/feedbackService', () => ({
  crearFeedbackInicial: jest.fn(),
  procesarAudioConIA: jest.fn(),
  actualizarFeedbackFinal: jest.fn(async () => undefined),
}));

const { crearFeedbackInicial, procesarAudioConIA, actualizarFeedbackFinal } = jest.requireMock(
  '../src/services/feedbackService',
);

const respuestaIA = (frase: string) => ({
  transcripcion: frase,
  resumen_estructurado: { punto_fuerte: frase, a_mejorar: 'Sin indicaciones', foco_semana: 'Sin indicaciones' },
});

const PRIMERA = 'Primera grabación: muy buen contacto visual.';
const SEGUNDA = 'Segunda grabación: ha pedido el pompero señalando.';

// Graba, detiene y pulsa «Transcribir y Analizar con IA»
const grabarYTranscribir = async (rerender: (ui: React.ReactElement) => Promise<void> | void) => {
  // Un elemento nuevo cada vez: con el mismo, rerender no vuelve a pintar
  const ui = () => <DarFeedback practicaId="practica-daniel" onEnviado={jest.fn()} />;
  await fireEvent.press(screen.getByText('Grabar nota de voz'));
  mockGrabando = true;
  await rerender(ui());
  await fireEvent.press(screen.getByText('Detener'));
  mockGrabando = false;
  await rerender(ui());
  await fireEvent.press(await screen.findByText('Transcribir y Analizar con IA'));
};

describe('Volver a grabar la nota de voz tras transcribirla', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks no vacía las respuestas «Once» sin usar de los tests anteriores: hace falta mockReset
    crearFeedbackInicial.mockReset();
    procesarAudioConIA.mockReset();
    mockGrabadora.uri = null;
    mockGrabando = false;
    crearFeedbackInicial.mockResolvedValueOnce('fb-1').mockResolvedValueOnce('fb-2');
    procesarAudioConIA.mockResolvedValueOnce(respuestaIA(PRIMERA)).mockResolvedValueOnce(respuestaIA(SEGUNDA));
  });

  it('tras la transcripción aparece «Descartar y volver a grabar»', async () => {
    const { rerender } = await render(<DarFeedback practicaId="practica-daniel" onEnviado={jest.fn()} />);
    await grabarYTranscribir(rerender);

    expect(await screen.findByText('Descartar y volver a grabar')).toBeTruthy();
    expect(screen.getByLabelText('Transcripción de la nota de voz').props.value).toBe(PRIMERA);
  });

  it('con la transcripción en pantalla se puede volver a escuchar la nota de voz', async () => {
    const { rerender } = await render(<DarFeedback practicaId="practica-daniel" onEnviado={jest.fn()} />);
    await grabarYTranscribir(rerender);

    await screen.findByLabelText('Transcripción de la nota de voz');
    expect(screen.getByText('Tu nota de voz')).toBeTruthy();
    expect(screen.getByText('Escuchar grabación')).toBeTruthy();
  });

  it('al descartar vuelve a «Grabar nota de voz» y desaparecen la transcripción y el resumen', async () => {
    const { rerender } = await render(<DarFeedback practicaId="practica-daniel" onEnviado={jest.fn()} />);
    await grabarYTranscribir(rerender);

    await fireEvent.press(await screen.findByText('Descartar y volver a grabar'));

    expect(screen.getByText('Grabar nota de voz')).toBeTruthy();
    expect(screen.queryByLabelText('Transcripción de la nota de voz')).toBeNull();
    expect(screen.queryByText('Aprobar y enviar resumen')).toBeNull();
    expect(screen.queryByText('Tu nota de voz')).toBeNull();
  });

  it('la segunda grabación se transcribe de nuevo y se envía con el id nuevo, sin las correcciones de la primera', async () => {
    const { rerender } = await render(<DarFeedback practicaId="practica-daniel" onEnviado={jest.fn()} />);
    await grabarYTranscribir(rerender);
    await fireEvent.changeText(await screen.findByLabelText('Transcripción de la nota de voz'), 'texto corregido a mano');

    await fireEvent.press(await screen.findByText('Descartar y volver a grabar'));
    await grabarYTranscribir(rerender);

    // Primero se espera a que aparezca la segunda transcripción; luego se comprueban las llamadas
    expect((await screen.findByLabelText('Transcripción de la nota de voz')).props.value).toBe(SEGUNDA);
    expect(crearFeedbackInicial).toHaveBeenCalledTimes(2);
    expect(procesarAudioConIA).toHaveBeenLastCalledWith('fb-2');

    await fireEvent.press(screen.getByText('Aprobar y enviar resumen'));
    expect(actualizarFeedbackFinal).toHaveBeenCalledWith(
      'fb-2',
      'practica-daniel',
      expect.objectContaining({ transcripcion: SEGUNDA, resumen_aprobado: true }),
    );
  });
});
