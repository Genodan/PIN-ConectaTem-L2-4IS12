import {
  crearModulo,
  actualizarModulo,
  obtenerModulosPropiosDeTerapeuta,
  subirVideoGuia,
  BUCKET_VIDEOS_GUIA,
} from '../src/services/modulosService';
import { supabase } from '../src/utils/supabase';

jest.mock('../src/utils/supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
}));

const from = supabase.from as jest.Mock;
const storageFrom = supabase.storage.from as jest.Mock;

describe('modulosService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('crearModulo', () => {
    it('crea un módulo personalizado correctamente', async () => {
      const nuevoModulo = {
        id: 'mod-custom-1',
        titulo: 'Juego de bloques',
        objetivo: 'Fomentar la imitación',
        ideas_materiales: ['Bloques', 'Caja'],
        video_guia_url: 'guia_123.mp4',
        terapeuta_id: 'ter-elena',
      };

      const mockSingle = jest.fn().mockResolvedValue({ data: nuevoModulo, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
      from.mockReturnValue({ insert: mockInsert });

      const res = await crearModulo({
        titulo: 'Juego de bloques',
        objetivo: 'Fomentar la imitación',
        ideas_materiales: ['Bloques', 'Caja'],
        video_guia_url: 'guia_123.mp4',
        terapeuta_id: 'ter-elena',
      });

      expect(from).toHaveBeenCalledWith('modulos');
      expect(mockInsert).toHaveBeenCalledWith({
        titulo: 'Juego de bloques',
        objetivo: 'Fomentar la imitación',
        ideas_materiales: ['Bloques', 'Caja'],
        video_guia_url: 'guia_123.mp4',
        terapeuta_id: 'ter-elena',
      });
      expect(res).toEqual(nuevoModulo);
    });

    it('falla si el título o el objetivo están vacíos', async () => {
      await expect(
        crearModulo({
          titulo: '   ',
          objetivo: 'Objetivo',
          terapeuta_id: 'ter-1',
        }),
      ).rejects.toThrow('El título del módulo es obligatorio.');

      await expect(
        crearModulo({
          titulo: 'Título',
          objetivo: '',
          terapeuta_id: 'ter-1',
        }),
      ).rejects.toThrow('El objetivo del módulo es obligatorio.');
    });

    it('falla si la base de datos devuelve error', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'violación de clave única' },
      });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      from.mockReturnValue({ insert: jest.fn().mockReturnValue({ select: mockSelect }) });

      await expect(
        crearModulo({
          titulo: 'Módulo duplicado',
          objetivo: 'Objetivo',
          terapeuta_id: 'ter-1',
        }),
      ).rejects.toThrow('Error al crear el módulo: violación de clave única');
    });
  });

  describe('actualizarModulo', () => {
    it('actualiza los datos de un módulo existente perteneciente al terapeuta', async () => {
      const moduloActualizado = {
        id: 'mod-custom-1',
        titulo: 'Juego de bloques v2',
        objetivo: 'Fomentar la imitación y turnos',
        ideas_materiales: ['Bloques'],
        video_guia_url: null,
        terapeuta_id: 'ter-elena',
      };

      const mockSingle = jest.fn().mockResolvedValue({ data: moduloActualizado, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEqTerapeuta = jest.fn().mockReturnValue({ select: mockSelect });
      const mockEqId = jest.fn().mockReturnValue({ eq: mockEqTerapeuta });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEqId });
      from.mockReturnValue({ update: mockUpdate });

      const res = await actualizarModulo('mod-custom-1', 'ter-elena', {
        titulo: 'Juego de bloques v2',
        objetivo: 'Fomentar la imitación y turnos',
        ideas_materiales: ['Bloques'],
      });

      expect(from).toHaveBeenCalledWith('modulos');
      expect(mockUpdate).toHaveBeenCalledWith({
        titulo: 'Juego de bloques v2',
        objetivo: 'Fomentar la imitación y turnos',
        ideas_materiales: ['Bloques'],
      });
      expect(mockEqId).toHaveBeenCalledWith('id', 'mod-custom-1');
      expect(mockEqTerapeuta).toHaveBeenCalledWith('terapeuta_id', 'ter-elena');
      expect(res).toEqual(moduloActualizado);
    });

    it('falla si se intenta poner un título vacío al actualizar', async () => {
      await expect(
        actualizarModulo('mod-1', 'ter-1', {
          titulo: '   ',
        }),
      ).rejects.toThrow('El título del módulo no puede estar vacío.');
    });

    it('falla si el módulo no existe o no pertenece al terapeuta', async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEqTerapeuta = jest.fn().mockReturnValue({ select: mockSelect });
      const mockEqId = jest.fn().mockReturnValue({ eq: mockEqTerapeuta });
      from.mockReturnValue({ update: jest.fn().mockReturnValue({ eq: mockEqId }) });

      await expect(
        actualizarModulo('mod-ajeno', 'ter-elena', {
          titulo: 'Intentar editar',
        }),
      ).rejects.toThrow('No se encontró el módulo o no tienes permiso para editarlo.');
    });
  });

  describe('obtenerModulosPropiosDeTerapeuta', () => {
    it('obtiene los módulos creados por el terapeuta actual', async () => {
      const modulos = [
        { id: 'm-1', titulo: 'Módulo A', terapeuta_id: 'ter-1' },
        { id: 'm-2', titulo: 'Módulo B', terapeuta_id: 'ter-1' },
      ];

      const mockOrder = jest.fn().mockResolvedValue({ data: modulos, error: null });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      from.mockReturnValue({ select: mockSelect });

      const res = await obtenerModulosPropiosDeTerapeuta('ter-1');

      expect(from).toHaveBeenCalledWith('modulos');
      expect(mockEq).toHaveBeenCalledWith('terapeuta_id', 'ter-1');
      expect(mockOrder).toHaveBeenCalledWith('titulo');
      expect(res).toEqual(modulos);
    });
  });

  describe('subirVideoGuia', () => {
    it('sube el archivo al bucket "videos guia"', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(new Blob(['video-mock'], { type: 'video/mp4' })),
      } as any);

      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: 'guia_123_video.mp4' },
        error: null,
      });
      storageFrom.mockReturnValue({ upload: mockUpload });

      const path = await subirVideoGuia('file:///cache/video.mp4', 'video.mp4');

      expect(storageFrom).toHaveBeenCalledWith(BUCKET_VIDEOS_GUIA);
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^guia_\d+_video\.mp4$/),
        expect.any(Blob),
        { contentType: 'video/mp4', upsert: true },
      );
      expect(path).toBe('guia_123_video.mp4');
    });

    it('lanza error si la subida a Storage falla', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(new Blob(['video-mock'], { type: 'video/mp4' })),
      } as any);

      const mockUpload = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Bucket no encontrado' },
      });
      storageFrom.mockReturnValue({ upload: mockUpload });

      await expect(subirVideoGuia('file:///cache/video.mp4')).rejects.toThrow(
        'Fallo al subir el vídeo guía: Bucket no encontrado',
      );
    });
  });
});
