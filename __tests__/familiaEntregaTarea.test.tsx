import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import InicioFamilia from '../src/app/familia/index';
import { obtenerTodosLosPacientes, obtenerTareasPendientes, enviarPractica } from '../src/services/tareasService';
import { obtenerPracticasDelPaciente } from '../src/services/panelFamiliaService';

jest.mock('../src/services/tareasService', () => ({
  obtenerTodosLosPacientes: jest.fn(),
  obtenerTareasPendientes: jest.fn(),
  enviarPractica: jest.fn(),
}));

// UT 1141: la pantalla lee todas las prácticas del paciente con este servicio
jest.mock('../src/services/panelFamiliaService', () => ({
  ...jest.requireActual('../src/services/panelFamiliaService'),
  obtenerPracticasDelPaciente: jest.fn(),
}));

jest.mock('../src/components/VerFeedback', () => ({
  VerFeedback: () => null,
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

const mockAlert = jest.spyOn(Alert, 'alert');

describe('Entrega de Tarea - Grabar y Enviar Vídeo', () => {
  const pacientesMock = [
    { id: 'pac-1', nombre_nino: 'Lucas', nombre_familia: 'García' },
  ];

  const tareasMock = [
    {
      id: 'tarea-101',
      estado: 'pendientes',
      modulos: {
        titulo: 'Contacto Visual',
        objetivo: 'Mantener la mirada 5 segundos',
        ideas_materiales: ['Burbujas'],
        video_guia_url: 'https://video.guia/101',
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (obtenerTodosLosPacientes as jest.Mock).mockResolvedValue(pacientesMock);
    (obtenerTareasPendientes as jest.Mock).mockResolvedValue(tareasMock);
    (obtenerPracticasDelPaciente as jest.Mock).mockResolvedValue(tareasMock);
  });

  it('muestra el botón de grabar al lado de seleccionar archivo al desplegar una tarea', async () => {
    const screen = await render(<InicioFamilia />);

    const cabeceraTarea = await screen.findByText('Contacto Visual');
    fireEvent.press(cabeceraTarea);

    expect(await screen.findByText('📁 Seleccionar archivo/vídeo')).toBeOnTheScreen();
    expect(await screen.findByText('🎥 Grabar')).toBeOnTheScreen();
  });

  it('muestra notificación de activar la cámara al pulsar grabar', async () => {
    const screen = await render(<InicioFamilia />);

    const cabeceraTarea = await screen.findByText('Contacto Visual');
    fireEvent.press(cabeceraTarea);

    const botonGrabar = await screen.findByText('🎥 Grabar');
    fireEvent.press(botonGrabar);

    expect(mockAlert).toHaveBeenCalledWith(
      'Activar cámara',
      expect.stringContaining('activar la cámara'),
      expect.any(Array)
    );
  });

  it('solicita permisos y lanza la cámara para grabar al confirmar la notificación', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///videos/tarea_grabada.mp4', fileName: 'tarea_grabada.mp4' }],
    });

    const screen = await render(<InicioFamilia />);

    const cabeceraTarea = await screen.findByText('Contacto Visual');
    fireEvent.press(cabeceraTarea);

    const botonGrabar = await screen.findByText('🎥 Grabar');
    fireEvent.press(botonGrabar);

    // Obtenemos los botones pasados a Alert.alert
    const alertCalls = mockAlert.mock.calls;
    const ultimoAlert = alertCalls[alertCalls.length - 1];
    const botones = ultimoAlert[2] as Array<{ text: string; onPress?: () => void }>;
    const botonConfirmar = botones.find((b) => b.text === 'Activar cámara');

    expect(botonConfirmar).toBeDefined();

    // Pulsamos "Activar cámara" en la alerta
    botonConfirmar?.onPress?.();

    await waitFor(() => {
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaTypes: ['videos'],
        })
      );
    });

    // El vídeo queda adjuntado
    expect(await screen.findByText('tarea_grabada.mp4')).toBeOnTheScreen();
    expect(screen.getByText(/Vídeo grabado:/)).toBeOnTheScreen();
  });

  it('permite enviar la práctica una vez el vídeo grabado queda adjuntado', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///videos/tarea_grabada.mp4', fileName: 'tarea_grabada.mp4' }],
    });
    (enviarPractica as jest.Mock).mockResolvedValue({ id: 'tarea-101', estado: 'completada' });

    const screen = await render(<InicioFamilia />);

    const cabeceraTarea = await screen.findByText('Contacto Visual');
    fireEvent.press(cabeceraTarea);

    const botonGrabar = await screen.findByText('🎥 Grabar');
    fireEvent.press(botonGrabar);

    const alertCalls = mockAlert.mock.calls;
    const botones = alertCalls[alertCalls.length - 1][2] as Array<{ text: string; onPress?: () => void }>;
    const botonConfirmar = botones.find((b) => b.text === 'Activar cámara');
    botonConfirmar?.onPress?.();

    await screen.findByText('tarea_grabada.mp4');

    // Pulsamos "Enviar Práctica"
    const botonEnviar = screen.getByText('📤 Enviar Práctica');
    fireEvent.press(botonEnviar);

    await waitFor(() => {
      expect(enviarPractica).toHaveBeenCalledWith('tarea-101', 'tarea_grabada.mp4');
    });
  });

  it('permite activar la cámara y grabar directamente desde el modal visible en pantalla', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///videos/tarea_modal.mp4', fileName: 'tarea_modal.mp4' }],
    });

    const screen = await render(<InicioFamilia />);

    const cabeceraTarea = await screen.findByText('Contacto Visual');
    fireEvent.press(cabeceraTarea);

    const botonGrabar = await screen.findByText('🎥 Grabar');
    fireEvent.press(botonGrabar);

    // El modal en pantalla muestra la notificación visible
    expect(await screen.findByText('Activar Cámara')).toBeOnTheScreen();
    expect(
      screen.getByText('Se va a activar la cámara para comenzar a grabar el vídeo de la tarea.')
    ).toBeOnTheScreen();

    // Pulsamos el botón "Activar y Grabar" del modal
    const botonActivarModal = screen.getByText('Activar y Grabar');
    fireEvent.press(botonActivarModal);

    await waitFor(() => {
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
    });

    expect(await screen.findByText('tarea_modal.mp4')).toBeOnTheScreen();
  });
});
