import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import InicioFamilia from '../src/app/familia/index';
import { RepetirPractica } from '../src/components/RepetirPractica';

// Prueba de aceptación de la UT 1401 «Repetir una práctica» (Worki).
// La base de datos se simula: no se tocan datos reales de Supabase.
jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn() }),
  useAudioPlayerStatus: () => ({ playing: false, didJustFinish: false, currentTime: 0, duration: 0 }),
}));
jest.mock('expo-image-picker', () => ({ requestCameraPermissionsAsync: jest.fn(), launchCameraAsync: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

jest.mock('../src/services/tareasService', () => ({
  obtenerTodosLosPacientes: jest.fn(async () => [
    { id: 'daniel', nombre_nino: 'Daniel', nombre_familia: 'Laura Ibáñez' },
  ]),
  enviarPractica: jest.fn(),
}));

const modulo = (id: string, titulo: string) => ({ id, titulo, objetivo: 'Objetivo', video_guia_url: null, ideas_materiales: null });
const PRACTICA_NUEVA = {
  id: 'nueva', estado: 'pendientes', fecha_asignacion: '2026-11-09T10:00:00Z', fecha_envio: null,
  modulos: modulo('mod-3', 'El Espejo'), feedback: null,
};
const PRACTICAS = [
    { id: 'espejo-1', estado: 'evaluada', fecha_asignacion: '2026-10-22T10:00:00Z', fecha_envio: '2026-10-23T10:00:00Z',
      modulos: modulo('mod-3', 'El Espejo'), feedback: null },
    { id: 'intencion-2', estado: 'pendientes', fecha_asignacion: '2026-10-21T10:00:00Z', fecha_envio: null,
      modulos: modulo('mod-1', 'Intención Comunicativa'), feedback: null },
    { id: 'intencion-1', estado: 'completada', fecha_asignacion: '2026-10-15T10:00:00Z', fecha_envio: '2026-10-18T10:00:00Z',
      modulos: modulo('mod-2', 'Gestos'), feedback: null },
];
jest.mock('../src/services/panelFamiliaService', () => ({
  ...jest.requireActual('../src/services/panelFamiliaService'),
  obtenerPracticasDelPaciente: jest.fn(),
}));
const { obtenerPracticasDelPaciente } = jest.requireMock('../src/services/panelFamiliaService');

jest.mock('../src/services/practicasService', () => ({
  ...jest.requireActual('../src/services/practicasService'),
  repetirPractica: jest.fn(),
}));
const { repetirPractica } = jest.requireMock('../src/services/practicasService');

describe('UT 1401 · Repetir una práctica (panel de la familia)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    repetirPractica.mockResolvedValue({ id: 'nueva' });
    // Primera carga: las prácticas de Daniel. Tras repetir: las mismas más la nueva «Pendiente»
    obtenerPracticasDelPaciente
      .mockReset()
      .mockResolvedValueOnce(PRACTICAS)
      .mockResolvedValue([PRACTICA_NUEVA, ...PRACTICAS]);
  });

  it('PA-3: «Repetir práctica» aparece en las prácticas Enviada y Con feedback, no en la Pendiente', async () => {
    await render(<InicioFamilia />);
    await screen.findByText('Prácticas de Daniel');

    await fireEvent.press(screen.getByText('Pendiente'));
    expect(screen.queryByText('Repetir práctica')).toBeNull();

    await fireEvent.press(screen.getByText('Enviada'));
    expect(screen.getByText('Repetir práctica')).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Con feedback'));
    expect(screen.getByText('Repetir práctica')).toBeOnTheScreen();
  });

  it.each(['Con feedback', 'Enviada'])(
    'PA-1: al repetir una práctica «%s» se abre la nueva «Pendiente», lista para grabar el clip',
    async (estado) => {
      await render(<InicioFamilia />);
      await screen.findByText('Prácticas de Daniel');
      await fireEvent.press(screen.getByText(estado));
      // Antes de repetir no hay ninguna práctica abierta para grabar
      expect(screen.queryByText('Objetivo:')).toBeNull();

      await fireEvent.press(screen.getByText('Repetir práctica'));

      await waitFor(() => expect(repetirPractica).toHaveBeenCalledTimes(1));
      // La nueva práctica aparece «Pendiente» y abierta (con su objetivo y el envío del clip)
      expect(await screen.findByText('Objetivo:')).toBeOnTheScreen();
      expect(screen.getAllByText('Pendiente').length).toBeGreaterThanOrEqual(2);
    },
  );
});

describe('UT 1401 · Botón «Repetir práctica»', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('PA-2/PA-4: si no se puede repetir, muestra el motivo y no avisa de éxito', async () => {
    repetirPractica.mockRejectedValue(
      new Error('Ya tienes una práctica pendiente de este módulo. Envíala antes de repetirla.'),
    );
    const onRepetida = jest.fn();
    await render(<RepetirPractica practicaId="espejo-1" onRepetida={onRepetida} />);

    await fireEvent.press(screen.getByText('Repetir práctica'));

    expect(
      await screen.findByText('Ya tienes una práctica pendiente de este módulo. Envíala antes de repetirla.'),
    ).toBeOnTheScreen();
    expect(onRepetida).not.toHaveBeenCalled();
  });

  it('tras un error se puede volver a intentar', async () => {
    repetirPractica.mockRejectedValueOnce(new Error('No se ha podido repetir la práctica: sin conexión')).mockResolvedValue({ id: 'nueva' });
    const onRepetida = jest.fn();
    await render(<RepetirPractica practicaId="espejo-1" onRepetida={onRepetida} />);

    await fireEvent.press(screen.getByText('Repetir práctica'));
    await screen.findByText(/sin conexión/);
    await fireEvent.press(screen.getByText('Repetir práctica'));

    await waitFor(() => expect(onRepetida).toHaveBeenCalledWith('nueva'));
    expect(screen.queryByText(/sin conexión/)).toBeNull();
  });
});

// Va el último: dos clics sin esperar abren dos «act» a la vez y dejarían sucios los tests siguientes
describe('UT 1401 · Doble clic en «Repetir práctica»', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('PA-2: un doble clic rápido crea una sola práctica', async () => {
    let terminar: (valor: unknown) => void = () => undefined;
    repetirPractica.mockReturnValue(new Promise((resolver) => (terminar = resolver)));
    const onRepetida = jest.fn();
    await render(<RepetirPractica practicaId="espejo-1" onRepetida={onRepetida} />);

    // Sin «await» en los clics: el primero espera a la respuesta, que aquí se resuelve a mano
    const clics = [
      fireEvent.press(screen.getByText('Repetir práctica')),
      fireEvent.press(screen.getByText('Repetir práctica')),
    ];

    expect(repetirPractica).toHaveBeenCalledTimes(1);
    terminar({ id: 'nueva' });
    await Promise.all(clics);
    await waitFor(() => expect(onRepetida).toHaveBeenCalledTimes(1));
  });
});
