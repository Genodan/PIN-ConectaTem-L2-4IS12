import { fireEvent, render, screen } from '@testing-library/react-native';

import { FlechaVolver } from '../src/components/FlechaVolver';

// La flecha de la cabecera de /familia y /terapeuta: antes desaparecía al recargar la página.
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockPuedeVolver = true;

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => mockPuedeVolver }),
}));

describe('FlechaVolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPuedeVolver = true;
  });

  it('se muestra siempre, también cuando no hay pantalla anterior en el historial', async () => {
    mockPuedeVolver = false;
    await render(<FlechaVolver />);

    expect(screen.getByLabelText('Volver al inicio')).toBeOnTheScreen();
  });

  it('con historial, vuelve a la pantalla anterior', async () => {
    await render(<FlechaVolver />);

    await fireEvent.press(screen.getByLabelText('Volver al inicio'));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('sin historial (página recargada), va al inicio en lugar de no hacer nada', async () => {
    mockPuedeVolver = false;
    await render(<FlechaVolver />);

    await fireEvent.press(screen.getByLabelText('Volver al inicio'));

    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(mockBack).not.toHaveBeenCalled();
  });
});
