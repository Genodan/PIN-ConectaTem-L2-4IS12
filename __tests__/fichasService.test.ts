import { darDeAltaPaciente, obtenerMisPacientes, transferirPaciente } from '../src/services/fichasService';
import { supabase } from '../src/lib/supabase';

// Simulamos a Supabase para no tocar datos reales durante el test
jest.mock('../src/lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}));

const mockSupabase = supabase as unknown as { from: jest.Mock; rpc: jest.Mock };

describe('Servicio de fichas - alta de pacientes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('da de alta al paciente con la función de la base de datos y devuelve el código', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 'A1B2C3D4E5', error: null });

    const codigo = await darDeAltaPaciente('  Hugo ', 'Marta Sanchis');

    expect(mockSupabase.rpc).toHaveBeenCalledWith('crear_paciente_con_codigo', {
      p_nombre_nino: 'Hugo',
      p_nombre_familia: 'Marta Sanchis',
    });
    expect(codigo).toBe('A1B2C3D4E5');
  });

  it('no llama a la base de datos si falta algún nombre', async () => {
    await expect(darDeAltaPaciente('Hugo', '  ')).rejects.toThrow('Escribe el nombre del niño/a y el de la familia.');
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it('muestra el motivo si la base de datos rechaza el alta (por ejemplo, sin sesión de terapeuta)', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'Solo una terapeuta puede dar de alta pacientes' } });

    await expect(darDeAltaPaciente('Hugo', 'Marta Sanchis')).rejects.toThrow(
      'No se pudo dar de alta al paciente: Solo una terapeuta puede dar de alta pacientes',
    );
  });

  it('solo trae los pacientes asignados a la terapeuta', async () => {
    const mockOrder = jest.fn().mockResolvedValue({ data: [{ id: 'p1', nombre_nino: 'Hugo' }], error: null });
    const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const pacientes = await obtenerMisPacientes('terapeuta-elena');

    expect(mockSupabase.from).toHaveBeenCalledWith('pacientes');
    expect(mockEq).toHaveBeenCalledWith('terapeuta_asignado_id', 'terapeuta-elena');
    expect(pacientes).toHaveLength(1);
  });
});

describe('Servicio de fichas - transferir paciente', () => {
  beforeEach(() => jest.clearAllMocks());

  it('transfiere el paciente con la función de la base de datos', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

    await transferirPaciente('p1', 'terapeuta-javier');

    expect(mockSupabase.rpc).toHaveBeenCalledWith('transferir_paciente', { p_paciente: 'p1', p_terapeuta_nueva: 'terapeuta-javier' });
  });

  it('muestra el motivo si la base de datos lo rechaza (por ejemplo, el paciente no es suyo)', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'Paciente no encontrado' } });

    await expect(transferirPaciente('p1', 'terapeuta-javier')).rejects.toThrow('No se pudo transferir al paciente: Paciente no encontrado');
  });
});
