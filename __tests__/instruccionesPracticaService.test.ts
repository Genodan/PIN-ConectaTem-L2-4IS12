import { crearPractica, repetirPractica } from '../src/services/practicasService';
import { supabase } from '../src/utils/supabase';

// UT 1406 «Leer en voz alta las instrucciones»: la terapeuta escribe las instrucciones al crear la práctica.
// La base de datos se simula: no se tocan datos reales.
jest.mock('../src/utils/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const from = supabase.from as jest.Mock;

const INSTRUCCIONES = 'Poneos los dos frente al espejo. Haz un gesto sencillo, como aplaudir, y espera a que Hugo te imite.';

const simularInsert = () => {
  const mockInsert = jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue({ data: [{ id: 'nueva', estado: 'pendientes' }], error: null }),
  });
  from.mockReturnValue({ insert: mockInsert });
  return mockInsert;
};

describe('Instrucciones de una práctica (UT 1406) - crear', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    from.mockReset();
  });

  it('guarda las instrucciones de la terapeuta tal cual, sin espacios sobrantes', async () => {
    const mockInsert = simularInsert();

    await crearPractica({ terapeutaId: 'elena', pacienteId: 'hugo', moduloId: 'espejo', instrucciones: `  ${INSTRUCCIONES}\n` });

    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ instrucciones: INSTRUCCIONES }));
  });

  it('si la terapeuta no escribe instrucciones, no guarda nada en ese campo', async () => {
    const mockInsert = simularInsert();

    await crearPractica({ terapeutaId: 'elena', pacienteId: 'hugo', moduloId: 'espejo', instrucciones: '   ' });

    expect(mockInsert.mock.calls[0][0]).not.toHaveProperty('instrucciones');
  });
});

describe('Instrucciones de una práctica (UT 1406) - repetir', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    from.mockReset();
  });

  it('al repetir una práctica (UT 1401), la nueva conserva las instrucciones de la terapeuta', async () => {
    // 1.ª consulta: la práctica original. 2.ª: pendientes del mismo módulo. 3.ª: insert de la nueva
    const original = {
      id: 'practica-1',
      terapeuta_id: 'elena',
      paciente_id: 'hugo',
      modulo_id: 'espejo',
      estado: 'evaluada',
      instrucciones: INSTRUCCIONES,
    };
    const lectura = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: original, error: null }) }),
      }),
    };
    const limit = jest.fn().mockResolvedValue({ data: [], error: null });
    const consulta = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ limit }) }) }),
      }),
    };
    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: [{ id: 'nueva', estado: 'pendientes' }], error: null }),
    });
    from.mockReturnValueOnce(lectura).mockReturnValueOnce(consulta).mockReturnValueOnce({ insert: mockInsert });

    await repetirPractica('practica-1');

    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ instrucciones: INSTRUCCIONES }));
  });
});
