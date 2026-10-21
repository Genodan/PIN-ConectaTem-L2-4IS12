import { fireEvent, render, screen } from '@testing-library/react-native';

import Fichas from '../src/app/terapeuta/fichas';

// Prueba de aceptación: la terapeuta transfiere un paciente a otra terapeuta (baja, cambio de centro).
// El paciente nunca se queda sin terapeuta. La base de datos se simula en memoria.
type Paciente = { id: string; nombre_nino: string; nombre_familia: string; familia_id: string | null; fecha_registro: string; terapeuta: string };
let mockPacientes: Paciente[] = [];
let mockUsuario = { id: 'terapeuta-elena', nombre: 'Elena Ferrer', rol: 'terapeuta' };
const ELENA = { id: 'terapeuta-elena', nombre: 'Elena Ferrer', rol: 'terapeuta' };
const JAVIER = { id: 'terapeuta-javier', nombre: 'Javier Ortega', rol: 'terapeuta' };

jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: jest.fn() }) }));
jest.mock('../src/sesion', () => ({ useSesion: () => ({ usuario: mockUsuario, modoDemo: false }) }));
jest.mock('../src/services/fichasService', () => ({
  obtenerMisPacientes: jest.fn(async (terapeutaId: string) => mockPacientes.filter((p) => p.terapeuta === terapeutaId)),
  obtenerOtrasTerapeutas: jest.fn(async () =>
    [
      { id: 'terapeuta-elena', nombre: 'Elena Ferrer' },
      { id: 'terapeuta-javier', nombre: 'Javier Ortega' },
    ].filter((t) => t.id !== mockUsuario.id),
  ),
  // Como transferir_paciente: solo la terapeuta actual puede pasarlo a otra
  transferirPaciente: jest.fn(async (pacienteId: string, nuevaId: string) => {
    const paciente = mockPacientes.find((p) => p.id === pacienteId && p.terapeuta === mockUsuario.id);
    if (!paciente) throw new Error('No se pudo transferir al paciente: Paciente no encontrado');
    paciente.terapeuta = nuevaId;
  }),
}));

describe('Transferir paciente a otra terapeuta', () => {
  it('Elena pasa a Hugo a Javier: desaparece de sus fichas y aparece en las de Javier', async () => {
    // Condición: Hugo es paciente de Elena
    mockPacientes = [{ id: 'hugo', nombre_nino: 'Hugo', nombre_familia: 'Marta Sanchis', familia_id: 'f1', fecha_registro: '2026-10-01', terapeuta: 'terapeuta-elena' }];
    mockUsuario = ELENA;
    const { rerender } = await render(<Fichas />);

    // Pasos: abrir la ficha de Hugo → elegir a Javier → Transferir paciente → confirmar
    await fireEvent.press(await screen.findByText('Hugo'));
    await fireEvent.press(await screen.findByText('Javier Ortega'));
    await fireEvent.press(screen.getByText('Transferir paciente'));
    expect(screen.getByText('¿Pasar a Hugo a Javier Ortega?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Sí, transferir'));

    // Resultado: Hugo ya no está en las fichas de Elena...
    expect(await screen.findByText(/Todavía no tienes pacientes/)).toBeOnTheScreen();
    expect(screen.queryByText('Hugo')).not.toBeOnTheScreen();

    // ...y aparece en las de Javier (que verá también todo su historial)
    mockUsuario = JAVIER;
    await rerender(<Fichas />);
    expect(await screen.findByText('Hugo')).toBeOnTheScreen();
  });

  it('no deja transferir sin elegir a la nueva terapeuta', async () => {
    mockPacientes = [{ id: 'hugo', nombre_nino: 'Hugo', nombre_familia: 'Marta Sanchis', familia_id: 'f1', fecha_registro: '2026-10-01', terapeuta: 'terapeuta-elena' }];
    mockUsuario = ELENA;
    await render(<Fichas />);

    await fireEvent.press(await screen.findByText('Hugo'));
    expect(await screen.findByRole('button', { name: 'Transferir paciente' })).toBeDisabled();
  });
});
