import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Speech from 'expo-speech';

import InicioFamilia from '../src/app/familia/index';
import { CrearPractica } from '../src/components/CrearPractica';

// Prueba de aceptación de la UT 1406 "Leer en voz alta las instrucciones de una práctica" (Worki).
// La base de datos y la voz del dispositivo se simulan: no se tocan datos reales ni suena nada.
const INSTRUCCIONES_ELENA =
  'Poneos los dos frente al espejo. Haz un gesto sencillo, como aplaudir, y espera unos segundos a que Hugo te imite. Si lo hace, celebradlo juntos.';

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(async () => undefined),
}));

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn() }),
  useAudioPlayerStatus: () => ({ playing: false, didJustFinish: false, currentTime: 0, duration: 0 }),
}));

jest.mock('../src/services/tareasService', () => ({
  obtenerTodosLosPacientes: jest.fn(async () => [{ id: 'hugo', nombre_nino: 'Hugo', nombre_familia: 'Marta Sanchis' }]),
  enviarPractica: jest.fn(),
}));

// Condición: Elena ha escrito las instrucciones de la práctica «El Espejo» (la otra práctica no tiene)
const modulo = (id: string, titulo: string) => ({ id, titulo, objetivo: 'Objetivo del módulo', video_guia_url: null, ideas_materiales: null });
jest.mock('../src/services/panelFamiliaService', () => ({
  ...jest.requireActual('../src/services/panelFamiliaService'),
  obtenerPracticasDelPaciente: jest.fn(async () => [
    {
      id: 'espejo-1',
      estado: 'pendientes',
      fecha_asignacion: '2026-11-10T10:00:00Z',
      fecha_envio: null,
      instrucciones:
        'Poneos los dos frente al espejo. Haz un gesto sencillo, como aplaudir, y espera unos segundos a que Hugo te imite. Si lo hace, celebradlo juntos.',
      modulos: modulo('mod-3', 'El Espejo'),
      feedback: null,
    },
    {
      id: 'intencion-1',
      estado: 'pendientes',
      fecha_asignacion: '2026-11-09T10:00:00Z',
      fecha_envio: null,
      instrucciones: null,
      modulos: modulo('mod-1', 'Intención Comunicativa'),
      feedback: null,
    },
  ]),
}));

jest.mock('../src/services/practicasService', () => ({
  obtenerPacientesDeTerapeuta: jest.fn(async () => [{ id: 'hugo', nombre_nino: 'Hugo', nombre_familia: 'Marta Sanchis' }]),
  obtenerModulos: jest.fn(async () => [
    { id: 'mod-3', titulo: 'El Espejo', objetivo: 'Imitación de gestos', video_guia_url: null },
  ]),
  crearPractica: jest.fn(async () => ({ id: 'espejo-1', estado: 'pendientes' })),
  repetirPractica: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({ requestCameraPermissionsAsync: jest.fn(), launchCameraAsync: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

const { crearPractica } = jest.requireMock('../src/services/practicasService');
const speak = Speech.speak as jest.Mock;
const stop = Speech.stop as jest.Mock;

describe('UT 1406 · Leer en voz alta las instrucciones de una práctica', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Elena escribe las instrucciones al crear la práctica «El Espejo»', async () => {
    await render(<CrearPractica terapeutaIdActual="elena" />);

    await fireEvent.changeText(await screen.findByLabelText('Instrucciones para la familia'), INSTRUCCIONES_ELENA);
    await fireEvent.press(screen.getByText('Guardar práctica'));

    expect(crearPractica).toHaveBeenCalledWith({
      terapeutaId: 'elena',
      pacienteId: 'hugo',
      moduloId: 'mod-3',
      instrucciones: INSTRUCCIONES_ELENA,
    });
  });

  it('Marta abre «El Espejo», pulsa «Escuchar instrucciones» y la app lee exactamente el texto de Elena', async () => {
    await render(<InicioFamilia />);

    // Pasos: Marta abre la práctica → «Escuchar instrucciones»
    await fireEvent.press(await screen.findByText('El Espejo'));
    expect(screen.getByText(INSTRUCCIONES_ELENA)).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Escuchar instrucciones'));

    // Resultado: lee exactamente el texto de Elena, sin añadir nada, en español
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0]).toBe(INSTRUCCIONES_ELENA);
    expect(speak.mock.calls[0][1]).toEqual(expect.objectContaining({ language: 'es-ES' }));

    // Mientras lee, el botón sirve para parar
    await fireEvent.press(screen.getByText('Parar'));
    expect(stop).toHaveBeenCalled();
    expect(screen.getByText('Escuchar instrucciones')).toBeOnTheScreen();
  });

  it('cuando termina de leer, el botón vuelve a «Escuchar instrucciones»', async () => {
    await render(<InicioFamilia />);
    await fireEvent.press(await screen.findByText('El Espejo'));
    await fireEvent.press(screen.getByText('Escuchar instrucciones'));
    expect(screen.getByText('Parar')).toBeOnTheScreen();

    // La voz del dispositivo avisa de que ha terminado
    const { onDone } = speak.mock.calls[0][1];
    await act(async () => onDone());

    expect(await screen.findByText('Escuchar instrucciones')).toBeOnTheScreen();
  });

  it('si la terapeuta no escribió instrucciones, no aparece el botón', async () => {
    await render(<InicioFamilia />);

    await fireEvent.press(await screen.findByText('Intención Comunicativa'));

    expect(screen.queryByText('Escuchar instrucciones')).toBeNull();
    expect(screen.queryByText('Instrucciones de tu terapeuta')).toBeNull();
  });
});
