import { LIMITE_NOMBRE_PACIENTE, MENSAJE_PACIENTE_EXISTENTE, crearPaciente } from '../src/services/pacientesService';
import { supabase } from '../src/utils/supabase';

// UT 1354 · alta de un paciente por la terapeuta (sin tocar la base de datos real)
jest.mock('../src/utils/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const from = supabase.from as jest.Mock;

// Las dos consultas del servicio: select(...) para ver todos los pacientes que ya existen, e insert(...).select().single()
const simular = ({
  existentes = [] as { nombre_nino: string; nombre_familia: string; terapeuta_asignado_id?: string | null }[],
  errorLeer = null as { message: string } | null,
  filaCreada = { id: 'pac-nuevo', nombre_nino: 'X', nombre_familia: 'Y', terapeuta_asignado_id: 'ter-1' } as unknown,
  errorInsertar = null as { message: string } | null,
} = {}) => {
  const single = jest.fn().mockResolvedValue({ data: filaCreada, error: errorInsertar });
  const selectDespuesDeInsertar = jest.fn().mockReturnValue({ single });
  const insert = jest.fn().mockReturnValue({ select: selectDespuesDeInsertar });
  const select = jest.fn().mockResolvedValue({ data: existentes, error: errorLeer });
  from.mockReturnValue({ select, insert });
  return { insert, select };
};

describe('crearPaciente (UT 1354)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('crea el paciente asignado a la terapeuta que lo da de alta y devuelve la fila creada', async () => {
    const fila = {
      id: 'pac-1',
      nombre_nino: 'Paciente de prueba 1',
      nombre_familia: 'Familia de prueba 1',
      terapeuta_asignado_id: 'ter-1',
    };
    const { insert } = simular({ filaCreada: fila });

    const creado = await crearPaciente({
      nombreNino: 'Paciente de prueba 1',
      nombreFamilia: 'Familia de prueba 1',
      terapeutaId: 'ter-1',
    });

    expect(from).toHaveBeenCalledWith('pacientes');
    expect(insert).toHaveBeenCalledWith({
      nombre_nino: 'Paciente de prueba 1',
      nombre_familia: 'Familia de prueba 1',
      terapeuta_asignado_id: 'ter-1',
    });
    expect(creado).toEqual(fila);
  });

  it('quita los espacios al principio y al final, y admite tildes y eñes', async () => {
    const { insert } = simular();

    await crearPaciente({
      nombreNino: '  Paciente de prueba ñandú  ',
      nombreFamilia: ' Familia de prueba ñ ',
      terapeutaId: 'ter-1',
    });

    expect(insert).toHaveBeenCalledWith({
      nombre_nino: 'Paciente de prueba ñandú',
      nombre_familia: 'Familia de prueba ñ',
      terapeuta_asignado_id: 'ter-1',
    });
  });

  describe('datos obligatorios', () => {
    it.each([
      ['el nombre del paciente está vacío', '', 'Familia de prueba', 'El nombre del paciente es obligatorio.'],
      ['el nombre del paciente son solo espacios', '   ', 'Familia de prueba', 'El nombre del paciente es obligatorio.'],
      ['el nombre de la familia está vacío', 'Paciente de prueba', '', 'El nombre de la familia es obligatorio.'],
      ['el nombre de la familia son solo espacios', 'Paciente de prueba', '   ', 'El nombre de la familia es obligatorio.'],
      ['faltan los dos (se avisa del paciente primero)', '', '', 'El nombre del paciente es obligatorio.'],
    ])('falla si %s y no toca la base de datos', async (_caso, nombreNino, nombreFamilia, mensaje) => {
      const { insert } = simular();

      await expect(crearPaciente({ nombreNino, nombreFamilia, terapeutaId: 'ter-1' })).rejects.toThrow(mensaje);

      expect(from).not.toHaveBeenCalled();
      expect(insert).not.toHaveBeenCalled();
    });

    it('falla si no se sabe qué terapeuta lo da de alta', async () => {
      simular();
      await expect(
        crearPaciente({ nombreNino: 'Paciente de prueba', nombreFamilia: 'Familia de prueba', terapeutaId: '' }),
      ).rejects.toThrow('Se requiere la terapeuta que da de alta al paciente.');
      expect(from).not.toHaveBeenCalled();
    });
  });

  describe('límite de caracteres', () => {
    it('admite exactamente 80 caracteres', async () => {
      const { insert } = simular();
      const justo = 'a'.repeat(LIMITE_NOMBRE_PACIENTE);

      await crearPaciente({ nombreNino: justo, nombreFamilia: justo, terapeutaId: 'ter-1' });

      expect(LIMITE_NOMBRE_PACIENTE).toBe(80);
      expect(insert).toHaveBeenCalledTimes(1);
    });

    it('rechaza 81 caracteres en el paciente o en la familia', async () => {
      const { insert } = simular();
      const demasiado = 'a'.repeat(LIMITE_NOMBRE_PACIENTE + 1);

      await expect(
        crearPaciente({ nombreNino: demasiado, nombreFamilia: 'Familia', terapeutaId: 'ter-1' }),
      ).rejects.toThrow('El nombre del paciente no puede tener más de 80 caracteres.');
      await expect(
        crearPaciente({ nombreNino: 'Paciente', nombreFamilia: demasiado, terapeutaId: 'ter-1' }),
      ).rejects.toThrow('El nombre de la familia no puede tener más de 80 caracteres.');
      expect(insert).not.toHaveBeenCalled();
    });

    it('los espacios sobrantes no cuentan para el límite', async () => {
      const { insert } = simular();
      const justo = 'a'.repeat(LIMITE_NOMBRE_PACIENTE);

      await crearPaciente({ nombreNino: `  ${justo}  `, nombreFamilia: 'Familia', terapeutaId: 'ter-1' });

      expect(insert).toHaveBeenCalledTimes(1);
    });
  });

  describe('pacientes repetidos', () => {
    it('mira todos los pacientes, no solo los de esa terapeuta', async () => {
      const { select } = simular();

      await crearPaciente({ nombreNino: 'Paciente', nombreFamilia: 'Familia', terapeutaId: 'ter-7' });

      expect(select).toHaveBeenCalledWith('id, nombre_nino, nombre_familia, terapeuta_asignado_id');
    });

    it('rechaza el mismo nombre y la misma familia en su cartera, sin distinguir mayúsculas ni espacios sobrantes', async () => {
      const { insert } = simular({
        existentes: [
          { nombre_nino: 'Paciente de prueba 1', nombre_familia: 'Familia de prueba 1', terapeuta_asignado_id: 'ter-1' },
        ],
      });

      for (const [nino, familia] of [
        ['Paciente de prueba 1', 'Familia de prueba 1'],
        ['PACIENTE DE PRUEBA 1', 'familia de prueba 1'],
        ['  Paciente   de prueba 1 ', ' Familia de  prueba 1  '],
      ]) {
        await expect(
          crearPaciente({ nombreNino: nino, nombreFamilia: familia, terapeutaId: 'ter-1' }),
        ).rejects.toThrow('Ya tienes un paciente con ese nombre y esa familia.');
      }
      expect(insert).not.toHaveBeenCalled();
    });

    it('rechaza el paciente que ya está en la cartera de otra terapeuta, sin decir de quién es', async () => {
      const { insert } = simular({
        existentes: [
          { nombre_nino: 'Paciente de prueba 1', nombre_familia: 'Familia de prueba 1', terapeuta_asignado_id: 'ter-1' },
        ],
      });

      for (const [nino, familia] of [
        ['Paciente de prueba 1', 'Familia de prueba 1'],
        ['  paciente   DE prueba 1 ', ' familia de  prueba 1  '],
      ]) {
        await expect(
          crearPaciente({ nombreNino: nino, nombreFamilia: familia, terapeutaId: 'ter-2' }),
        ).rejects.toThrow(MENSAJE_PACIENTE_EXISTENTE);
      }
      expect(MENSAJE_PACIENTE_EXISTENTE).not.toContain('ter-1');
      expect(insert).not.toHaveBeenCalled();
    });

    it('rechaza también el paciente que existe sin terapeuta asignada', async () => {
      const { insert } = simular({
        existentes: [{ nombre_nino: 'Paciente de prueba 1', nombre_familia: 'Familia de prueba 1', terapeuta_asignado_id: null }],
      });

      await expect(
        crearPaciente({ nombreNino: 'Paciente de prueba 1', nombreFamilia: 'Familia de prueba 1', terapeutaId: 'ter-2' }),
      ).rejects.toThrow(MENSAJE_PACIENTE_EXISTENTE);
      expect(insert).not.toHaveBeenCalled();
    });

    it('admite el mismo nombre con otra familia, y la misma familia con otro nombre', async () => {
      const { insert } = simular({
        existentes: [
          { nombre_nino: 'Paciente de prueba 1', nombre_familia: 'Familia de prueba 1', terapeuta_asignado_id: 'ter-1' },
        ],
      });

      await crearPaciente({ nombreNino: 'Paciente de prueba 1', nombreFamilia: 'Familia de prueba 2', terapeutaId: 'ter-1' });
      await crearPaciente({ nombreNino: 'Paciente de prueba 2', nombreFamilia: 'Familia de prueba 1', terapeutaId: 'ter-1' });

      expect(insert).toHaveBeenCalledTimes(2);
    });
  });

  describe('fallos de la base de datos', () => {
    it('avisa si no puede comprobar los pacientes que ya tiene', async () => {
      const { insert } = simular({ errorLeer: { message: 'sin conexión' } });

      await expect(
        crearPaciente({ nombreNino: 'Paciente', nombreFamilia: 'Familia', terapeutaId: 'ter-1' }),
      ).rejects.toThrow('Error al comprobar los pacientes: sin conexión');
      expect(insert).not.toHaveBeenCalled();
    });

    it('avisa con el motivo si al guardar la base de datos devuelve un error', async () => {
      simular({ errorInsertar: { message: 'new row violates row-level security policy for table "pacientes"' } });

      await expect(
        crearPaciente({ nombreNino: 'Paciente', nombreFamilia: 'Familia', terapeutaId: 'ter-1' }),
      ).rejects.toThrow('Error al crear el paciente: new row violates row-level security policy for table "pacientes"');
    });

    it('avisa si no devuelve ninguna fila', async () => {
      simular({ filaCreada: null });

      await expect(
        crearPaciente({ nombreNino: 'Paciente', nombreFamilia: 'Familia', terapeutaId: 'ter-1' }),
      ).rejects.toThrow('No se pudo guardar el paciente en la base de datos.');
    });
  });
});
