import { fireEvent, render, screen } from '@testing-library/react-native';

import { VerFeedback, formatearTiempo, textoInsignia } from '../src/components/VerFeedback';
import { obtenerPracticasConFeedback, obtenerUrlAudio } from '../src/services/feedbackService';

jest.mock('../src/services/feedbackService', () => ({
  obtenerPracticasConFeedback: jest.fn(),
  obtenerUrlAudio: jest.fn(),
}));
jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn() }),
  useAudioPlayerStatus: () => ({ playing: false, didJustFinish: false, currentTime: 12, duration: 78 }),
}));

const practicas = obtenerPracticasConFeedback as jest.Mock;
const urlAudio = obtenerUrlAudio as jest.Mock;

const feedback = {
  audio_url: 't1.m4a',
  enviado_en: '2026-10-20T10:00:00Z',
  fecha_evaluacion: null,
  insignia: 'Familia Constante',
  transcripcion: null,
  resumen_estructurado: null,
};

// Prueba de aceptación (UT 1352): Marta abre la práctica con feedback y puede escuchar la nota de voz de Elena.
describe('Ver feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('muestra la práctica, quién responde, la insignia y el botón para escuchar la nota de voz', async () => {
    practicas.mockResolvedValue([{ id: 't1', modulo: 'El Espejo', terapeuta: 'Elena Ferrer', feedback }]);
    urlAudio.mockResolvedValue('https://firmada/audio');

    await render(<VerFeedback pacienteId="pac-1" />);

    expect(await screen.findByText('El Espejo')).toBeOnTheScreen();
    expect(screen.getByText(/Feedback de Elena Ferrer/)).toBeOnTheScreen();
    expect(screen.getByText('⭐ Familia Constante')).toBeOnTheScreen();
    expect(await screen.findByText('▶ Escuchar nota de voz')).toBeOnTheScreen();
    expect(practicas).toHaveBeenCalledWith('pac-1');
    expect(urlAudio).toHaveBeenCalledWith('t1.m4a');
  });

  it('muestra el resumen por apartados junto al audio, sin los apartados vacíos', async () => {
    const resumen = { punto_fuerte: 'Hugo mira antes de pedir.', a_mejorar: null, foco_semana: 'Pompero 5 minutos al día.' };
    practicas.mockResolvedValue([
      { id: 't1', modulo: 'El Espejo', terapeuta: 'Elena Ferrer', feedback: { ...feedback, resumen_estructurado: resumen } },
    ]);
    urlAudio.mockResolvedValue('https://firmada/audio');

    await render(<VerFeedback pacienteId="pac-1" />);

    expect(await screen.findByText('Lo que ha ido bien')).toBeOnTheScreen();
    expect(screen.getByText('Hugo mira antes de pedir.')).toBeOnTheScreen();
    expect(screen.getByText('Foco de la semana')).toBeOnTheScreen();
    expect(screen.queryByText('A mejorar')).toBeNull();
    expect(await screen.findByText('▶ Escuchar nota de voz')).toBeOnTheScreen();
  });

  it('con resumen y transcripción, la transcripción se abre con el botón y las viñetas salen como «•»', async () => {
    const resumen = { punto_fuerte: 'Hugo mira antes de pedir.', a_mejorar: null, foco_semana: null };
    practicas.mockResolvedValue([
      {
        id: 't1',
        modulo: 'El Espejo',
        terapeuta: 'Elena Ferrer',
        feedback: { ...feedback, resumen_estructurado: resumen, transcripcion: 'Hola Marta:\n\n* Lo que más me ha gustado.' },
      },
    ]);
    urlAudio.mockResolvedValue('https://firmada/audio');

    await render(<VerFeedback pacienteId="pac-1" />);

    expect(await screen.findByText('Hugo mira antes de pedir.')).toBeOnTheScreen();
    expect(screen.queryByText(/Lo que más me ha gustado/)).toBeNull();

    await fireEvent.press(screen.getByText('Ver transcripción'));

    expect(await screen.findByText(/• Lo que más me ha gustado/)).toBeOnTheScreen();
    expect(screen.getByText('Ocultar transcripción')).toBeOnTheScreen();
  });

  it('si no hay resumen, muestra la transcripción', async () => {
    practicas.mockResolvedValue([
      { id: 't1', modulo: 'El Espejo', terapeuta: 'Elena Ferrer', feedback: { ...feedback, transcripcion: 'Marta, muy bien. Hugo ha mirado el pompero.' } },
    ]);
    urlAudio.mockResolvedValue('https://firmada/audio');

    await render(<VerFeedback pacienteId="pac-1" />);

    expect(await screen.findByText('Marta, muy bien. Hugo ha mirado el pompero.')).toBeOnTheScreen();
    expect(screen.queryByText('Lo que ha ido bien')).toBeNull();
  });

  it('muestra el tiempo reproducido y la duración del audio', async () => {
    practicas.mockResolvedValue([{ id: 't1', modulo: 'El Espejo', terapeuta: 'Elena Ferrer', feedback }]);
    urlAudio.mockResolvedValue('https://firmada/audio');

    await render(<VerFeedback pacienteId="pac-1" />);

    expect(await screen.findByText('0:12 / 1:18')).toBeOnTheScreen();
  });

  it('no muestra insignia si el feedback no la tiene y usa un nombre genérico si no consta la terapeuta', async () => {
    practicas.mockResolvedValue([
      { id: 't2', modulo: 'El Reloj de la Calma', terapeuta: null, feedback: { ...feedback, insignia: null } },
    ]);
    urlAudio.mockResolvedValue('https://firmada/audio');

    await render(<VerFeedback pacienteId="pac-1" />);

    expect(await screen.findByText(/Feedback de la terapeuta ·/)).toBeOnTheScreen();
    expect(screen.queryByText(/⭐/)).toBeNull();
  });

  it('avisa si todavía no hay feedback', async () => {
    practicas.mockResolvedValue([]);

    await render(<VerFeedback pacienteId="pac-1" />);

    expect(await screen.findByText(/Todavía no hay feedback/)).toBeOnTheScreen();
  });

  it('avisa si la práctica tiene feedback pero sin audio', async () => {
    practicas.mockResolvedValue([{ id: 't2', modulo: 'Manos a la Obra', terapeuta: null, feedback: null }]);

    await render(<VerFeedback pacienteId="pac-1" />);

    expect(await screen.findByText('La terapeuta todavía no ha adjuntado el audio.')).toBeOnTheScreen();
    expect(urlAudio).not.toHaveBeenCalled();
  });

  it('muestra el error si no se puede cargar el feedback', async () => {
    practicas.mockRejectedValue(new Error('Error al cargar el feedback: sin conexión'));

    await render(<VerFeedback pacienteId="pac-1" />);

    expect(await screen.findByText('Error al cargar el feedback: sin conexión')).toBeOnTheScreen();
  });
});

describe('textoInsignia', () => {
  it('añade la estrella solo si la insignia no trae ya su emoji', () => {
    expect(textoInsignia('Familia Constante')).toBe('⭐ Familia Constante');
    expect(textoInsignia('⭐ Familia Constante')).toBe('⭐ Familia Constante');
    expect(textoInsignia('💪 Gran esfuerzo')).toBe('💪 Gran esfuerzo');
  });
});

describe('formatearTiempo', () => {
  it('da formato minutos:segundos', () => {
    expect(formatearTiempo(0)).toBe('0:00');
    expect(formatearTiempo(9)).toBe('0:09');
    expect(formatearTiempo(78)).toBe('1:18');
    expect(formatearTiempo(600)).toBe('10:00');
  });

  it('no falla si la duración todavía no se conoce', () => {
    expect(formatearTiempo(NaN)).toBe('0:00');
    expect(formatearTiempo(-3)).toBe('0:00');
  });
});
