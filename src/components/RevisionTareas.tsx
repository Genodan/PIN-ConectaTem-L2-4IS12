import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Linking, TouchableOpacity, Alert } from 'react-native';
import { obtenerTareasCompletadas } from '../services/tareasService';
import { DarFeedback } from './DarFeedback';

export const RevisionTareas = ({ terapeutaIdActual }: { terapeutaIdActual: string }) => {
  const [tareas, setTareas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargarTareas = async () => {
    if (!terapeutaIdActual) return;
    setCargando(true);
    try {
      const datos = await obtenerTareasCompletadas(terapeutaIdActual);
      setTareas(datos || []);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setCargando(false);
    }
  };

  // Recargar la lista si el terapeuta cambia en el simulador
  useEffect(() => {
    setAviso(null);
    cargarTareas();
  }, [terapeutaIdActual]);

  // UT 1099: tras enviar el feedback, la práctica sale de la bandeja
  const alEnviarFeedback = () => {
    setAviso('Feedback enviado. La práctica pasa a «Con feedback».');
    cargarTareas();
  };

  if (cargando) return <ActivityIndicator size="small" color="#0000ff" />;

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Bandeja de Entrada (Vídeos Recibidos)</Text>
      {aviso && <Text style={styles.aviso}>{aviso}</Text>}
      
      {tareas.length === 0 ? (
        <Text style={styles.textoVacio}>No tienes tareas pendientes de revisar.</Text>
      ) : (
        tareas.map((tarea) => {
          const paciente = tarea.pacientes;
          const modulo = tarea.modulos;
          // Formateamos la fecha si existe
          const fechaEnvio = tarea.fecha_envio 
            ? new Date(tarea.fecha_envio).toLocaleDateString() 
            : 'Reciente';

          return (
            <View key={tarea.id} style={styles.tarjeta}>
              <View style={styles.cabeceraTarjeta}>
                <Text style={styles.paciente}>
                  Niño: {paciente?.nombre_nino} ({paciente?.nombre_familia})
                </Text>
                <Text style={styles.estadoBadge}>Por revisar</Text>
              </View>
              
              <Text style={styles.modulo}>Módulo: {modulo?.titulo}</Text>
              <Text style={styles.fecha}>Enviado el: {fechaEnvio}</Text>

              {tarea.video_url && (
                <TouchableOpacity 
                  style={styles.botonVideo} 
                  onPress={() => Linking.openURL(tarea.video_url)}
                >
                  <Text style={styles.textoBotonVideo}>▶️ Ver vídeo de la práctica</Text>
                </TouchableOpacity>
              )}

              <DarFeedback practicaId={tarea.id} onEnviado={alEnviarFeedback} />
            </View>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 20, padding: 15, backgroundColor: '#f0f8ff', borderRadius: 10, borderWidth: 1, borderColor: '#bae7ff' },
  titulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#0050b3' },
  aviso: { color: '#237804', fontWeight: 'bold', marginBottom: 12 },
  textoVacio: { fontStyle: 'italic', color: '#666' },
  tarjeta: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 2, borderWidth: 1, borderColor: '#e6e6e6' },
  cabeceraTarjeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  paciente: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  estadoBadge: { color: '#004085', fontWeight: 'bold', fontSize: 12, backgroundColor: '#cce5ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  modulo: { color: '#555', marginBottom: 4 },
  fecha: { color: '#888', fontSize: 12, marginBottom: 12 },
  botonVideo: { backgroundColor: '#e6f7ff', padding: 10, borderRadius: 5, alignItems: 'center', borderWidth: 1, borderColor: '#91d5ff' },
  textoBotonVideo: { color: '#0050b3', fontWeight: 'bold' }
});