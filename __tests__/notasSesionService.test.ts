import { franjaDeSesion, guardarNotaDeSesion, horaDeSesion, obtenerSesionesDelDia } from '../src/services/notasSesionService';
import { supabase } from '../src/utils/supabase';

// Nueva interfaz · sesiones de la terapeuta y su nota (una por sesión). Supabase simulado.
jest.mock('../src/utils/supabase', () => ({ supabase: { from: jest.fn() } }));
const from = supabase.from as jest.Mock;

beforeEach(() => {
  from.mockReset();
});

describe('Notas de sesión · datos', () => {
  it('sesiones del día: solo las de esa terapeuta entre las 00:00 y las 24:00, por orden de hora', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [
        {
          id: 's1',
          empieza_en: '2026-11-30T09:00:00Z',
          duracion_min: 45,
          paciente_id: 'p1',
          pacientes: { nombre_nino: 'Niño 1', nombre_familia: 'Apellido Uno' },
          notas: { id: 'n1', texto: 'Ha ido bien.', actualizada_en: '2026-11-30T10:00:00Z' },
        },
        { id: 's2', empieza_en: '2026-11-30T11:00:00Z', duracion_min: 30, paciente_id: 'p2', pacientes: [{ nombre_nino: 'Niño 2', nombre_familia: null }], notas: [] },
      ],
      error: null,
    });
    const lt = jest.fn().mockReturnValue({ order });
    const gte = jest.fn().mockReturnValue({ lt });
    const eq = jest.fn().mockReturnValue({ gte });
    from.mockReturnValue({ select: jest.fn().mockReturnValue({ eq }) });

    const resultado = await obtenerSesionesDelDia('terapeuta-1', new Date(2026, 10, 30, 17, 25));

    expect(from).toHaveBeenCalledWith('sesiones');
    expect(eq).toHaveBeenCalledWith('terapeuta_id', 'terapeuta-1');
    expect(gte).toHaveBeenCalledWith('empieza_en', new Date(2026, 10, 30).toISOString());
    expect(lt).toHaveBeenCalledWith('empieza_en', new Date(2026, 11, 1).toISOString());
    expect(order).toHaveBeenCalledWith('empieza_en', { ascending: true });
    expect(resultado).toEqual([
      {
        id: 's1',
        empiezaEn: '2026-11-30T09:00:00Z',
        duracionMin: 45,
        pacienteId: 'p1',
        nino: 'Niño 1',
        familia: 'Apellido Uno',
        nota: { id: 'n1', texto: 'Ha ido bien.', actualizadaEn: '2026-11-30T10:00:00Z' },
      },
      { id: 's2', empiezaEn: '2026-11-30T11:00:00Z', duracionMin: 30, pacienteId: 'p2', nino: 'Niño 2', familia: null, nota: null },
    ]);
  });

  it('guardar nota: crea o edita la única nota de la sesión, sin espacios sobrantes', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 'n1', texto: 'Nota nueva', actualizada_en: '2026-11-30T10:00:00Z' }, error: null });
    const upsert = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single }) });
    from.mockReturnValue({ upsert });

    const nota = await guardarNotaDeSesion('s1', '  Nota nueva  ');

    expect(from).toHaveBeenCalledWith('notas');
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ sesion_id: 's1', texto: 'Nota nueva' }), { onConflict: 'sesion_id' });
    expect(nota).toEqual({ id: 'n1', texto: 'Nota nueva', actualizadaEn: '2026-11-30T10:00:00Z' });
  });

  it('guardar una nota vacía la borra', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const borrar = jest.fn().mockReturnValue({ eq });
    from.mockReturnValue({ delete: borrar });

    expect(await guardarNotaDeSesion('s1', '   ')).toBeNull();
    expect(eq).toHaveBeenCalledWith('sesion_id', 's1');
  });

  it('si Supabase falla, avisa con un mensaje claro', async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { message: 'sin conexión' } });
    from.mockReturnValue({ upsert: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single }) }) });

    await expect(guardarNotaDeSesion('s1', 'Nota')).rejects.toThrow('No se pudo guardar la nota: sin conexión');
  });
});

describe('Notas de sesión · formatos', () => {
  it('franja y hora de la sesión', () => {
    const inicio = new Date(2026, 10, 30, 10, 0).toISOString();
    expect(franjaDeSesion(inicio, 45)).toBe('10:00 – 10:45');
    expect(horaDeSesion(inicio)).toBe('10:00');
  });
});
