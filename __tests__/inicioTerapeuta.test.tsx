import React, { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import InicioTerapeuta from '../src/app/terapeuta/index';
import { CalendarioInicio } from '../src/components/kairos/BloquesInicioTerapeuta';
import { fechaLarga } from '../src/services/inicioTerapeutaService';

// Nueva interfaz · Inicio de la terapeuta (Figma «INICIO - TERAPEUTA»). Datos simulados e inventados.
jest.setTimeout(30000);

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

const mockElegir = jest.fn();
jest.mock('../src/sesion/SesionTerapeuta', () => ({
  useSesionTerapeuta: () => ({
    terapeutas: [
      { id: 'terapeuta-1', nombre: 'Terapeuta Uno' },
      { id: 'terapeuta-2', nombre: 'Terapeuta Dos' },
    ],
    terapeutaActual: 'terapeuta-1',
    nombreActual: 'Terapeuta Uno',
    cargando: false,
    elegirTerapeuta: mockElegir,
    datosVersion: 0,
    alCambiarDatos: jest.fn(),
  }),
}));

jest.mock('../src/services/inicioTerapeutaService', () => ({
  ...jest.requireActual('../src/services/inicioTerapeutaService'),
  obtenerEvidenciasPorRevisar: jest.fn(async () => [
    { id: 'e1', modulo: 'El Espejo', nino: 'Niño 1', fechaEnvio: new Date().toISOString() },
    { id: 'e2', modulo: 'Juego de bloques', nino: 'Niño 2', fechaEnvio: null },
  ]),
  obtenerPacientesConProgreso: jest.fn(async () => [
    { id: 'p1', nombreNino: 'Niño 1', completadas: 3, total: 6 },
    { id: 'p2', nombreNino: 'Niño 2', completadas: 0, total: 0 },
    { id: 'p3', nombreNino: 'Niño 3', completadas: 4, total: 4 },
  ]),
}));

// Sesiones simuladas: hoy hay dos (una ya con nota); el resto de días, ninguna
const aLas = (h: number, m = 0) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const mismoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
let mockSesiones: (dia: Date) => Promise<unknown>;
const mockGuardarNota = jest.fn();
jest.mock('../src/services/notasSesionService', () => ({
  ...jest.requireActual('../src/services/notasSesionService'),
  obtenerSesionesDelDia: jest.fn((_terapeuta: string, dia: Date) => mockSesiones(dia)),
  guardarNotaDeSesion: (...args: unknown[]) => mockGuardarNota(...args),
}));
import { obtenerSesionesDelDia } from '../src/services/notasSesionService';

beforeEach(() => {
  jest.clearAllMocks();
  mockSesiones = async (dia) =>
    mismoDia(dia, new Date())
      ? [
          {
            id: 's1',
            empiezaEn: aLas(10),
            duracionMin: 45,
            pacienteId: 'p1',
            nino: 'Niño 1',
            familia: 'Apellido Uno',
            nota: { id: 'n1', texto: 'Ha pedido el juego él solo.', actualizadaEn: aLas(11) },
          },
          { id: 's2', empiezaEn: aLas(12, 30), duracionMin: 45, pacienteId: 'p2', nino: 'Niño 2', familia: null, nota: null },
        ]
      : [];
});

const abrir = async () => {
  await render(<InicioTerapeuta />);
  await screen.findByText('Hola, Terapeuta');
};

describe('Nueva interfaz · Inicio de la terapeuta', () => {
  it('saluda a la terapeuta y mantiene el «login» simulado de siempre', async () => {
    await abrir();

    expect(screen.getByText('¿Quién eres? (Simulación de Login)')).toBeOnTheScreen();
    expect(screen.getAllByText('Terapeuta Uno').length).toBeGreaterThan(0); // cabecera
  });

  it('«Hagamos memoria»: sesiones de hoy, evidencias por revisar y pacientes activos', async () => {
    await abrir();

    expect(await screen.findByLabelText('2 Sesiones de hoy')).toBeOnTheScreen();
    expect(screen.getByLabelText('2 Evidencias por revisar')).toBeOnTheScreen();
    expect(screen.getByLabelText('3 Pacientes activos')).toBeOnTheScreen();
  });

  it('lista las evidencias por revisar con el niño y el módulo, y al pulsar una va a «Evidencias»', async () => {
    await abrir();

    const tarjetas = screen.getAllByTestId('tarjeta-evidencia');
    expect(tarjetas).toHaveLength(2);
    expect(within(tarjetas[0]).getByText('Niño 1')).toBeOnTheScreen();
    expect(within(tarjetas[0]).getByText('El Espejo')).toBeOnTheScreen();
    expect(within(tarjetas[0]).getByText(/^Hoy, \d\d:\d\d$/)).toBeOnTheScreen();

    await fireEvent.press(tarjetas[0]);
    expect(mockReplace).toHaveBeenCalledWith('/terapeuta/evidencias');
  });

  it('lista los pacientes activos con su progreso y «Ver ficha» lleva a «Pacientes»', async () => {
    await abrir();

    const tarjetas = screen.getAllByTestId('tarjeta-paciente');
    expect(tarjetas).toHaveLength(3);
    expect(within(tarjetas[0]).getByText('3 de 6 tareas')).toBeOnTheScreen();
    expect(within(tarjetas[0]).getByText('50%')).toBeOnTheScreen();
    expect(within(tarjetas[1]).getByText('0 de 0 tareas')).toBeOnTheScreen();
    expect(within(tarjetas[2]).getByText('100%')).toBeOnTheScreen();

    await fireEvent.press(within(tarjetas[0]).getByText('Ver ficha →'));
    expect(mockReplace).toHaveBeenCalledWith('/terapeuta/pacientes');
  });

  it('«Sesiones de hoy» lista las sesiones de hoy con su hora, aunque se elija otro día en el calendario', async () => {
    await abrir();

    const sesiones = await screen.findAllByTestId('sesion-de-hoy');
    expect(sesiones).toHaveLength(2);
    expect(within(sesiones[0]).getByText('10:00h')).toBeOnTheScreen();
    expect(within(sesiones[0]).getByText('Niño 1')).toBeOnTheScreen();
    expect(within(sesiones[1]).getByText('12:30h')).toBeOnTheScreen();

    const otroDia = new Date().getDate() === 15 ? '16' : '15';
    await fireEvent.press(within(screen.getByTestId('calendario-inicio')).getAllByText(otroDia)[0]);
    await screen.findByText('No hay sesiones este día.');

    expect(screen.getAllByTestId('sesion-de-hoy')).toHaveLength(2);
    expect(screen.getByLabelText('2 Sesiones de hoy')).toBeOnTheScreen();
  });

  it('sin sesiones hoy, lo dice y el contador queda a 0', async () => {
    mockSesiones = async () => [];
    await abrir();

    expect(await screen.findByText('No hay sesiones programadas para hoy.')).toBeOnTheScreen();
    expect(screen.getByLabelText('0 Sesiones de hoy')).toBeOnTheScreen();
  });

  it('«Notas rápidas» muestra las notas de la terapeuta sobre las sesiones de hoy', async () => {
    await abrir();

    const notas = await screen.findAllByTestId('nota-rapida');
    expect(notas).toHaveLength(1); // la sesión sin nota no aparece
    expect(within(notas[0]).getByText('Niño 1')).toBeOnTheScreen();
    expect(within(notas[0]).getByText('10:00')).toBeOnTheScreen();
    expect(within(notas[0]).getByText('Ha pedido el juego él solo.')).toBeOnTheScreen();
  });

  it('al elegir otro día en el calendario, «Notas rápidas» muestra las de ese día', async () => {
    await abrir();
    await screen.findAllByTestId('nota-rapida');

    const otroDia = new Date().getDate() === 15 ? '16' : '15';
    await fireEvent.press(within(screen.getByTestId('calendario-inicio')).getAllByText(otroDia)[0]);

    expect(await screen.findByText('No hay sesiones este día.')).toBeOnTheScreen();
    expect(screen.queryByTestId('nota-rapida')).toBeNull();
  });

  it('si las sesiones no se pueden cargar, avisa sin romper el resto del inicio', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockSesiones = async () => {
      throw new Error('tabla no encontrada');
    };
    await abrir();

    expect(await screen.findByText('No se pudieron cargar las notas de este día.')).toBeOnTheScreen();
    expect(screen.getByText('No se pudieron cargar las sesiones de hoy.')).toBeOnTheScreen();
    expect(screen.getAllByTestId('tarjeta-evidencia')).toHaveLength(2);
  });

  it('la barra inferior lleva a cada sección y marca «Inicio» como activa', async () => {
    await abrir();

    expect(screen.getByTestId('pestana-inicio').props.accessibilityState).toEqual({ selected: true });
    await fireEvent.press(screen.getByTestId('pestana-practicas'));
    expect(mockReplace).toHaveBeenCalledWith('/terapeuta/practicas');
    await fireEvent.press(screen.getByTestId('pestana-inicio'));
    expect(mockReplace).toHaveBeenCalledTimes(1); // pulsar la pestaña activa no navega
  });
});

// El calendario recibe el día elegido desde el inicio; aquí se envuelve con su propio estado
const CalendarioConEstado = ({ hoy }: { hoy: Date }) => {
  const [dia, setDia] = useState(hoy);
  return <CalendarioInicio hoy={hoy} diaElegido={dia} onElegirDia={setDia} />;
};

describe('Nueva interfaz · Calendario del inicio · botón «Hoy»', () => {
  const hoy = new Date(2026, 10, 27); // viernes 27 de noviembre de 2026

  it('no aparece mientras estás en el día de hoy', async () => {
    await render(<CalendarioConEstado hoy={hoy} />);

    expect(screen.getByText('Noviembre 2026')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Volver a hoy')).toBeNull();
  });

  it('tras moverte varios meses, «Hoy» te devuelve al mes actual con el día de hoy marcado', async () => {
    await render(<CalendarioConEstado hoy={hoy} />);

    for (let i = 0; i < 5; i++) await fireEvent.press(screen.getByLabelText('Mes siguiente'));
    expect(screen.getByText('Abril 2027')).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText('Volver a hoy'));

    expect(screen.getByText('Noviembre 2026')).toBeOnTheScreen();
    expect(within(screen.getByRole('button', { selected: true })).getByText('27')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Volver a hoy')).toBeNull();
  });

  it('también aparece si eliges otro día del mes actual', async () => {
    await render(<CalendarioConEstado hoy={hoy} />);

    await fireEvent.press(screen.getAllByText('10')[0]);
    expect(screen.getByLabelText('Volver a hoy')).toBeOnTheScreen();
  });
});

describe('Nueva interfaz · Ventana «Notas del día»', () => {
  const abrirNotas = async () => {
    await abrir();
    await screen.findAllByTestId('nota-rapida');
    await fireEvent.press(screen.getByLabelText('Abrir las notas del día'));
    return screen.findByTestId('notas-del-dia');
  };

  it('se abre encima del inicio con las sesiones del día y su nota', async () => {
    const ventana = await abrirNotas();

    expect(within(ventana).getByText('Notas del día')).toBeOnTheScreen();
    const sesiones = within(ventana).getAllByTestId('sesion-del-dia');
    expect(sesiones).toHaveLength(2);
    expect(within(sesiones[0]).getByText('Niño 1')).toBeOnTheScreen();
    expect(within(sesiones[0]).getByText('Familia Apellido Uno')).toBeOnTheScreen();
    expect(within(sesiones[0]).getByText('10:00 – 10:45')).toBeOnTheScreen();
    expect(within(sesiones[0]).getByDisplayValue('Ha pedido el juego él solo.')).toBeOnTheScreen();
    expect(within(sesiones[1]).getByPlaceholderText('Escribe una nota sobre esta sesión…')).toBeOnTheScreen();
    // El inicio sigue debajo
    expect(screen.getByText('Hagamos memoria')).toBeOnTheScreen();
  });

  it('escribir y guardar la nota de una sesión la añade a «Notas rápidas»', async () => {
    mockGuardarNota.mockResolvedValue({ id: 'n2', texto: 'Preparar pictogramas.', actualizadaEn: aLas(12) });
    const ventana = await abrirNotas();
    const segunda = within(ventana).getAllByTestId('sesion-del-dia')[1];

    expect(within(segunda).getByTestId('boton-guardar-nota')).toBeDisabled();
    await fireEvent.changeText(within(segunda).getByTestId('campo-nota'), 'Preparar pictogramas.');
    await fireEvent.press(within(segunda).getByTestId('boton-guardar-nota'));

    expect(mockGuardarNota).toHaveBeenCalledWith('s2', 'Preparar pictogramas.');
    expect(await within(segunda).findByText('Nota guardada.')).toBeOnTheScreen();

    await fireEvent.press(within(ventana).getByLabelText('Cerrar'));
    expect(screen.queryByTestId('notas-del-dia')).toBeNull();
    expect(screen.getAllByTestId('nota-rapida')).toHaveLength(2);
    expect(screen.getByText('Preparar pictogramas.')).toBeOnTheScreen();
  });

  it('si no se puede guardar, avisa y deja el texto escrito', async () => {
    mockGuardarNota.mockRejectedValue(new Error('No se pudo guardar la nota: sin conexión'));
    const ventana = await abrirNotas();
    const segunda = within(ventana).getAllByTestId('sesion-del-dia')[1];

    await fireEvent.changeText(within(segunda).getByTestId('campo-nota'), 'Texto pendiente');
    await fireEvent.press(within(segunda).getByTestId('boton-guardar-nota'));

    expect(await within(segunda).findByText('No se pudo guardar la nota: sin conexión')).toBeOnTheScreen();
    expect(within(segunda).getByDisplayValue('Texto pendiente')).toBeOnTheScreen();
  });

  it('las flechas pasan al día siguiente (también días futuros) sin cerrar la ventana', async () => {
    await abrirNotas();
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);

    await fireEvent.press(screen.getByLabelText('Día siguiente'));

    expect(await within(screen.getByTestId('notas-del-dia')).findByText(fechaLarga(manana))).toBeOnTheScreen();
    expect(screen.getAllByText(fechaLarga(manana))).toHaveLength(2); // «Notas rápidas» del inicio también sigue al día
    expect(obtenerSesionesDelDia).toHaveBeenLastCalledWith('terapeuta-1', expect.any(Date));
    expect((obtenerSesionesDelDia as jest.Mock).mock.calls.at(-1)[1].toDateString()).toBe(manana.toDateString());
    expect(within(screen.getByTestId('notas-del-dia')).getByText('No hay sesiones este día.')).toBeOnTheScreen();
  });
});
