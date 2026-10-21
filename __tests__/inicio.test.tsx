import { fireEvent, render, screen } from '@testing-library/react-native';

import Acceso from '../src/app/index';

const mockPush = jest.fn();
const mockIniciarSesion = jest.fn();
let mockModoDemo = true;
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../src/sesion', () => ({
  useSesion: () => ({ modoDemo: mockModoDemo, iniciarSesion: mockIniciarSesion }),
}));

// Pantalla de acceso: elegir rol, iniciar sesión o registrarse
describe('Pantalla de acceso', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockIniciarSesion.mockReset();
    mockModoDemo = true;
  });

  it('muestra el nombre de la aplicación y los dos roles', async () => {
    await render(<Acceso />);
    expect(screen.getAllByText('ConecTEM').length).toBeGreaterThan(0);
    expect(screen.getByText('👨‍👩‍👧 Soy familia')).toBeOnTheScreen();
    expect(screen.getByText('🩺 Soy terapeuta')).toBeOnTheScreen();
  });

  it('en modo demo entra al panel del rol elegido sin comprobar la cuenta', async () => {
    await render(<Acceso />);
    await fireEvent.press(screen.getByText('🩺 Soy terapeuta'));
    await fireEvent.press(screen.getByText('Entrar'));
    expect(mockPush).toHaveBeenCalledWith('/terapeuta');
    expect(mockIniciarSesion).not.toHaveBeenCalled();
  });

  it('con Supabase inicia sesión y lleva al panel del rol de la cuenta', async () => {
    mockModoDemo = false;
    mockIniciarSesion.mockResolvedValue({ id: 'u1', nombre: 'Elena Ferrer', rol: 'terapeuta' });
    await render(<Acceso />);
    await fireEvent.changeText(screen.getByLabelText('Correo electrónico'), 'elena@centro.test');
    await fireEvent.changeText(screen.getByLabelText('Contraseña'), 'secreta');
    await fireEvent.press(screen.getByText('Entrar'));

    expect(mockIniciarSesion).toHaveBeenCalledWith('elena@centro.test', 'secreta');
    expect(mockPush).toHaveBeenCalledWith('/terapeuta');
  });

  it('si la contraseña no es correcta muestra el error y no entra', async () => {
    mockModoDemo = false;
    mockIniciarSesion.mockRejectedValue(new Error('El correo o la contraseña no son correctos. Vuelve a intentarlo.'));
    await render(<Acceso />);
    await fireEvent.press(screen.getByText('Entrar'));

    expect(await screen.findByText('El correo o la contraseña no son correctos. Vuelve a intentarlo.')).toBeOnTheScreen();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('en el registro pide el código de invitación a la familia y el colegiado a la terapeuta', async () => {
    await render(<Acceso />);
    await fireEvent.press(screen.getByText('Registrarse'));
    expect(screen.getByText(/Código de invitación/)).toBeOnTheScreen();
    expect(screen.queryByText('Número de colegiado')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByText('🩺 Soy terapeuta'));
    expect(screen.getByText('Número de colegiado')).toBeOnTheScreen();
    expect(screen.queryByText(/Código de invitación/)).not.toBeOnTheScreen();
  });
});
