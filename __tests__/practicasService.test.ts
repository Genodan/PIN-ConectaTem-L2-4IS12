import {
  ESTADO_PRACTICA_PENDIENTE,
  crearPractica,
  obtenerModulos,
  obtenerPacientesDeTerapeuta,
} from '../src/services/practicasService';
import { supabase } from '../src/utils/supabase';

jest.mock('../src/utils/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const from = supabase.from as jest.Mock;

describe('Servicio de Prácticas - Crear práctica', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('crea la práctica pendiente con terapeuta, paciente y módulo', async () => {
    const fila = { id: 'tarea-1', estado: ESTADO_PRACTICA_PENDIENTE };
    const mockSelect = jest.fn().mockResolvedValue({ data: [fila], error: null });
    const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
    from.mockReturnValue({ insert: mockInsert });

    const resultado = await crearPractica({ terapeutaId: 'ter-1', pacienteId: 'pac-1', moduloId: 'mod-1' });

    expect(from).toHaveBeenCalledWith('tareas');
    expect(mockInsert).toHaveBeenCalledWith({
      terapeuta_id: 'ter-1',
      paciente_id: 'pac-1',
      modulo_id: 'mod-1',
      estado: 'pendientes',
      fecha_asignacion: expect.any(String),
    });
    expect(resultado).toEqual(fila);
  });

  it('lanza error si Supabase devuelve un error', async () => {
    const mockSelect = jest.fn().mockResolvedValue({ data: null, error: { message: 'fallo de red' } });
    from.mockReturnValue({ insert: jest.fn().mockReturnValue({ select: mockSelect }) });

    await expect(
      crearPractica({ terapeutaId: 'ter-1', pacienteId: 'pac-1', moduloId: 'mod-1' }),
    ).rejects.toThrow('Error al crear la práctica: fallo de red');
  });

  it('lanza error si la base de datos no guarda ninguna fila (permisos RLS)', async () => {
    const mockSelect = jest.fn().mockResolvedValue({ data: [], error: null });
    from.mockReturnValue({ insert: jest.fn().mockReturnValue({ select: mockSelect }) });

    await expect(
      crearPractica({ terapeutaId: 'ter-1', pacienteId: 'pac-1', moduloId: 'mod-1' }),
    ).rejects.toThrow('No se pudo crear la práctica');
  });
});

describe('Servicio de Prácticas - datos del formulario', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('obtiene los módulos ordenados', async () => {
    const modulos = [{ id: 'm1', titulo: 'Intención Comunicativa', objetivo: 'Pedir', video_guia_url: 'modulo-1.mp4' }];
    const mockOrder = jest.fn().mockResolvedValue({ data: modulos, error: null });
    const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
    from.mockReturnValue({ select: mockSelect });

    const resultado = await obtenerModulos();

    expect(from).toHaveBeenCalledWith('modulos');
    expect(mockOrder).toHaveBeenCalledWith('id');
    expect(resultado).toEqual(modulos);
  });

  it('obtiene solo los pacientes de la terapeuta indicada', async () => {
    const pacientes = [{ id: 'p1', nombre_nino: 'Hugo', nombre_familia: 'Sanchis' }];
    const mockOrder = jest.fn().mockResolvedValue({ data: pacientes, error: null });
    const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    from.mockReturnValue({ select: mockSelect });

    const resultado = await obtenerPacientesDeTerapeuta('ter-1');

    expect(from).toHaveBeenCalledWith('pacientes');
    expect(mockEq).toHaveBeenCalledWith('terapeuta_asignado_id', 'ter-1');
    expect(resultado).toEqual(pacientes);
  });

  it('lanza error si no se pueden cargar los módulos', async () => {
    const mockOrder = jest.fn().mockResolvedValue({ data: null, error: { message: 'sin conexión' } });
    from.mockReturnValue({ select: jest.fn().mockReturnValue({ order: mockOrder }) });

    await expect(obtenerModulos()).rejects.toThrow('Error al cargar los módulos: sin conexión');
  });
});
