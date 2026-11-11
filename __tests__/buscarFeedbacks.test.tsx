import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import InicioFamilia from '../src/app/familia/index';
import BuscarFeedbacksScreen from '../src/app/familia/buscar';
import { PracticaFamilia } from '../src/services/panelFamiliaService';

jest.setTimeout(30000);

// Mock de expo-audio
jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn() }),
  useAudioPlayerStatus: () => ({ playing: false, didJustFinish: false, currentTime: 0, duration: 0 }),
}));

// Mock de expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({ pacienteId: 'hugo' }),
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

// Mock de servicios
const mockPacientes = [
  { id: 'hugo', nombre_nino: 'Hugo', nombre_familia: 'Marta Sanchis' },
];

const mockPracticas: PracticaFamilia[] = [
  {
    id: 'p-pompas',
    estado: 'evaluada',
    fecha_asignacion: '2026-10-10T10:00:00Z',
    fecha_envio: '2026-10-12T10:00:00Z',
    modulos: {
      id: 'mod-pompas',
      titulo: 'Pedir más',
      objetivo: 'Aprender a pedir más pompas',
      video_guia_url: null,
      ideas_materiales: null,
    },
    feedback: {
      id: 'fb-pompas',
      transcripcion: 'Marta lo ha hecho genial con el pompero de jabón.',
      resumen_estructurado: {
        punto_fuerte: 'Mantiene la atención visual.',
        a_mejorar: 'Sin indicaciones',
        foco_semana: 'Esperar dos segundos antes de soplar.',
      },
      resumen_aprobado: true,
      resumen_escrito: null,
      fecha_evaluacion: '2026-10-15T12:00:00Z',
      enviado_en: '2026-10-15T12:00:00Z',
      insignia: '⭐ Gran esfuerzo',
      audio_url: null,
    },
  },
  {
    id: 'p-espejo',
    estado: 'evaluada',
    fecha_asignacion: '2026-10-20T10:00:00Z',
    fecha_envio: '2026-10-22T10:00:00Z',
    modulos: {
      id: 'mod-espejo',
      titulo: 'El Espejo',
      objetivo: 'Imitar gestos faciales',
      video_guia_url: null,
      ideas_materiales: null,
    },
    feedback: {
      id: 'fb-espejo',
      transcripcion: 'Hugo imitó el gesto de sacar la lengua frente al espejo.',
      resumen_estructurado: null,
      resumen_aprobado: false,
      resumen_escrito: 'Muy buena imitación frente al espejo; practicar sonreír.',
      fecha_evaluacion: '2026-10-25T15:00:00Z',
      enviado_en: '2026-10-25T15:00:00Z',
      insignia: null,
      audio_url: null,
    },
  },
  {
    id: 'p-pendiente',
    estado: 'pendientes',
    fecha_asignacion: '2026-10-28T10:00:00Z',
    fecha_envio: null,
    modulos: {
      id: 'mod-pompas',
      titulo: 'Pedir más',
      objetivo: 'Aprender a pedir más pompas',
      video_guia_url: null,
      ideas_materiales: null,
    },
    feedback: null,
  },
];

jest.mock('../src/services/tareasService', () => ({
  obtenerTodosLosPacientes: jest.fn(async () => mockPacientes),
  enviarPractica: jest.fn(),
}));

jest.mock('../src/services/panelFamiliaService', () => ({
  ...jest.requireActual('../src/services/panelFamiliaService'),
  obtenerPracticasDelPaciente: jest.fn(async () => mockPracticas),
}));

describe('Búsqueda de Feedbacks (Vista Familia)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Botón de búsqueda en InicioFamilia', () => {
    it('muestra el botón de búsqueda y al pulsarlo navega a la página de búsqueda', async () => {
      await render(<InicioFamilia />);

      const botonBuscar = await screen.findByText('🔍 Buscar feedbacks');
      expect(botonBuscar).toBeOnTheScreen();

      fireEvent.press(botonBuscar);

      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/familia/buscar',
        params: { pacienteId: 'hugo' },
      });
    });
  });

  describe('Pantalla BuscarFeedbacksScreen', () => {
    it('muestra los tres modos de búsqueda: por palabra, por módulo y por fecha', async () => {
      await render(<BuscarFeedbacksScreen />);

      expect(await screen.findByText('Búsqueda de Feedbacks')).toBeOnTheScreen();
      expect(screen.getByText('Por palabra')).toBeOnTheScreen();
      expect(screen.getByText('Por módulo')).toBeOnTheScreen();
      expect(screen.getByText('Por fecha')).toBeOnTheScreen();

      // Por defecto muestra ambos feedbacks evaluados
      expect(await screen.findByText('Resultados (2)')).toBeOnTheScreen();
      expect(screen.getByText('Módulo: Pedir más')).toBeOnTheScreen();
      expect(screen.getByText('Módulo: El Espejo')).toBeOnTheScreen();
    });

    it('busca por palabra en la transcripción, nombre de módulo y resúmenes', async () => {
      await render(<BuscarFeedbacksScreen />);
      await screen.findByText('Resultados (2)');

      const input = screen.getByTestId('input-buscar-palabra');

      // 1. Buscar palabra de transcripción ("pompero")
      await fireEvent.changeText(input, 'pompero');
      expect(screen.getByText('Resultados (1)')).toBeOnTheScreen();
      expect(screen.getByText('Módulo: Pedir más')).toBeOnTheScreen();
      expect(screen.queryByText('Módulo: El Espejo')).toBeNull();

      // 2. Buscar palabra del resumen escrito ("sonreír")
      await fireEvent.changeText(input, 'sonreir');
      expect(screen.getByText('Resultados (1)')).toBeOnTheScreen();
      expect(screen.getByText('Módulo: El Espejo')).toBeOnTheScreen();
      expect(screen.queryByText('Módulo: Pedir más')).toBeNull();

      // 3. Buscar palabra del resumen IA ("atención visual")
      await fireEvent.changeText(input, 'atencion visual');
      expect(screen.getByText('Resultados (1)')).toBeOnTheScreen();
      expect(screen.getByText('Módulo: Pedir más')).toBeOnTheScreen();

      // 4. Palabra que no existe
      await fireEvent.changeText(input, 'palabraInexistente');
      expect(screen.getByText('Resultados (0)')).toBeOnTheScreen();
      expect(
        screen.getByText('No se encontraron feedbacks para el criterio de búsqueda seleccionado.'),
      ).toBeOnTheScreen();

      // 5. Limpiar búsqueda
      await fireEvent.press(screen.getByText('Limpiar búsqueda'));
      expect(screen.getByText('Resultados (2)')).toBeOnTheScreen();
    });

    it('busca por módulo marcando y desmarcando checkboxes', async () => {
      await render(<BuscarFeedbacksScreen />);
      await screen.findByText('Resultados (2)');

      // Cambiar a la pestaña "Por módulo"
      await fireEvent.press(screen.getByTestId('tab-modulo'));

      // Verificar que salen los checkboxes para cada módulo con feedbacks
      const checkPompas = screen.getByTestId('checkbox-modulo-mod-pompas');
      const checkEspejo = screen.getByTestId('checkbox-modulo-mod-espejo');
      expect(checkPompas).toBeOnTheScreen();
      expect(checkEspejo).toBeOnTheScreen();

      // Desmarcar "El Espejo"
      await fireEvent.press(checkEspejo);
      expect(screen.getByText('Resultados (1)')).toBeOnTheScreen();
      expect(screen.getByText('Módulo: Pedir más')).toBeOnTheScreen();
      expect(screen.queryByText('Módulo: El Espejo')).toBeNull();

      // Desmarcar todos
      await fireEvent.press(screen.getByText('Desmarcar todos'));
      expect(screen.getByText('Resultados (0)')).toBeOnTheScreen();

      // Marcar todos
      await fireEvent.press(screen.getByText('Marcar todos'));
      expect(screen.getByText('Resultados (2)')).toBeOnTheScreen();
      expect(screen.getByText('Módulo: Pedir más')).toBeOnTheScreen();
      expect(screen.getByText('Módulo: El Espejo')).toBeOnTheScreen();
    });

    describe('por fecha, con calendario (UT 1585)', () => {
      // Se falsea solo la fecha: hoy es 11/11/2026. El resto de temporizadores sigue siendo real.
      beforeEach(() => {
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

      const abrirPorFecha = async () => {
        await render(<BuscarFeedbacksScreen />);
        await screen.findByText('Resultados (2)');
        await fireEvent.press(screen.getByTestId('tab-fecha'));
      };

      // Elige un día de octubre de 2026 en el calendario que esté abierto (arranca en noviembre)
      const elegirDiaDeOctubre = async (campo: string, dia: string) => {
        await fireEvent.press(screen.getByTestId(campo));
        await fireEvent.press(screen.getByTestId('mes-anterior'));
        expect(screen.getByText('octubre de 2026')).toBeOnTheScreen();
        await fireEvent.press(screen.getByTestId(`dia-2026-10-${dia}`));
      };

      it('los campos empiezan vacíos y sin teclado: no hay donde escribir la fecha', async () => {
        await abrirPorFecha();

        expect(screen.getAllByText('dd/mm/aaaa')).toHaveLength(2);
        expect(screen.queryByTestId('input-fecha-inicio')).toBeNull();
        expect(screen.queryByTestId('input-fecha-fin')).toBeNull();
        expect(screen.queryByTestId('calendario-inicio')).toBeNull();
        expect(screen.getByText('Resultados (2)')).toBeOnTheScreen();
      });

      it('elige el periodo en el calendario: las fechas salen como dd/mm/aaaa y se filtra por ellas', async () => {
        await abrirPorFecha();

        // 1. Periodo que abarca solo el primer feedback (15 de octubre de 2026)
        await elegirDiaDeOctubre('campo-fecha-inicio', '10');
        expect(screen.getByText('10/10/2026')).toBeOnTheScreen();
        expect(screen.queryByTestId('calendario-inicio')).toBeNull(); // se cierra al elegir
        await elegirDiaDeOctubre('campo-fecha-fin', '18');
        expect(screen.getByText('18/10/2026')).toBeOnTheScreen();

        expect(screen.getByText('Resultados (1)')).toBeOnTheScreen();
        expect(screen.getByText('Módulo: Pedir más')).toBeOnTheScreen();
        expect(screen.queryByText('Módulo: El Espejo')).toBeNull();
      });

      it('solo con la fecha «Desde» el periodo queda abierto por el otro lado', async () => {
        await abrirPorFecha();

        await elegirDiaDeOctubre('campo-fecha-inicio', '20');

        expect(screen.getByText('20/10/2026')).toBeOnTheScreen();
        expect(screen.getByText('Resultados (1)')).toBeOnTheScreen();
        expect(screen.getByText('Módulo: El Espejo')).toBeOnTheScreen();
      });

      it('un periodo sin evaluaciones da 0 resultados y «Limpiar fechas» los devuelve todos', async () => {
        await abrirPorFecha();

        await fireEvent.press(screen.getByTestId('campo-fecha-inicio'));
        await fireEvent.press(screen.getByTestId('dia-2026-11-03'));
        await fireEvent.press(screen.getByTestId('campo-fecha-fin'));
        await fireEvent.press(screen.getByTestId('dia-2026-11-10'));

        expect(screen.getByText('Resultados (0)')).toBeOnTheScreen();
        expect(
          screen.getByText('No se encontraron feedbacks para el criterio de búsqueda seleccionado.'),
        ).toBeOnTheScreen();

        await fireEvent.press(screen.getByText('Limpiar fechas'));
        expect(screen.getAllByText('dd/mm/aaaa')).toHaveLength(2);
        expect(screen.getByText('Resultados (2)')).toBeOnTheScreen();
        expect(screen.queryByText('Limpiar fechas')).toBeNull();
      });

      it('no deja elegir días futuros ni ir a meses futuros', async () => {
        await abrirPorFecha();
        await fireEvent.press(screen.getByTestId('campo-fecha-inicio'));

        expect(screen.getByText('noviembre de 2026')).toBeOnTheScreen();
        expect(screen.getByTestId('dia-2026-11-11')).toBeEnabled(); // hoy sí
        expect(screen.getByTestId('dia-2026-11-12')).toBeDisabled(); // mañana no
        expect(screen.getByTestId('mes-siguiente')).toBeDisabled();

        await fireEvent.press(screen.getByTestId('dia-2026-11-12'));
        await fireEvent.press(screen.getByTestId('mes-siguiente'));

        expect(screen.getAllByText('dd/mm/aaaa')).toHaveLength(2); // nada elegido
        expect(screen.getByText('noviembre de 2026')).toBeOnTheScreen(); // no se movió
      });

      it('«Hasta» no admite días anteriores a «Desde»', async () => {
        await abrirPorFecha();
        await elegirDiaDeOctubre('campo-fecha-inicio', '20');

        await fireEvent.press(screen.getByTestId('campo-fecha-fin'));
        await fireEvent.press(screen.getByTestId('mes-anterior')); // arranca en noviembre: se va a octubre
        expect(screen.getByTestId('dia-2026-10-19')).toBeDisabled();
        expect(screen.getByTestId('dia-2026-10-20')).toBeEnabled(); // el mismo día vale
        expect(screen.getByTestId('mes-anterior')).toBeDisabled(); // septiembre queda entero antes de «Desde»

        await fireEvent.press(screen.getByTestId('dia-2026-10-19'));
        expect(screen.queryByText('19/10/2026')).toBeNull();
      });

      it('«Desde» no admite días posteriores a «Hasta»', async () => {
        await abrirPorFecha();
        await elegirDiaDeOctubre('campo-fecha-fin', '15');

        await fireEvent.press(screen.getByTestId('campo-fecha-inicio'));
        // Con «Hasta» elegido, el calendario de «Desde» se abre en el mes de «Hasta»
        expect(screen.getByText('octubre de 2026')).toBeOnTheScreen();
        expect(screen.getByTestId('dia-2026-10-16')).toBeDisabled();
        expect(screen.getByTestId('dia-2026-10-15')).toBeEnabled();
        expect(screen.getByTestId('mes-siguiente')).toBeDisabled();
      });
    });
  });
});
