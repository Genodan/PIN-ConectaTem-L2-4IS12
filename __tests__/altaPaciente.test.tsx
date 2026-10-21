import { fireEvent, render, screen } from '@testing-library/react-native';

import Fichas from '../src/app/terapeuta/fichas';

// Prueba de aceptación: la terapeuta da de alta a un paciente y queda asignado a ella.
// La base de datos se simula en memoria: no se tocan datos reales de Supabase.
type Paciente = { id: string; nombre_nino: string; nombre_familia: string; familia_id: string | null; fecha_registro: string; terapeuta: string };
let mockPacientes: Paciente[] = [];
const ELENA = 'terapeuta-elena';
const JAVIER = 'terapeuta-javier';

jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: jest.fn() }) }));
jest.mock('../src/sesion', () => ({
  useSesion: () => ({ usuario: { id: 'terapeuta-elena', nombre: 'Elena Ferrer', rol: 'terapeuta' }, modoDemo: false }),
}));
jest.mock('../src/services/fichasService', () => ({
  obtenerMisPacientes: jest.fn(async (terapeutaId: string) => mockPacientes.filter((p) => p.terapeuta === terapeutaId)),
  obtenerOtrasTerapeutas: jest.fn(async () => [{ id: 'terapeuta-javier', nombre: 'Javier Ortega' }]),
  // Como crear_paciente_con_codigo: el paciente queda asignado a la terapeuta con sesión (Elena)
  darDeAltaPaciente: jest.fn(async (nino: string, familia: string) => {
    mockPacientes.push({ id: `p${mockPacientes.length + 1}`, nombre_nino: nino, nombre_familia: familia, familia_id: null, fecha_registro: '2026-10-21', terapeuta: 'terapeuta-elena' });
    return 'A1B2C3D4E5';
  }),
}));

describe('Alta de paciente por la terapeuta', () => {
  it('Elena da de alta a Hugo, recibe el código y Hugo aparece en sus fichas', async () => {
    // Condición: Elena tiene sesión iniciada y todavía no tiene pacientes
    mockPacientes = [];
    await render(<Fichas />);
    expect(await screen.findByText(/Todavía no tienes pacientes/)).toBeOnTheScreen();

    // Pasos: Invitar nueva familia → nombre del niño y de la familia → Generar invitación
    await fireEvent.press(screen.getByText('＋ Invitar nueva familia'));
    await fireEvent.changeText(screen.getByLabelText('Nombre del niño/a'), 'Hugo');
    await fireEvent.changeText(screen.getByLabelText('Nombre de la familia'), 'Marta Sanchis');
    await fireEvent.press(screen.getByText('Generar invitación segura'));

    // Resultado: se muestra el código y Hugo está en la lista de Elena, pendiente de que la familia se registre
    expect(await screen.findByText('A1B2C3D4E5')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('← Volver a las fichas'));
    expect(screen.getByText('Hugo')).toBeOnTheScreen();
    expect(screen.getByText('Familia: Marta Sanchis · pendiente de registro')).toBeOnTheScreen();
  });

  it('Elena no ve los pacientes de otra terapeuta', async () => {
    mockPacientes = [
      { id: 'p1', nombre_nino: 'Lucía', nombre_familia: 'Raúl Gómez', familia_id: 'f1', fecha_registro: '2026-10-01', terapeuta: JAVIER },
      { id: 'p2', nombre_nino: 'Hugo', nombre_familia: 'Marta Sanchis', familia_id: null, fecha_registro: '2026-10-21', terapeuta: ELENA },
    ];
    await render(<Fichas />);

    expect(await screen.findByText('Hugo')).toBeOnTheScreen();
    expect(screen.queryByText('Lucía')).not.toBeOnTheScreen();
  });
});
