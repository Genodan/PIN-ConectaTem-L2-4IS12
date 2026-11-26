import {
  Mensaje,
  enviarMensaje,
  obtenerConversacionesDeLaFamilia,
  obtenerConversacionesDeLaTerapeuta,
  obtenerMensajes,
  suscribirseAMensajes,
  unirMensajes,
} from '../src/services/mensajesService';
import { supabase } from '../src/utils/supabase';

// UT 1095 · Servicio de mensajes. Supabase simulado: no se tocan datos reales.
jest.mock('../src/utils/supabase', () => ({
  supabase: { from: jest.fn(), channel: jest.fn(), removeChannel: jest.fn() },
}));

const from = supabase.from as jest.Mock;
const channel = supabase.channel as jest.Mock;
const removeChannel = supabase.removeChannel as jest.Mock;

const mensaje = (id: string, fecha: string, extra: Partial<Mensaje> = {}): Mensaje => ({
  id,
  terapeuta_id: 'terapeuta-1',
  paciente_id: 'paciente-1',
  enviado_por: 'paciente',
  texto: `Mensaje ${id}`,
  fecha_envio: fecha,
  leido: false,
  ...extra,
});

beforeEach(() => {
  jest.clearAllMocks();
  from.mockReset();
});

describe('Mensajes (UT 1095) - enviar', () => {
  const simularInsert = () => {
    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mensaje('nuevo', '2026-11-26T10:00:00Z'), error: null }),
      }),
    });
    from.mockReturnValue({ insert: mockInsert });
    return mockInsert;
  };

  it('guarda el mensaje de la familia sin espacios sobrantes, como no leído', async () => {
    const mockInsert = simularInsert();

    await enviarMensaje({ pacienteId: 'paciente-1', terapeutaId: 'terapeuta-1', autor: 'paciente', texto: '  ¿Podemos hacerlo por la tarde?  ' });

    expect(from).toHaveBeenCalledWith('mensajes');
    expect(mockInsert).toHaveBeenCalledWith({
      paciente_id: 'paciente-1',
      terapeuta_id: 'terapeuta-1',
      enviado_por: 'paciente',
      texto: '¿Podemos hacerlo por la tarde?',
      fecha_envio: expect.any(String),
      leido: false,
    });
  });

  it('no envía mensajes vacíos ni solo con espacios', async () => {
    const mockInsert = simularInsert();

    await expect(
      enviarMensaje({ pacienteId: 'paciente-1', terapeutaId: 'terapeuta-1', autor: 'terapeuta', texto: '   \n ' }),
    ).rejects.toThrow('Escribe un mensaje antes de enviarlo.');
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe('Mensajes (UT 1095) - leer y tiempo real', () => {
  it('carga la conversación de un paciente con una terapeuta, del más antiguo al más reciente', async () => {
    const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
    const eqTerapeuta = jest.fn().mockReturnValue({ order: mockOrder });
    const eqPaciente = jest.fn().mockReturnValue({ eq: eqTerapeuta });
    from.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: eqPaciente }) });

    await obtenerMensajes('paciente-1', 'terapeuta-1');

    expect(eqPaciente).toHaveBeenCalledWith('paciente_id', 'paciente-1');
    expect(eqTerapeuta).toHaveBeenCalledWith('terapeuta_id', 'terapeuta-1');
    expect(mockOrder).toHaveBeenCalledWith('fecha_envio', { ascending: true });
  });

  it('en tiempo real solo avisa de los mensajes de esa conversación, y deja de escuchar al salir', () => {
    let alCambio: (cambio: { new: Mensaje }) => void = () => undefined;
    interface CanalSimulado {
      on: jest.Mock;
      subscribe: jest.Mock;
    }
    const canal: CanalSimulado = { on: jest.fn(), subscribe: jest.fn() };
    canal.on.mockImplementation((_tipo: string, _filtro: unknown, callback: (cambio: { new: Mensaje }) => void) => {
      alCambio = callback;
      return canal;
    });
    canal.subscribe.mockReturnValue(canal);
    channel.mockReturnValue(canal);
    const recibidos: Mensaje[] = [];

    const dejarDeEscuchar = suscribirseAMensajes('paciente-1', 'terapeuta-1', (m) => recibidos.push(m));
    alCambio({ new: mensaje('a', '2026-11-26T10:00:00Z') });
    alCambio({ new: mensaje('b', '2026-11-26T10:01:00Z', { terapeuta_id: 'otra-terapeuta' }) });
    dejarDeEscuchar();

    expect(canal.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'mensajes', filter: 'paciente_id=eq.paciente-1' },
      expect.any(Function),
    );
    expect(recibidos.map((m) => m.id)).toEqual(['a']);
    expect(removeChannel).toHaveBeenCalledWith(canal);
  });

  it('une mensajes sin repetir el propio (llega al enviarlo y por tiempo real) y los ordena por fecha', () => {
    const resultado = unirMensajes(
      [mensaje('b', '2026-11-26T10:05:00Z'), mensaje('a', '2026-11-26T10:00:00Z')],
      [mensaje('b', '2026-11-26T10:05:00Z'), mensaje('c', '2026-11-26T10:02:00Z')],
    );

    expect(resultado.map((m) => m.id)).toEqual(['a', 'c', 'b']);
  });
});

describe('Mensajes (UT 1095) - conversaciones', () => {
  it('la familia escribe a su terapeuta actual; las terapeutas anteriores quedan aparte', async () => {
    const pacientes = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { terapeuta_asignado_id: 'actual' }, error: null }),
        }),
      }),
    };
    const mensajes = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [{ terapeuta_id: 'anterior' }, { terapeuta_id: 'actual' }, { terapeuta_id: 'anterior' }],
          error: null,
        }),
      }),
    };
    const terapeutas = {
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({
          data: [
            { id: 'actual', nombre: 'Terapeuta actual' },
            { id: 'anterior', nombre: 'Terapeuta anterior' },
          ],
          error: null,
        }),
      }),
    };
    from.mockImplementation((tabla: string) => ({ pacientes, mensajes, terapeutas })[tabla]);

    const resultado = await obtenerConversacionesDeLaFamilia('paciente-1');

    expect(resultado).toEqual({
      actual: { terapeutaId: 'actual', nombre: 'Terapeuta actual' },
      anteriores: [{ terapeutaId: 'anterior', nombre: 'Terapeuta anterior' }],
    });
  });

  it('la terapeuta ve una conversación por paciente, con su último mensaje, las más recientes primero', async () => {
    const pacientes = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [
              { id: 'p1', nombre_nino: 'Niño 1', nombre_familia: 'Familia 1' },
              { id: 'p2', nombre_nino: 'Niño 2', nombre_familia: 'Familia 2' },
              { id: 'p3', nombre_nino: 'Niño 3', nombre_familia: 'Familia 3' },
            ],
            error: null,
          }),
        }),
      }),
    };
    const mensajes = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [
              mensaje('m3', '2026-11-26T12:00:00Z', { paciente_id: 'p2' }),
              mensaje('m2', '2026-11-26T11:00:00Z', { paciente_id: 'p1' }),
              mensaje('m1', '2026-11-26T09:00:00Z', { paciente_id: 'p2' }),
            ],
            error: null,
          }),
        }),
      }),
    };
    from.mockImplementation((tabla: string) => ({ pacientes, mensajes })[tabla]);

    const resultado = await obtenerConversacionesDeLaTerapeuta('terapeuta-1');

    expect(resultado.map((c) => [c.pacienteId, c.ultimoMensaje?.id ?? null])).toEqual([
      ['p2', 'm3'],
      ['p1', 'm2'],
      ['p3', null],
    ]);
  });
});
