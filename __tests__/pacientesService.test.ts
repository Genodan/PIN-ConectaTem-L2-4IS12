import { vincularPaciente } from '../src/services/pacientesService';
import { supabase } from '../src/utils/supabase';

// Simulamos a Supabase para no tocar datos reales durante el test
jest.mock('../src/utils/supabase', () => ({
  supabase: { from: jest.fn() },
}));

describe('Servicio de Pacientes - Asignación', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('debe asignar el terapeuta correctamente si el paciente está libre', async () => {
    const mockSelect = jest.fn().mockResolvedValue({ 
      data: [{ id: 'pac-1', terapeuta_asignado_id: 'terap-1' }], error: null 
    });
    const mockIs = jest.fn().mockReturnValue({ select: mockSelect });
    const mockEq = jest.fn().mockReturnValue({ is: mockIs });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    
    (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

    const resultado = await vincularPaciente('pac-1', 'terap-1');

    expect(mockUpdate).toHaveBeenCalledWith({ terapeuta_asignado_id: 'terap-1' });
    expect(mockIs).toHaveBeenCalledWith('terapeuta_asignado_id', null);
    expect(resultado.terapeuta_asignado_id).toBe('terap-1');
  });

  it('debe lanzar error si otro terapeuta ya lo ha asignado', async () => {
    const mockSelect = jest.fn().mockResolvedValue({ data: [], error: null });
    const mockIs = jest.fn().mockReturnValue({ select: mockSelect });
    const mockEq = jest.fn().mockReturnValue({ is: mockIs });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    
    (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

    await expect(vincularPaciente('pac-1', 'terap-1')).rejects.toThrow('El paciente ya ha sido asignado a otro terapeuta.');
  });
});