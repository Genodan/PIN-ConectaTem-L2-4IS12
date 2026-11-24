import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import CalendarioHitosScreen from '../src/app/familia/calendario';
import { PracticaFamilia } from '../src/services/panelFamiliaService';
import { insigniasPorDia } from '../src/services/rachaService';

// Prueba de aceptación de la UT 1449 en el calendario de hitos (UT 1404): las insignias también salen
// en el calendario, el día en que se consiguieron. Datos inventados; hoy es el viernes 20/11/2026.
jest.setTimeout(30000);

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn() }),
  useAudioPlayerStatus: () => ({ playing: false, didJustFinish: false, currentTime: 0, duration: 0 }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({ pacienteId: 'hugo' }),
}));

jest.mock('../src/services/tareasService', () => ({
  obtenerTodosLosPacientes: jest.fn(async () => [{ id: 'hugo', nombre_nino: 'Hugo', nombre_familia: 'Marta Sanchis' }]),
  enviarPractica: jest.fn(),
}));

const local = (mes: number, dia: number) => new Date(2026, mes - 1, dia, 10).toISOString();
const modulo = (id: string, titulo: string) => ({ id, titulo, objetivo: null, video_guia_url: null, ideas_materiales: null });
const INTENCION = modulo('intencion', 'Intención Comunicativa');
const ESPEJO = modulo('espejo', 'El Espejo');

// Condición: Hugo ha enviado prácticas 4 semanas seguidas (26/10, 03/11, 10/11 y 17/11)
// y la del 03/11 repite «Intención Comunicativa» después del feedback del 28/10
const PRACTICAS: PracticaFamilia[] = [
  {
    id: 'p1',
    estado: 'evaluada',
    fecha_asignacion: local(10, 20),
    fecha_envio: local(10, 26),
    modulos: INTENCION,
    feedback: {
      transcripcion: null,
      resumen_estructurado: null,
      resumen_aprobado: false,
      resumen_escrito: 'Muy bien, Marta.',
      fecha_evaluacion: local(10, 28),
      enviado_en: local(10, 28),
      audio_url: null,
    },
  },
  { id: 'p2', estado: 'completada', fecha_asignacion: local(10, 30), fecha_envio: local(11, 3), modulos: INTENCION, feedback: null },
  { id: 'p3', estado: 'completada', fecha_asignacion: local(11, 5), fecha_envio: local(11, 10), modulos: ESPEJO, feedback: null },
  { id: 'p4', estado: 'completada', fecha_asignacion: local(11, 12), fecha_envio: local(11, 17), modulos: ESPEJO, feedback: null },
];

jest.mock('../src/services/panelFamiliaService', () => ({
  ...jest.requireActual('../src/services/panelFamiliaService'),
  obtenerPracticasDelPaciente: jest.fn(async () => mockPracticas),
}));
let mockPracticas: PracticaFamilia[] = [];

describe('UT 1449 · Las insignias salen en el calendario de hitos', () => {
  beforeEach(() => {
    mockPracticas = PRACTICAS;
    jest.useFakeTimers({
      now: new Date(2026, 10, 20, 12, 0, 0),
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

  it('cada insignia cae el día en que se envió la práctica que la consiguió', () => {
    const dias = insigniasPorDia(PRACTICAS, new Date(2026, 10, 20, 12));

    expect([...dias.entries()].map(([dia, insignias]) => [dia, insignias.map((i) => i.clave)])).toEqual([
      ['2026-10-26', ['primer-paso']],
      ['2026-11-03', ['lo-volvemos-a-intentar']],
      ['2026-11-17', ['constancia']],
    ]);
  });

  it('Marta ve marcados en el calendario los días de sus insignias, con su leyenda', async () => {
    await abrir();

    expect(screen.getByText('Insignia conseguida')).toBeOnTheScreen(); // leyenda
    expect(screen.getByTestId('marca-2026-11-03-insignia')).toBeOnTheScreen();
    expect(screen.getByTestId('marca-2026-11-17-insignia')).toBeOnTheScreen();
    expect(screen.queryByTestId('marca-2026-11-10-insignia')).toBeNull();

    await fireEvent.press(screen.getByTestId('mes-anterior'));
    expect(screen.getByTestId('marca-2026-10-26-insignia')).toBeOnTheScreen();
  });

  it('al pulsar el día de una insignia se ve cuál fue, junto a la práctica de ese día', async () => {
    await abrir();
    await fireEvent.press(screen.getByTestId('dia-2026-11-17'));

    const insignias = screen.getAllByTestId('tarjeta-dia-insignia');
    expect(insignias).toHaveLength(1);
    expect(within(insignias[0]).getByText('Insignia conseguida: Constancia')).toBeOnTheScreen();
    expect(screen.getAllByTestId('tarjeta-dia-practica')).toHaveLength(1);
  });

  it('un día con insignia pero sin hito (la práctica se evaluó otro día) no dice «Este día no hay prácticas»', async () => {
    await abrir();
    await fireEvent.press(screen.getByTestId('mes-anterior'));
    await fireEvent.press(screen.getByTestId('dia-2026-10-26'));

    expect(screen.getByText('Insignia conseguida: Primer paso')).toBeOnTheScreen();
    expect(screen.queryByTestId('texto-dia-sin-practicas')).toBeNull();
  });
});
