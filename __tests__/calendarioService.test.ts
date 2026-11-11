import {
  aTextoISO,
  diaDeshabilitado,
  diasEnMes,
  formatearFecha,
  inicioDelDia,
  mismoDia,
  semanasDelMes,
  textoLargoDeFecha,
} from '../src/services/calendarioService';

// UT 1585 · Elegir las fechas del periodo con un calendario: la lógica del calendario, sin pantalla.
describe('calendarioService', () => {
  describe('semanasDelMes', () => {
    it('febrero de 2026 tiene los días del 1 al 28 y ninguno más (no hay 29, 30 ni 31)', () => {
      const dias = semanasDelMes(2026, 1)
        .flat()
        .filter((d): d is number => d !== null);
      expect(dias).toEqual(Array.from({ length: 28 }, (_, i) => i + 1));
    });

    it('febrero de 2028 es bisiesto: tiene 29 días', () => {
      expect(diasEnMes(2028, 1)).toBe(29);
      expect(semanasDelMes(2028, 1).flat()).toContain(29);
    });

    it('la semana empieza en lunes: el 1 de noviembre de 2026 (domingo) cae en la última columna', () => {
      const [primera] = semanasDelMes(2026, 10);
      expect(primera).toEqual([null, null, null, null, null, null, 1]);
    });

    it('todas las semanas tienen 7 celdas', () => {
      for (let mes = 0; mes < 12; mes++) {
        for (const semana of semanasDelMes(2026, mes)) expect(semana).toHaveLength(7);
      }
    });
  });

  describe('formatos', () => {
    it('formatea dd/mm/aaaa con ceros a la izquierda', () => {
      expect(formatearFecha(new Date(2026, 8, 5))).toBe('05/09/2026');
      expect(formatearFecha(new Date(2026, 10, 3))).toBe('03/11/2026');
    });

    it('convierte a aaaa-mm-dd, el formato del filtro', () => {
      expect(aTextoISO(new Date(2026, 8, 5))).toBe('2026-09-05');
    });

    it('escribe la fecha larga para los lectores de pantalla', () => {
      expect(textoLargoDeFecha(new Date(2026, 10, 3))).toBe('3 de noviembre de 2026');
    });
  });

  describe('diaDeshabilitado', () => {
    const min = new Date(2026, 9, 20);
    const max = new Date(2026, 10, 11);

    it('los días dentro del rango se pueden elegir, y los extremos también', () => {
      expect(diaDeshabilitado(new Date(2026, 9, 20), min, max)).toBe(false);
      expect(diaDeshabilitado(new Date(2026, 10, 1), min, max)).toBe(false);
      expect(diaDeshabilitado(new Date(2026, 10, 11), min, max)).toBe(false);
    });

    it('un día antes de min o después de max no se puede elegir', () => {
      expect(diaDeshabilitado(new Date(2026, 9, 19), min, max)).toBe(true);
      expect(diaDeshabilitado(new Date(2026, 10, 12), min, max)).toBe(true);
    });

    it('la hora no cuenta: el mismo día a las 23:59 sigue valiendo', () => {
      expect(diaDeshabilitado(new Date(2026, 10, 11, 23, 59), min, max)).toBe(false);
    });

    it('sin límites, todo vale', () => {
      expect(diaDeshabilitado(new Date(2030, 0, 1), null, null)).toBe(false);
    });
  });

  it('inicioDelDia y mismoDia ignoran la hora', () => {
    const tarde = new Date(2026, 10, 3, 18, 30);
    expect(inicioDelDia(tarde).getHours()).toBe(0);
    expect(mismoDia(tarde, new Date(2026, 10, 3, 8, 0))).toBe(true);
    expect(mismoDia(tarde, new Date(2026, 10, 4))).toBe(false);
    expect(mismoDia(tarde, null)).toBe(false);
  });
});
