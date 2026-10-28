import { fireEvent, render, screen, within } from '@testing-library/react-native';

import InicioFamilia from '../src/app/familia/index';

// Prueba de aceptación de la UT 1141 "Panel principal de la familia" (Worki).
// La base de datos se simula: no se tocan datos reales de Supabase.
jest.mock('../src/services/tareasService', () => ({
  obtenerTodosLosPacientes: jest.fn(async () => [
    { id: 'hugo', nombre_nino: 'Hugo', nombre_familia: 'Marta Sanchis' },
  ]),
  enviarPractica: jest.fn(),
}));

// Condición: Hugo tiene dos prácticas en «Intención Comunicativa» y una en «El Espejo»,
// una de ellas con feedback nuevo
const modulo = (id: string, titulo: string) => ({ id, titulo, objetivo: 'Objetivo', video_guia_url: null, ideas_materiales: null });
jest.mock('../src/services/panelFamiliaService', () => ({
  ...jest.requireActual('../src/services/panelFamiliaService'),
  obtenerPracticasDelPaciente: jest.fn(async () => [
    {
      id: 'espejo-1',
      estado: 'evaluada',
      fecha_asignacion: '2026-10-22T10:00:00Z',
      fecha_envio: '2026-10-23T10:00:00Z',
      modulos: modulo('mod-3', 'El Espejo'),
      feedback: {
        audio_url: null,
        enviado_en: '2026-10-25T10:00:00Z',
        fecha_evaluacion: null,
        insignia: null,
        transcripcion: 'Muy bien, Marta. Hugo ha imitado los dos gestos.',
        resumen_estructurado: null,
      },
    },
    {
      id: 'intencion-2',
      estado: 'pendientes',
      fecha_asignacion: '2026-10-21T10:00:00Z',
      fecha_envio: null,
      modulos: modulo('mod-1', 'Intención Comunicativa'),
      feedback: null,
    },
    {
      id: 'intencion-1',
      estado: 'completada',
      fecha_asignacion: '2026-10-15T10:00:00Z',
      fecha_envio: '2026-10-18T10:00:00Z',
      modulos: modulo('mod-1', 'Intención Comunicativa'),
      feedback: null,
    },
  ]),
}));

// Reproductor y comentario de «Ver feedback» (UT 1352) simplificados: aquí solo importa dónde aparecen
jest.mock('../src/components/VerFeedback', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    NotaDeVoz: () => <Text>Nota de voz</Text>,
    ComentarioEscrito: ({ feedback }: { feedback: { transcripcion: string | null } }) => (
      <Text>{feedback.transcripcion}</Text>
    ),
    textoInsignia: (insignia: string) => insignia,
  };
});

jest.mock('expo-image-picker', () => ({ requestCameraPermissionsAsync: jest.fn(), launchCameraAsync: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

describe('UT 1141 · Panel principal de la familia', () => {
  it('Marta ve las prácticas de Hugo agrupadas por módulo, con su estado, y la del feedback nuevo marcada', async () => {
    // Pasos: Marta entra en el panel con «Hugo (Marta Sanchis)»
    await render(<InicioFamilia />);
    expect(await screen.findByText('Prácticas de Hugo')).toBeOnTheScreen();

    // Agrupadas por módulo
    expect(screen.getByText('Módulo: Intención Comunicativa (2 prácticas)')).toBeOnTheScreen();
    expect(screen.getByText('Módulo: El Espejo (1 práctica)')).toBeOnTheScreen();

    // Con su estado
    expect(screen.getByText('Pendiente')).toBeOnTheScreen();
    expect(screen.getByText('Enviada')).toBeOnTheScreen();
    expect(screen.getByText('Con feedback')).toBeOnTheScreen();

    // La del feedback nuevo aparece marcada en su módulo…
    expect(screen.getAllByText('Feedback nuevo')).toHaveLength(1);
    // …y, arriba del todo, el feedback más reciente
    const ultimo = screen.getByText('Feedback más reciente').parent?.parent;
    expect(ultimo).toBeTruthy();
    expect(within(ultimo!).getByText('El Espejo')).toBeOnTheScreen();
    expect(within(ultimo!).getByText('Muy bien, Marta. Hugo ha imitado los dos gestos.')).toBeOnTheScreen();
  });

  it('al abrir una práctica con feedback, el feedback aparece dentro de ella', async () => {
    await render(<InicioFamilia />);
    await screen.findByText('Prácticas de Hugo');

    // El primer «El Espejo» es el del feedback más reciente; el segundo, la práctica en su módulo
    const practicaEspejo = screen.getAllByText('El Espejo')[1];
    await fireEvent.press(practicaEspejo);

    expect(screen.getAllByText('Muy bien, Marta. Hugo ha imitado los dos gestos.')).toHaveLength(2);
  });
});
