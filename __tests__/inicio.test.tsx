import { render, screen } from '@testing-library/react-native';

import Inicio from '../src/app/index';

// Prueba de humo: la pantalla de inicio muestra el nombre y las dos entradas.
describe('Pantalla de inicio', () => {
  it('muestra el nombre de la aplicación', async () => {
    await render(<Inicio />);
    expect(screen.getByText('ConecTEM')).toBeOnTheScreen();
  });

  it('ofrece entrar como familia y como terapeuta', async () => {
    await render(<Inicio />);
    expect(screen.getByText('Entrar como familia')).toBeOnTheScreen();
    expect(screen.getByText('Entrar como terapeuta')).toBeOnTheScreen();
  });
});
