import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import InicioFamilia from '../src/app/familia/index';
import { PracticaFamilia, ordenarPorFechaAsignacion } from '../src/services/panelFamiliaService';

// Pruebas de aceptación de la UT 1138 «Historial de hitos» (opción B: todas las prácticas, con su estado).
// La base de datos se simula: no se tocan datos reales de Supabase.
jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn() }),
  useAudioPlayerStatus: () => ({ playing: false, didJustFinish: false, currentTime: 0, duration: 0 }),
}));
jest.mock('expo-image-picker', () => ({ requestCameraPermissionsAsync: jest.fn(), launchCameraAsync: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('../src/services/tareasService', () => ({
  obtenerTodosLosPacientes: jest.fn(async () => [{ id: 'p1', nombre_nino: 'Paciente', nombre_familia: 'Familia' }]),
  enviarPractica: jest.fn(),
}));
jest.mock('../src/services/panelFamiliaService', () => ({
  ...jest.requireActual('../src/services/panelFamiliaService'),
  obtenerPracticasDelPaciente: jest.fn(),
}));
jest.mock('../src/services/practicasService', () => ({
  ...jest.requireActual('../src/services/practicasService'),
  repetirPractica: jest.fn(),
}));
const { obtenerPracticasDelPaciente } = jest.requireMock('../src/services/panelFamiliaService');
const { repetirPractica } = jest.requireMock('../src/services/practicasService');
const { enviarPractica } = jest.requireMock('../src/services/tareasService');

const modulo = (titulo: string) => ({ id: `m-${titulo}`, titulo, objetivo: `Objetivo de ${titulo}`, video_guia_url: null, ideas_materiales: null });
const practica = (id: string, estado: string, fecha: string | null, titulo: string): PracticaFamilia => ({
  id,
  estado,
  fecha_asignacion: fecha,
  fecha_envio: null,
  modulos: modulo(titulo),
  feedback: null,
});

// Una práctica en cada estado, con fechas desordenadas y módulos distintos
const PRACTICAS = [
  practica('a', 'completada', '2026-10-15T10:00:00Z', 'El Espejo'),
  practica('b', 'pendientes', '2026-11-05T10:00:00Z', 'Manos a la Obra'),
  practica('c', 'evaluada', '2026-10-01T10:00:00Z', 'Intención Comunicativa'),
];

// Títulos de módulo de las tarjetas, en el orden en que aparecen en pantalla
const titulosEnOrden = () =>
  screen.getAllByTestId('tarjeta-practica').map((tarjeta) => within(tarjeta).getAllByText(/./)[0].props.children as string);

const abrirHistorial = async (practicas: PracticaFamilia[]) => {
  obtenerPracticasDelPaciente.mockResolvedValue(practicas);
  await render(<InicioFamilia />);
  await screen.findByText('Prácticas de Paciente');
  await fireEvent.press(screen.getByText('Historial'));
};

describe('UT 1138 · Orden del historial', () => {
  const orden = (practicas: PracticaFamilia[]) => ordenarPorFechaAsignacion(practicas).map((p) => p.id);

  it('de la más reciente a la más antigua por fecha de asignación', () => {
    expect(orden(PRACTICAS)).toEqual(['b', 'a', 'c']);
  });

  it('una práctica sin fecha de asignación va al final y no rompe la lista', () => {
    expect(
      orden([practica('sin-fecha', 'pendientes', null, 'El Espejo'), practica('reciente', 'pendientes', '2026-11-05T10:00:00Z', 'El Espejo')]),
    ).toEqual(['reciente', 'sin-fecha']);
  });

  it('con la misma fecha se mantiene el orden recibido', () => {
    expect(
      orden([practica('1', 'pendientes', '2026-11-05T09:00:00Z', 'El Espejo'), practica('2', 'evaluada', '2026-11-05T09:00:00Z', 'El Espejo')]),
    ).toEqual(['1', '2']);
  });
});

describe('UT 1138 · Historial en el panel de la familia', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    repetirPractica.mockReset();
    enviarPractica.mockReset();
  });

  it('al pulsar «Historial» aparecen todas las prácticas en una lista cronológica, y «Ver por módulos» vuelve al panel', async () => {
    obtenerPracticasDelPaciente.mockResolvedValue(PRACTICAS);
    await render(<InicioFamilia />);
    await screen.findByText('Prácticas de Paciente');
    // Antes del historial, las prácticas salen agrupadas por módulo
    expect(screen.getByText('Módulo: El Espejo (1 práctica)')).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Historial'));

    expect(titulosEnOrden()).toEqual(['Manos a la Obra', 'El Espejo', 'Intención Comunicativa']);
    expect(screen.queryByText('Módulo: El Espejo (1 práctica)')).toBeNull();

    await fireEvent.press(screen.getByText('Ver por módulos'));
    expect(screen.getByText('Módulo: El Espejo (1 práctica)')).toBeOnTheScreen();
  });

  it('cada práctica muestra su estado: Pendiente, Enviada o Con feedback', async () => {
    await abrirHistorial(PRACTICAS);

    expect(screen.getByText('Pendiente')).toBeOnTheScreen();
    expect(screen.getByText('Enviada')).toBeOnTheScreen();
    expect(screen.getByText('Con feedback')).toBeOnTheScreen();
  });

  it('varios módulos salen en una sola lista cronológica, no agrupados por módulo', async () => {
    await abrirHistorial([
      practica('1', 'evaluada', '2026-10-01T10:00:00Z', 'El Espejo'),
      practica('2', 'evaluada', '2026-10-10T10:00:00Z', 'Manos a la Obra'),
      practica('3', 'evaluada', '2026-10-20T10:00:00Z', 'El Espejo'),
    ]);

    expect(titulosEnOrden()).toEqual(['El Espejo', 'Manos a la Obra', 'El Espejo']);
  });

  it('dos prácticas asignadas el mismo día aparecen las dos, sin error', async () => {
    await abrirHistorial([
      practica('1', 'pendientes', '2026-11-05T09:00:00Z', 'El Espejo'),
      practica('2', 'evaluada', '2026-11-05T09:00:00Z', 'El Espejo'),
    ]);

    expect(screen.getAllByTestId('tarjeta-practica')).toHaveLength(2);
  });

  it('un paciente sin prácticas ve el mensaje y ninguna lista', async () => {
    await abrirHistorial([]);

    expect(screen.getByText('Todavía no hay prácticas para este paciente.')).toBeOnTheScreen();
    expect(screen.queryByTestId('tarjeta-practica')).toBeNull();
  });

  it('desde el historial se puede abrir una práctica «Pendiente» para adjuntar el vídeo y enviarlo', async () => {
    await abrirHistorial(PRACTICAS);

    // La «Pendiente» se abre con su objetivo y los botones para adjuntar o grabar
    await fireEvent.press(screen.getByText('Pendiente'));

    expect(screen.getByText('Objetivo de Manos a la Obra')).toBeOnTheScreen();
    expect(screen.getByText('📁 Seleccionar archivo/vídeo')).toBeOnTheScreen();
    expect(screen.getByText('🎥 Grabar')).toBeOnTheScreen();
    expect(screen.getByText('📤 Enviar Práctica')).toBeOnTheScreen();
  });

  it('desde el historial se puede repetir una práctica «Enviada» o «Con feedback»', async () => {
    repetirPractica.mockResolvedValue({ id: 'nueva' });
    await abrirHistorial(PRACTICAS);

    await fireEvent.press(screen.getByText('Enviada'));
    expect(screen.getByText('Repetir práctica')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Repetir práctica'));

    await waitFor(() => expect(repetirPractica).toHaveBeenCalledWith('a'));
  });
});
