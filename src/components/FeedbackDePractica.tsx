import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { supabase } from '../utils/supabase';

// -------------------------------------------------------------
// REPRODUCTOR DE AUDIO (expo-audio)
// -------------------------------------------------------------
const ReproductorAudio = ({ uri }: { uri: string }) => {
  const player = useAudioPlayer(uri);
  const estado = useAudioPlayerStatus(player);

  const alPulsar = async () => {
    if (estado.playing) {
      player.pause();
      return;
    }
    if (estado.didJustFinish) await player.seekTo(0);
    player.play();
  };

  const formatearTiempo = (segundos: number) => {
    if (!Number.isFinite(segundos) || segundos < 0) return '0:00';
    const total = Math.floor(segundos);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  };

  return (
    <View style={styles.escuchar}>
      <Button 
        title={estado.playing ? 'Pausar' : 'Escuchar evaluación del terapeuta'} 
        onPress={alPulsar} 
      />
      <Text style={styles.tiempo}>
        {formatearTiempo(estado.currentTime)} / {estado.duration > 0 ? formatearTiempo(estado.duration) : '--:--'}
      </Text>
    </View>
  );
};

// -------------------------------------------------------------
// COMPONENTE PRINCIPAL (FeedbackDePractica)
// -------------------------------------------------------------
export const FeedbackDePractica = ({ feedback }: { feedback: any }) => {
  // Aseguramos que tenemos el objeto (por si viene en un array)
  const feedbackObj = Array.isArray(feedback) ? feedback[0] : feedback;

  const [audioUrlFirmada, setAudioUrlFirmada] = useState<string | null>(null);
  const [cargandoAudio, setCargandoAudio] = useState(true);

  // 1. OBTENER URL SEGURA PARA EL AUDIO
  useEffect(() => {
    const obtenerUrl = async () => {
      if (!feedbackObj?.audio_url) {
        setCargandoAudio(false);
        return;
      }
      if (/^https?:\/\//.test(feedbackObj.audio_url)) {
        setAudioUrlFirmada(feedbackObj.audio_url);
        setCargandoAudio(false);
        return;
      }
      try {
        const ruta = feedbackObj.audio_url.replace(/^feedbacks\//, '');
        const { data, error } = await supabase.storage.from('feedbacks').createSignedUrl(ruta, 3600);
        if (data?.signedUrl) setAudioUrlFirmada(data.signedUrl);
        if (error) console.error("Error al obtener url firmada:", error);
      } catch (err) {
        console.error("Error al obtener audio", err);
      } finally {
        setCargandoAudio(false);
      }
    };
    obtenerUrl();
  }, [feedbackObj?.audio_url]);

  if (!feedbackObj) return null;

  // 2. PARSEO SEGURO DEL JSON (Resumen Estructurado)
  let resumenIA = null;
  if (feedbackObj.resumen_estructurado) {
    if (typeof feedbackObj.resumen_estructurado === 'object') {
      resumenIA = feedbackObj.resumen_estructurado;
    } else if (typeof feedbackObj.resumen_estructurado === 'string') {
      try {
        let parsed = JSON.parse(feedbackObj.resumen_estructurado);
        if (typeof parsed === 'string') parsed = JSON.parse(parsed); // Limpieza de doble string
        resumenIA = parsed;
      } catch (e) {
        console.error("Error al parsear JSON:", e);
      }
    }
  }

  // Comprobación del booleano de aceptación
  const isAprobado = feedbackObj.resumen_aprobado === true || feedbackObj.resumen_aprobado === 'true';

  const focoSemanaTexto = resumenIA?.foco_semana || resumenIA?.foco_proxima_semana;

  return (
    <View style={styles.container}>
      {/* SECCIÓN 1: REPRODUCTOR DE AUDIO (si existe nota de voz) */}
      {feedbackObj.audio_url ? (
        cargandoAudio ? (
          <ActivityIndicator size="small" color="#0050b3" style={{ marginVertical: 10 }} />
        ) : audioUrlFirmada ? (
          <ReproductorAudio uri={audioUrlFirmada} />
        ) : (
          <Text style={styles.errorText}>No se pudo cargar el audio.</Text>
        )
      ) : null}

      {/* SECCIÓN 2: TRANSCRIPCIÓN (SIEMPRE VISIBLE CUANDO EXISTA O INFORMATIVA) */}
      <View style={styles.seccion}>
        <Text style={styles.label}>Transcripción de la nota de voz:</Text>
        <Text style={styles.textoBase}>{feedbackObj.transcripcion || "Sin transcripción disponible."}</Text>
      </View>

      {/* SECCIÓN 3: LÓGICA DE VISUALIZACIÓN (IA ACEPTADO vs RESUMEN ESCRITO RECHAZADO) */}
      <View style={styles.seccion}>
        {isAprobado && resumenIA ? (
          // SI ESTÁ APROBADO -> SE MUESTRA LA IA CON IDENTIFICADOR DE GENERADO CON IA
          <View style={styles.cajaIA}>
            <View style={styles.cabeceraBadge}>
              <Text style={styles.labelIA}>Resumen estructurado</Text>
              <View style={styles.badgeIA}>
                <Text style={styles.textoBadgeIA}>✨ Generado con IA</Text>
              </View>
            </View>
            {resumenIA.punto_fuerte ? (
              <Text style={styles.punto}>⭐ <Text style={styles.negrita}>Punto fuerte:</Text> {resumenIA.punto_fuerte}</Text>
            ) : null}
            {resumenIA.a_mejorar ? (
              <Text style={styles.punto}>📈 <Text style={styles.negrita}>A mejorar:</Text> {resumenIA.a_mejorar}</Text>
            ) : null}
            {focoSemanaTexto ? (
              <Text style={styles.punto}>🎯 <Text style={styles.negrita}>Foco semana:</Text> {focoSemanaTexto}</Text>
            ) : null}
          </View>
        ) : feedbackObj.resumen_escrito ? (
          // SI SE RECHAZA (O NO ESTÁ APROBADO) -> SE MUESTRA EL CAMPO resumen_escrito SIN NINGÚN ÍCONO
          <View style={styles.cajaManual}>
            <Text style={styles.label}>Resumen escrito:</Text>
            <Text style={styles.textoBase}>{feedbackObj.resumen_escrito}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 15, backgroundColor: '#fff', borderRadius: 8, marginTop: 10, borderColor: '#eee', borderWidth: 1 },
  seccion: { marginTop: 15 },
  label: { fontWeight: 'bold', color: '#555', marginBottom: 5 },
  labelIA: { fontWeight: 'bold', color: '#0050b3', fontSize: 16 },
  textoBase: { fontSize: 15, color: '#444', lineHeight: 22 },
  cajaIA: { backgroundColor: '#f0f5ff', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#d6e4ff' },
  cajaManual: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  punto: { fontSize: 14, color: '#333', marginBottom: 6, lineHeight: 20 },
  negrita: { fontWeight: 'bold' },
  escuchar: { marginBottom: 5 },
  tiempo: { color: '#888', fontSize: 12, marginTop: 4, textAlign: 'right' },
  cabeceraBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  badgeIA: { backgroundColor: '#e6f7ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#91d5ff' },
  textoBadgeIA: { color: '#0050b3', fontSize: 11, fontWeight: 'bold' },
  errorText: { color: '#d9534f', fontSize: 12, marginTop: 5 }
});
