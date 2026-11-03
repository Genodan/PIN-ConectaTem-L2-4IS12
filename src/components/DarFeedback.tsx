import React, { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
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
  ResumenEstructurado,
  crearFeedbackInicial, 
  procesarAudioConIA, 
  actualizarFeedbackFinal 
} from '../services/feedbackService';

type Mensaje = { tipo: 'ok' | 'error'; texto: string };

// Lo que devuelve la IA para esta nota de voz (UT 1122)
type FeedbackProcesado = { id: string; transcripcion: string; resumen_estructurado: ResumenEstructurado | null };

// UT 1353 · Los tres apartados del resumen, editables por la terapeuta antes de aprobarlo
type ResumenEditable = { punto_fuerte: string; a_mejorar: string; foco_semana: string };
const APARTADOS_RESUMEN: { clave: keyof ResumenEditable; titulo: string }[] = [
  { clave: 'punto_fuerte', titulo: 'Punto fuerte' },
  { clave: 'a_mejorar', titulo: 'A mejorar' },
  { clave: 'foco_semana', titulo: 'Foco de la semana' },
];
const RESUMEN_VACIO: ResumenEditable = { punto_fuerte: '', a_mejorar: '', foco_semana: '' };

const resumenEditableDe = (resumen: ResumenEstructurado | null): ResumenEditable => ({
  punto_fuerte: resumen?.punto_fuerte ?? '',
  a_mejorar: resumen?.a_mejorar ?? '',
  foco_semana: resumen?.foco_semana ?? resumen?.foco_proxima_semana ?? '',
});
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

  const [feedbackBD, setFeedbackBD] = useState<FeedbackProcesado | null>(null);
  // UT 1353: el resumen de la IA corregido por la terapeuta, o su propio resumen escrito
  const [resumenEditado, setResumenEditado] = useState<ResumenEditable>(RESUMEN_VACIO);
  const [resumenEscrito, setResumenEscrito] = useState('');
  // La transcripción también se revisa: la familia la verá junto al resumen
  const [transcripcionEditada, setTranscripcionEditada] = useState('');

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
      
      setFeedbackBD({ id: idBD, transcripcion: dataIA.transcripcion, resumen_estructurado: dataIA.resumen_estructurado });
      setResumenEditado(resumenEditableDe(dataIA.resumen_estructurado));
      setTranscripcionEditada(dataIA.transcripcion ?? '');
      setResumenEscrito('');
      setMensaje(null);
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + textoDeError(error) });
    } finally {
      setProcesando(false);
    }
  };

  const enviarDefinitivo = async (resumenAprobado: boolean) => {
    if (!feedbackBD?.id) {
      setMensaje({ tipo: 'error', texto: 'No se encontró el feedback. Vuelve a procesar la nota de voz.' });
      return;
    }
    // Lo que la terapeuta ha dejado en los campos, sin espacios sobrantes
    const resumenFinal: ResumenEditable = {
      punto_fuerte: resumenEditado.punto_fuerte.trim(),
      a_mejorar: resumenEditado.a_mejorar.trim(),
      foco_semana: resumenEditado.foco_semana.trim(),
    };
    const escritoFinal = resumenEscrito.trim();
    if (resumenAprobado && !Object.values(resumenFinal).some(Boolean)) {
      setMensaje({ tipo: 'error', texto: 'El resumen está vacío: complétalo o escribe tu propio resumen.' });
      return;
    }
    if (!resumenAprobado && !escritoFinal) {
      setMensaje({ tipo: 'error', texto: 'Escribe tu resumen antes de enviarlo.' });
      return;
    }
    setProcesando(true);
    setMensaje(null);

    try {
      const payload = {
        // La transcripción revisada por la terapeuta (si la deja vacía, se guarda la de la IA)
        transcripcion: transcripcionEditada.trim() || feedbackBD.transcripcion,
        resumen_aprobado: resumenAprobado,
        // Si aprueba: se guarda el resumen con las correcciones de la terapeuta
        resumen_estructurado: resumenAprobado ? resumenFinal : null,
        // Si no usa el de la IA: se guarda su propio resumen escrito
        resumen_escrito: resumenAprobado ? null : escritoFinal,
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
          
          {/* Transcripción de la IA, editable: la familia la verá junto al resumen cuando se apruebe */}
          <Text style={styles.label}>Transcripción de la nota de voz</Text>
          <Text style={styles.ayuda}>Corrige la transcripción si la IA ha entendido algo mal.</Text>
          <TextInput
            style={styles.campoTexto}
            accessibilityLabel="Transcripción de la nota de voz"
            value={transcripcionEditada}
            onChangeText={setTranscripcionEditada}
            multiline
          />

          {/* UT 1353: la terapeuta revisa y corrige el resumen de la IA antes de aprobarlo */}
          {feedbackBD.resumen_estructurado ? (
            <View style={styles.cajaPreviaIA}>
              <Text style={styles.labelIA}>Resumen generado por IA</Text>
              <Text style={styles.ayuda}>
                Revísalo y corrige lo que haga falta. La familia verá la transcripción y el resumen cuando lo apruebes.
              </Text>
              {APARTADOS_RESUMEN.map(({ clave, titulo }) => (
                <View key={clave}>
                  <Text style={styles.label}>{titulo}</Text>
                  <TextInput
                    style={styles.campoTexto}
                    accessibilityLabel={titulo}
                    value={resumenEditado[clave]}
                    onChangeText={(texto) => setResumenEditado((actual) => ({ ...actual, [clave]: texto }))}
                    multiline
                  />
                </View>
              ))}
              <Button title="Aprobar y enviar resumen" color="#28a745" onPress={() => enviarDefinitivo(true)} />
            </View>
          ) : (
            <Text style={styles.ayuda}>No se generó resumen automático.</Text>
          )}

          {/* Alternativa: enviar un resumen escrito por la terapeuta en lugar del de la IA */}
          <Text style={styles.label}>
            {feedbackBD.resumen_estructurado ? '¿Prefieres no usar el resumen de la IA?' : 'Resumen escrito'}
          </Text>
          <TextInput
            style={styles.campoTexto}
            accessibilityLabel="Resumen escrito"
            value={resumenEscrito}
            onChangeText={setResumenEscrito}
            placeholder="Escribe tu propio resumen para la familia..."
            multiline
          />
          <View style={styles.botonesFila}>
            <Button
              title="Enviar con mi resumen escrito"
              color="#666"
              onPress={() => enviarDefinitivo(false)}
              disabled={!resumenEscrito.trim()}
            />
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
  campoTexto: { minHeight: 60, marginBottom: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, backgroundColor: '#fff', textAlignVertical: 'top', marginTop: 5 },
  mensajeOk: { color: '#28a745', fontWeight: 'bold', textAlign: 'center', marginBottom: 5, marginTop: 10 },
  mensajeError: { color: '#d9534f', fontWeight: 'bold', textAlign: 'center', marginBottom: 5, marginTop: 10 },
});