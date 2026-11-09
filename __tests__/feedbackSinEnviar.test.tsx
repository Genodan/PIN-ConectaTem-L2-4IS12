import { fireEvent, render, screen } from '@testing-library/react-native';

import InicioFamilia from '../src/app/familia/index';

// La familia no ve el feedback de la terapeuta hasta que ella lo envía (UT 1353): mientras la práctica está
// «Enviada», la fila de feedback es un borrador (audio ya transcrito pero sin enviar) y no se muestra.
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

const modulo = { id: 'm1', titulo: 'Manos a la Obra', objetivo: 'Objetivo', video_guia_url: null, ideas_materiales: null };
const BORRADOR = {
  audio_url: 'borrador.m4a', enviado_en: null, fecha_evaluacion: null, insignia: null,
  transcripcion: 'Texto del borrador', resumen_estructurado: null, resumen_aprobado: false, resumen_escrito: null,
};
jest.mock('../src/services/panelFamiliaService', () => ({
  ...jest.requireActual('../src/services/panelFamiliaService'),
  obtenerPracticasDelPaciente: jest.fn(),
}));
const { obtenerPracticasDelPaciente } = jest.requireMock('../src/services/panelFamiliaService');

// Se sustituye el componente del feedback por una marca: aquí solo importa si se muestra o no
jest.mock('../src/components/FeedbackDePractica', () => {
  const { Text } = jest.requireActual('react-native');
  return { FeedbackDePractica: () => <Text>FEEDBACK VISIBLE</Text> };
});

describe('Feedback sin enviar en el panel de la familia', () => {
  it('una práctica «Enviada» con borrador de feedback no muestra el feedback', async () => {
    obtenerPracticasDelPaciente.mockResolvedValue([
      { id: 'a', estado: 'completada', fecha_asignacion: '2026-11-01T10:00:00Z', fecha_envio: '2026-11-02T10:00:00Z', modulos: modulo, feedback: BORRADOR },
    ]);
    await render(<InicioFamilia />);
    await screen.findByText('Prácticas de Paciente');

    await fireEvent.press(screen.getByText('Enviada'));

    expect(screen.getByText(/Práctica enviada/)).toBeOnTheScreen();
    expect(screen.queryByText('FEEDBACK VISIBLE')).toBeNull();
  });

  it('una práctica «Con feedback» sí muestra el feedback', async () => {
    obtenerPracticasDelPaciente.mockResolvedValue([
      { id: 'b', estado: 'evaluada', fecha_asignacion: '2026-10-21T10:00:00Z', fecha_envio: '2026-10-25T10:00:00Z', modulos: modulo,
        feedback: { ...BORRADOR, enviado_en: '2026-10-26T10:00:00Z', resumen_aprobado: true } },
    ]);
    await render(<InicioFamilia />);
    await screen.findByText('Prácticas de Paciente');

    await fireEvent.press(screen.getByText('Con feedback'));

    expect(screen.getAllByText('FEEDBACK VISIBLE').length).toBeGreaterThanOrEqual(1);
  });
});
