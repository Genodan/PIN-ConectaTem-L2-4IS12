import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Button,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { obtenerTodosLosPacientes } from '../../services/tareasService';
import {
  PracticaFamilia,
  obtenerPracticasDelPaciente,
} from '../../services/panelFamiliaService';
import {
  obtenerPracticasConFeedbackFamilia,
  filtrarPorPalabra,
  obtenerModulosDeFeedbacks,
  filtrarPorModulos,
  filtrarPorPeriodoFecha,
  obtenerFechaEvaluacion,
} from '../../services/busquedaFeedbackService';
import { FeedbackDePractica } from '../../components/FeedbackDePractica';

type ModoBusqueda = 'palabra' | 'modulo' | 'fecha';

export default function BuscarFeedbacksScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ pacienteId?: string }>();

  const [pacientes, setPacientes] = useState<any[]>([]);
  const [pacienteActual, setPacienteActual] = useState<string | null>(params.pacienteId || null);

  const [cargando, setCargando] = useState(true);
  const [todasLasPracticas, setTodasLasPracticas] = useState<PracticaFamilia[]>([]);

  // Modos de búsqueda
  const [modo, setModo] = useState<ModoBusqueda>('palabra');

  // Estado del filtro por palabra
  const [palabra, setPalabra] = useState('');

  // Estado del filtro por módulo
  const [modulosSeleccionados, setModulosSeleccionados] = useState<string[]>([]);

  // Estado del filtro por fecha
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Cargar lista de pacientes (simulación de login/sesión)
  useEffect(() => {
    const cargar = async () => {
      try {
        const datos = await obtenerTodosLosPacientes();
        setPacientes(datos || []);
        if (!pacienteActual && datos && datos.length > 0) {
          setPacienteActual(datos[0].id);
        }
      } catch (e) {
        console.error('Error al cargar pacientes:', e);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  // Cargar prácticas del paciente actual
  useEffect(() => {
    if (!pacienteActual) return;
    const cargarPracticas = async () => {
      setCargando(true);
      try {
        const practicas = await obtenerPracticasDelPaciente(pacienteActual);
        setTodasLasPracticas(practicas || []);

        // Inicializar módulos seleccionados con todos los módulos disponibles
        const modulos = obtenerModulosDeFeedbacks(practicas || []);
        setModulosSeleccionados(modulos.map((m) => m.id));
      } catch (e) {
        console.error('Error al cargar prácticas:', e);
      } finally {
        setCargando(false);
      }
    };
    cargarPracticas();
  }, [pacienteActual]);

  // Lista base de prácticas evaluadas con feedback
  const feedbacksBase = useMemo(() => {
    return obtenerPracticasConFeedbackFamilia(todasLasPracticas);
  }, [todasLasPracticas]);

  // Módulos únicos disponibles para los checkboxes
  const modulosDisponibles = useMemo(() => {
    return obtenerModulosDeFeedbacks(feedbacksBase);
  }, [feedbacksBase]);

  // Alternar checkbox de un módulo
  const toggleModulo = (moduloId: string) => {
    setModulosSeleccionados((prev) => {
      if (prev.includes(moduloId)) {
        return prev.filter((id) => id !== moduloId);
      } else {
        return [...prev, moduloId];
      }
    });
  };

  const seleccionarTodosLosModulos = () => {
    setModulosSeleccionados(modulosDisponibles.map((m) => m.id));
  };

  const deseleccionarTodosLosModulos = () => {
    setModulosSeleccionados([]);
  };

  // Cálculo de resultados según el modo activo
  const resultados = useMemo(() => {
    if (modo === 'palabra') {
      return filtrarPorPalabra(feedbacksBase, palabra);
    }
    if (modo === 'modulo') {
      return filtrarPorModulos(feedbacksBase, modulosSeleccionados);
    }
    if (modo === 'fecha') {
      return filtrarPorPeriodoFecha(feedbacksBase, fechaInicio, fechaFin);
    }
    return feedbacksBase;
  }, [modo, feedbacksBase, palabra, modulosSeleccionados, fechaInicio, fechaFin]);

  const nombreNino = pacientes.find((p) => p.id === pacienteActual)?.nombre_nino;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* CABECERA Y SELECTOR DE PACIENTE */}
      <View style={styles.cabecera}>
        <Text style={styles.tituloPrincipal}>Búsqueda de Feedbacks</Text>
        <Text style={styles.subtitulo}>
          {nombreNino ? `Feedbacks del paciente: ${nombreNino}` : 'Consulta los feedbacks recibidos'}
        </Text>
      </View>

      {/* SELECTOR DE PACIENTE (SIMULADOR) */}
      {pacientes.length > 1 && (
        <View style={styles.tarjetaSelector}>
          <Text style={styles.labelSelector}>Cambiar paciente:</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={pacienteActual}
              onValueChange={(val) => setPacienteActual(val)}
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
        </View>
      )}

      {/* SELECTOR DE MODO DE BÚSQUEDA */}
      <View style={styles.seccionPestanas}>
        <Text style={styles.labelFiltro}>Selecciona cómo quieres buscar:</Text>
        <View style={styles.contenedorPestanas}>
          <TouchableOpacity
            testID="tab-palabra"
            style={[styles.pestana, modo === 'palabra' && styles.pestanaActiva]}
            onPress={() => setModo('palabra')}
            accessibilityRole="tab"
            accessibilityState={{ selected: modo === 'palabra' }}
          >
            <Text style={[styles.textoPestana, modo === 'palabra' && styles.textoPestanaActiva]}>
              Por palabra
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="tab-modulo"
            style={[styles.pestana, modo === 'modulo' && styles.pestanaActiva]}
            onPress={() => setModo('modulo')}
            accessibilityRole="tab"
            accessibilityState={{ selected: modo === 'modulo' }}
          >
            <Text style={[styles.textoPestana, modo === 'modulo' && styles.textoPestanaActiva]}>
              Por módulo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="tab-fecha"
            style={[styles.pestana, modo === 'fecha' && styles.pestanaActiva]}
            onPress={() => setModo('fecha')}
            accessibilityRole="tab"
            accessibilityState={{ selected: modo === 'fecha' }}
          >
            <Text style={[styles.textoPestana, modo === 'fecha' && styles.textoPestanaActiva]}>
              Por fecha
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* FILTROS SEGÚN EL MODO SELECCIONADO */}
      <View style={styles.tarjetaFiltro}>
        {/* 1. MODO: POR PALABRA */}
        {modo === 'palabra' && (
          <View>
            <Text style={styles.tituloModo}>🔍 Búsqueda por palabra clave</Text>
            <Text style={styles.descripcionModo}>
              Busca en el nombre del módulo, la transcripción del audio y el resumen generado por IA o escrito.
            </Text>
            <TextInput
              testID="input-buscar-palabra"
              style={styles.inputTexto}
              placeholder="Escribe una palabra (ej: imitar, pompero, espejo...)"
              value={palabra}
              onChangeText={setPalabra}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {palabra.trim().length > 0 && (
              <TouchableOpacity style={styles.botonLimpiar} onPress={() => setPalabra('')}>
                <Text style={styles.textoBotonLimpiar}>Limpiar búsqueda</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 2. MODO: POR MÓDULO (CHECKBOXES) */}
        {modo === 'modulo' && (
          <View>
            <Text style={styles.tituloModo}>📦 Filtrar por módulos</Text>
            <Text style={styles.descripcionModo}>
              Marca o desmarca los módulos para ver sus feedbacks:
            </Text>

            {modulosDisponibles.length === 0 ? (
              <Text style={styles.textoAviso}>No hay módulos con feedbacks evaluados.</Text>
            ) : (
              <View>
                <View style={styles.filaAccionesModulos}>
                  <TouchableOpacity
                    style={styles.botonAccionModulo}
                    onPress={seleccionarTodosLosModulos}
                  >
                    <Text style={styles.textoAccionModulo}>Marcar todos</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.botonAccionModulo}
                    onPress={deseleccionarTodosLosModulos}
                  >
                    <Text style={styles.textoAccionModulo}>Desmarcar todos</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.listaCheckboxes}>
                  {modulosDisponibles.map((mod) => {
                    const seleccionado = modulosSeleccionados.includes(mod.id);
                    return (
                      <TouchableOpacity
                        key={mod.id}
                        testID={`checkbox-modulo-${mod.id}`}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: seleccionado }}
                        style={[
                          styles.filaCheckbox,
                          seleccionado && styles.filaCheckboxSeleccionada,
                        ]}
                        onPress={() => toggleModulo(mod.id)}
                      >
                        <View style={[styles.cajaCheckbox, seleccionado && styles.cajaCheckboxActiva]}>
                          {seleccionado && <Text style={styles.tickCheckbox}>✓</Text>}
                        </View>
                        <Text style={styles.textoModuloCheckbox}>
                          {mod.titulo}{' '}
                          <Text style={styles.contadorModulo}>
                            ({mod.cantidad} {mod.cantidad === 1 ? 'feedback' : 'feedbacks'})
                          </Text>
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* 3. MODO: POR FECHA (PERIODO) */}
        {modo === 'fecha' && (
          <View>
            <Text style={styles.tituloModo}>📅 Filtrar por periodo de evaluación</Text>
            <Text style={styles.descripcionModo}>
              Introduce las dos fechas del periodo para ver los feedbacks evaluados en ese intervalo:
            </Text>

            <View style={styles.filaFechas}>
              <View style={styles.columnaFecha}>
                <Text style={styles.labelFecha}>Fecha inicio (desde):</Text>
                <TextInput
                  testID="input-fecha-inicio"
                  style={styles.inputTexto}
                  placeholder="DD-MM-AAAA"
                  value={fechaInicio}
                  onChangeText={setFechaInicio}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.columnaFecha}>
                <Text style={styles.labelFecha}>Fecha fin (hasta):</Text>
                <TextInput
                  testID="input-fecha-fin"
                  style={styles.inputTexto}
                  placeholder="DD-MM-AAAA"
                  value={fechaFin}
                  onChangeText={setFechaFin}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <Text style={styles.formatoHint}>
              Formatos válidos: AAAA-MM-DD (ej: 2026-10-01) o DD/MM/AAAA (ej: 01/10/2026).
            </Text>

            {(fechaInicio.length > 0 || fechaFin.length > 0) && (
              <TouchableOpacity
                style={styles.botonLimpiar}
                onPress={() => {
                  setFechaInicio('');
                  setFechaFin('');
                }}
              >
                <Text style={styles.textoBotonLimpiar}>Limpiar fechas</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* SECCIÓN DE RESULTADOS */}
      <View style={styles.seccionResultados}>
        <View style={styles.cabeceraResultados}>
          <Text style={styles.tituloResultados}>
            {`Resultados (${resultados.length})`}
          </Text>
        </View>

        {cargando ? (
          <ActivityIndicator size="large" color="#0050b3" style={{ marginVertical: 20 }} />
        ) : feedbacksBase.length === 0 ? (
          <View style={styles.tarjetaVacia}>
            <Text style={styles.textoVacio}>
              Todavía no hay ningún feedback evaluado para este paciente.
            </Text>
          </View>
        ) : resultados.length === 0 ? (
          <View style={styles.tarjetaVacia}>
            <Text style={styles.textoVacio}>
              No se encontraron feedbacks para el criterio de búsqueda seleccionado.
            </Text>
          </View>
        ) : (
          resultados.map((tarea) => {
            const fechaEval = obtenerFechaEvaluacion(tarea);
            const fechaFormateada = fechaEval
              ? fechaEval.toLocaleDateString('es-ES')
              : 'Fecha no disponible';

            return (
              <View key={tarea.id} style={styles.tarjetaResultado} testID="tarjeta-resultado-feedback">
                <View style={styles.cabeceraResultado}>
                  <Text style={styles.tituloModuloResultado}>
                    Módulo: {tarea.modulos?.titulo || 'Módulo asignado'}
                  </Text>
                  <Text style={styles.badgeFechaEvaluado}>
                    Evaluado el {fechaFormateada}
                  </Text>
                </View>

                {tarea.feedback && <FeedbackDePractica feedback={tarea.feedback} />}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  cabecera: {
    marginBottom: 16,
  },
  tituloPrincipal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F5C8C',
    marginBottom: 4,
  },
  subtitulo: {
    fontSize: 14,
    color: '#666',
  },
  tarjetaSelector: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  labelSelector: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 6,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  seccionPestanas: {
    marginBottom: 16,
  },
  labelFiltro: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  contenedorPestanas: {
    flexDirection: 'row',
    gap: 8,
  },
  pestana: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#e6f0fa',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cfe2f3',
  },
  pestanaActiva: {
    backgroundColor: '#1F5C8C',
    borderColor: '#1F5C8C',
  },
  textoPestana: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F5C8C',
  },
  textoPestanaActiva: {
    color: '#fff',
  },
  tarjetaFiltro: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#d9e2ec',
    elevation: 1,
  },
  tituloModo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F5C8C',
    marginBottom: 4,
  },
  descripcionModo: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  inputTexto: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  botonLimpiar: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  textoBotonLimpiar: {
    color: '#0050b3',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  filaAccionesModulos: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  botonAccionModulo: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f0f5ff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#adc6ff',
  },
  textoAccionModulo: {
    color: '#1d39c4',
    fontSize: 12,
    fontWeight: '600',
  },
  listaCheckboxes: {
    gap: 8,
  },
  filaCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fafafa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  filaCheckboxSeleccionada: {
    backgroundColor: '#f0f7ff',
    borderColor: '#91d5ff',
  },
  cajaCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#888',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#fff',
  },
  cajaCheckboxActiva: {
    backgroundColor: '#1F5C8C',
    borderColor: '#1F5C8C',
  },
  tickCheckbox: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  textoModuloCheckbox: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  contadorModulo: {
    color: '#666',
    fontSize: 12,
  },
  textoAviso: {
    fontStyle: 'italic',
    color: '#888',
    fontSize: 13,
  },
  filaFechas: {
    flexDirection: 'row',
    gap: 12,
  },
  columnaFecha: {
    flex: 1,
  },
  labelFecha: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
  },
  formatoHint: {
    fontSize: 11,
    color: '#888',
    marginTop: 6,
  },
  seccionResultados: {
    marginTop: 8,
  },
  cabeceraResultados: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tituloResultados: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  tarjetaResultado: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
  },
  cabeceraResultado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  tituloModuloResultado: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F5C8C',
  },
  badgeFechaEvaluado: {
    fontSize: 11,
    color: '#0050b3',
    backgroundColor: '#e6f7ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontWeight: '600',
  },
  tarjetaVacia: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textoVacio: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
