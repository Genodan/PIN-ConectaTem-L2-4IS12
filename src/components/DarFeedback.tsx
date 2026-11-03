import React, { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View, ActivityIndicator, Alert } from 'react-native';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { 
  crearFeedbackInicial, 
  procesarAudioConIA, 
  actualizarFeedbackFinal 
} from '../services/feedbackService';

type Mensaje = { tipo: 'ok' | 'error'; texto: string };
const textoDeError = (error: unknown) => (error instanceof Error ? error.message : 'Error desconocido');

const formatearDuracion = (milisegundos: number) => {
  if (!Number.isFinite(milisegundos) || milisegundos < 0) return '0:00';
  const total = Math.floor(milisegundos / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

const EscucharGrabacion = ({ uri }: { uri: string }) => {
  const reproductor = useAudioPlayer(uri);
  const estado = useAudioPlayerStatus(reproductor);

  const alPulsar = async () => {
    if (estado.playing) {
      reproductor.pause();
      return;
    }
    if (estado.didJustFinish || (estado.duration > 0 && estado.currentTime >= estado.duration)) {
      await reproductor.seekTo(0);
    }
    reproductor.play();
  };

  return (
    <View style={styles.escuchar}>
      <Button title={estado.playing ? 'Pausar' : 'Escuchar grabación'} onPress={alPulsar} />
      <Text style={styles.tiempo}>
        {formatearDuracion(estado.currentTime * 1000)} / {formatearDuracion(estado.duration * 1000)}
      </Text>
    </View>
  );
};

export const DarFeedback = ({ practicaId, onEnviado }: { practicaId: string; onEnviado: () => void }) => {
  const grabadora = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const estadoGrabadora = useAudioRecorderState(grabadora);
  
  const [uriAudio, setUriAudio] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [procesando, setProcesando] = useState(false);

  const [feedbackBD, setFeedbackBD] = useState<any | null>(null);
  // UN SOLO CAMPO DE TEXTO EDITABLE
  const [textoUnico, setTextoUnico] = useState<string>('');

  const grabar = async () => {
    setMensaje(null);
    setFeedbackBD(null);
    try {
      const permiso = await requestRecordingPermissionsAsync();
      if (!permiso.granted) {
        setMensaje({ tipo: 'error', texto: 'Permite el uso del micrófono.' });
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await grabadora.prepareToRecordAsync();
      grabadora.record();
      setUriAudio(null);
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error al grabar: ' + textoDeError(error) });
    }
  };

  const detener = async () => {
    try {
      await grabadora.stop();
      await setAudioModeAsync({ allowsRecording: false });
      setUriAudio(grabadora.uri);
      setMensaje({ tipo: 'ok', texto: 'Audio capturado. Listo para procesar.' });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error al detener: ' + textoDeError(error) });
    }
  };

  const solicitarProcesamientoIA = async () => {
    if (!uriAudio) return;
    setProcesando(true);
    setMensaje({ tipo: 'ok', texto: 'Subiendo audio y analizando con IA...' });

    try {
      const idBD = feedbackBD?.id || await crearFeedbackInicial(practicaId, uriAudio);
      const dataIA = await procesarAudioConIA(idBD);
      
      setFeedbackBD({ id: idBD, ...dataIA });
      setTextoUnico(dataIA.transcripcion || '');
      setMensaje(null);
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + textoDeError(error) });
    } finally {
      setProcesando(false);
    }
  };

  const enviarDefinitivo = async (resumenAprobado: boolean) => {
    if (!feedbackBD?.id) {
      Alert.alert("Error", "No se encontró el ID del feedback.");
      return;
    }
    setProcesando(true);
    setMensaje(null);

    try {
      const payload = {
        // La transcripción se mantiene intacta desde la IA
        transcripcion: feedbackBD.transcripcion,
        resumen_aprobado: resumenAprobado,
        // Si acepta IA: se guarda el objeto estructurado JSON y resumen_escrito queda en null
        resumen_estructurado: resumenAprobado ? feedbackBD.resumen_estructurado : null,
        // Si NO acepta IA: se guarda el texto del único campo como resumen_escrito
        resumen_escrito: resumenAprobado ? null : textoUnico
      };

      await actualizarFeedbackFinal(feedbackBD.id, practicaId, payload);
      setMensaje({ tipo: 'ok', texto: 'Feedback enviado a la familia con éxito.' });
      onEnviado();
    } catch (error) {
      setMensaje({ tipo: 'error', texto: textoDeError(error) });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Evaluación del Terapeuta</Text>

      {/* 1. BLOQUE GRABACIÓN */}
      {!feedbackBD?.transcripcion && (
        <View style={styles.seccion}>
          {estadoGrabadora.isRecording ? (
            <View>
              <Text style={styles.grabando}>● Grabando {formatearDuracion(estadoGrabadora.durationMillis)}</Text>
              <Button title="Detener" onPress={detener} />
            </View>
          ) : uriAudio ? (
            <View>
              <EscucharGrabacion uri={uriAudio} />
              <Button title="Transcribir y Analizar con IA" onPress={solicitarProcesamientoIA} disabled={procesando} />
              <View style={styles.separador} />
              <Button title="Volver a grabar" onPress={grabar} disabled={procesando} color="#888" />
            </View>
          ) : (
            <Button title="Grabar nota de voz" onPress={grabar} />
          )}
        </View>
      )}

      {procesando && <ActivityIndicator style={{ marginVertical: 10 }} size="large" color="#0050b3" />}

      {/* 2. RESULTADOS Y ENVÍO */}
      {feedbackBD?.transcripcion && !procesando && (
        <View style={styles.seccionDatos}>
          
          {/* Muestra el resumen estructurado de la IA si existe */}
          {feedbackBD.resumen_estructurado ? (
            <View style={styles.cajaPreviaIA}>
              <Text style={styles.labelIA}>✨ Resumen generado por IA:</Text>
              <Text style={styles.itemIA}>⭐ <Text style={{fontWeight: 'bold'}}>Punto fuerte:</Text> {feedbackBD.resumen_estructurado.punto_fuerte}</Text>
              <Text style={styles.itemIA}>📈 <Text style={{fontWeight: 'bold'}}>A mejorar:</Text> {feedbackBD.resumen_estructurado.a_mejorar}</Text>
              <Text style={styles.itemIA}>🎯 <Text style={{fontWeight: 'bold'}}>Foco semana:</Text> {feedbackBD.resumen_estructurado.foco_semana}</Text>
            </View>
          ) : (
            <Text style={styles.ayuda}>No se generó resumen automático.</Text>
          )}

          {/* ÚNICO CAMPO DE TEXTO */}
          <Text style={styles.label}>Notas / Resumen escrito:</Text>
          <TextInput
            style={styles.campoTexto}
            value={textoUnico}
            onChangeText={setTextoUnico}
            placeholder="Escribe tu resumen manual aquí (se enviará si no usas la IA)..."
            multiline
          />

          <View style={styles.botonesFila}>
            {feedbackBD.resumen_estructurado && (
              <Button title="✅ Enviar con Resumen IA" color="#28a745" onPress={() => enviarDefinitivo(true)} />
            )}
            <Button title="❌ Enviar con Resumen Escrito" color="#666" onPress={() => enviarDefinitivo(false)} />
          </View>
        </View>
      )}

      {mensaje && (
        <Text style={mensaje.tipo === 'ok' ? styles.mensajeOk : styles.mensajeError}>{mensaje.texto}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 15, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  titulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  seccion: { marginBottom: 15 },
  seccionDatos: { marginTop: 15, padding: 15, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  grabando: { color: '#a8071a', fontWeight: 'bold', marginBottom: 8, textAlign: 'center', fontSize: 16 },
  separador: { height: 10 },
  botonesFila: { flexDirection: 'column', gap: 10, marginTop: 15 },
  escuchar: { marginBottom: 12 },
  tiempo: { color: '#888', fontSize: 12, marginTop: 4, textAlign: 'right' },
  label: { fontWeight: 'bold', marginBottom: 5, color: '#333' },
  labelIA: { fontWeight: 'bold', marginBottom: 8, color: '#0050b3' },
  cajaPreviaIA: { backgroundColor: '#f0f5ff', padding: 12, borderRadius: 6, marginBottom: 15, borderWidth: 1, borderColor: '#d6e4ff' },
  itemIA: { fontSize: 13, marginBottom: 4, color: '#333' },
  ayuda: { fontSize: 12, color: '#666', marginBottom: 10, fontStyle: 'italic' },
  campoTexto: { minHeight: 80, borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, backgroundColor: '#fff', textAlignVertical: 'top', marginTop: 5 },
  mensajeOk: { color: '#28a745', fontWeight: 'bold', textAlign: 'center', marginBottom: 5, marginTop: 10 },
  mensajeError: { color: '#d9534f', fontWeight: 'bold', textAlign: 'center', marginBottom: 5, marginTop: 10 },
});