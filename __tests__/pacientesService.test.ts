import { vincularPaciente } from '../src/services/pacientesService';
import { supabase } from '../src/utils/supabase';

// Simulamos a Supabase para no tocar datos reales durante el test
jest.mock('../src/utils/supabase', () => ({
  supabase: { from: jest.fn() },
}));

// La consulta que hace el servicio: update(terapeuta) -> eq(id del paciente) -> select()
const simularActualizacion = (resultado: { data: unknown; error: unknown }) => {
  const mockSelect = jest.fn().mockResolvedValue(resultado);
  const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
  const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
  (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });
  return { mockUpdate, mockEq };
};

describe('Servicio de Pacientes - Asignación', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // El servicio escribe en la consola lo que envía y lo que responde Supabase: se silencia en las pruebas
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('debe asignar el terapeuta al paciente indicado y devolver la fila actualizada', async () => {
    const { mockUpdate, mockEq } = simularActualizacion({
      data: [{ id: 'pac-1', terapeuta_asignado_id: 'terap-1' }],
      error: null,
    });

    const resultado = await vincularPaciente('pac-1', 'terap-1');

    expect(supabase.from).toHaveBeenCalledWith('pacientes');
    expect(mockUpdate).toHaveBeenCalledWith({ terapeuta_asignado_id: 'terap-1' });
    expect(mockEq).toHaveBeenCalledWith('id', 'pac-1');
    expect(resultado.terapeuta_asignado_id).toBe('terap-1');
  });

  it('debe lanzar error si Supabase no actualiza ninguna fila (posible bloqueo de permisos)', async () => {
    simularActualizacion({ data: [], error: null });

    await expect(vincularPaciente('pac-1', 'terap-1')).rejects.toThrow(
      'Supabase no actualizó nada. Posible bloqueo de permisos (RLS).',
    );
  });

  it('debe lanzar error con el motivo si Supabase devuelve un error', async () => {
    simularActualizacion({ data: null, error: { message: 'fallo de red' } });

    await expect(vincularPaciente('pac-1', 'terap-1')).rejects.toThrow('Error al asignar paciente: fallo de red');
  });
});
