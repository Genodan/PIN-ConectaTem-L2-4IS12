import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FeedbackResumen } from '../services/feedbackService';
import { ComentarioEscrito, NotaDeVoz, textoInsignia } from './VerFeedback';

const formatearFecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-ES') : null);

// UT 1141 · El feedback de la terapeuta dentro de su práctica: fecha, insignia, nota de voz y comentario escrito.
// Reutiliza el reproductor y el comentario de «Ver feedback» (UT 1352).
export const FeedbackDePractica = ({ feedback }: { feedback: FeedbackResumen }) => {
  const fecha = formatearFecha(feedback.enviado_en ?? feedback.fecha_evaluacion);

  return (
    <View style={styles.container}>
      {fecha && <Text style={styles.fecha}>Feedback de la terapeuta · {fecha}</Text>}
      {feedback.insignia ? <Text style={styles.insignia}>{textoInsignia(feedback.insignia)}</Text> : null}
      {/* El feedback puede ser solo escrito (UT 1099): entonces no hay audio que reproducir */}
      {feedback.audio_url && <NotaDeVoz rutaAudio={feedback.audio_url} />}
      <ComentarioEscrito feedback={feedback} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 10 },
  fecha: { color: '#888', fontSize: 12, marginBottom: 8 },
  insignia: {
    alignSelf: 'flex-start',
    color: '#874d00',
    fontWeight: 'bold',
    fontSize: 12,
    backgroundColor: '#fff1b8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 12,
  },
});
