import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Button,
  Alert,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  obtenerTodosLosPacientes,
  obtenerTareasPendientes,
  enviarPractica,
} from '../../services/tareasService';
import { VerFeedback } from '../../components/VerFeedback';

// Helper compatible con Web y Móvil para mostrar alertas y notificaciones
const mostrarAlerta = (titulo: string, mensaje?: string) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${titulo}${mensaje ? `\n\n${mensaje}` : ''}`);
  } else {
    Alert.alert(titulo, mensaje);
  }
};

const formatearSegundos = (segundos: number) => {
  const min = Math.floor(segundos / 60);
  const sec = segundos % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

export default function InicioFamilia() {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [pacienteActual, setPacienteActual] = useState<string | null>(null);
  const [tareas, setTareas] = useState<any[]>([]);
  const [tareaSeleccionada, setTareaSeleccionada] = useState<string | null>(null);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<{
    uri: string;
    name: string;
    tipo?: 'archivo' | 'grabacion';
  } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [grabandoNativo, setGrabandoNativo] = useState(false);

  // Estados para grabación y modal de notificación
  const [modalNotificacionVisible, setModalNotificacionVisible] = useState(false);
  const [grabandoEnWeb, setGrabandoEnWeb] = useState(false);
  const [tiempoGrabacion, setTiempoGrabacion] = useState(0);

  const mediaRecorderRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const chunksRef = useRef<any[]>([]);
  const videoWebRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const cargarPacientes = async () => {
      try {
        const datos = await obtenerTodosLosPacientes();
        setPacientes(datos || []);
        if (datos && datos.length > 0) setPacienteActual(datos[0].id);
      } catch (error: any) {
        mostrarAlerta('Error', error.message);
      } finally {
        setCargando(false);
      }
    };
    cargarPacientes();
  }, []);

  useEffect(() => {
    if (pacienteActual) {
      cargarTareas();
    }
  }, [pacienteActual]);

  // Asignar el stream al elemento de vídeo en Web cuando se abre la cámara
  useEffect(() => {
    if (grabandoEnWeb && videoWebRef.current && streamRef.current) {
      videoWebRef.current.srcObject = streamRef.current;
      videoWebRef.current.play().catch(() => {});
    }
  }, [grabandoEnWeb]);

  // Limpiar recursos al desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((track: any) => track.stop());
        } catch (e) {}
      }
    };
  }, []);

  const cargarTareas = async () => {
    if (!pacienteActual) return;
    try {
      const datos = await obtenerTareasPendientes(pacienteActual);
      setTareas(datos || []);
      setTareaSeleccionada(null);
      setArchivoSeleccionado(null);
    } catch (error: any) {
      mostrarAlerta('Error', error.message);
    }
  };

  // Abrir el selector de archivos del dispositivo/PC
  const seleccionarArchivo = async () => {
    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!resultado.canceled && resultado.assets && resultado.assets.length > 0) {
        const file = resultado.assets[0];
        setArchivoSeleccionado({
          uri: file.uri,
          name: file.name,
          tipo: 'archivo',
        });
      }
    } catch (error) {
      mostrarAlerta('Error', 'No se pudo seleccionar el archivo.');
    }
  };

  // Muestra la notificación de activación de cámara
  const solicitarGrabarVideo = () => {
    setModalNotificacionVisible(true);
    // Para plataformas nativas y tests que escuchan Alert.alert
    Alert.alert(
      'Activar cámara',
      'Se va a activar la cámara para comenzar a grabar el vídeo de la tarea.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => setModalNotificacionVisible(false),
        },
        {
          text: 'Activar cámara',
          onPress: () => {
            setModalNotificacionVisible(false);
            ejecutarGrabacion();
          },
        },
      ]
    );
  };

  const confirmarYGrabarDesdeModal = () => {
    setModalNotificacionVisible(false);
    ejecutarGrabacion();
  };

  // Ejecuta la grabación según el entorno (Web o Nativo móvil)
  const ejecutarGrabacion = async () => {
    if (
      Platform.OS === 'web' &&
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function'
    ) {
      await iniciarGrabacionWeb();
    } else {
      await iniciarGrabacionNativa();
    }
  };

  // Grabación en Web usando la webcam del navegador
  const iniciarGrabacionWeb = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;
      setGrabandoEnWeb(true);
      setTiempoGrabacion(0);
      chunksRef.current = [];

      let mimeType = 'video/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
        }
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event: any) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250);

      timerRef.current = setInterval(() => {
        setTiempoGrabacion((prev) => prev + 1);
      }, 1000);
    } catch (error: any) {
      console.error('Error al iniciar cámara en web:', error);
      mostrarAlerta(
        'Permiso de cámara',
        'No se pudo activar la cámara web. Asegúrate de permitir el acceso en el navegador.'
      );
      detenerGrabacionWeb(false);
    }
  };

  const detenerGrabacionWeb = (guardar: boolean = true) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        if (guardar && chunksRef.current.length > 0) {
          const mime = mediaRecorderRef.current?.mimeType || 'video/webm';
          const ext = mime.includes('mp4') ? 'mp4' : 'webm';
          const blob = new Blob(chunksRef.current, { type: mime });
          const videoUrl = URL.createObjectURL(blob);
          const nombreVideo = `video_grabado_${Date.now()}.${ext}`;

          setArchivoSeleccionado({
            uri: videoUrl,
            name: nombreVideo,
            tipo: 'grabacion',
          });

          mostrarAlerta(
            'Vídeo grabado',
            `El vídeo "${nombreVideo}" ha quedado adjuntado. Ahora puedes subirlo pulsando "Enviar Práctica".`
          );
        }
        chunksRef.current = [];
      };

      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track: any) => track.stop());
      } catch (e) {}
      streamRef.current = null;
    }

    setGrabandoEnWeb(false);
  };

  // Grabación en iOS / Android nativo mediante expo-image-picker
  const iniciarGrabacionNativa = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permisoCamara = await ImagePicker.requestCameraPermissionsAsync();

        if (!permisoCamara.granted) {
          mostrarAlerta(
            'Permiso requerido',
            'Es necesario autorizar el acceso a la cámara para grabar el vídeo.'
          );
          return;
        }
      }

      setGrabandoNativo(true);
      const resultado = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 1,
      });

      if (!resultado.canceled && resultado.assets && resultado.assets.length > 0) {
        const video = resultado.assets[0];
        let nombreVideo = video.fileName;
        if (!nombreVideo) {
          const partes = video.uri.split('/');
          const ultimaParte = partes[partes.length - 1];
          nombreVideo =
            ultimaParte && ultimaParte.includes('.') ? ultimaParte : `grabacion_${Date.now()}.mp4`;
        }

        setArchivoSeleccionado({
          uri: video.uri,
          name: nombreVideo,
          tipo: 'grabacion',
        });

        mostrarAlerta(
          'Vídeo grabado',
          `El vídeo "${nombreVideo}" ha quedado adjuntado. Puedes revisarlo o subirlo pulsando "Enviar Práctica".`
        );
      }
    } catch (error) {
      mostrarAlerta('Error', 'No se pudo activar la cámara o grabar el vídeo.');
    } finally {
      setGrabandoNativo(false);
    }
  };

  const manejarEnvioVideo = async (tareaId: string) => {
    if (!archivoSeleccionado) {
      mostrarAlerta('Aviso', 'Por favor, selecciona un archivo o graba un vídeo antes de enviar.');
      return;
    }

    setEnviando(true);
    try {
      // IMPORTANTE: Le pasamos la URI real para que el servicio pueda extraer el archivo físico
      await enviarPractica(tareaId, archivoSeleccionado.uri);
      mostrarAlerta('¡Éxito!', `"${archivoSeleccionado.name}" enviado correctamente.`);
      await cargarTareas();
    } catch (error: any) {
      mostrarAlerta('Error', error.message);
    } finally {
      setEnviando(false);
    }
  };

  const estaGrabando = grabandoNativo || grabandoEnWeb;

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* LOGIN SIMULADO */}
      <View style={styles.loginContainer}>
        <Text style={styles.tituloSecundario}>¿Qué familia eres? (Simulación Login)</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={pacienteActual}
            onValueChange={(itemValue) => setPacienteActual(itemValue)}
          >
            {pacientes.map((p) => (
              <Picker.Item key={p.id} label={`${p.nombre_nino} (${p.nombre_familia})`} value={p.id} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.separador} />
      <Text style={styles.titulo}>Tareas Pendientes</Text>

      {tareas.length === 0 ? (
        <Text style={styles.textoVacio}>No hay tareas pendientes para este paciente.</Text>
      ) : (
        tareas.map((tarea) => {
          const esSeleccionada = tareaSeleccionada === tarea.id;
          const modulo = tarea.modulos;

          const materialesTexto = Array.isArray(modulo?.ideas_materiales)
            ? modulo.ideas_materiales.join(', ')
            : modulo?.ideas_materiales || 'No especificados';

          return (
            <View key={tarea.id} style={styles.tarjetaTarea}>
              <TouchableOpacity
                style={styles.cabeceraTarea}
                onPress={() => {
                  setTareaSeleccionada(esSeleccionada ? null : tarea.id);
                  setArchivoSeleccionado(null);
                }}
              >
                <Text style={styles.tituloModulo}>{modulo?.titulo || 'Módulo asignado'}</Text>
                <Text style={styles.estadoBadge}>{tarea.estado}</Text>
              </TouchableOpacity>

              {esSeleccionada && (
                <View style={styles.detalleTarea}>
                  <Text style={styles.label}>Objetivo:</Text>
                  <Text style={styles.texto}>{modulo?.objetivo || 'Sin objetivo'}</Text>

                  <Text style={styles.label}>Ideas de materiales:</Text>
                  <Text style={styles.texto}>{materialesTexto}</Text>

                  <Text style={styles.label}>Vídeo Guía:</Text>
                  <Text style={styles.enlace}>{modulo?.video_guia_url || 'Sin enlace'}</Text>

                  {/* SECCIÓN DE SELECCIÓN DE ARCHIVO Y GRABACIÓN */}
                  <View style={styles.seccionArchivo}>
                    <Text style={styles.label}>Adjuntar vídeo o archivo de práctica:</Text>

                    <View style={styles.filaBotones}>
                      <TouchableOpacity
                        style={styles.botonAdjuntar}
                        onPress={seleccionarArchivo}
                        disabled={estaGrabando || enviando}
                      >
                        <Text style={styles.textoBotonAdjuntar}>
                          📁 {archivoSeleccionado && archivoSeleccionado.tipo === 'archivo'
                            ? 'Cambiar archivo'
                            : 'Seleccionar archivo/vídeo'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.botonGrabar}
                        onPress={solicitarGrabarVideo}
                        disabled={estaGrabando || enviando}
                      >
                        <Text style={styles.textoBotonGrabar}>
                          {estaGrabando
                            ? '🎥 Grabando...'
                            : archivoSeleccionado && archivoSeleccionado.tipo === 'grabacion'
                            ? '🎥 Grabar de nuevo'
                            : '🎥 Grabar'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {archivoSeleccionado && (
                      <View style={styles.contenedorArchivoSeleccionado}>
                        <Text style={styles.textoArchivoSeleccionado}>
                          {archivoSeleccionado.tipo === 'grabacion'
                            ? '🎥 Vídeo grabado: '
                            : '📁 Adjuntado: '}
                          <Text style={{ fontWeight: 'bold' }}>{archivoSeleccionado.name}</Text>
                        </Text>
                        <TouchableOpacity onPress={() => setArchivoSeleccionado(null)}>
                          <Text style={styles.botonEliminarArchivo}>Quitar</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <View style={styles.botonContainer}>
                    <Button
                      title={enviando ? 'Enviando...' : '📤 Enviar Práctica'}
                      color="#28a745"
                      onPress={() => manejarEnvioVideo(tarea.id)}
                      disabled={enviando || estaGrabando || !archivoSeleccionado}
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })
      )}

      {/* VER FEEDBACK: notas de voz de la terapeuta */}
      <VerFeedback pacienteId={pacienteActual} />

      {/* NOTIFICACIÓN / MODAL DE ACTIVACIÓN DE CÁMARA */}
      <Modal
        visible={modalNotificacionVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalNotificacionVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalIcono}>📷</Text>
            <Text style={styles.modalTitulo}>Activar Cámara</Text>
            <Text style={styles.modalMensaje}>
              Se va a activar la cámara para comenzar a grabar el vídeo de la tarea.
            </Text>
            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.botonModalCancelar}
                onPress={() => setModalNotificacionVisible(false)}
              >
                <Text style={styles.textoModalCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.botonModalAceptar}
                onPress={confirmarYGrabarDesdeModal}
              >
                <Text style={styles.textoModalAceptar}>Activar y Grabar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* VISTA DE GRABACIÓN EN VIVO (WEB) */}
      <Modal
        visible={grabandoEnWeb}
        transparent={true}
        animationType="slide"
        onRequestClose={() => detenerGrabacionWeb(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCamaraCard}>
            <View style={styles.cabeceraCamara}>
              <View style={styles.indicadorGrabando}>
                <View style={styles.puntoRojo} />
                <Text style={styles.textoGrabando}>
                  Grabando: {formatearSegundos(tiempoGrabacion)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => detenerGrabacionWeb(false)}>
                <Text style={styles.textoCerrarCamara}>✕ Cancelar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.contenedorVideo}>
              {Platform.OS === 'web' &&
                React.createElement('video', {
                  ref: videoWebRef,
                  autoPlay: true,
                  playsInline: true,
                  muted: true,
                  style: {
                    width: '100%',
                    height: 280,
                    backgroundColor: '#000',
                    borderRadius: 8,
                    objectFit: 'cover',
                  },
                })}
            </View>

            <View style={styles.accionesCamara}>
              <TouchableOpacity
                style={styles.botonDetenerGrabacion}
                onPress={() => detenerGrabacionWeb(true)}
              >
                <Text style={styles.textoBotonDetener}>⏹️ Detener y adjuntar vídeo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loginContainer: {
    padding: 15,
    backgroundColor: '#e6f7ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#91d5ff',
  },
  tituloSecundario: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#0050b3' },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, backgroundColor: '#fff' },
  separador: { height: 20 },
  titulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  textoVacio: { fontStyle: 'italic', color: '#666', textAlign: 'center', marginTop: 20 },
  tarjetaTarea: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    padding: 15,
    elevation: 2,
  },
  cabeceraTarea: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tituloModulo: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  estadoBadge: {
    color: '#856404',
    fontWeight: 'bold',
    fontSize: 12,
    backgroundColor: '#fff3cd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  detalleTarea: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderColor: '#eee' },
  label: { fontWeight: 'bold', marginTop: 10, color: '#555' },
  texto: { color: '#333', marginBottom: 5 },
  enlace: { color: '#007bff', textDecorationLine: 'underline', marginBottom: 15 },
  seccionArchivo: {
    marginVertical: 10,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filaBotones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  botonAdjuntar: {
    flex: 1,
    backgroundColor: '#e9ecef',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  textoBotonAdjuntar: {
    color: '#495057',
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center',
  },
  botonGrabar: {
    flex: 1,
    backgroundColor: '#e3f2fd',
    borderColor: '#90caf9',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  textoBotonGrabar: {
    color: '#0d47a1',
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center',
  },
  contenedorArchivoSeleccionado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#edf7ed',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  textoArchivoSeleccionado: {
    color: '#2e7d32',
    fontSize: 13,
    flex: 1,
  },
  botonEliminarArchivo: {
    color: '#d32f2f',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  botonContainer: { marginTop: 15 },

  // Estilos de los modales
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalIcono: {
    fontSize: 44,
    marginBottom: 12,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMensaje: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalBotones: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  botonModalCancelar: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f1f3f5',
    alignItems: 'center',
  },
  textoModalCancelar: {
    color: '#495057',
    fontWeight: 'bold',
    fontSize: 14,
  },
  botonModalAceptar: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007bff',
    alignItems: 'center',
  },
  textoModalAceptar: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  // Estilos de la vista de grabación de vídeo
  modalCamaraCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    width: '100%',
    maxWidth: 500,
    elevation: 8,
  },
  cabeceraCamara: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  indicadorGrabando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  puntoRojo: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e53935',
  },
  textoGrabando: {
    fontWeight: 'bold',
    color: '#c62828',
    fontSize: 14,
  },
  textoCerrarCamara: {
    color: '#666',
    fontWeight: 'bold',
    padding: 6,
  },
  contenedorVideo: {
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 14,
  },
  accionesCamara: {
    alignItems: 'center',
  },
  botonDetenerGrabacion: {
    backgroundColor: '#d32f2f',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  textoBotonDetener: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
