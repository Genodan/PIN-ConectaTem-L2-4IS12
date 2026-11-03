import { fireEvent, render, screen } from '@testing-library/react-native';

import { DarFeedback } from '../src/components/DarFeedback';
import { FeedbackDePractica } from '../src/components/FeedbackDePractica';

// Prueba de aceptación de la UT 1353 "Aprobar o editar el resumen antes de enviarlo" (Worki).
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

jest.mock('../src/utils/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        createSignedUrl: jest.fn(async () => ({ data: { signedUrl: 'https://storage/nota.m4a' }, error: null })),
      }),
    },
  },
}));

// La IA se equivoca en una frase: entiende «solo de vez en cuando lo señala»
// cuando la terapeuta dijo «no se lo des en cuanto lo señale»
const RESUMEN_IA = {
  punto_fuerte: 'Ha señalado el pompero antes de cogerlo y eso ha sido una petición clara.',
  a_mejorar: 'Solo lo señala de vez en cuando y es mejor que espere a que le mires.',
  foco_semana: 'Practicar tres veces al día con algo que le guste mucho, a la vista pero fuera de su alcance.',
};
const FRASE_CORREGIDA = 'No se lo des en cuanto lo señale: espera a que te mire a ti.';
const TRANSCRIPCION_IA = 'Muy bien. A mejorar: solo de vez en cuando lo señalo, mejor espera a que te mire a ti.';
const TRANSCRIPCION_CORREGIDA = 'Muy bien. A mejorar: no se lo des en cuanto lo señale, mejor espera a que te mire a ti.';

jest.mock('../src/services/feedbackService', () => ({
  crearFeedbackInicial: jest.fn(async () => 'feedback-hugo'),
  procesarAudioConIA: jest.fn(async () => ({
    transcripcion: 'Muy bien. A mejorar: solo de vez en cuando lo señalo, mejor espera a que te mire a ti.',
    resumen_estructurado: {
      punto_fuerte: 'Ha señalado el pompero antes de cogerlo y eso ha sido una petición clara.',
      a_mejorar: 'Solo lo señala de vez en cuando y es mejor que espere a que le mires.',
      foco_semana: 'Practicar tres veces al día con algo que le guste mucho, a la vista pero fuera de su alcance.',
    },
  })),
  actualizarFeedbackFinal: jest.fn(async () => undefined),
}));

const { actualizarFeedbackFinal } = jest.requireMock('../src/services/feedbackService');

describe('UT 1353 · Aprobar o editar el resumen antes de enviarlo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGrabadora.uri = null;
    mockGrabando = false;
  });

  it('Elena corrige una frase del resumen de la IA y lo aprueba: se guarda su versión corregida', async () => {
    const onEnviado = jest.fn();
    const { rerender } = await render(<DarFeedback practicaId="practica-hugo" onEnviado={onEnviado} />);

    // Graba la nota de voz y la manda a la IA
    await fireEvent.press(screen.getByText('Grabar nota de voz'));
    mockGrabando = true;
    await rerender(<DarFeedback practicaId="practica-hugo" onEnviado={onEnviado} />);
    await fireEvent.press(screen.getByText('Detener'));
    mockGrabando = false;
    await rerender(<DarFeedback practicaId="practica-hugo" onEnviado={onEnviado} />);
    await fireEvent.press(await screen.findByText('Transcribir y Analizar con IA'));

    // Condición: se ha generado el resumen y Elena no lo ha aprobado. Lo ve en campos editables
    const campoAMejorar = await screen.findByLabelText('A mejorar');
    expect(campoAMejorar.props.value).toBe(RESUMEN_IA.a_mejorar);

    // La transcripción también se puede corregir
    const campoTranscripcion = screen.getByLabelText('Transcripción de la nota de voz');
    expect(campoTranscripcion.props.value).toBe(TRANSCRIPCION_IA);

    // Pasos: Elena corrige la frase en el resumen (y en la transcripción) y lo aprueba
    await fireEvent.changeText(campoAMejorar, FRASE_CORREGIDA);
    await fireEvent.changeText(campoTranscripcion, TRANSCRIPCION_CORREGIDA);
    await fireEvent.press(screen.getByText('Aprobar y enviar resumen'));

    // Se guardan la transcripción y el resumen con las correcciones de Elena, aprobado
    expect(actualizarFeedbackFinal).toHaveBeenCalledWith('feedback-hugo', 'practica-hugo', {
      transcripcion: TRANSCRIPCION_CORREGIDA,
      resumen_aprobado: true,
      resumen_estructurado: { ...RESUMEN_IA, a_mejorar: FRASE_CORREGIDA },
      resumen_escrito: null,
    });
    expect(onEnviado).toHaveBeenCalled();
  });

  it('no deja aprobar un resumen que se ha quedado vacío', async () => {
    const { rerender } = await render(<DarFeedback practicaId="practica-hugo" onEnviado={jest.fn()} />);
    await fireEvent.press(screen.getByText('Grabar nota de voz'));
    mockGrabando = true;
    await rerender(<DarFeedback practicaId="practica-hugo" onEnviado={jest.fn()} />);
    await fireEvent.press(screen.getByText('Detener'));
    mockGrabando = false;
    await rerender(<DarFeedback practicaId="practica-hugo" onEnviado={jest.fn()} />);
    await fireEvent.press(await screen.findByText('Transcribir y Analizar con IA'));

    for (const apartado of ['Punto fuerte', 'A mejorar', 'Foco de la semana']) {
      await fireEvent.changeText(await screen.findByLabelText(apartado), '   ');
    }
    await fireEvent.press(screen.getByText('Aprobar y enviar resumen'));

    expect(await screen.findByText(/El resumen está vacío/)).toBeOnTheScreen();
    expect(actualizarFeedbackFinal).not.toHaveBeenCalled();
  });

  it('Marta: antes de la aprobación solo oye el audio; después ve también el resumen con la corrección de Elena', async () => {
    const feedbackAntes = {
      audio_url: 'practica-hugo-1793741261221.m4a',
      transcripcion: TRANSCRIPCION_IA,
      resumen_estructurado: RESUMEN_IA,
      resumen_aprobado: false,
      resumen_escrito: null,
    };

    // Antes de la aprobación
    const { rerender } = await render(<FeedbackDePractica feedback={feedbackAntes} />);
    expect(await screen.findByText('Escuchar evaluación del terapeuta')).toBeOnTheScreen();
    expect(screen.queryByText(/Solo lo señala de vez en cuando/)).toBeNull();
    expect(screen.queryByText(/No se lo des en cuanto lo señale/)).toBeNull();
    expect(screen.queryByText('Transcripción de la nota de voz:')).toBeNull();

    // Después de que Elena corrija y apruebe
    const feedbackDespues = {
      ...feedbackAntes,
      transcripcion: TRANSCRIPCION_CORREGIDA,
      resumen_estructurado: { ...RESUMEN_IA, a_mejorar: FRASE_CORREGIDA },
      resumen_aprobado: true,
    };
    await rerender(<FeedbackDePractica feedback={feedbackDespues} />);

    expect(await screen.findByText('Escuchar evaluación del terapeuta')).toBeOnTheScreen();
    expect(screen.getByText(/No se lo des en cuanto lo señale/)).toBeOnTheScreen();
    expect(screen.queryByText(/Solo lo señala de vez en cuando/)).toBeNull();
    // La transcripción aparte, también corregida
    expect(screen.getByText('Transcripción de la nota de voz:')).toBeOnTheScreen();
    expect(screen.getByText(TRANSCRIPCION_CORREGIDA)).toBeOnTheScreen();
    expect(screen.queryByText(TRANSCRIPCION_IA)).toBeNull();
  });
});
