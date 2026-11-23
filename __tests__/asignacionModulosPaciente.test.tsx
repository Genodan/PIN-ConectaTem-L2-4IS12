import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { AsignacionModulosPaciente } from '../src/components/AsignacionModulosPaciente';
import { CrearPractica } from '../src/components/CrearPractica';
import * as practicasService from '../src/services/practicasService';
import * as modulosPacienteService from '../src/services/modulosPacienteService';

jest.mock('../src/services/practicasService', () => ({
  ...jest.requireActual('../src/services/practicasService'),
  obtenerPacientesDeTerapeuta: jest.fn(),
  obtenerModulos: jest.fn(),
  crearPractica: jest.fn(),
}));

jest.mock('../src/services/modulosPacienteService', () => ({
  ...jest.requireActual('../src/services/modulosPacienteService'),
  obtenerModulosAsignadosAPaciente: jest.fn(),
  asignarModuloAPaciente: jest.fn(),
  desasignarModuloDePaciente: jest.fn(),
}));

const mockObtenerPacientes = practicasService.obtenerPacientesDeTerapeuta as jest.Mock;
const mockObtenerModulos = practicasService.obtenerModulos as jest.Mock;
const mockObtenerAsignados = modulosPacienteService.obtenerModulosAsignadosAPaciente as jest.Mock;
const mockAsignar = modulosPacienteService.asignarModuloAPaciente as jest.Mock;
const mockDesasignar = modulosPacienteService.desasignarModuloDePaciente as jest.Mock;

describe('UT · Elegir los módulos que trabaja cada paciente', () => {
  const pacientesMock = [
    { id: 'pac-hugo', nombre_nino: 'Hugo', nombre_familia: 'Sanchis' },
    { id: 'pac-lucas', nombre_nino: 'Lucas', nombre_familia: 'García' },
  ];

  const modulosDisponibles = [
    {
      id: 'mod-1',
      titulo: 'Intención Comunicativa',
      objetivo: 'Fomentar la petición',
      video_guia_url: null,
      terapeuta_id: null, // Común
    },
    {
      id: 'mod-2',
      titulo: 'El Espejo',
      objetivo: 'Imitación de gestos',
      video_guia_url: null,
      terapeuta_id: null, // Común
    },
    {
      id: 'mod-personal-elena',
      titulo: 'Caja Sensorial de Elena',
      objetivo: 'Estimulación táctil',
      video_guia_url: null,
      terapeuta_id: 'ter-elena', // Personal de Elena
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockObtenerPacientes.mockResolvedValue(pacientesMock);
    mockObtenerModulos.mockResolvedValue(modulosDisponibles);
    mockObtenerAsignados.mockImplementation((pacId: string) => {
      if (pacId === 'pac-hugo') {
        return Promise.resolve(['mod-2']);
      }
      return Promise.resolve([]);
    });
  });

  describe('Interfaz de Asignación de Módulos (AsignacionModulosPaciente)', () => {
    it('muestra los pacientes del terapeuta y los módulos asignables (comunes y personales)', async () => {
      mockObtenerAsignados.mockResolvedValue([]);

      await render(
        <AsignacionModulosPaciente terapeutaIdActual="ter-elena" />,
      );

      // Esperar a que cargue
      expect(await screen.findByText('Módulos de trabajo por paciente')).toBeTruthy();
      expect(screen.getByText('Intención Comunicativa')).toBeTruthy();
      expect(screen.getByText('El Espejo')).toBeTruthy();
      expect(screen.getByText('Caja Sensorial de Elena')).toBeTruthy();

      // Verifica etiquetas de tipo
      expect(screen.getByText('Personal')).toBeTruthy();
      expect(screen.getAllByText('Común').length).toBe(2);

      // Con 0 módulos asignados, muestra aviso de que puede elegir cualquier módulo
      expect(screen.getByText(/no tiene módulos específicos asignados/i)).toBeTruthy();
    });

    it('el terapeuta asigna un módulo a un paciente y este queda marcado como asignado', async () => {
      mockObtenerAsignados.mockResolvedValue([]); // Inicialmente sin módulos
      mockAsignar.mockResolvedValue(undefined);

      const alCambiar = jest.fn();
      await render(
        <AsignacionModulosPaciente
          terapeutaIdActual="ter-elena"
          onModulosAsignadosCambiados={alCambiar}
        />,
      );

      // El módulo 'mod-1' inicialmente está no asignado
      expect(await screen.findByTestId('boton-toggle-modulo-mod-1')).toBeTruthy();
      expect(screen.getByTestId('estado-modulo-mod-1')).toHaveTextContent('○ No asignado');

      // Pulsar para asignar
      await fireEvent.press(screen.getByTestId('boton-toggle-modulo-mod-1'));

      // Verifica que se llamó al servicio
      expect(mockAsignar).toHaveBeenCalledWith('pac-hugo', 'mod-1');
      expect(alCambiar).toHaveBeenCalled();

      // El botón ahora dice Desasignar y el estado cambia a asignado
      expect(await screen.findByText('✓ Asignado a este paciente')).toBeTruthy();
      expect(screen.getByText('Desasignar')).toBeTruthy();
    });

    it('el terapeuta desasigna un módulo y este vuelve al estado no asignado', async () => {
      // Hugo tiene 'mod-2' asignado
      mockObtenerAsignados.mockResolvedValue(['mod-2']);
      mockDesasignar.mockResolvedValue(undefined);

      const alCambiar = jest.fn();
      await render(
        <AsignacionModulosPaciente
          terapeutaIdActual="ter-elena"
          onModulosAsignadosCambiados={alCambiar}
        />,
      );

      expect(await screen.findByTestId('boton-toggle-modulo-mod-2')).toBeTruthy();
      expect(screen.getByTestId('estado-modulo-mod-2')).toHaveTextContent('✓ Asignado a este paciente');

      // Pulsar para desasignar
      await fireEvent.press(screen.getByTestId('boton-toggle-modulo-mod-2'));

      expect(mockDesasignar).toHaveBeenCalledWith('pac-hugo', 'mod-2');
      expect(alCambiar).toHaveBeenCalled();

      expect(await screen.findByTestId('estado-modulo-mod-2')).toHaveTextContent('○ No asignado');
    });

    it('cambiar de paciente en el selector carga los módulos asignados a ese nuevo paciente', async () => {
      // Para Hugo: ['mod-1'], para Lucas: []
      mockObtenerAsignados.mockImplementation((pacId: string) => {
        if (pacId === 'pac-hugo') return Promise.resolve(['mod-1']);
        return Promise.resolve([]);
      });

      await render(
        <AsignacionModulosPaciente terapeutaIdActual="ter-elena" />,
      );

      expect(await screen.findByTestId('estado-modulo-mod-1')).toHaveTextContent('✓ Asignado a este paciente');

      // Cambiar a Lucas
      const picker = screen.getByTestId('picker-paciente-modulos');
      await fireEvent(picker, 'valueChange', 'pac-lucas');

      await waitFor(() => {
        expect(mockObtenerAsignados).toHaveBeenCalledWith('pac-lucas');
      });

      // Para Lucas no hay módulos asignados
      expect(screen.getByTestId('estado-modulo-mod-1')).toHaveTextContent('○ No asignado');
      expect(screen.getByText(/no tiene módulos específicos asignados/i)).toBeTruthy();
    });
  });

  describe('Comportamiento al Crear Práctica (CrearPractica)', () => {
    it('al seleccionar un paciente con módulos específicos asignados, solo salen sus módulos asignados', async () => {
      // Hugo tiene asignado solo 'El Espejo' ('mod-2')
      await render(<CrearPractica terapeutaIdActual="ter-elena" />);

      // Esperar a que cargue CrearPractica
      expect(await screen.findByText('Crear práctica')).toBeTruthy();

      // El módulo seleccionado por defecto debe ser 'El Espejo'
      expect(screen.getByText('El Espejo')).toBeTruthy();
      expect(screen.queryByText('Intención Comunicativa')).toBeNull();
    });

    it('al seleccionar un paciente sin módulos asignados, salen todos los módulos del terapeuta', async () => {
      await render(<CrearPractica terapeutaIdActual="ter-elena" />);

      expect(await screen.findByText('Crear práctica')).toBeTruthy();

      // Cambiar de paciente a Lucas (quien no tiene módulos asignados)
      const pickerPaciente = screen.getByTestId('picker-paciente');
      await fireEvent(pickerPaciente, 'valueChange', 'pac-lucas');

      // Ahora deben consultarse las asignaciones de Lucas y quedar todos los módulos disponibles
      await waitFor(() => {
        expect(mockObtenerAsignados).toHaveBeenCalledWith('pac-lucas');
      });

      // Ahora se puede cambiar el picker de módulo a 'Intención Comunicativa'
      const pickerModulo = screen.getByTestId('picker-modulo');
      await fireEvent(pickerModulo, 'valueChange', 'mod-1');

      expect(await screen.findByText('Intención Comunicativa')).toBeTruthy();
      expect(screen.getByText('Objetivo: Fomentar la petición')).toBeTruthy();
    });
  });
});
