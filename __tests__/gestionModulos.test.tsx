import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { GestionModulos } from '../src/components/GestionModulos';
import { CrearPractica } from '../src/components/CrearPractica';
import * as modulosService from '../src/services/modulosService';
import * as practicasService from '../src/services/practicasService';

jest.setTimeout(30000);

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('../src/services/modulosService', () => ({
  ...jest.requireActual('../src/services/modulosService'),
  obtenerModulosPropiosDeTerapeuta: jest.fn(),
  crearModulo: jest.fn(),
  actualizarModulo: jest.fn(),
  subirVideoGuia: jest.fn(),
}));

jest.mock('../src/services/practicasService', () => ({
  ...jest.requireActual('../src/services/practicasService'),
  obtenerPacientesDeTerapeuta: jest.fn(async () => [
    { id: 'pac-hugo', nombre_nino: 'Hugo', nombre_familia: 'Sanchis' },
  ]),
  obtenerModulos: jest.fn(),
  crearPractica: jest.fn(),
}));

const mockObtenerModulosPropios = modulosService.obtenerModulosPropiosDeTerapeuta as jest.Mock;
const mockCrearModulo = modulosService.crearModulo as jest.Mock;
const mockActualizarModulo = modulosService.actualizarModulo as jest.Mock;
const mockSubirVideoGuia = modulosService.subirVideoGuia as jest.Mock;
const mockObtenerModulos = practicasService.obtenerModulos as jest.Mock;

describe('PA · Crear y Editar Módulos Personalizados', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Crear módulo', () => {
    it('Elena crea un módulo con toda la información necesaria y se guarda asignado a ella', async () => {
      // Condición: Elena está en su panel y no tiene módulos personalizados todavía
      mockObtenerModulosPropios.mockResolvedValue([]);

      const alCambiar = jest.fn();
      await render(
        <GestionModulos terapeutaIdActual="ter-elena" onModuloCambiado={alCambiar} />,
      );

      // Ver que sale el botón "Crear módulo"
      const botonCrear = await screen.findByTestId('boton-crear-modulo');
      expect(botonCrear).toBeOnTheScreen();
      expect(
        screen.getByText('No tienes módulos personalizados creados todavía. Pulsa «Crear módulo» para añadir uno.'),
      ).toBeOnTheScreen();

      // Pasos: Abrir formulario y rellenar información
      await fireEvent.press(botonCrear);
      expect(screen.getByText('✨ Nuevo módulo personalizado')).toBeOnTheScreen();

      await fireEvent.changeText(
        screen.getByTestId('input-titulo-modulo'),
        'Juego de encajables',
      );
      await fireEvent.changeText(
        screen.getByTestId('input-objetivo-modulo'),
        'Fomentar la motricidad fina y la atención conjunta',
      );
      await fireEvent.changeText(
        screen.getByTestId('input-materiales-modulo'),
        'Encajables de madera, Cesta, Mesa baja',
      );
      await fireEvent.changeText(
        screen.getByTestId('input-video-guia'),
        'https://ejemplo.com/guia-encajables.mp4',
      );

      const nuevoModulo = {
        id: 'mod-encajables',
        titulo: 'Juego de encajables',
        objetivo: 'Fomentar la motricidad fina y la atención conjunta',
        ideas_materiales: ['Encajables de madera', 'Cesta', 'Mesa baja'],
        video_guia_url: 'https://ejemplo.com/guia-encajables.mp4',
        terapeuta_id: 'ter-elena',
      };
      mockCrearModulo.mockResolvedValue(nuevoModulo);
      mockObtenerModulosPropios.mockResolvedValue([nuevoModulo]);

      // Guardar
      await fireEvent.press(screen.getByTestId('boton-guardar-modulo'));

      // Resultado: Se guarda con terapeuta_id = ter-elena
      expect(mockCrearModulo).toHaveBeenCalledWith({
        titulo: 'Juego de encajables',
        objetivo: 'Fomentar la motricidad fina y la atención conjunta',
        ideas_materiales: ['Encajables de madera', 'Cesta', 'Mesa baja'],
        video_guia_url: 'https://ejemplo.com/guia-encajables.mp4',
        terapeuta_id: 'ter-elena',
      });
      expect(alCambiar).toHaveBeenCalled();
      expect(await screen.findByText('Juego de encajables')).toBeOnTheScreen();
    });

    it('al crear un módulo se puede adjuntar un archivo de vídeo que se sube al bucket videos guia', async () => {
      mockObtenerModulosPropios.mockResolvedValue([]);
      const { getDocumentAsync } = require('expo-document-picker');
      getDocumentAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///cache/video_guia.mp4', name: 'video_guia.mp4' }],
      });
      mockSubirVideoGuia.mockResolvedValue('guia_17949_video_guia.mp4');
      mockCrearModulo.mockResolvedValue({
        id: 'mod-1',
        titulo: 'Módulo con vídeo',
        objetivo: 'Objetivo',
        ideas_materiales: [],
        video_guia_url: 'guia_17949_video_guia.mp4',
        terapeuta_id: 'ter-elena',
      });

      await render(<GestionModulos terapeutaIdActual="ter-elena" />);
      await fireEvent.press(await screen.findByTestId('boton-crear-modulo'));

      await fireEvent.changeText(screen.getByTestId('input-titulo-modulo'), 'Módulo con vídeo');
      await fireEvent.changeText(screen.getByTestId('input-objetivo-modulo'), 'Objetivo');

      // Adjuntar vídeo
      await fireEvent.press(screen.getByTestId('boton-adjuntar-video'));
      expect(await screen.findByText(/Vídeo adjunto para subir:/)).toBeOnTheScreen();

      await fireEvent.press(screen.getByTestId('boton-guardar-modulo'));

      expect(mockSubirVideoGuia).toHaveBeenCalledWith(
        'file:///cache/video_guia.mp4',
        'video_guia.mp4',
      );
      expect(mockCrearModulo).toHaveBeenCalledWith(
        expect.objectContaining({
          video_guia_url: 'guia_17949_video_guia.mp4',
        }),
      );
    });

    it('no permite guardar si el título o el objetivo están vacíos', async () => {
      mockObtenerModulosPropios.mockResolvedValue([]);
      await render(<GestionModulos terapeutaIdActual="ter-elena" />);
      await fireEvent.press(await screen.findByTestId('boton-crear-modulo'));

      await fireEvent.press(screen.getByTestId('boton-guardar-modulo'));
      expect(await screen.findByText('El título del módulo es obligatorio.')).toBeOnTheScreen();
      expect(mockCrearModulo).not.toHaveBeenCalled();
    });

    it('inicia plegado si inicialmenteAbierto es false y se despliega al pulsar el botón/cabecera', async () => {
      mockObtenerModulosPropios.mockResolvedValue([]);
      await render(
        <GestionModulos terapeutaIdActual="ter-elena" inicialmenteAbierto={false} />,
      );

      expect(screen.getByText('Módulos personalizados')).toBeTruthy();
      expect(screen.queryByTestId('boton-crear-modulo')).toBeNull();

      // Desplegar
      const botonToggle = screen.getByTestId('boton-toggle-desplegable-modulos');
      await fireEvent.press(botonToggle);

      expect(await screen.findByTestId('boton-crear-modulo')).toBeTruthy();

      // Plegar
      await fireEvent.press(botonToggle);
      expect(screen.queryByTestId('boton-crear-modulo')).toBeNull();
    });
  });

  describe('Editar módulo', () => {
    it('Elena edita un módulo existente y la versión anterior deja de verse, mostrando la versión actual', async () => {
      // Condición: Hay un módulo asignado al terapeuta
      const moduloInicial = {
        id: 'mod-encajables',
        titulo: 'Juego de encajables',
        objetivo: 'Fomentar la motricidad fina',
        ideas_materiales: ['Encajables'],
        video_guia_url: null,
        terapeuta_id: 'ter-elena',
      };
      mockObtenerModulosPropios.mockResolvedValue([moduloInicial]);

      const alCambiar = jest.fn();
      await render(
        <GestionModulos terapeutaIdActual="ter-elena" onModuloCambiado={alCambiar} />,
      );

      expect(await screen.findByText('Juego de encajables')).toBeOnTheScreen();
      expect(screen.getByText('Fomentar la motricidad fina')).toBeOnTheScreen();

      // Pasos: Pulsar botón de editar del módulo
      const botonEditar = screen.getByTestId('boton-editar-modulo-mod-encajables');
      await fireEvent.press(botonEditar);

      expect(
        screen.getByText('✏️ Editar módulo: Juego de encajables'),
      ).toBeOnTheScreen();
      expect(screen.getByDisplayValue('Juego de encajables')).toBeOnTheScreen();
      expect(screen.getByDisplayValue('Fomentar la motricidad fina')).toBeOnTheScreen();

      // Modificar datos (Nombre y objetivo)
      await fireEvent.changeText(
        screen.getByTestId('input-titulo-modulo'),
        'Juego de encajables avanzado',
      );
      await fireEvent.changeText(
        screen.getByTestId('input-objetivo-modulo'),
        'Coordinación ojo-mano y clasificación por formas',
      );

      const moduloActualizado = {
        ...moduloInicial,
        titulo: 'Juego de encajables avanzado',
        objetivo: 'Coordinación ojo-mano y clasificación por formas',
      };
      mockActualizarModulo.mockResolvedValue(moduloActualizado);
      mockObtenerModulosPropios.mockResolvedValue([moduloActualizado]);

      // Guardar cambios
      await fireEvent.press(screen.getByTestId('boton-guardar-modulo'));

      expect(mockActualizarModulo).toHaveBeenCalledWith('mod-encajables', 'ter-elena', {
        titulo: 'Juego de encajables avanzado',
        objetivo: 'Coordinación ojo-mano y clasificación por formas',
        ideas_materiales: ['Encajables'],
        video_guia_url: null,
      });

      // RESULTADO: El módulo anterior no debería verse, sino la versión actual
      expect(await screen.findByText('Juego de encajables avanzado')).toBeOnTheScreen();
      expect(
        screen.getByText('Coordinación ojo-mano y clasificación por formas'),
      ).toBeOnTheScreen();
      expect(screen.queryByText('Fomentar la motricidad fina')).toBeNull();
      expect(alCambiar).toHaveBeenCalled();
    });
  });

  describe('Asignación de módulos al crear tareas', () => {
    it('solo deja asignar módulos del sistema (terapeuta_id null) o asignados al terapeuta actual', async () => {
      // Condición: Hay módulos globales (terapeuta_id: null) y módulos personalizados de Elena
      const modulosParaElena = [
        { id: 'mod-global', titulo: 'Intención Comunicativa', objetivo: 'Pedir', video_guia_url: null, terapeuta_id: null },
        { id: 'mod-elena', titulo: 'Juego de encajables', objetivo: 'Motricidad fina', video_guia_url: null, terapeuta_id: 'ter-elena' },
      ];
      mockObtenerModulos.mockResolvedValue(modulosParaElena);

      await render(<CrearPractica terapeutaIdActual="ter-elena" />);

      // Se llama a obtenerModulos pasando el id de Elena
      expect(mockObtenerModulos).toHaveBeenCalledWith('ter-elena');

      // Elena ve el módulo inicial seleccionado
      expect(await screen.findByText('Intención Comunicativa')).toBeOnTheScreen();
      expect(screen.getByText('Objetivo: Pedir')).toBeOnTheScreen();

      // Elena cambia el picker a su módulo personalizado
      const pickerModulo = screen.getByTestId('picker-modulo');
      await fireEvent(pickerModulo, 'valueChange', 'mod-elena');

      expect(await screen.findByText('Juego de encajables')).toBeOnTheScreen();
      expect(screen.getByText('Objetivo: Motricidad fina')).toBeOnTheScreen();
    });

    it('un módulo creado por otro terapeuta no se puede ver ni asignar por un terapeuta distinto', async () => {
      // Si el terapeuta Carlos entra, solo se le devuelven módulos globales o suyos
      const modulosParaCarlos = [
        { id: 'mod-global', titulo: 'Intención Comunicativa', objetivo: 'Pedir', video_guia_url: null, terapeuta_id: null },
        { id: 'mod-carlos', titulo: 'Módulo de Carlos', objetivo: 'Equilibrio', video_guia_url: null, terapeuta_id: 'ter-carlos' },
      ];
      mockObtenerModulos.mockResolvedValue(modulosParaCarlos);

      await render(<CrearPractica terapeutaIdActual="ter-carlos" />);

      expect(mockObtenerModulos).toHaveBeenCalledWith('ter-carlos');
      expect(await screen.findByText('Intención Comunicativa')).toBeOnTheScreen();

      // El módulo de Elena no debe estar presente
      expect(screen.queryByText('Juego de encajables')).toBeNull();
    });
  });
});
