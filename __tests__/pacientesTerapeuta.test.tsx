import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import PacientesTerapeuta from '../src/app/terapeuta/pacientes';

// Nueva interfaz · Pestaña «Pacientes» de la terapeuta (Figma «PACIENTES - TERAPEUTA»). Datos simulados e inventados.
jest.setTimeout(30000);

const mockReplace = jest.fn();
let mockParams: { paciente?: string } = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
}));

const mockAlCambiarDatos = jest.fn();
jest.mock('../src/sesion/SesionTerapeuta', () => ({
  useSesionTerapeuta: () => ({
    terapeutas: [{ id: 'terapeuta-1', nombre: 'Terapeuta Uno' }],
    terapeutaActual: 'terapeuta-1',
    nombreActual: 'Terapeuta Uno',
    cargando: false,
    elegirTerapeuta: jest.fn(),
    datosVersion: 0,
    alCambiarDatos: mockAlCambiarDatos,
  }),
}));

const hace = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString();

const mockLista = [
  { id: 'p1', nombre: 'Niño Uno', identificador: '11111111', progresoSemanal: 25, ultimaActividad: { tipo: 'tarea', fecha: hace(0) } },
  { id: 'p2', nombre: 'Niña Dos', identificador: '22222222', progresoSemanal: 50, ultimaActividad: { tipo: 'nota', fecha: hace(1) } },
  { id: 'p3', nombre: 'Niño Tres', identificador: '33333333', progresoSemanal: 0, ultimaActividad: null },
];

const mockFichaDe = (id: string) => ({
  datos: {
    id,
    nombreNino: id === 'p1' ? 'Niño' : 'Niña',
    apellidos: id === 'p1' ? 'Uno Apellido' : 'Dos Apellido',
    fechaNacimiento: '2023-06-23',
    identificador: id === 'p1' ? '11111111' : '22222222',
    email: id === 'p1' ? 'familia1@correo.ejemplo' : null,
    telefono: '600 000 001',
    telefonoFijo: null,
    tutor1: 'Tutor Uno',
    tutor2: null,
    necesidadesObjetivos: id === 'p1' ? 'Objetivo inventado.' : null,
  },
  completadas: 3,
  pendientes: 2,
  sesionesAtendidas: 4,
  historial: [
    { id: 't1', titulo: 'El Espejo', estado: 'Pendiente' },
    { id: 't2', titulo: 'Manos a la Obra', estado: 'Por revisar' },
    { id: 't3', titulo: 'Intención Comunicativa', estado: 'Completada' },
    { id: 't4', titulo: 'El Reloj de la Calma', estado: 'Pendiente' },
    { id: 't5', titulo: 'Mis Primeras Palabras', estado: 'Completada' },
  ],
  notas: [
    { id: 'n1', fechaSesion: new Date(2026, 10, 11, 10).toISOString(), texto: 'Primera nota inventada.' },
    { id: 'n2', fechaSesion: new Date(2026, 10, 6, 10).toISOString(), texto: 'Segunda nota inventada.' },
    { id: 'n3', fechaSesion: new Date(2026, 9, 30, 10).toISOString(), texto: 'Tercera nota inventada.' },
  ],
});

const mockFicha = jest.fn(async (id: string) => mockFichaDe(id));
const mockActualizar = jest.fn();
const mockTraspasar = jest.fn();
let mockArchivados: unknown[] = [];
jest.mock('../src/services/pacientesTerapeutaService', () => ({
  ...jest.requireActual('../src/services/pacientesTerapeutaService'),
  obtenerListadoPacientes: jest.fn(async () => mockLista),
  obtenerFichaPaciente: (id: string) => mockFicha(id),
  actualizarDatosPaciente: (...args: unknown[]) => mockActualizar(...args),
  obtenerArchivados: jest.fn(async () => mockArchivados),
  obtenerOtrasTerapeutas: jest.fn(async () => [
    { id: 'terapeuta-2', nombre: 'Terapeuta Dos' },
    { id: 'terapeuta-3', nombre: 'Terapeuta Tres' },
  ]),
  traspasarPaciente: (...args: unknown[]) => mockTraspasar(...args),
}));

jest.mock('../src/services/practicasService', () => ({
  obtenerModulos: jest.fn(async () => [
    { id: 'm1', titulo: 'Intención Comunicativa', objetivo: 'Objetivo largo 1', video_guia_url: null },
    { id: 'm2', titulo: 'El Espejo', objetivo: 'Objetivo largo 2', video_guia_url: null },
  ]),
}));

const mockAsignar = jest.fn(async () => undefined);
const mockQuitar = jest.fn(async () => undefined);
jest.mock('../src/services/modulosPacienteService', () => ({
  obtenerModulosAsignadosAPaciente: jest.fn(async () => ['m2']),
  asignarModuloAPaciente: (...args: unknown[]) => mockAsignar(...(args as [])),
  desasignarModuloDePaciente: (...args: unknown[]) => mockQuitar(...(args as [])),
}));

const mockCrearPaciente = jest.fn();
jest.mock('../src/services/pacientesService', () => ({
  ...jest.requireActual('../src/services/pacientesService'),
  crearPaciente: (...args: unknown[]) => mockCrearPaciente(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockArchivados = [];
});

const abrir = async () => {
  await render(<PacientesTerapeuta />);
  await screen.findByTestId('ficha-paciente');
};

describe('Nueva interfaz · Pacientes · listado', () => {
  it('muestra cuántos pacientes activos hay y sus tarjetas con la última actividad y el progreso semanal', async () => {
    await abrir();

    expect(screen.getByText('3 pacientes activos')).toBeOnTheScreen();
    const tarjetas = screen.getAllByTestId('paciente-listado');
    expect(tarjetas).toHaveLength(3);
    expect(within(tarjetas[0]).getByText('Tarea enviada · Hoy')).toBeOnTheScreen();
    expect(within(tarjetas[0]).getByText('25%')).toBeOnTheScreen();
    expect(within(tarjetas[1]).getByText('Nota enviada · Hace 1 día')).toBeOnTheScreen();
    expect(within(tarjetas[2]).getByText('Sin actividad todavía')).toBeOnTheScreen();
  });

  it('el primero queda seleccionado; al pulsar otro se ve su ficha', async () => {
    await abrir();
    const tarjetas = screen.getAllByTestId('paciente-listado');
    expect(within(tarjetas[0]).getByText('Seleccionado')).toBeOnTheScreen();
    expect(within(tarjetas[1]).getByText('Ver ficha →')).toBeOnTheScreen();
    expect(screen.getByText('Niño Uno Apellido')).toBeOnTheScreen();

    await fireEvent.press(tarjetas[1]);

    expect(await screen.findByText('Niña Dos Apellido')).toBeOnTheScreen();
    expect(mockFicha).toHaveBeenLastCalledWith('p2');
    expect(within(screen.getAllByTestId('paciente-listado')[1]).getByText('Seleccionado')).toBeOnTheScreen();
  });

  it('al llegar desde «Ver ficha →» del inicio se abre la ficha de ese niño', async () => {
    mockParams = { paciente: 'p2' };
    await abrir();

    expect(await screen.findByText('Niña Dos Apellido')).toBeOnTheScreen();
  });

  it('busca por nombre o por identificador', async () => {
    await abrir();

    await fireEvent.changeText(screen.getByLabelText('Buscar por nombre o identificador'), '#2222');
    expect(screen.getAllByTestId('paciente-listado')).toHaveLength(1);
    expect(screen.getByText('Niña Dos')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Buscar por nombre o identificador'), 'zzz');
    expect(screen.getByText('Ningún paciente coincide con la búsqueda.')).toBeOnTheScreen();
  });

  it('«Invitar a un nuevo paciente» abre una ventana encima, lo da de alta y lo selecciona', async () => {
    mockCrearPaciente.mockResolvedValue({ id: 'p9', nombre_nino: 'Niño Nueve', nombre_familia: 'Familia Nueve', terapeuta_asignado_id: 'terapeuta-1' });
    await abrir();

    await fireEvent.press(screen.getByTestId('boton-invitar-paciente'));
    const ventana = await screen.findByTestId('invitar-paciente');
    expect(within(ventana).getByTestId('boton-crear-paciente')).toBeDisabled();
    await fireEvent.changeText(within(ventana).getByLabelText('Nombre del niño'), 'Niño Nueve');
    await fireEvent.changeText(within(ventana).getByLabelText('Nombre de la familia'), 'Familia Nueve');
    await fireEvent.press(within(ventana).getByTestId('boton-crear-paciente'));

    expect(mockCrearPaciente).toHaveBeenCalledWith({ nombreNino: 'Niño Nueve', nombreFamilia: 'Familia Nueve', terapeutaId: 'terapeuta-1' });
    expect(mockAlCambiarDatos).toHaveBeenCalled();
    expect(screen.queryByTestId('invitar-paciente')).toBeNull();
  });

  it('si el alta falla, lo explica sin cerrar la ventana', async () => {
    mockCrearPaciente.mockRejectedValue(new Error('Ya tienes un paciente con ese nombre y esa familia.'));
    await abrir();

    await fireEvent.press(screen.getByTestId('boton-invitar-paciente'));
    const ventana = await screen.findByTestId('invitar-paciente');
    await fireEvent.changeText(within(ventana).getByLabelText('Nombre del niño'), 'Niño Uno');
    await fireEvent.changeText(within(ventana).getByLabelText('Nombre de la familia'), 'Familia Uno');
    await fireEvent.press(within(ventana).getByTestId('boton-crear-paciente'));

    expect(await within(ventana).findByText('Ya tienes un paciente con ese nombre y esa familia.')).toBeOnTheScreen();
  });
});

describe('Nueva interfaz · Pacientes · ficha', () => {
  it('muestra los datos del niño: edad, identificador, contacto y tutores (y lo que falta, en gris)', async () => {
    await abrir();
    const ficha = screen.getByTestId('ficha-paciente');

    expect(within(ficha).getByText(/años · 23 de junio de 2023$/)).toBeOnTheScreen();
    expect(within(ficha).getByText('#11111111')).toBeOnTheScreen();
    expect(within(ficha).getByText('familia1@correo.ejemplo')).toBeOnTheScreen();
    expect(within(ficha).getByText('600 000 001')).toBeOnTheScreen();
    expect(within(ficha).getByText('Nº teléfono fijo')).toBeOnTheScreen();
    expect(within(ficha).getByText('Tutor Uno')).toBeOnTheScreen();
    expect(within(ficha).getByText('Objetivo inventado.')).toBeOnTheScreen();
  });

  it('«Progreso»: tareas completadas, pendientes y sesiones atendidas', async () => {
    await abrir();

    expect(screen.getByLabelText('3 Tareas completadas')).toBeOnTheScreen();
    expect(screen.getByLabelText('2 Pendientes')).toBeOnTheScreen();
    expect(screen.getByLabelText('4 Sesiones atendidas')).toBeOnTheScreen();
  });

  it('«Notas»: las dos últimas de sus sesiones; «Ver todas» las abre todas en una ventana encima', async () => {
    await abrir();

    expect(screen.getAllByTestId('nota-ficha')).toHaveLength(2);
    expect(screen.getByText('11 de noviembre de 2026')).toBeOnTheScreen();
    expect(screen.queryByText('Tercera nota inventada.')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Ver todas: Notas'));
    const ventana = await screen.findByTestId('notas-del-paciente');
    expect(within(ventana).getByText('Tercera nota inventada.')).toBeOnTheScreen();
  });

  it('«Historial de tareas»: estados de la interfaz, cuatro a la vista y «Ver todas» despliega el resto', async () => {
    await abrir();

    let tareas = screen.getAllByTestId('tarea-historial');
    expect(tareas).toHaveLength(4);
    expect(within(tareas[0]).getByText('Pendiente')).toBeOnTheScreen();
    expect(within(tareas[1]).getByText('Por revisar')).toBeOnTheScreen();
    expect(within(tareas[2]).getByText('Completada')).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText('Ver todas: Historial de tareas'));
    tareas = screen.getAllByTestId('tarea-historial');
    expect(tareas).toHaveLength(5);
  });

  it('«Asignar nueva práctica» lleva a la pestaña Prácticas', async () => {
    await abrir();

    await fireEvent.press(screen.getByTestId('boton-asignar-practica'));
    expect(mockReplace).toHaveBeenCalledWith('/terapeuta/practicas');
  });

  it('carrusel de módulos: marca los asignados y la flecha asigna o quita', async () => {
    await abrir();
    const tarjetas = screen.getAllByTestId('tarjeta-modulo');
    expect(within(tarjetas[1]).getByText('Asignado')).toBeOnTheScreen();
    expect(within(tarjetas[0]).getByText('Expresar deseos y necesidades')).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText('Asignar el módulo «Intención Comunicativa»'));
    expect(mockAsignar).toHaveBeenCalledWith('p1', 'm1');
    expect(await screen.findByLabelText('Quitar el módulo «Intención Comunicativa»')).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText('Quitar el módulo «El Espejo»'));
    expect(mockQuitar).toHaveBeenCalledWith('p1', 'm2');
    expect(await screen.findByLabelText('Asignar el módulo «El Espejo»')).toBeOnTheScreen();
  });

  it('el lápiz abre «Editar datos» con los datos actuales y al guardar se actualiza la ficha', async () => {
    mockActualizar.mockImplementation(async (_id: string, c: { nombreNino: string; apellidos: string }) => ({
      ...mockFichaDe('p1').datos,
      nombreNino: c.nombreNino,
      apellidos: c.apellidos,
    }));
    await abrir();

    await fireEvent.press(screen.getByLabelText('Editar los datos del niño'));
    const ventana = await screen.findByTestId('editar-paciente');
    expect(within(ventana).getByDisplayValue('23/06/2023')).toBeOnTheScreen();
    await fireEvent.changeText(within(ventana).getByLabelText('Apellidos'), 'Uno Cambiado');
    await fireEvent.press(within(ventana).getByTestId('boton-guardar-paciente'));

    expect(mockActualizar).toHaveBeenCalledWith('p1', expect.objectContaining({ nombreNino: 'Niño', apellidos: 'Uno Cambiado', fechaNacimiento: '23/06/2023' }));
    expect(await screen.findByText('Niño Uno Cambiado')).toBeOnTheScreen();
    expect(screen.queryByTestId('editar-paciente')).toBeNull();
  });

  it('si los datos no son válidos, lo dice y no cierra la ventana', async () => {
    mockActualizar.mockRejectedValue(new Error('La fecha de nacimiento debe tener el formato DD/MM/AAAA.'));
    await abrir();

    await fireEvent.press(screen.getByLabelText('Editar los datos del niño'));
    const ventana = await screen.findByTestId('editar-paciente');
    await fireEvent.changeText(within(ventana).getByLabelText('Fecha de nacimiento'), '2023-06-23');
    await fireEvent.press(within(ventana).getByTestId('boton-guardar-paciente'));

    expect(await within(ventana).findByText('La fecha de nacimiento debe tener el formato DD/MM/AAAA.')).toBeOnTheScreen();
  });
});

describe('Nueva interfaz · Pacientes · traspaso y «Archivados»', () => {
  const abrirTraspaso = async () => {
    await abrir();
    await fireEvent.press(screen.getByLabelText('Editar los datos del niño'));
    const editar = await screen.findByTestId('editar-paciente');
    await fireEvent.press(within(editar).getByTestId('boton-traspasar'));
    return screen.findByTestId('traspasar-paciente');
  };

  it('desde el lápiz se traspasa a otra terapeuta: se elige, se avisa de lo que pasará y se confirma', async () => {
    mockTraspasar.mockResolvedValue(undefined);
    const ventana = await abrirTraspaso();

    expect(within(ventana).getByTestId('boton-confirmar-traspaso')).toBeDisabled();
    await fireEvent.press(await within(ventana).findByText('Terapeuta Dos'));
    expect(within(ventana).getByTestId('aviso-traspaso')).toHaveTextContent(/pasará a Terapeuta Dos/);
    await fireEvent.press(within(ventana).getByTestId('boton-confirmar-traspaso'));

    expect(mockTraspasar).toHaveBeenCalledWith('p1', 'terapeuta-1', 'terapeuta-2');
    expect(await screen.findByText('Niño se ha traspasado a Terapeuta Dos. Lo encontrarás en «Archivados».')).toBeOnTheScreen();
    expect(screen.queryByTestId('traspasar-paciente')).toBeNull();
    expect(mockAlCambiarDatos).toHaveBeenCalled();
  });

  it('«Cancelar» vuelve a los datos sin traspasar', async () => {
    const ventana = await abrirTraspaso();

    await fireEvent.press(within(ventana).getByText('Cancelar'));

    expect(await screen.findByTestId('editar-paciente')).toBeOnTheScreen();
    expect(mockTraspasar).not.toHaveBeenCalled();
  });

  it('si el traspaso falla, lo explica y no cierra la ventana', async () => {
    mockTraspasar.mockRejectedValue(new Error('No se pudo traspasar el paciente: Paciente no encontrado'));
    const ventana = await abrirTraspaso();

    await fireEvent.press(await within(ventana).findByText('Terapeuta Tres'));
    await fireEvent.press(within(ventana).getByTestId('boton-confirmar-traspaso'));

    expect(await within(ventana).findByText('No se pudo traspasar el paciente: Paciente no encontrado')).toBeOnTheScreen();
  });

  it('«Archivados» lista los niños traspasados y su ficha se ve en solo lectura', async () => {
    mockArchivados = [{ id: 'p2', nombre: 'Niña Dos', identificador: '22222222', traspasadoA: 'Terapeuta Dos', fecha: new Date(2026, 10, 20, 10).toISOString() }];
    await abrir();

    await fireEvent.press(screen.getByTestId('pestana-archivados'));

    expect(screen.getByText('1 paciente archivado')).toBeOnTheScreen();
    expect(screen.queryByTestId('boton-invitar-paciente')).toBeNull();
    const tarjeta = screen.getByTestId('paciente-listado');
    expect(within(tarjeta).getByText('Traspasado a Terapeuta Dos · 20 de noviembre')).toBeOnTheScreen();
    expect(within(tarjeta).queryByText('Progreso semanal')).toBeNull();

    expect(await screen.findByText('Niña Dos Apellido')).toBeOnTheScreen();
    expect(screen.getByTestId('aviso-archivado')).toHaveTextContent(/Traspasado a Terapeuta Dos el 20 de noviembre de 2026/);
    expect(screen.queryByLabelText('Editar los datos del niño')).toBeNull();
    expect(screen.queryByTestId('boton-asignar-practica')).toBeNull();
    expect(screen.queryByLabelText(/Asignar el módulo|Quitar el módulo/)).toBeNull();
    expect(within(screen.getAllByTestId('tarjeta-modulo')[1]).getByText('Asignado')).toBeOnTheScreen();
  });

  it('sin traspasos, «Archivados» lo dice', async () => {
    await abrir();

    await fireEvent.press(screen.getByTestId('pestana-archivados'));

    expect(screen.getByText('0 pacientes archivados')).toBeOnTheScreen();
    expect(screen.getByText('No has traspasado ningún paciente a otra terapeuta.')).toBeOnTheScreen();
  });
});
