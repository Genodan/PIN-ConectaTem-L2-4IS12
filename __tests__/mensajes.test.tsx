import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import MensajesFamiliaScreen from '../src/app/familia/mensajes';
import MensajesTerapeutaScreen from '../src/app/terapeuta/mensajes';
import type { Mensaje } from '../src/services/mensajesService';

// Pruebas de aceptación de la UT 1095 «Sistema de mensajería» (Worki).
// La base de datos y el tiempo real se simulan: no se tocan datos reales.
jest.setTimeout(30000);

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

// Base de datos simulada en memoria y aviso de tiempo real que el test puede disparar
let mockMensajes: Mensaje[] = [];
let mockAvisarNuevo: ((m: Mensaje) => void) | null = null;
let mockContador = 0;

jest.mock('../src/services/mensajesService', () => ({
  ...jest.requireActual('../src/services/mensajesService'),
  obtenerMensajes: jest.fn(async (pacienteId: string, terapeutaId: string) =>
    mockMensajes.filter((m) => m.paciente_id === pacienteId && m.terapeuta_id === terapeutaId),
  ),
  enviarMensaje: jest.fn(async ({ pacienteId, terapeutaId, autor, texto }) => {
    const nuevo = {
      id: `m${++mockContador}`,
      paciente_id: pacienteId,
      terapeuta_id: terapeutaId,
      enviado_por: autor,
      texto: texto.trim(),
      fecha_envio: new Date(2026, 10, 26, 10, mockContador).toISOString(),
      leido: false,
    };
    mockMensajes.push(nuevo);
    return nuevo;
  }),
  suscribirseAMensajes: jest.fn((_p: string, _t: string, alRecibir: (m: Mensaje) => void) => {
    mockAvisarNuevo = alRecibir;
    return () => {
      mockAvisarNuevo = null;
    };
  }),
  obtenerConversacionesDeLaFamilia: jest.fn(async () => ({
    actual: { terapeutaId: 'terapeuta-actual', nombre: 'Terapeuta actual' },
    anteriores: [{ terapeutaId: 'terapeuta-anterior', nombre: 'Terapeuta anterior' }],
  })),
  obtenerConversacionesDeLaTerapeuta: jest.fn(async () => [
    { pacienteId: 'paciente-1', nombreNino: 'Paciente 1', nombreFamilia: 'Familia 1', ultimoMensaje: null },
    { pacienteId: 'paciente-2', nombreNino: 'Paciente 2', nombreFamilia: 'Familia 2', ultimoMensaje: null },
  ]),
}));

const { enviarMensaje } = jest.requireMock('../src/services/mensajesService');

const mensajeDe = (autor: 'terapeuta' | 'paciente', texto: string, terapeutaId = 'terapeuta-actual'): Mensaje => ({
  id: `externo-${++mockContador}`,
  paciente_id: 'paciente-1',
  terapeuta_id: terapeutaId,
  enviado_por: autor,
  texto,
  fecha_envio: new Date(2026, 10, 26, 9, mockContador).toISOString(),
  leido: false,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockMensajes = [];
  mockAvisarNuevo = null;
});

describe('UT 1095 · La familia escribe a su terapeuta', () => {
  beforeEach(() => {
    mockParams = { pacienteId: 'paciente-1' };
  });

  it('el mensaje de la familia aparece al momento como propio y le llega a su terapeuta actual', async () => {
    await render(<MensajesFamiliaScreen />);
    expect(await screen.findByText('Mensajes con Terapeuta actual')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Escribe un mensaje'), '¿Podemos hacer la actividad con pompas de jabón?');
    await fireEvent.press(screen.getByText('Enviar'));

    expect(enviarMensaje).toHaveBeenCalledWith({
      pacienteId: 'paciente-1',
      terapeutaId: 'terapeuta-actual',
      autor: 'paciente',
      texto: '¿Podemos hacer la actividad con pompas de jabón?',
    });
    const propio = await screen.findByTestId('mensaje-propio');
    expect(within(propio).getByText('¿Podemos hacer la actividad con pompas de jabón?')).toBeOnTheScreen();
    expect(within(propio).getByText('Tú')).toBeOnTheScreen();
  });

  it('la respuesta de la terapeuta llega en tiempo real, sin recargar', async () => {
    await render(<MensajesFamiliaScreen />);
    await screen.findByText('Mensajes con Terapeuta actual');

    await act(async () => mockAvisarNuevo?.(mensajeDe('terapeuta', 'Sí, perfecto, con pompas también vale.')));

    const recibido = await screen.findByTestId('mensaje-recibido');
    expect(within(recibido).getByText('Sí, perfecto, con pompas también vale.')).toBeOnTheScreen();
    expect(within(recibido).getByText('Terapeuta actual')).toBeOnTheScreen();
  });

  it('la conversación con una terapeuta anterior se puede leer pero no escribir', async () => {
    mockMensajes = [mensajeDe('terapeuta', 'Mensaje de la terapeuta anterior', 'terapeuta-anterior')];
    await render(<MensajesFamiliaScreen />);
    await screen.findByText('Conversaciones anteriores');

    await fireEvent.press(screen.getByText('Terapeuta anterior'));

    expect(await screen.findByText('Mensaje de la terapeuta anterior')).toBeOnTheScreen();
    expect(screen.getByText('Conversación con una terapeuta anterior: solo lectura.')).toBeOnTheScreen();
    // Solo hay una caja para escribir: la de la terapeuta actual
    expect(screen.getAllByLabelText('Escribe un mensaje')).toHaveLength(1);
  });

  it('no se puede enviar un mensaje vacío o solo con espacios', async () => {
    await render(<MensajesFamiliaScreen />);
    await screen.findByText('Mensajes con Terapeuta actual');

    await fireEvent.changeText(screen.getByLabelText('Escribe un mensaje'), '    ');
    await fireEvent.press(screen.getByText('Enviar'));

    expect(enviarMensaje).not.toHaveBeenCalled();
    expect(screen.queryByTestId('mensaje-propio')).toBeNull();
  });
});

describe('UT 1095 · La terapeuta escribe a una familia', () => {
  beforeEach(() => {
    mockParams = { terapeutaId: 'terapeuta-actual' };
  });

  it('elige la conversación del paciente, su mensaje sale como propio y solo en esa conversación', async () => {
    mockMensajes = [
      { ...mensajeDe('paciente', 'Mensaje de la familia 2'), paciente_id: 'paciente-2' },
    ];
    await render(<MensajesTerapeutaScreen />);

    // Una conversación por paciente
    expect(await screen.findAllByTestId('conversacion-paciente')).toHaveLength(2);
    await fireEvent.press(screen.getByText('Paciente 1 (Familia 1)'));
    expect(await screen.findByText('Todavía no hay mensajes. Escribe a la familia de Paciente 1.')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Escribe un mensaje'), 'Hola, recordad usar un juguete llamativo hoy.');
    await fireEvent.press(screen.getByText('Enviar'));

    expect(enviarMensaje).toHaveBeenCalledWith({
      pacienteId: 'paciente-1',
      terapeutaId: 'terapeuta-actual',
      autor: 'terapeuta',
      texto: 'Hola, recordad usar un juguete llamativo hoy.',
    });
    const propio = await screen.findByTestId('mensaje-propio');
    expect(within(propio).getByText('Hola, recordad usar un juguete llamativo hoy.')).toBeOnTheScreen();
    // Los mensajes de otro paciente no se mezclan
    expect(screen.queryByText('Mensaje de la familia 2')).toBeNull();
  });
});
