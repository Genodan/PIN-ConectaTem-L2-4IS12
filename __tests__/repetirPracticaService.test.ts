import { repetirPractica } from '../src/services/practicasService';
import { supabase } from '../src/utils/supabase';

// UT 1401 «Repetir una práctica»: la base de datos se simula, no se tocan datos reales.
jest.mock('../src/utils/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const from = supabase.from as jest.Mock;
const mockInsert = jest.fn();

const ORIGINAL = {
  id: 'practica-1',
  terapeuta_id: 'elena',
  paciente_id: 'daniel',
  modulo_id: 'intencion',
  estado: 'evaluada',
};

// 1.ª consulta: la práctica original. 2.ª: pendientes del mismo módulo. 3.ª: insert de la nueva
const simular = ({
  original = { data: ORIGINAL, error: null } as { data: unknown; error: unknown },
  pendientes = { data: [], error: null } as { data: unknown; error: unknown },
  insertar = { data: [{ id: 'nueva', estado: 'pendientes' }], error: null } as { data: unknown; error: unknown },
} = {}) => {
  const mockSingle = jest.fn().mockResolvedValue(original);
  const lectura = { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: mockSingle }) }) };

  const mockLimit = jest.fn().mockResolvedValue(pendientes);
  const eq3 = jest.fn().mockReturnValue({ limit: mockLimit });
  const eq2 = jest.fn().mockReturnValue({ eq: eq3 });
  const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
  const consulta = { select: jest.fn().mockReturnValue({ eq: eq1 }) };

  mockInsert.mockReturnValue({ select: jest.fn().mockResolvedValue(insertar) });
  const escritura = { insert: mockInsert };

  from.mockReturnValueOnce(lectura).mockReturnValueOnce(consulta).mockReturnValueOnce(escritura);
  return { eq1, eq2, eq3 };
};

describe('repetirPractica · UT 1401', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    from.mockReset();
  });

  it('PA-1: crea una práctica «Pendiente» con la misma terapeuta, paciente y módulo', async () => {
    simular();

    const nueva = await repetirPractica('practica-1');

    expect(nueva).toEqual({ id: 'nueva', estado: 'pendientes' });
    expect(mockInsert).toHaveBeenCalledWith({
      terapeuta_id: 'elena',
      paciente_id: 'daniel',
      modulo_id: 'intencion',
      estado: 'pendientes',
      fecha_asignacion: expect.any(String),
    });
  });

  it('PA-1: busca pendientes solo del mismo paciente y módulo', async () => {
    const { eq1, eq2, eq3 } = simular();

    await repetirPractica('practica-1');

    expect(eq1).toHaveBeenCalledWith('paciente_id', 'daniel');
    expect(eq2).toHaveBeenCalledWith('modulo_id', 'intencion');
    expect(eq3).toHaveBeenCalledWith('estado', 'pendientes');
  });

  it('PA-2: si ya hay una pendiente de ese módulo, avisa y no crea ninguna', async () => {
    simular({ pendientes: { data: [{ id: 'otra' }], error: null } });

    await expect(repetirPractica('practica-1')).rejects.toThrow(
      'Ya tienes una práctica pendiente de este módulo. Envíala antes de repetirla.',
    );
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it.each(['completada', 'evaluada'])('PA-1: se puede repetir una práctica en estado «%s» (Enviada o Con feedback)', async (estado) => {
    simular({ original: { data: { ...ORIGINAL, estado }, error: null } });

    await expect(repetirPractica('practica-1')).resolves.toEqual({ id: 'nueva', estado: 'pendientes' });
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('PA-3: una práctica «Pendiente» no se repite: todavía no se ha enviado', async () => {
    simular({ original: { data: { ...ORIGINAL, estado: 'pendientes' }, error: null } });

    await expect(repetirPractica('practica-1')).rejects.toThrow(
      'Solo se puede repetir una práctica que ya has enviado.',
    );
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('PA-4: si falla al crear, el mensaje empieza por «No se ha podido repetir la práctica»', async () => {
    simular({ insertar: { data: null, error: { message: 'sin conexión' } } });

    await expect(repetirPractica('practica-1')).rejects.toThrow(
      /^No se ha podido repetir la práctica: .*sin conexión/,
    );
  });

  it('PA-4: si falla al leer la práctica original, tampoco crea nada', async () => {
    simular({ original: { data: null, error: { message: 'sin conexión' } } });

    await expect(repetirPractica('practica-1')).rejects.toThrow(/^No se ha podido repetir la práctica: sin conexión/);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
