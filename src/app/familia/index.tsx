import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Button, Alert, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import { obtenerTodosLosPacientes, obtenerTareasPendientes, enviarPractica } from '../../services/tareasService';

export default function InicioFamilia() {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [pacienteActual, setPacienteActual] = useState<string | null>(null);
  const [tareas, setTareas] = useState<any[]>([]);
  const [tareaSeleccionada, setTareaSeleccionada] = useState<string | null>(null);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<{ uri: string; name: string } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const cargarPacientes = async () => {
      try {
        const datos = await obtenerTodosLosPacientes();
        setPacientes(datos || []);
        if (datos && datos.length > 0) setPacienteActual(datos[0].id);
      } catch (error: any) {
        Alert.alert('Error', error.message);
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

  const cargarTareas = async () => {
    if (!pacienteActual) return;
    try {
      const datos = await obtenerTareasPendientes(pacienteActual);
      setTareas(datos || []);
      setTareaSeleccionada(null);
      setArchivoSeleccionado(null);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // Abrir el selector de archivos del dispositivo/PC
  const seleccionarArchivo = async () => {
    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Permite cualquier tipo de archivo (vídeo, audio, PDF, etc.)
        copyToCacheDirectory: true,
      });

      if (!resultado.canceled && resultado.assets && resultado.assets.length > 0) {
        const file = resultado.assets[0];
        setArchivoSeleccionado({
          uri: file.uri,
          name: file.name,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar el archivo.');
    }
  };

  const manejarEnvioVideo = async (tareaId: string) => {
    if (!archivoSeleccionado) {
      Alert.alert('Aviso', 'Por favor, selecciona un archivo o vídeo antes de enviar.');
      return;
    }

    setEnviando(true);
    try {
      // Guardamos la ruta/nombre del archivo seleccionado en la columna video_url
      await enviarPractica(tareaId, archivoSeleccionado.name || archivoSeleccionado.uri);
      
      Alert.alert('¡Éxito!', `Archivo "${archivoSeleccionado.name}" enviado correctamente.`);
      await cargarTareas(); // Refresca la lista y pasa la tarea a completada
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#0000ff" /></View>;
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
                  setArchivoSeleccionado(null); // Resetea el archivo al cambiar de tarea
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

                  {/* SECCIÓN DE SELECCIÓN DE ARCHIVO */}
                  <View style={styles.seccionArchivo}>
                    <Text style={styles.label}>Adjuntar vídeo o archivo de práctica:</Text>
                    
                    <TouchableOpacity style={styles.botonAdjuntar} onPress={seleccionarArchivo}>
                      <Text style={styles.textoBotonAdjuntar}>
                        📁 {archivoSeleccionado ? "Cambiar archivo" : "Seleccionar archivo/vídeo"}
                      </Text>
                    </TouchableOpacity>

                    {archivoSeleccionado && (
                      <Text style={styles.textoArchivoSeleccionado}>
                        Selected: <Text style={{ fontWeight: 'bold' }}>{archivoSeleccionado.name}</Text>
                      </Text>
                    )}
                  </View>

                  <View style={styles.botonContainer}>
                    <Button 
                      title={enviando ? "Enviando..." : "📤 Enviar Práctica"} 
                      color="#28a745"
                      onPress={() => manejarEnvioVideo(tarea.id)}
                      disabled={enviando || !archivoSeleccionado}
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loginContainer: { padding: 15, backgroundColor: '#e6f7ff', borderRadius: 10, borderWidth: 1, borderColor: '#91d5ff' },
  tituloSecundario: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#0050b3' },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, backgroundColor: '#fff' },
  separador: { height: 20 },
  titulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  textoVacio: { fontStyle: 'italic', color: '#666', textAlign: 'center', marginTop: 20 },
  tarjetaTarea: { backgroundColor: '#fff', borderRadius: 8, marginBottom: 15, padding: 15, elevation: 2 },
  cabeceraTarea: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tituloModulo: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  estadoBadge: { color: '#856404', fontWeight: 'bold', fontSize: 12, backgroundColor: '#fff3cd', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  detalleTarea: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderColor: '#eee' },
  label: { fontWeight: 'bold', marginTop: 10, color: '#555' },
  texto: { color: '#333', marginBottom: 5 },
  enlace: { color: '#007bff', textDecorationLine: 'underline', marginBottom: 15 },
  seccionArchivo: { marginVertical: 10, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 5, borderWidth: 1, borderColor: '#e0e0e0' },
  botonAdjuntar: { backgroundColor: '#e9ecef', padding: 10, borderRadius: 5, alignItems: 'center', marginTop: 5 },
  textoBotonAdjuntar: { color: '#495057', fontWeight: 'bold' },
  textoArchivoSeleccionado: { marginTop: 8, color: '#28a745', fontSize: 13 },
  botonContainer: { marginTop: 15 }
});