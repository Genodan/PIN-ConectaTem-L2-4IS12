import {
  normalizarTexto,
  obtenerPracticasConFeedbackFamilia,
  coincideConPalabra,
  filtrarPorPalabra,
  obtenerModulosDeFeedbacks,
  filtrarPorModulos,
  parsearFecha,
  filtrarPorPeriodoFecha,
} from '../src/services/busquedaFeedbackService';
import { PracticaFamilia } from '../src/services/panelFamiliaService';

describe('busquedaFeedbackService', () => {
  const practicasMock: PracticaFamilia[] = [
    {
      id: 'p-1',
      estado: 'evaluada',
      fecha_asignacion: '2026-10-10T10:00:00Z',
      fecha_envio: '2026-10-12T10:00:00Z',
      modulos: {
        id: 'mod-1',
        titulo: 'Pedir más',
        objetivo: 'Aprender a pedir más pompas',
        video_guia_url: null,
        ideas_materiales: null,
      },
      feedback: {
        id: 'fb-1',
        transcripcion: 'Marta lo ha hecho genial con el pompero.',
        resumen_estructurado: {
          punto_fuerte: 'Contacto visual mantenido.',
          a_mejorar: 'Sin indicaciones',
          foco_semana: 'Esperar dos segundos antes de soplar.',
        },
        resumen_aprobado: true,
        resumen_escrito: null,
        fecha_evaluacion: '2026-10-15T12:00:00Z',
        enviado_en: '2026-10-15T12:05:00Z',
        insignia: '⭐ Gran esfuerzo',
      },
    },
    {
      id: 'p-2',
      estado: 'evaluada',
      fecha_asignacion: '2026-10-18T10:00:00Z',
      fecha_envio: '2026-10-20T10:00:00Z',
      modulos: {
        id: 'mod-2',
        titulo: 'El Espejo',
        objetivo: 'Imitar gestos faciales',
        video_guia_url: null,
        ideas_materiales: null,
      },
      feedback: {
        id: 'fb-2',
        transcripcion: 'Hugo imitó sacar la lengua frente al espejo.',
        resumen_estructurado: null,
        resumen_aprobado: false,
        resumen_escrito: 'Muy buena imitación frente al espejo; probar con sonreír.',
        fecha_evaluacion: '2026-10-25T15:00:00Z',
        enviado_en: '2026-10-25T15:00:00Z',
        insignia: null,
      },
    },
    {
      id: 'p-3',
      estado: 'pendientes',
      fecha_asignacion: '2026-10-28T10:00:00Z',
      fecha_envio: null,
      modulos: {
        id: 'mod-1',
        titulo: 'Pedir más',
        objetivo: 'Aprender a pedir más pompas',
        video_guia_url: null,
        ideas_materiales: null,
      },
      feedback: null,
    },
    {
      id: 'p-4',
      estado: 'completada',
      fecha_asignacion: '2026-10-29T10:00:00Z',
      fecha_envio: '2026-10-30T10:00:00Z',
      modulos: {
        id: 'mod-3',
        titulo: 'Intención Comunicativa',
        objetivo: 'Señalar objetos deseados',
        video_guia_url: null,
        ideas_materiales: null,
      },
      feedback: null,
    },
  ];

  describe('normalizarTexto', () => {
    it('elimina acentos y convierte a minúsculas', () => {
      expect(normalizarTexto('Atención Temprana')).toBe('atencion temprana');
      expect(normalizarTexto('MÓDULO')).toBe('modulo');
      expect(normalizarTexto(null)).toBe('');
    });
  });

  describe('obtenerPracticasConFeedbackFamilia', () => {
    it('devuelve solo las prácticas evaluadas con feedback', () => {
      const res = obtenerPracticasConFeedbackFamilia(practicasMock);
      expect(res.map((p) => p.id)).toEqual(['p-1', 'p-2']);
    });
  });

  describe('filtrarPorPalabra', () => {
    it('devuelve todas las evaluadas si la palabra está vacía', () => {
      const res = filtrarPorPalabra(practicasMock, '');
      expect(res).toHaveLength(2);
    });

    it('encuentra coincidencia por nombre de módulo (insensible a acentos)', () => {
      const res = filtrarPorPalabra(practicasMock, 'espejo');
      expect(res.map((p) => p.id)).toEqual(['p-2']);

      const res2 = filtrarPorPalabra(practicasMock, 'pedir mas');
      expect(res2.map((p) => p.id)).toEqual(['p-1']);
    });

    it('encuentra coincidencia en la transcripción', () => {
      const res = filtrarPorPalabra(practicasMock, 'pompero');
      expect(res.map((p) => p.id)).toEqual(['p-1']);

      const res2 = filtrarPorPalabra(practicasMock, 'lengua');
      expect(res2.map((p) => p.id)).toEqual(['p-2']);
    });

    it('encuentra coincidencia en el resumen estructurado de la IA', () => {
      const res1 = filtrarPorPalabra(practicasMock, 'contacto visual');
      expect(res1.map((p) => p.id)).toEqual(['p-1']);

      const res2 = filtrarPorPalabra(practicasMock, 'dos segundos');
      expect(res2.map((p) => p.id)).toEqual(['p-1']);
    });

    it('encuentra coincidencia en el resumen escrito', () => {
      const res = filtrarPorPalabra(practicasMock, 'sonreir');
      expect(res.map((p) => p.id)).toEqual(['p-2']);
    });

    it('devuelve array vacío si ninguna coincide', () => {
      const res = filtrarPorPalabra(practicasMock, 'palabraInexistente123');
      expect(res).toHaveLength(0);
    });
  });

  describe('obtenerModulosDeFeedbacks y filtrarPorModulos', () => {
    it('extrae los módulos únicos de las prácticas evaluadas', () => {
      const modulos = obtenerModulosDeFeedbacks(practicasMock);
      expect(modulos).toEqual([
        { id: 'mod-2', titulo: 'El Espejo', cantidad: 1 },
        { id: 'mod-1', titulo: 'Pedir más', cantidad: 1 },
      ]);
    });

    it('filtra correctamente por checkboxes seleccionados', () => {
      const resMod1 = filtrarPorModulos(practicasMock, ['mod-1']);
      expect(resMod1.map((p) => p.id)).toEqual(['p-1']);

      const resMod2 = filtrarPorModulos(practicasMock, ['mod-2']);
      expect(resMod2.map((p) => p.id)).toEqual(['p-2']);

      const resAmbos = filtrarPorModulos(practicasMock, ['mod-1', 'mod-2']);
      expect(resAmbos.map((p) => p.id)).toEqual(['p-1', 'p-2']);

      const resNinguno = filtrarPorModulos(practicasMock, []);
      expect(resNinguno).toHaveLength(0);
    });
  });

  describe('parsearFecha y filtrarPorPeriodoFecha', () => {
    it('parsea correctamente fechas en varios formatos', () => {
      const fecha = parsearFecha('2026-10-15');
      expect(fecha?.getFullYear()).toBe(2026);
      expect(fecha?.getMonth()).toBe(9); // Octubre (base 0)
      expect(fecha?.getDate()).toBe(15);
      expect(parsearFecha('15/10/2026')?.getDate()).toBe(15);
      expect(parsearFecha('invalida')).toBeNull();
      expect(parsearFecha('')).toBeNull();
    });

    it('filtra feedbacks evaluados dentro del rango de fechas', () => {
      // p-1 evaluada el 15/10/2026, p-2 evaluada el 25/10/2026
      const resRangoP1 = filtrarPorPeriodoFecha(practicasMock, '2026-10-10', '2026-10-16');
      expect(resRangoP1.map((p) => p.id)).toEqual(['p-1']);

      const resRangoP2 = filtrarPorPeriodoFecha(practicasMock, '2026-10-20', '2026-10-30');
      expect(resRangoP2.map((p) => p.id)).toEqual(['p-2']);

      const resRangoAmbos = filtrarPorPeriodoFecha(practicasMock, '2026-10-01', '2026-10-31');
      expect(resRangoAmbos.map((p) => p.id)).toEqual(['p-1', 'p-2']);

      const resFuera = filtrarPorPeriodoFecha(practicasMock, '2026-11-01', '2026-11-30');
      expect(resFuera).toHaveLength(0);
    });

    it('permite filtrar solo con fecha de inicio o solo con fecha de fin', () => {
      const desdeEl20 = filtrarPorPeriodoFecha(practicasMock, '2026-10-20', '');
      expect(desdeEl20.map((p) => p.id)).toEqual(['p-2']);

      const hastaEl20 = filtrarPorPeriodoFecha(practicasMock, '', '2026-10-20');
      expect(hastaEl20.map((p) => p.id)).toEqual(['p-1']);
    });
  });
});
