import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import InicioFamilia from '../src/app/familia/index';
import CalendarioHitosScreen from '../src/app/familia/calendario';
import { PracticaFamilia } from '../src/services/panelFamiliaService';

jest.setTimeout(30000);

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn() }),
  useAudioPlayerStatus: () => ({ playing: false, didJustFinish: false, currentTime: 0, duration: 0 }),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({ pacienteId: 'paciente-a' }),
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

const mockPacientes = [{ id: 'paciente-a', nombre_nino: 'Paciente A', nombre_familia: 'Familia A' }];

// Practicas del paciente de prueba: feedbacks evaluados el 28/09, 26/10, 01/11 y 03/11 (tres ese día),
// una práctica enviada el 05/11 sin feedback y una pendiente. Horas a mediodía UTC.
const modulo = (id: string, titulo: string) => ({
  id,
  titulo,
  objetivo: null,
  video_guia_url: null,
  ideas_materiales: null,
});

const conFeedback = (id: string, titulo: string, evaluacion: string, texto: string): PracticaFamilia => ({
  id,
  estado: 'evaluada',
  fecha_asignacion: '2026-09-01T12:00:00Z',
  fecha_envio: '2026-09-02T12:00:00Z',
  modulos: modulo(`m-${titulo}`, titulo),
  feedback: {
    id: `f-${id}`,
    transcripcion: null,
    resumen_estructurado: null,
    resumen_aprobado: true,
    resumen_escrito: texto,
    fecha_evaluacion: evaluacion,
    enviado_en: evaluacion,
    insignia: null,
    audio_url: null,
  },
});

const practicasDePrueba: PracticaFamilia[] = [
  conFeedback('p1', 'Intención Comunicativa', '2026-09-28T12:00:00Z', 'Feedback de septiembre'),
  conFeedback('p2', 'Intención Comunicativa', '2026-10-26T12:00:00Z', 'Feedback del 26 de octubre'),
  conFeedback('p3', 'El Espejo', '2026-11-01T12:00:00Z', 'Feedback del 1 de noviembre'),
  conFeedback('p4', 'Intención Comunicativa', '2026-11-03T09:00:00Z', 'Primer feedback del 3 de noviembre'),
  conFeedback('p5', 'Intención Comunicativa', '2026-11-03T12:00:00Z', 'Segundo feedback del 3 de noviembre'),
  conFeedback('p6', 'El Reloj de la Calma', '2026-11-03T15:00:00Z', 'Tercer feedback del 3 de noviembre'),
  {
    id: 'p7',
    estado: 'completada',
    fecha_asignacion: '2026-11-04T12:00:00Z',
    fecha_envio: '2026-11-05T12:00:00Z',
    modulos: modulo('m-pedir', 'Pedir más'),
    feedback: null,
  },
  {
    id: 'p8',
    estado: 'pendientes',
    fecha_asignacion: '2026-11-06T12:00:00Z',
    fecha_envio: null,
    modulos: modulo('m-pedir', 'Pedir más'),
    feedback: null,
  },
];

const mockObtenerPracticas = jest.fn();

jest.mock('../src/services/tareasService', () => ({
  obtenerTodosLosPacientes: jest.fn(async () => mockPacientes),
  enviarPractica: jest.fn(),
}));

jest.mock('../src/services/panelFamiliaService', () => ({
  ...jest.requireActual('../src/services/panelFamiliaService'),
  obtenerPracticasDelPaciente: (...args: unknown[]) => mockObtenerPracticas(...args),
}));

describe('Calendario de hitos (UT 1404)', () => {
  // Se falsea solo la fecha: hoy es 11/11/2026. El resto de temporizadores sigue siendo real.
  beforeEach(() => {
    jest.clearAllMocks();
    mockObtenerPracticas.mockResolvedValue(practicasDePrueba);
    jest.useFakeTimers({
      now: new Date(2026, 10, 11, 10, 0, 0),
      doNotFake: [
        'hrtime',
        'nextTick',
        'performance',
        'queueMicrotask',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'requestIdleCallback',
        'cancelIdleCallback',
        'setImmediate',
        'clearImmediate',
        'setInterval',
        'clearInterval',
        'setTimeout',
        'clearTimeout',
      ],
    });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  const abrir = async () => {
    await render(<CalendarioHitosScreen />);
    await screen.findByTestId('calendario-hitos');
  };

  it('el panel de la familia tiene el botón que lleva al calendario del paciente', async () => {
    await render(<InicioFamilia />);
    await fireEvent.press(await screen.findByText('📅 Calendario de hitos'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/familia/calendario', params: { pacienteId: 'paciente-a' } });
  });

  it('abre en el mes actual, con una marca verde por hito y azul por práctica enviada', async () => {
    await abrir();

    expect(screen.getByText('noviembre de 2026')).toBeOnTheScreen();
    expect(screen.getByTestId('marca-2026-11-01-feedback')).toBeOnTheScreen();
    expect(screen.getByTestId('marca-2026-11-03-feedback')).toBeOnTheScreen();
    expect(screen.getByTestId('marca-2026-11-05-enviada')).toBeOnTheScreen();
    // Cada día lleva una sola marca de cada tipo, y la práctica enviada no lleva la de feedback
    expect(screen.queryByTestId('marca-2026-11-05-feedback')).toBeNull();
    expect(screen.queryByTestId('marca-2026-11-03-enviada')).toBeNull();
  });

  it('los días sin prácticas no llevan marca, y la práctica pendiente no aparece en ningún día', async () => {
    await abrir();

    expect(screen.queryByTestId('marca-2026-11-02-feedback')).toBeNull();
    expect(screen.queryByTestId('marca-2026-11-02-enviada')).toBeNull();
    // La pendiente se asignó el 06/11 y no tiene fecha de envío
    expect(screen.queryByTestId('marca-2026-11-06-enviada')).toBeNull();
    expect(screen.queryByTestId('marca-2026-11-06-feedback')).toBeNull();
    expect(screen.getByText('Pulsa un día marcado para ver sus prácticas.')).toBeOnTheScreen();
  });

  it('al pulsar un día con tres hitos salen sus tres prácticas con su feedback', async () => {
    await abrir();
    await fireEvent.press(screen.getByTestId('dia-2026-11-03'));

    expect(screen.getByText('Prácticas del 3 de noviembre de 2026')).toBeOnTheScreen();
    const tarjetas = screen.getAllByTestId('tarjeta-dia-practica');
    expect(tarjetas).toHaveLength(3);
    // El más reciente primero
    expect(within(tarjetas[0]).getByText('Módulo: El Reloj de la Calma')).toBeOnTheScreen();
    expect(within(tarjetas[0]).getByText('Tercer feedback del 3 de noviembre')).toBeOnTheScreen();
    expect(within(tarjetas[1]).getByText('Segundo feedback del 3 de noviembre')).toBeOnTheScreen();
    expect(within(tarjetas[2]).getByText('Primer feedback del 3 de noviembre')).toBeOnTheScreen();
    expect(within(tarjetas[0]).getByText('Con feedback')).toBeOnTheScreen();
    expect(within(tarjetas[0]).getByText('Evaluado el 03/11/2026')).toBeOnTheScreen();
  });

  it('una práctica enviada sin feedback sale como «Enviada», sin feedback', async () => {
    await abrir();
    await fireEvent.press(screen.getByTestId('dia-2026-11-05'));

    const tarjetas = screen.getAllByTestId('tarjeta-dia-practica');
    expect(tarjetas).toHaveLength(1);
    expect(within(tarjetas[0]).getByText('Módulo: Pedir más')).toBeOnTheScreen();
    expect(within(tarjetas[0]).getByText('Enviada')).toBeOnTheScreen();
    expect(within(tarjetas[0]).getByText('Enviada el 05/11/2026')).toBeOnTheScreen();
  });

  it('un día sin prácticas avisa de que no hay nada', async () => {
    await abrir();
    await fireEvent.press(screen.getByTestId('dia-2026-11-02'));

    expect(screen.getByTestId('texto-dia-sin-practicas')).toHaveTextContent('Este día no hay prácticas.');
    expect(screen.queryByTestId('tarjeta-dia-practica')).toBeNull();
  });

  it('con las flechas se cambia de mes y se ven las marcas de cada uno', async () => {
    await abrir();

    await fireEvent.press(screen.getByTestId('mes-anterior'));
    expect(screen.getByText('octubre de 2026')).toBeOnTheScreen();
    expect(screen.getByTestId('marca-2026-10-26-feedback')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('mes-anterior'));
    expect(screen.getByText('septiembre de 2026')).toBeOnTheScreen();
    expect(screen.getByTestId('marca-2026-09-28-feedback')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('mes-siguiente'));
    expect(screen.getByText('octubre de 2026')).toBeOnTheScreen();
  });

  it('no se puede ir antes del mes de la primera práctica ni después del mes actual', async () => {
    await abrir();

    // Mes actual: no hay siguiente
    expect(screen.getByTestId('mes-siguiente')).toBeDisabled();
    expect(screen.getByTestId('mes-anterior')).toBeEnabled();

    await fireEvent.press(screen.getByTestId('mes-anterior'));
    await fireEvent.press(screen.getByTestId('mes-anterior'));
    expect(screen.getByText('septiembre de 2026')).toBeOnTheScreen();
    // Septiembre es el mes del primer hito: no hay anterior
    expect(screen.getByTestId('mes-anterior')).toBeDisabled();
    expect(screen.getByTestId('mes-siguiente')).toBeEnabled();
  });

  it('abre siempre en el mes actual, aunque los hitos sean de meses anteriores', async () => {
    mockObtenerPracticas.mockResolvedValue([practicasDePrueba[0], practicasDePrueba[1]]);
    await abrir();

    expect(screen.getByText('noviembre de 2026')).toBeOnTheScreen();
    expect(screen.queryByTestId('marca-2026-11-03-feedback')).toBeNull();
  });

  it('una práctica enviada con un borrador de feedback no enseña ese borrador a la familia', async () => {
    const enviadaConBorrador: PracticaFamilia = {
      ...practicasDePrueba[6],
      id: 'p9',
      fecha_envio: '2026-11-07T12:00:00Z',
      feedback: {
        id: 'f-borrador',
        transcripcion: null,
        resumen_estructurado: null,
        resumen_aprobado: true,
        resumen_escrito: 'Borrador sin enviar',
        fecha_evaluacion: '2026-11-08T12:00:00Z',
        enviado_en: '2026-11-08T12:00:00Z',
        insignia: null,
        audio_url: null,
      },
    };
    mockObtenerPracticas.mockResolvedValue([enviadaConBorrador]);
    await abrir();

    // Cuenta el día del envío, no el del borrador
    expect(screen.getByTestId('marca-2026-11-07-enviada')).toBeOnTheScreen();
    expect(screen.queryByTestId('marca-2026-11-08-feedback')).toBeNull();
    await fireEvent.press(screen.getByTestId('dia-2026-11-07'));
    expect(screen.getAllByTestId('tarjeta-dia-practica')).toHaveLength(1);
    expect(screen.queryByText('Borrador sin enviar')).toBeNull();
  });

  it('un paciente sin prácticas ve el calendario sin marcas y un aviso', async () => {
    mockObtenerPracticas.mockResolvedValue([]);
    await abrir();

    expect(screen.getByText('noviembre de 2026')).toBeOnTheScreen();
    expect(screen.getByTestId('texto-sin-hitos')).toHaveTextContent(
      'Todavía no hay hitos ni prácticas enviadas para este paciente.',
    );
    expect(screen.queryByTestId('marca-2026-11-03-feedback')).toBeNull();
    expect(screen.getByTestId('mes-anterior')).toBeDisabled();
    expect(screen.getByTestId('mes-siguiente')).toBeDisabled();
  });

  it('un paciente solo con prácticas pendientes se ve igual que uno sin prácticas', async () => {
    mockObtenerPracticas.mockResolvedValue([practicasDePrueba[7]]);
    await abrir();

    expect(screen.getByTestId('texto-sin-hitos')).toBeOnTheScreen();
  });

  it('si no se pueden cargar las prácticas lo dice, en lugar de enseñar un calendario vacío', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockObtenerPracticas.mockRejectedValue(new Error('sin conexión'));
    await render(<CalendarioHitosScreen />);

    expect(await screen.findByText('No se han podido cargar las prácticas. Inténtalo de nuevo.')).toBeOnTheScreen();
    expect(screen.queryByTestId('calendario-hitos')).toBeNull();
  });
});
