import {
  TABLA_MODULO_PACIENTE,
  asignarModuloAPaciente,
  desasignarModuloDePaciente,
  obtenerModulosAsignadosAPaciente,
  obtenerModulosParaPaciente,
} from '../src/services/modulosPacienteService';
import * as practicasService from '../src/services/practicasService';
import { supabase } from '../src/utils/supabase';

jest.mock('../src/utils/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../src/services/practicasService', () => ({
  obtenerModulos: jest.fn(),
}));

const from = supabase.from as jest.Mock;
const mockObtenerModulos = practicasService.obtenerModulos as jest.Mock;

describe('modulosPacienteService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('obtenerModulosAsignadosAPaciente', () => {
    it('obtiene los IDs de los módulos asignados a un paciente', async () => {
      const mockEq = jest.fn().mockResolvedValue({
        data: [{ modulo_id: 'mod-1' }, { modulo_id: 'mod-3' }],
        error: null,
      });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      from.mockReturnValue({ select: mockSelect });

      const resultado = await obtenerModulosAsignadosAPaciente('pac-hugo');

      expect(from).toHaveBeenCalledWith(TABLA_MODULO_PACIENTE);
      expect(mockSelect).toHaveBeenCalledWith('modulo_id');
      expect(mockEq).toHaveBeenCalledWith('paciente_id', 'pac-hugo');
      expect(resultado).toEqual(['mod-1', 'mod-3']);
    });

    it('devuelve array vacío si el paciente no tiene asignaciones', async () => {
      const mockEq = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      from.mockReturnValue({ select: mockSelect });

      const resultado = await obtenerModulosAsignadosAPaciente('pac-lucas');

      expect(resultado).toEqual([]);
    });

    it('lanza error si la consulta a Supabase falla', async () => {
      const mockEq = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Fallo de red' },
      });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      from.mockReturnValue({ select: mockSelect });

      await expect(obtenerModulosAsignadosAPaciente('pac-hugo')).rejects.toThrow(
        'Error al obtener los módulos del paciente: Fallo de red',
      );
    });
  });

  describe('asignarModuloAPaciente', () => {
    it('inserta una nueva fila en modulo_paciente', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      from.mockReturnValue({ insert: mockInsert });

      await asignarModuloAPaciente('pac-hugo', 'mod-2');

      expect(from).toHaveBeenCalledWith(TABLA_MODULO_PACIENTE);
      expect(mockInsert).toHaveBeenCalledWith({
        paciente_id: 'pac-hugo',
        modulo_id: 'mod-2',
      });
    });

    it('no falla si el módulo ya estaba asignado (código 23505 duplicado)', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        error: { code: '23505', message: 'Clave primaria duplicada' },
      });
      from.mockReturnValue({ insert: mockInsert });

      await expect(asignarModuloAPaciente('pac-hugo', 'mod-2')).resolves.not.toThrow();
    });

    it('lanza error si ocurre un fallo diferente al insertar', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        error: { code: '42P01', message: 'Error de inserción' },
      });
      from.mockReturnValue({ insert: mockInsert });

      await expect(asignarModuloAPaciente('pac-hugo', 'mod-2')).rejects.toThrow(
        'Error al asignar el módulo al paciente: Error de inserción',
      );
    });
  });

  describe('desasignarModuloDePaciente', () => {
    it('elimina la fila correspondiente en modulo_paciente', async () => {
      const mockEqModulo = jest.fn().mockResolvedValue({ error: null });
      const mockEqPaciente = jest.fn().mockReturnValue({ eq: mockEqModulo });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEqPaciente });
      from.mockReturnValue({ delete: mockDelete });

      await desasignarModuloDePaciente('pac-hugo', 'mod-2');

      expect(from).toHaveBeenCalledWith(TABLA_MODULO_PACIENTE);
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEqPaciente).toHaveBeenCalledWith('paciente_id', 'pac-hugo');
      expect(mockEqModulo).toHaveBeenCalledWith('modulo_id', 'mod-2');
    });

    it('lanza error si falla la eliminación', async () => {
      const mockEqModulo = jest.fn().mockResolvedValue({
        error: { message: 'Fallo al borrar' },
      });
      const mockEqPaciente = jest.fn().mockReturnValue({ eq: mockEqModulo });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEqPaciente });
      from.mockReturnValue({ delete: mockDelete });

      await expect(desasignarModuloDePaciente('pac-hugo', 'mod-2')).rejects.toThrow(
        'Error al desasignar el módulo del paciente: Fallo al borrar',
      );
    });
  });

  describe('obtenerModulosParaPaciente', () => {
    const modulosTerapeuta = [
      { id: 'mod-1', titulo: 'Intención Comunicativa', objetivo: 'Pedir', video_guia_url: null, terapeuta_id: null },
      { id: 'mod-2', titulo: 'Atención Conjunta', objetivo: 'Mirar', video_guia_url: null, terapeuta_id: null },
      { id: 'mod-custom-elena', titulo: 'Bloques de Elena', objetivo: 'Construir', video_guia_url: null, terapeuta_id: 'ter-elena' },
    ];

    it('si el paciente tiene módulos asignados, solo devuelve esos módulos', async () => {
      mockObtenerModulos.mockResolvedValue(modulosTerapeuta);

      const mockEq = jest.fn().mockResolvedValue({
        data: [{ modulo_id: 'mod-2' }, { modulo_id: 'mod-custom-elena' }],
        error: null,
      });
      from.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: mockEq }) });

      const modulos = await obtenerModulosParaPaciente('pac-hugo', 'ter-elena');

      expect(mockObtenerModulos).toHaveBeenCalledWith('ter-elena');
      expect(modulos).toHaveLength(2);
      expect(modulos.map((m) => m.id)).toEqual(['mod-2', 'mod-custom-elena']);
    });

    it('si el paciente no tiene módulos asignados, devuelve TODOS los módulos disponibles para el terapeuta', async () => {
      mockObtenerModulos.mockResolvedValue(modulosTerapeuta);

      const mockEq = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      from.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: mockEq }) });

      const modulos = await obtenerModulosParaPaciente('pac-nuevo', 'ter-elena');

      expect(modulos).toHaveLength(3);
      expect(modulos).toEqual(modulosTerapeuta);
    });

    it('si se le desasignan todos los módulos, vuelve a devolver todos los módulos disponibles', async () => {
      mockObtenerModulos.mockResolvedValue(modulosTerapeuta);

      const mockEq = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      from.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: mockEq }) });

      const modulos = await obtenerModulosParaPaciente('pac-hugo', 'ter-elena');

      expect(modulos).toEqual(modulosTerapeuta);
    });
  });
});
