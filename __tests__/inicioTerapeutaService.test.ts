import {
  fechaDeHoy,
  fechaLarga,
  horaRelativa,
  obtenerEvidenciasPorRevisar,
  obtenerPacientesConProgreso,
  patronDeModulo,
  porcentaje,
} from '../src/services/inicioTerapeutaService';
import { supabase } from '../src/utils/supabase';

// Nueva interfaz · datos y formatos del inicio de la terapeuta. Supabase simulado.
jest.mock('../src/utils/supabase', () => ({ supabase: { from: jest.fn() } }));
const from = supabase.from as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  from.mockReset();
});

describe('Inicio de la terapeuta · datos', () => {
  it('evidencias por revisar: prácticas «Enviadas» de la terapeuta, la más reciente primero', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: 't1', fecha_envio: '2026-11-27T10:00:00Z', pacientes: { nombre_nino: 'Niño 1' }, modulos: [{ titulo: 'El Espejo' }] }],
      error: null,
    });
    const eqEstado = jest.fn().mockReturnValue({ order });
    const eqTerapeuta = jest.fn().mockReturnValue({ eq: eqEstado });
    from.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: eqTerapeuta }) });

    const resultado = await obtenerEvidenciasPorRevisar('terapeuta-1');

    expect(eqTerapeuta).toHaveBeenCalledWith('terapeuta_id', 'terapeuta-1');
    expect(eqEstado).toHaveBeenCalledWith('estado', 'completada');
    expect(order).toHaveBeenCalledWith('fecha_envio', { ascending: false });
    expect(resultado).toEqual([{ id: 't1', fechaEnvio: '2026-11-27T10:00:00Z', nino: 'Niño 1', modulo: 'El Espejo' }]);
  });

  it('pacientes con progreso: cuenta como hechas las prácticas enviadas o con feedback', async () => {
    const pacientes = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [
              { id: 'p1', nombre_nino: 'Niño 1' },
              { id: 'p2', nombre_nino: 'Niño 2' },
            ],
            error: null,
          }),
        }),
      }),
    };
    const tareas = {
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({
          data: [
            { paciente_id: 'p1', estado: 'evaluada' },
            { paciente_id: 'p1', estado: 'completada' },
            { paciente_id: 'p1', estado: 'pendientes' },
            { paciente_id: 'p1', estado: 'pendientes' },
          ],
          error: null,
        }),
      }),
    };
    from.mockImplementation((tabla: string) => ({ pacientes, tareas })[tabla]);

    const resultado = await obtenerPacientesConProgreso('terapeuta-1');

    expect(resultado).toEqual([
      { id: 'p1', nombreNino: 'Niño 1', completadas: 2, total: 4 },
      { id: 'p2', nombreNino: 'Niño 2', completadas: 0, total: 0 },
    ]);
  });
});

describe('Inicio de la terapeuta · formatos', () => {
  const hoy = new Date(2026, 10, 9, 18, 0); // lunes 9 de noviembre de 2026

  it('fecha del saludo y fecha larga de un día', () => {
    expect(fechaDeHoy(hoy)).toBe('Lunes, 9 de noviembre.');
    expect(fechaLarga(new Date(2026, 10, 30))).toBe('Lunes, 30 de noviembre');
  });

  it('hora relativa de cada evidencia o nota', () => {
    expect(horaRelativa(new Date(2026, 10, 9, 12, 30).toISOString(), hoy)).toBe('Hoy, 12:30');
    expect(horaRelativa(new Date(2026, 10, 8, 9, 5).toISOString(), hoy)).toBe('Ayer, 09:05');
    expect(horaRelativa(new Date(2026, 10, 5, 18, 40).toISOString(), hoy)).toBe('5 nov, 18:40');
    expect(horaRelativa(null, hoy)).toBe('');
  });

  it('porcentaje de progreso', () => {
    expect(porcentaje(3, 6)).toBe(50);
    expect(porcentaje(6, 7)).toBe(86);
    expect(porcentaje(0, 0)).toBe(0);
  });

  it('cada módulo del catálogo tiene su patrón; los personalizados no', () => {
    expect(patronDeModulo('Intención Comunicativa')).toBe('intencion-comunicativa');
    expect(patronDeModulo('El Reloj de la Calma')).toBe('reloj-de-la-calma');
    expect(patronDeModulo('El Espejo')).toBe('el-espejo');
    expect(patronDeModulo('Manos a la Obra')).toBe('manos-a-la-obra');
    expect(patronDeModulo('Mis Primeras Palabras')).toBe('mis-primeras-palabras');
    expect(patronDeModulo('Juego de bloques')).toBeNull();
  });
});
