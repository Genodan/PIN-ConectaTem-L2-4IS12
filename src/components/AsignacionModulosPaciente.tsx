import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { ModuloResumen, PacienteResumen, obtenerModulos, obtenerPacientesDeTerapeuta } from '../services/practicasService';
import {
  asignarModuloAPaciente,
  desasignarModuloDePaciente,
  obtenerModulosAsignadosAPaciente,
} from '../services/modulosPacienteService';

interface Props {
  terapeutaIdActual: string;
  recargarTrigger?: number;
  onModulosAsignadosCambiados?: () => void;
  inicialmenteAbierto?: boolean;
}

type Mensaje = { tipo: 'ok' | 'error'; texto: string };

export const AsignacionModulosPaciente: React.FC<Props> = ({
  terapeutaIdActual,
  recargarTrigger,
  onModulosAsignadosCambiados,
  inicialmenteAbierto = true,
}) => {
  const [desplegado, setDesplegado] = useState(inicialmenteAbierto);
  const [pacientes, setPacientes] = useState<PacienteResumen[]>([]);
  const [pacienteSeleccionadoId, setPacienteSeleccionadoId] = useState<string | null>(null);
  const [modulosDisponibles, setModulosDisponibles] = useState<ModuloResumen[]>([]);
  const [modulosAsignadosIds, setModulosAsignadosIds] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(true);
  const [procesandoModuloId, setProcesandoModuloId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);

  // Carga inicial de pacientes y catálogo de módulos del terapeuta
  const cargarPacientesYCatalogo = useCallback(async () => {
    setCargando(true);
    setMensaje(null);
    try {
      const [listaPacientes, listaModulos] = await Promise.all([
        obtenerPacientesDeTerapeuta(terapeutaIdActual),
        obtenerModulos(terapeutaIdActual),
      ]);

      setPacientes(listaPacientes);
      setModulosDisponibles(listaModulos);

      // Si no hay paciente seleccionado o el actual ya no está, elegir el primero
      setPacienteSeleccionadoId((prev) => {
        if (prev && listaPacientes.some((p) => p.id === prev)) return prev;
        return listaPacientes[0]?.id ?? null;
      });
    } catch (error: any) {
      setMensaje({ tipo: 'error', texto: error.message || 'Error al cargar los datos' });
    } finally {
      setCargando(false);
    }
  }, [terapeutaIdActual]);

  // Carga los módulos asignados al paciente seleccionado
  const cargarAsignacionesDePaciente = useCallback(async (pacId: string) => {
    try {
      const ids = await obtenerModulosAsignadosAPaciente(pacId);
      setModulosAsignadosIds(new Set(ids));
    } catch (error: any) {
      setMensaje({ tipo: 'error', texto: error.message || 'Error al cargar las asignaciones del paciente' });
    }
  }, []);

  // Recarga al cambiar de terapeuta o si cambia recargarTrigger
  useEffect(() => {
    cargarPacientesYCatalogo();
  }, [cargarPacientesYCatalogo, recargarTrigger]);

  // Cuando cambia el paciente seleccionado, cargar sus asignaciones
  useEffect(() => {
    if (pacienteSeleccionadoId) {
      cargarAsignacionesDePaciente(pacienteSeleccionadoId);
    } else {
      setModulosAsignadosIds(new Set());
    }
  }, [pacienteSeleccionadoId, cargarAsignacionesDePaciente]);

  const toggleAsignacion = async (modulo: ModuloResumen) => {
    if (!pacienteSeleccionadoId) return;

    setProcesandoModuloId(modulo.id);
    setMensaje(null);

    const estaAsignado = modulosAsignadosIds.has(modulo.id);
    const paciente = pacientes.find((p) => p.id === pacienteSeleccionadoId);
    const nombrePaciente = paciente ? paciente.nombre_nino : 'el paciente';

    try {
      if (estaAsignado) {
        // Desasignar
        await desasignarModuloDePaciente(pacienteSeleccionadoId, modulo.id);
        setModulosAsignadosIds((prev) => {
          const nuevo = new Set(prev);
          nuevo.delete(modulo.id);
          return nuevo;
        });
        setMensaje({
          tipo: 'ok',
          texto: `Módulo «${modulo.titulo}» desasignado de ${nombrePaciente}.`,
        });
      } else {
        // Asignar
        await asignarModuloAPaciente(pacienteSeleccionadoId, modulo.id);
        setModulosAsignadosIds((prev) => {
          const nuevo = new Set(prev);
          nuevo.add(modulo.id);
          return nuevo;
        });
        setMensaje({
          tipo: 'ok',
          texto: `Módulo «${modulo.titulo}» asignado a ${nombrePaciente}.`,
        });
      }

      // Notificar al componente padre para que CrearPractica refresque su lista de módulos
      onModulosAsignadosCambiados?.();
    } catch (error: any) {
      setMensaje({
        tipo: 'error',
        texto: error.message || 'Error al modificar la asignación del módulo.',
      });
    } finally {
      setProcesandoModuloId(null);
    }
  };

  const pacienteActual = pacientes.find((p) => p.id === pacienteSeleccionadoId);
  const totalAsignados = modulosAsignadosIds.size;

  return (
    <View style={styles.container}>
      {/* CABECERA DESPLEGABLE */}
      <TouchableOpacity
        testID="boton-toggle-desplegable-asignacion"
        style={styles.cabeceraColapsable}
        onPress={() => setDesplegado((prev) => !prev)}
        activeOpacity={0.7}
      >
        <View style={styles.cabeceraTextoContenedor}>
          <Text style={styles.titulo}>Módulos de trabajo por paciente</Text>
          <Text style={styles.subtituloColapsable}>
            {desplegado
              ? 'Toca para plegar la sección'
              : 'Toca para abrir y asignar/desasignar módulos por paciente'}
          </Text>
        </View>
        <View style={[styles.botonDesplegarIcono, desplegado && styles.botonDesplegarIconoAbierto]}>
          <Text style={styles.textoIconoDesplegar}>{desplegado ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {desplegado && (
        <View style={styles.contenidoDesplegable}>
          <Text style={styles.subtitulo}>
            Elige qué módulos específicos trabaja cada paciente. Al crear una tarea para este paciente,
            solo se mostrarán los módulos asignados aquí. Si no tiene ninguno asignado, se podrán usar todos.
          </Text>

          {cargando ? (
            <ActivityIndicator size="small" color="#0050b3" style={{ marginVertical: 15 }} />
          ) : pacientes.length === 0 ? (
            <Text style={styles.textoVacio}>
              No tienes pacientes asignados todavía en tu cartera. Asigna uno primero.
            </Text>
          ) : (
            <View>
              {/* SELECTOR DE PACIENTE */}
              <Text style={styles.labelCampo}>Selecciona el paciente:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  testID="picker-paciente-modulos"
                  selectedValue={pacienteSeleccionadoId}
                  onValueChange={(val) => setPacienteSeleccionadoId(val)}
                >
                  {pacientes.map((p) => (
                    <Picker.Item
                      key={p.id}
                      label={`${p.nombre_nino} (${p.nombre_familia})`}
                      value={p.id}
                    />
                  ))}
                </Picker>
              </View>

              {/* INFORMACIÓN DE ESTADO DEL PACIENTE */}
              <View style={styles.cajaEstado} testID="aviso-modulos-paciente">
                {totalAsignados === 0 ? (
                  <Text style={styles.textoAvisoSinModulos}>
                    ℹ️ <Text style={{ fontWeight: 'bold' }}>{pacienteActual?.nombre_nino || 'El paciente'}</Text> no
                    tiene módulos específicos asignados. Al crearle una tarea, podrás elegir{' '}
                    <Text style={{ fontWeight: 'bold' }}>cualquier módulo disponible</Text>.
                  </Text>
                ) : (
                  <Text style={styles.textoAvisoConModulos}>
                    ℹ️ <Text style={{ fontWeight: 'bold' }}>{pacienteActual?.nombre_nino || 'El paciente'}</Text> tiene{' '}
                    <Text style={{ fontWeight: 'bold' }}>{totalAsignados} módulo(s)</Text> asignado(s). Al crearle tareas,
                    únicamente se ofrecerán estos módulos.
                  </Text>
                )}
              </View>

              {/* MENSAJE DE ÉXITO O ERROR */}
              {mensaje && (
                <View
                  style={[
                    styles.cajaMensaje,
                    mensaje.tipo === 'ok' ? styles.cajaMensajeOk : styles.cajaMensajeError,
                  ]}
                >
                  <Text
                    style={
                      mensaje.tipo === 'ok' ? styles.textoMensajeOk : styles.textoMensajeError
                    }
                  >
                    {mensaje.texto}
                  </Text>
                </View>
              )}

              {/* LISTA DE MÓDULOS ASIGNABLES */}
              <Text style={[styles.labelCampo, { marginTop: 15 }]}>
                Módulos asignables ({modulosDisponibles.length}):
              </Text>

              {modulosDisponibles.length === 0 ? (
                <Text style={styles.textoVacio}>No hay módulos en el catálogo.</Text>
              ) : (
                <View style={styles.listaModulos}>
                  {modulosDisponibles.map((modulo) => {
                    const asignado = modulosAsignadosIds.has(modulo.id);
                    const enProceso = procesandoModuloId === modulo.id;
                    const esPropio = modulo.terapeuta_id === terapeutaIdActual;

                    return (
                      <View
                        key={modulo.id}
                        style={[
                          styles.tarjetaModulo,
                          asignado && styles.tarjetaModuloAsignado,
                        ]}
                        testID={`modulo-item-${modulo.id}`}
                      >
                        <View style={styles.infoModulo}>
                          <View style={styles.filaTituloModulo}>
                            <Text style={styles.tituloModulo}>{modulo.titulo}</Text>
                            <View
                              style={[
                                styles.badgeTipo,
                                esPropio ? styles.badgePersonal : styles.badgeComun,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.textoBadgeTipo,
                                  esPropio ? styles.textoBadgePersonal : styles.textoBadgeComun,
                                ]}
                              >
                                {esPropio ? 'Personal' : 'Común'}
                              </Text>
                            </View>
                          </View>

                          {modulo.objetivo ? (
                            <Text style={styles.objetivoModulo} numberOfLines={2}>
                              {modulo.objetivo}
                            </Text>
                          ) : null}

                          <Text
                            testID={`estado-modulo-${modulo.id}`}
                            style={[
                              styles.estadoTexto,
                              asignado ? styles.estadoTextoAsignado : styles.estadoTextoNoAsignado,
                            ]}
                          >
                            {asignado ? '✓ Asignado a este paciente' : '○ No asignado'}
                          </Text>
                        </View>

                        <TouchableOpacity
                          testID={`boton-toggle-modulo-${modulo.id}`}
                          style={[
                            styles.botonToggle,
                            asignado ? styles.botonDesasignar : styles.botonAsignar,
                            enProceso && styles.botonDeshabilitado,
                          ]}
                          onPress={() => toggleAsignacion(modulo)}
                          disabled={enProceso}
                        >
                          {enProceso ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.textoBotonToggle}>
                              {asignado ? 'Desasignar' : 'Asignar'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 10,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  cabeceraColapsable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  cabeceraTextoContenedor: {
    flex: 1,
    marginRight: 10,
  },
  subtituloColapsable: {
    fontSize: 12,
    color: '#8c8c8c',
    marginTop: 2,
  },
  botonDesplegarIcono: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f5ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#adc6ff',
  },
  botonDesplegarIconoAbierto: {
    backgroundColor: '#e6f7ff',
    borderColor: '#91d5ff',
  },
  textoIconoDesplegar: {
    fontSize: 14,
    color: '#0050b3',
    fontWeight: 'bold',
  },
  contenidoDesplegable: {
    marginTop: 12,
  },
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0050b3',
    marginBottom: 2,
  },
  subtitulo: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    lineHeight: 18,
  },
  labelCampo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    backgroundColor: '#fafafa',
    marginBottom: 12,
  },
  cajaEstado: {
    backgroundColor: '#f0f5ff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#adc6ff',
    marginBottom: 10,
  },
  textoAvisoSinModulos: {
    fontSize: 13,
    color: '#1d39c4',
    lineHeight: 18,
  },
  textoAvisoConModulos: {
    fontSize: 13,
    color: '#0050b3',
    lineHeight: 18,
  },
  cajaMensaje: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  cajaMensajeOk: {
    backgroundColor: '#f6ffed',
    borderWidth: 1,
    borderColor: '#b7eb8f',
  },
  textoMensajeOk: {
    color: '#389e0d',
    fontSize: 13,
  },
  cajaMensajeError: {
    backgroundColor: '#fff1f0',
    borderWidth: 1,
    borderColor: '#ffa39e',
  },
  textoMensajeError: {
    color: '#cf1322',
    fontSize: 13,
  },
  listaModulos: {
    marginTop: 6,
    gap: 8,
  },
  tarjetaModulo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  tarjetaModuloAsignado: {
    backgroundColor: '#f0f9ff',
    borderColor: '#91d5ff',
  },
  infoModulo: {
    flex: 1,
    marginRight: 10,
  },
  filaTituloModulo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 6,
  },
  tituloModulo: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#262626',
  },
  badgeTipo: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  textoBadgeTipo: {
    fontSize: 11,
    fontWeight: '500',
  },
  badgeComun: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  textoBadgeComun: {
    fontSize: 11,
    color: '#595959',
  },
  badgePersonal: {
    backgroundColor: '#f6ffed',
    borderWidth: 1,
    borderColor: '#b7eb8f',
  },
  textoBadgePersonal: {
    fontSize: 11,
    color: '#389e0d',
  },
  objetivoModulo: {
    fontSize: 12,
    color: '#595959',
    marginBottom: 4,
  },
  estadoTexto: {
    fontSize: 12,
    fontWeight: '600',
  },
  estadoTextoAsignado: {
    color: '#1890ff',
  },
  estadoTextoNoAsignado: {
    color: '#8c8c8c',
  },
  botonToggle: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    minWidth: 95,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonAsignar: {
    backgroundColor: '#0050b3',
  },
  botonDesasignar: {
    backgroundColor: '#ff4d4f',
  },
  textoBotonToggle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  textoVacio: {
    fontStyle: 'italic',
    color: '#888',
    marginVertical: 10,
  },
});
