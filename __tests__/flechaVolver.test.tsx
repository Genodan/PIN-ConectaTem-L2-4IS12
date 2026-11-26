import { fireEvent, render, screen } from '@testing-library/react-native';

import { FlechaVolver, rutaAnterior } from '../src/components/FlechaVolver';

// La flecha de la cabecera: antes desaparecía al recargar la página, y sin historial llevaba al inicio del todo.
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockPuedeVolver = true;
let mockRuta = '/familia';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => mockPuedeVolver }),
  usePathname: () => mockRuta,
}));

describe('FlechaVolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPuedeVolver = true;
    mockRuta = '/familia';
  });

  it('se muestra siempre, también cuando no hay pantalla anterior en el historial', async () => {
    mockPuedeVolver = false;
    await render(<FlechaVolver />);

    expect(screen.getByLabelText('Volver')).toBeOnTheScreen();
  });

  it('con historial, vuelve a la pantalla anterior', async () => {
    await render(<FlechaVolver />);

    await fireEvent.press(screen.getByLabelText('Volver'));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('sin historial (página recargada) en un panel, va al inicio en lugar de no hacer nada', async () => {
    mockPuedeVolver = false;
    await render(<FlechaVolver />);

    await fireEvent.press(screen.getByLabelText('Volver'));

    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('sin historial en una pantalla interior (p. ej. mensajes), vuelve a su panel y no al inicio', async () => {
    mockPuedeVolver = false;
    mockRuta = '/familia/mensajes';
    await render(<FlechaVolver />);

    await fireEvent.press(screen.getByLabelText('Volver'));

    expect(mockReplace).toHaveBeenCalledWith('/familia');
  });

  it('calcula la pantalla de arriba de cada ruta', () => {
    expect(rutaAnterior('/familia/mensajes')).toBe('/familia');
    expect(rutaAnterior('/terapeuta/mensajes')).toBe('/terapeuta');
    expect(rutaAnterior('/familia')).toBe('/');
    expect(rutaAnterior('/')).toBe('/');
  });
});
