import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AltaPaciente } from '../src/components/AltaPaciente';
import { supabase } from '../src/utils/supabase';

// UT 1354 · «➕ Nuevo paciente»: la terapeuta da de alta un paciente y queda en su cartera.
// Se prueba el componente con el servicio real; solo se simula la base de datos.
jest.mock('../src/utils/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const from = supabase.from as jest.Mock;

type Existente = { nombre_nino: string; nombre_familia: string };

// Simula la tabla `pacientes`: lo que ya hay y lo que devuelve el insert (por defecto, la fila que se pidió)
const simularBaseDeDatos = ({
  existentes = [] as Existente[],
  errorInsertar = null as { message: string } | null,
  resolverInsert = null as Promise<unknown> | null,
} = {}) => {
  const insert = jest.fn((fila: Record<string, string>) => ({
    select: () => ({
      single: () =>
        resolverInsert ??
        Promise.resolve({ data: errorInsertar ? null : { id: 'pac-nuevo', ...fila }, error: errorInsertar }),
    }),
  }));
  const eq = jest.fn().mockResolvedValue({ data: existentes, error: null });
  const select = jest.fn().mockReturnValue({ eq });
  from.mockReturnValue({ select, insert });
  return { insert };
};

const abrirFormulario = async () => {
  await fireEvent.press(screen.getByTestId('boton-nuevo-paciente'));
};

const rellenar = async (nino: string, familia: string) => {
  await fireEvent.changeText(screen.getByTestId('input-nombre-paciente'), nino);
  await fireEvent.changeText(screen.getByTestId('input-nombre-familia'), familia);
};

const guardar = async () => {
  await fireEvent.press(screen.getByTestId('boton-guardar-paciente'));
};

describe('AltaPaciente (UT 1354)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('al abrir la pantalla solo se ve el botón «Nuevo paciente», sin formulario', async () => {
    simularBaseDeDatos();
    await render(<AltaPaciente terapeutaIdActual="ter-1" />);

    expect(screen.getByText('➕ Nuevo paciente')).toBeOnTheScreen();
    expect(screen.queryByTestId('formulario-paciente')).toBeNull();
    expect(screen.queryByTestId('mensaje-paciente')).toBeNull();
  });

  // PA 2483
  it('da de alta al paciente asignado a la terapeuta, avisa y cierra el formulario', async () => {
    const { insert } = simularBaseDeDatos();
    const alCrear = jest.fn();
    await render(<AltaPaciente terapeutaIdActual="ter-1" onPacienteCreado={alCrear} />);

    await abrirFormulario();
    expect(screen.getByTestId('formulario-paciente')).toBeOnTheScreen();
    expect(screen.queryByTestId('boton-nuevo-paciente')).toBeNull();

    await rellenar('Paciente de prueba 1', 'Familia de prueba 1');
    await guardar();

    expect(
      await screen.findByText('Paciente «Paciente de prueba 1» añadido a tu cartera. Ya puedes crearle prácticas.'),
    ).toBeOnTheScreen();
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith({
      nombre_nino: 'Paciente de prueba 1',
      nombre_familia: 'Familia de prueba 1',
      terapeuta_asignado_id: 'ter-1',
    });
    expect(screen.queryByTestId('formulario-paciente')).toBeNull();
    expect(screen.getByTestId('boton-nuevo-paciente')).toBeOnTheScreen();
    expect(alCrear).toHaveBeenCalledTimes(1);
  });

  it('quita los espacios de alrededor y el mensaje enseña el nombre ya limpio', async () => {
    const { insert } = simularBaseDeDatos();
    await render(<AltaPaciente terapeutaIdActual="ter-1" />);

    await abrirFormulario();
    await rellenar('  Paciente de prueba ñandú  ', '  Familia de prueba ñ ');
    await guardar();

    expect(
      await screen.findByText('Paciente «Paciente de prueba ñandú» añadido a tu cartera. Ya puedes crearle prácticas.'),
    ).toBeOnTheScreen();
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ nombre_nino: 'Paciente de prueba ñandú' }));
  });

  it('mientras se guarda, el botón queda bloqueado («Guardando...») y solo se crea un paciente', async () => {
    let terminarInsert: (resultado: unknown) => void = () => undefined;
    const { insert } = simularBaseDeDatos({ resolverInsert: new Promise((resolver) => (terminarInsert = resolver)) });
    const alCrear = jest.fn();
    await render(<AltaPaciente terapeutaIdActual="ter-1" onPacienteCreado={alCrear} />);

    await abrirFormulario();
    await rellenar('Paciente de prueba 1', 'Familia de prueba 1');

    // La pulsación no termina hasta que la base de datos responde, así que no se espera aquí
    const pulsacion = fireEvent.press(screen.getByTestId('boton-guardar-paciente'));

    await waitFor(() => expect(screen.getByText('Guardando...')).toBeOnTheScreen());
    expect(screen.getByTestId('boton-guardar-paciente')).toBeDisabled();
    expect(screen.getByTestId('boton-cancelar-paciente')).toBeDisabled();
    expect(insert).toHaveBeenCalledTimes(1);

    await act(async () => {
      terminarInsert({
        data: { id: 'pac-1', nombre_nino: 'Paciente de prueba 1', nombre_familia: 'Familia de prueba 1' },
        error: null,
      });
      await pulsacion;
    });
    await screen.findByText(/añadido a tu cartera/);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(alCrear).toHaveBeenCalledTimes(1);
  });

  // PA 2930
  describe('sin los datos obligatorios', () => {
    it.each([
      ['el nombre del paciente vacío', '', 'Familia de prueba 1', 'El nombre del paciente es obligatorio.'],
      ['el nombre de la familia vacío', 'Paciente de prueba 1', '', 'El nombre de la familia es obligatorio.'],
      ['solo espacios en el paciente', '    ', 'Familia de prueba 1', 'El nombre del paciente es obligatorio.'],
      ['solo espacios en la familia', 'Paciente de prueba 1', '    ', 'El nombre de la familia es obligatorio.'],
      ['los dos campos vacíos (avisa del paciente)', '', '', 'El nombre del paciente es obligatorio.'],
    ])('con %s no crea nada, deja el formulario abierto y avisa', async (_caso, nino, familia, error) => {
      const { insert } = simularBaseDeDatos();
      const alCrear = jest.fn();
      await render(<AltaPaciente terapeutaIdActual="ter-1" onPacienteCreado={alCrear} />);

      await abrirFormulario();
      await rellenar(nino, familia);
      await guardar();

      expect(await screen.findByText(error)).toBeOnTheScreen();
      expect(screen.getByTestId('formulario-paciente')).toBeOnTheScreen();
      expect(insert).not.toHaveBeenCalled();
      expect(alCrear).not.toHaveBeenCalled();
    });

    it('al corregir el dato y guardar de nuevo, se crea y desaparece el error', async () => {
      const { insert } = simularBaseDeDatos();
      await render(<AltaPaciente terapeutaIdActual="ter-1" />);

      await abrirFormulario();
      await rellenar('Paciente de prueba 1', '');
      await guardar();
      await screen.findByText('El nombre de la familia es obligatorio.');

      await fireEvent.changeText(screen.getByTestId('input-nombre-familia'), 'Familia de prueba 1');
      await guardar();

      await screen.findByText(/añadido a tu cartera/);
      expect(screen.queryByText('El nombre de la familia es obligatorio.')).toBeNull();
      expect(insert).toHaveBeenCalledTimes(1);
    });
  });

  // PA nueva (duplicados)
  describe('paciente repetido', () => {
    const existentes = [{ nombre_nino: 'Paciente de prueba 1', nombre_familia: 'Familia de prueba 1' }];

    it('no lo crea y avisa, aunque cambien las mayúsculas', async () => {
      const { insert } = simularBaseDeDatos({ existentes });
      await render(<AltaPaciente terapeutaIdActual="ter-1" />);

      await abrirFormulario();
      await rellenar('PACIENTE DE PRUEBA 1', ' familia de prueba 1 ');
      await guardar();

      expect(await screen.findByText('Ya tienes un paciente con ese nombre y esa familia.')).toBeOnTheScreen();
      expect(screen.getByTestId('formulario-paciente')).toBeOnTheScreen();
      expect(insert).not.toHaveBeenCalled();
    });

    it('con el mismo nombre y otra familia sí lo crea', async () => {
      const { insert } = simularBaseDeDatos({ existentes });
      await render(<AltaPaciente terapeutaIdActual="ter-1" />);

      await abrirFormulario();
      await rellenar('Paciente de prueba 1', 'Familia de prueba 2');
      await guardar();

      await screen.findByText(/añadido a tu cartera/);
      expect(insert).toHaveBeenCalledTimes(1);
    });
  });

  it('si la base de datos falla, enseña el motivo y conserva lo escrito para reintentar', async () => {
    simularBaseDeDatos({ errorInsertar: { message: 'sin conexión' } });
    const alCrear = jest.fn();
    await render(<AltaPaciente terapeutaIdActual="ter-1" onPacienteCreado={alCrear} />);

    await abrirFormulario();
    await rellenar('Paciente de prueba 1', 'Familia de prueba 1');
    await guardar();

    expect(await screen.findByText('Error al crear el paciente: sin conexión')).toBeOnTheScreen();
    expect(screen.getByTestId('input-nombre-paciente').props.value).toBe('Paciente de prueba 1');
    expect(screen.getByTestId('input-nombre-familia').props.value).toBe('Familia de prueba 1');
    expect(screen.getByTestId('boton-guardar-paciente')).toBeEnabled();
    expect(alCrear).not.toHaveBeenCalled();
  });

  it('«Cancelar» cierra el formulario sin crear nada y al reabrirlo está vacío', async () => {
    const { insert } = simularBaseDeDatos();
    await render(<AltaPaciente terapeutaIdActual="ter-1" />);

    await abrirFormulario();
    await rellenar('Paciente de prueba 1', 'Familia de prueba 1');
    await fireEvent.press(screen.getByTestId('boton-cancelar-paciente'));

    expect(screen.queryByTestId('formulario-paciente')).toBeNull();
    expect(insert).not.toHaveBeenCalled();

    await abrirFormulario();
    expect(screen.getByTestId('input-nombre-paciente').props.value).toBe('');
    expect(screen.getByTestId('input-nombre-familia').props.value).toBe('');
  });

  it('al cambiar de terapeuta se descarta el formulario a medias y el mensaje anterior', async () => {
    simularBaseDeDatos();
    const { rerender } = await render(<AltaPaciente terapeutaIdActual="ter-1" />);

    await abrirFormulario();
    await rellenar('Paciente de prueba 1', 'Familia de prueba 1');
    await guardar();
    await screen.findByText(/añadido a tu cartera/);
    await abrirFormulario();
    await rellenar('Otro paciente', 'Otra familia');

    await rerender(<AltaPaciente terapeutaIdActual="ter-2" />);

    expect(screen.queryByTestId('formulario-paciente')).toBeNull();
    expect(screen.queryByTestId('mensaje-paciente')).toBeNull();
  });

  it('el alta se hace a nombre de la terapeuta que está activa en ese momento', async () => {
    const { insert } = simularBaseDeDatos();
    const { rerender } = await render(<AltaPaciente terapeutaIdActual="ter-1" />);
    await rerender(<AltaPaciente terapeutaIdActual="ter-2" />);

    await abrirFormulario();
    await rellenar('Paciente de prueba 1', 'Familia de prueba 1');
    await guardar();

    await screen.findByText(/añadido a tu cartera/);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ terapeuta_asignado_id: 'ter-2' }));
  });
});
