import React, { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { enviarFeedback } from '../services/darFeedbackService';

type Mensaje = { tipo: 'ok' | 'error'; texto: string };
// Formas de dar feedback. El resumen en 3 puntos clave queda pendiente: puede que lo haga la IA (Sprint 2).
type Modo = 'voz' | 'texto';

const textoDeError = (error: unknown) => (error instanceof Error ? error.message : 'Error desconocido');

// 65000 ms -> «1:05»
const formatearDuracion = (milisegundos: number) => {
  if (!Number.isFinite(milisegundos) || milisegundos < 0) return '0:00';
  const total = Math.floor(milisegundos / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

// Escuchar la nota recién grabada antes de enviarla, para comprobar que se oye bien.
// Va aparte porque el reproductor necesita la URI de la grabación desde el principio.
const EscucharGrabacion = ({ uri }: { uri: string }) => {
  const reproductor = useAudioPlayer(uri);
  const estado = useAudioPlayerStatus(reproductor);

  const alPulsar = async () => {
    if (estado.playing) {
      reproductor.pause();
      return;
    }
    // Si ya terminó, vuelve a empezar desde el principio
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

// UT 1099 · Dar feedback sobre una práctica: grabar una nota de voz o escribirlo, y enviarlo a la familia.
// En el móvil graba en .m4a; en web, en el formato del navegador (webm en Chrome/Firefox, mp4 en Safari).
export const DarFeedback = ({ practicaId, onEnviado }: { practicaId: string; onEnviado: () => void }) => {
  const grabadora = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const estadoGrabadora = useAudioRecorderState(grabadora);
  const [modo, setModo] = useState<Modo>('voz');
  const [uriAudio, setUriAudio] = useState<string | null>(null);
  const [textoFeedback, setTextoFeedback] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);

  const grabar = async () => {
    setMensaje(null);
    try {
      const permiso = await requestRecordingPermissionsAsync();
      if (!permiso.granted) {
        setMensaje({ tipo: 'error', texto: 'Para grabar la nota de voz hay que permitir el uso del micrófono.' });
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await grabadora.prepareToRecordAsync();
      grabadora.record();
      setUriAudio(null);
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'No se pudo empezar a grabar: ' + textoDeError(error) });
    }
  };

  const detener = async () => {
    try {
      await grabadora.stop();
      await setAudioModeAsync({ allowsRecording: false });
      setUriAudio(grabadora.uri);
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'No se pudo detener la grabación: ' + textoDeError(error) });
    }
  };

  const cambiarModo = (nuevo: Modo) => {
    setModo(nuevo);
    setMensaje(null);
  };

  const enviar = async () => {
    const contenido = modo === 'voz' ? (uriAudio ? { uriAudio } : null) : { texto: textoFeedback };
    if (!contenido) return;
    setEnviando(true);
    setMensaje(null);
    try {
      await enviarFeedback(practicaId, contenido);
      setMensaje({ tipo: 'ok', texto: 'Feedback enviado. La práctica pasa a «Con feedback».' });
      onEnviado();
    } catch (error) {
      setMensaje({ tipo: 'error', texto: textoDeError(error) });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.modos}>
        {(['voz', 'texto'] as const).map((opcion) => (
          <View key={opcion} style={styles.modo}>
            <Button
              title={opcion === 'voz' ? 'Nota de voz' : 'Escribir'}
              color={modo === opcion ? '#0050b3' : '#8c8c8c'}
              onPress={() => cambiarModo(opcion)}
              disabled={enviando || estadoGrabadora.isRecording}
            />
          </View>
        ))}
      </View>

      {modo === 'texto' ? (
        <View>
          <TextInput
            style={styles.campoTexto}
            value={textoFeedback}
            onChangeText={setTextoFeedback}
            placeholder="Escribe tu feedback para la familia…"
            multiline
            maxLength={2000}
            editable={!enviando}
          />
          <Button
            title={enviando ? 'Enviando...' : 'Enviar feedback'}
            onPress={enviar}
            disabled={enviando || textoFeedback.trim() === ''}
          />
        </View>
      ) : estadoGrabadora.isRecording ? (
        <View>
          <Text style={styles.grabando}>● Grabando {formatearDuracion(estadoGrabadora.durationMillis)}</Text>
          <Button title="Detener" onPress={detener} />
        </View>
      ) : uriAudio ? (
        <View>
          <Text style={styles.listo}>Nota de voz grabada. Escúchala antes de enviarla.</Text>
          <EscucharGrabacion key={uriAudio} uri={uriAudio} />
          <Button title={enviando ? 'Enviando...' : 'Enviar feedback'} onPress={enviar} disabled={enviando} />
          <View style={styles.separador} />
          <Button title="Volver a grabar" onPress={grabar} disabled={enviando} />
        </View>
      ) : (
        <Button title="Grabar nota de voz" onPress={grabar} />
      )}

      {mensaje && (
        <Text style={mensaje.tipo === 'ok' ? styles.mensajeOk : styles.mensajeError}>{mensaje.texto}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 12 },
  grabando: { color: '#a8071a', fontWeight: 'bold', marginBottom: 8 },
  listo: { color: '#555', marginBottom: 8 },
  separador: { height: 8 },
  modos: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modo: { flex: 1 },
  campoTexto: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  escuchar: { marginBottom: 12 },
  tiempo: { color: '#888', fontSize: 12, marginTop: 4, textAlign: 'right' },
  mensajeOk: { marginTop: 10, color: '#237804', fontWeight: 'bold' },
  mensajeError: { marginTop: 10, color: '#a8071a', fontWeight: 'bold' },
});
