import { fireEvent, render, screen } from '@testing-library/react-native';

import DetalleModulo from '../src/app/familia/modulos/[id]';

jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: jest.fn() }),
  useLocalSearchParams: () => ({ id: '1' }),
}));

// Envío de una práctica desde el detalle de un módulo (interfaz del prototipo, aún sin Supabase)
describe('Detalle de módulo', () => {
  it('no deja enviar la práctica hasta adjuntar un vídeo', async () => {
    await render(<DetalleModulo />);
    expect(screen.getByRole('header', { name: 'Intención Comunicativa' })).toBeOnTheScreen();
    expect(screen.getByText('Adjunta tu vídeo para poder enviar la práctica.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Enviar práctica a Marta ✨' })).toBeDisabled();
  });

  it('con el vídeo adjunto se envía y muestra la confirmación', async () => {
    await render(<DetalleModulo />);
    await fireEvent.press(screen.getByText('📷 Grabar'));
    expect(screen.getByText('✓ Vídeo adjuntado')).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Enviar práctica a Marta ✨'));
    expect(screen.getByText('¡Práctica enviada!')).toBeOnTheScreen();
  });
});
