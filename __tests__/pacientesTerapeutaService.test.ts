import {
  PacienteDelListado,
  actualizarDatosPaciente,
  edadYNacimiento,
  fechaDeFormulario,
  fechaDeNota,
  filtrarPacientes,
  limitesDeLaSemana,
  obtenerArchivados,
  obtenerOtrasTerapeutas,
  textoTraspaso,
  traspasarPaciente,
  obtenerFichaPaciente,
  obtenerListadoPacientes,
  progresoSemanal,
  subtituloDeModulo,
  textoUltimaActividad,
} from '../src/services/pacientesTerapeutaService';
import { supabase } from '../src/utils/supabase';

// Nueva interfaz · pestaña «Pacientes» de la terapeuta: datos y formatos. Supabase simulado; datos inventados.
jest.mock('../src/utils/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }));
const from = supabase.from as jest.Mock;
const rpc = supabase.rpc as jest.Mock;

// Consulta encadenable de Supabase que, al final, devuelve `resultado`
const consulta = (resultado: unknown) => {
  const q: Record<string, jest.Mock> & { then?: unknown } = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'order', 'update']) q[m] = jest.fn(() => q);
  q.single = jest.fn(() => Promise.resolve(resultado));
  q.then = (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => Promise.resolve(resultado).then(ok, ko);
  return q;
};

const hoy = new Date(2026, 10, 27, 12, 0); // viernes 27 de noviembre de 2026
const iso = (d: number, h = 10) => new Date(2026, 10, d, h).toISOString();

beforeEach(() => {
  from.mockReset();
  rpc.mockReset();
});

describe('Pacientes · progreso semanal y última actividad', () => {
  it('la semana va de lunes a lunes', () => {
    const { desde, hasta } = limitesDeLaSemana(hoy);
    expect(desde).toEqual(new Date(2026, 10, 23));
    expect(hasta).toEqual(new Date(2026, 10, 30));
  });

  it('progreso semanal: hechas entre las asignadas esta semana (las de otras semanas no cuentan)', () => {
    const tareas = [
      { estado: 'evaluada', fecha_asignacion: iso(23) },
      { estado: 'completada', fecha_asignacion: iso(25) },
      { estado: 'pendientes', fecha_asignacion: iso(26) },
      { estado: 'pendientes', fecha_asignacion: iso(27) },
      { estado: 'evaluada', fecha_asignacion: iso(16) }, // semana pasada
    ];
    expect(progresoSemanal(tareas, hoy)).toBe(50);
    expect(progresoSemanal([], hoy)).toBe(0);
  });

  it('texto de la última actividad', () => {
    expect(textoUltimaActividad({ tipo: 'tarea', fecha: iso(27, 9) }, hoy)).toBe('Tarea enviada · Hoy');
    expect(textoUltimaActividad({ tipo: 'nota', fecha: iso(26) }, hoy)).toBe('Nota enviada · Hace 1 día');
    expect(textoUltimaActividad({ tipo: 'nota', fecha: iso(24) }, hoy)).toBe('Nota enviada · Hace 3 días');
    expect(textoUltimaActividad({ tipo: 'tarea', fecha: iso(2) }, hoy)).toBe('Tarea enviada · 2 de noviembre');
    expect(textoUltimaActividad(null, hoy)).toBe('Sin actividad todavía');
  });

  it('listado: nombre con el primer apellido, progreso y la actividad más reciente (tarea enviada o nota)', async () => {
    from.mockImplementation((tabla: string) => {
      if (tabla === 'pacientes')
        return consulta({
          data: [
            { id: 'p1', nombre_nino: 'Niño', apellidos: 'Uno Dos', identificador: '11111111' },
            { id: 'p2', nombre_nino: 'Niña', apellidos: null, identificador: '22222222' },
          ],
          error: null,
        });
      if (tabla === 'tareas')
        return consulta({
          data: [
            { paciente_id: 'p1', estado: 'completada', fecha_asignacion: iso(24), fecha_envio: iso(25) },
            { paciente_id: 'p1', estado: 'pendientes', fecha_asignacion: iso(24), fecha_envio: null },
          ],
          error: null,
        });
      return consulta({ data: [{ paciente_id: 'p1', notas: [{ creada_en: iso(26) }] }], error: null });
    });

    const lista = await obtenerListadoPacientes('terapeuta-1', hoy);

    expect(lista).toEqual([
      { id: 'p1', nombre: 'Niño Uno', identificador: '11111111', progresoSemanal: 50, ultimaActividad: { tipo: 'nota', fecha: iso(26) } },
      { id: 'p2', nombre: 'Niña', identificador: '22222222', progresoSemanal: 0, ultimaActividad: null },
    ]);
  });

  it('buscar por identificador (con o sin «#») o por nombre, sin tildes ni mayúsculas', () => {
    const lista = [
      { id: 'p1', nombre: 'Martín Uno', identificador: '06837261' },
      { id: 'p2', nombre: 'Lola Dos', identificador: '55555555' },
    ] as PacienteDelListado[];
    expect(filtrarPacientes(lista, '#0683').map((p) => p.id)).toEqual(['p1']);
    expect(filtrarPacientes(lista, '5555').map((p) => p.id)).toEqual(['p2']);
    expect(filtrarPacientes(lista, 'martin').map((p) => p.id)).toEqual(['p1']);
    expect(filtrarPacientes(lista, '   ')).toHaveLength(2);
  });
});

describe('Pacientes · ficha', () => {
  it('ficha: datos, contadores, historial con los estados de la interfaz y notas de sus sesiones', async () => {
    from.mockImplementation((tabla: string) => {
      if (tabla === 'pacientes')
        return consulta({
          data: {
            id: 'p1',
            nombre_nino: 'Niño',
            apellidos: 'Uno Dos',
            fecha_nacimiento: '2023-06-23',
            identificador: '06837261',
            email: null,
            telefono: '600 000 001',
            telefono_fijo: null,
            tutor_1: 'Tutor Uno',
            tutor_2: null,
            necesidades_objetivos: 'Objetivo inventado.',
          },
          error: null,
        });
      if (tabla === 'tareas')
        return consulta({
          data: [
            { id: 't1', estado: 'pendientes', modulos: { titulo: 'El Espejo' } },
            { id: 't2', estado: 'completada', modulos: [{ titulo: 'Manos a la Obra' }] },
            { id: 't3', estado: 'evaluada', modulos: null },
          ],
          error: null,
        });
      return consulta({
        data: [
          { id: 's3', empieza_en: iso(30), notas: { id: 'n3', texto: 'Preparar la sesión.' } }, // futura
          { id: 's2', empieza_en: iso(26), notas: [] },
          { id: 's1', empieza_en: iso(11), notas: [{ id: 'n1', texto: 'Nota inventada.' }] },
        ],
        error: null,
      });
    });

    const ficha = await obtenerFichaPaciente('p1', hoy);

    expect(ficha.datos).toMatchObject({ nombreNino: 'Niño', apellidos: 'Uno Dos', identificador: '06837261', tutor1: 'Tutor Uno', email: null });
    expect(ficha.completadas).toBe(2);
    expect(ficha.pendientes).toBe(1);
    expect(ficha.sesionesAtendidas).toBe(2); // la del día 30 aún no ha pasado
    expect(ficha.historial).toEqual([
      { id: 't1', titulo: 'El Espejo', estado: 'Pendiente' },
      { id: 't2', titulo: 'Manos a la Obra', estado: 'Por revisar' },
      { id: 't3', titulo: 'Práctica', estado: 'Completada' },
    ]);
    expect(ficha.notas).toEqual([
      { id: 'n3', fechaSesion: iso(30), texto: 'Preparar la sesión.' },
      { id: 'n1', fechaSesion: iso(11), texto: 'Nota inventada.' },
    ]);
  });

  it('edad y fecha de nacimiento', () => {
    expect(edadYNacimiento('2023-06-23', hoy)).toBe('3 años · 23 de junio de 2023');
    expect(edadYNacimiento('2025-11-28', hoy)).toBe('11 meses · 28 de noviembre de 2025');
    expect(edadYNacimiento('2025-10-27', hoy)).toBe('1 año · 27 de octubre de 2025');
    expect(edadYNacimiento(null, hoy)).toBeNull();
    expect(fechaDeNota(iso(11))).toBe('11 de noviembre de 2026');
  });

  it('fecha de nacimiento del formulario (DD/MM/AAAA)', () => {
    expect(fechaDeFormulario('23/06/2023', hoy)).toBe('2023-06-23');
    expect(fechaDeFormulario('3/6/2023', hoy)).toBe('2023-06-03');
    expect(fechaDeFormulario('  ', hoy)).toBeNull();
    expect(() => fechaDeFormulario('31/02/2023', hoy)).toThrow('DD/MM/AAAA');
    expect(() => fechaDeFormulario('2023-06-23', hoy)).toThrow('DD/MM/AAAA');
    expect(() => fechaDeFormulario('01/01/2030', hoy)).toThrow('no puede ser futura');
  });

  const cambios = {
    nombreNino: ' Niño ',
    apellidos: 'Uno Dos',
    fechaNacimiento: '23/06/2023',
    email: 'familia@correo.ejemplo',
    telefono: '',
    telefonoFijo: '',
    tutor1: 'Tutor Uno',
    tutor2: '  ',
    necesidadesObjetivos: 'Objetivo inventado.',
  };

  it('guardar los datos: limpia espacios y guarda vacíos como sin dato', async () => {
    const q = consulta({ data: { id: 'p1', nombre_nino: 'Niño', identificador: '06837261' }, error: null });
    from.mockReturnValue(q);

    await actualizarDatosPaciente('p1', cambios);

    expect(q.update).toHaveBeenCalledWith({
      nombre_nino: 'Niño',
      apellidos: 'Uno Dos',
      fecha_nacimiento: '2023-06-23',
      email: 'familia@correo.ejemplo',
      telefono: null,
      telefono_fijo: null,
      tutor_1: 'Tutor Uno',
      tutor_2: null,
      necesidades_objetivos: 'Objetivo inventado.',
    });
    expect(q.eq).toHaveBeenCalledWith('id', 'p1');
  });

  it('no guarda sin nombre ni con un correo mal escrito', async () => {
    await expect(actualizarDatosPaciente('p1', { ...cambios, nombreNino: '  ' })).rejects.toThrow('El nombre del niño es obligatorio.');
    await expect(actualizarDatosPaciente('p1', { ...cambios, email: 'correo-sin-arroba' })).rejects.toThrow('El correo electrónico no es válido.');
    expect(from).not.toHaveBeenCalled();
  });

  it('subtítulo de los módulos: el corto de Figma para el catálogo; el objetivo para los propios', () => {
    expect(subtituloDeModulo('el-espejo', 'Objetivo largo')).toBe('Reconocimiento corporal y conciencia propia');
    expect(subtituloDeModulo(null, 'Objetivo del módulo propio')).toBe('Objetivo del módulo propio');
  });
});

describe('Pacientes · traspasos y archivados', () => {
  it('terapeutas a las que traspasar: todas menos una misma', async () => {
    const q = consulta({ data: [{ id: 't2', nombre: 'Terapeuta Dos' }], error: null });
    from.mockReturnValue(q);

    expect(await obtenerOtrasTerapeutas('t1')).toEqual([{ id: 't2', nombre: 'Terapeuta Dos' }]);
    expect(q.neq).toHaveBeenCalledWith('id', 't1');
  });

  it('traspasar: llama a la función de la base de datos con el niño, la terapeuta actual y la nueva', async () => {
    rpc.mockResolvedValue({ error: null });

    await traspasarPaciente('p1', 't1', 't2');

    expect(rpc).toHaveBeenCalledWith('traspasar_paciente_sin_login', { p_paciente: 'p1', p_terapeuta_actual: 't1', p_terapeuta_nueva: 't2' });
  });

  it('traspasar: sin terapeuta elegida no se envía; si la base de datos falla, se explica', async () => {
    await expect(traspasarPaciente('p1', 't1', '')).rejects.toThrow('Elige a qué terapeuta');
    rpc.mockResolvedValue({ error: { message: 'Paciente no encontrado' } });
    await expect(traspasarPaciente('p1', 't1', 't2')).rejects.toThrow('No se pudo traspasar el paciente: Paciente no encontrado');
  });

  it('archivados: el último traspaso de cada niño, salvo los que le han devuelto', async () => {
    from.mockReturnValue(
      consulta({
        data: [
          { fecha: iso(20), pacientes: { id: 'p1', nombre_nino: 'Niño', apellidos: 'Uno Dos', identificador: '11111111', terapeuta_asignado_id: 't2' }, destino: { nombre: 'Terapeuta Dos' } },
          { fecha: iso(10), pacientes: { id: 'p1', nombre_nino: 'Niño', apellidos: 'Uno Dos', identificador: '11111111', terapeuta_asignado_id: 't2' }, destino: { nombre: 'Terapeuta Tres' } },
          { fecha: iso(5), pacientes: { id: 'p2', nombre_nino: 'Niña', apellidos: null, identificador: '22222222', terapeuta_asignado_id: 't1' }, destino: [{ nombre: 'Terapeuta Dos' }] },
        ],
        error: null,
      }),
    );

    expect(await obtenerArchivados('t1')).toEqual([
      { id: 'p1', nombre: 'Niño Uno', identificador: '11111111', traspasadoA: 'Terapeuta Dos', fecha: iso(20) },
    ]);
  });

  it('texto del traspaso en la tarjeta', () => {
    expect(textoTraspaso({ traspasadoA: 'Terapeuta Dos', fecha: iso(20) })).toBe('Traspasado a Terapeuta Dos · 20 de noviembre');
  });
});
