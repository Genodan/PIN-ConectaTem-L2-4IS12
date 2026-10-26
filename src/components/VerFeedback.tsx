import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import {
  FeedbackResumen,
  PracticaConFeedback,
  obtenerPracticasConFeedback,
  obtenerUrlAudio,
} from '../services/feedbackService';

const textoDeError = (error: unknown) => (error instanceof Error ? error.message : 'Error desconocido');

const formatearFecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-ES') : null);

// Algunas insignias ya traen su emoji («⭐ Familia Constante»): solo se añade la estrella si falta
export const textoInsignia = (insignia: string) =>
  /^[←-⯿\uD800-\uDBFF]/.test(insignia) ? insignia : `⭐ ${insignia}`;

// 78 segundos -> «1:18». Si la duración aún no se conoce (NaN) devuelve «0:00».
export const formatearTiempo = (segundos: number) => {
  if (!Number.isFinite(segundos) || segundos < 0) return '0:00';
  const total = Math.floor(segundos);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

// Reproductor con botón, barra de avance y tiempo. Va aparte porque los hooks de audio necesitan la URL desde el principio.
const Reproductor = ({ url }: { url: string }) => {
  const player = useAudioPlayer(url);
  const estado = useAudioPlayerStatus(player);
  const progreso = estado.duration > 0 ? Math.min(estado.currentTime / estado.duration, 1) : 0;

  const alPulsar = async () => {
    if (estado.playing) {
      player.pause();
      return;
    }
    // Si el audio ya terminó, se vuelve a empezar desde el principio
    if (estado.didJustFinish) await player.seekTo(0);
    player.play();
  };

  return (
    <View>
      <Button title={estado.playing ? '⏸ Pausar' : '▶ Escuchar nota de voz'} onPress={alPulsar} />
      <View style={styles.barra}>
        <View style={[styles.barraProgreso, { width: `${progreso * 100}%` }]} />
      </View>
      <Text style={styles.tiempo}>
        {formatearTiempo(estado.currentTime)} / {formatearTiempo(estado.duration)}
      </Text>
    </View>
  );
};

const SECCIONES_RESUMEN = [
  { clave: 'punto_fuerte', titulo: 'Lo que ha ido bien' },
  { clave: 'a_mejorar', titulo: 'A mejorar' },
  { clave: 'foco_semana', titulo: 'Foco de la semana' },
] as const;

// Comentario escrito: el resumen por apartados y, si no lo hay, la transcripción completa
const ComentarioEscrito = ({ feedback }: { feedback: FeedbackResumen | null }) => {
  const resumen = feedback?.resumen_estructurado;
  const secciones = SECCIONES_RESUMEN.filter(({ clave }) => resumen?.[clave]);

  if (secciones.length > 0) {
    return (
      <View style={styles.comentario}>
        {secciones.map(({ clave, titulo }) => (
          <View key={clave} style={styles.seccion}>
            <Text style={styles.seccionTitulo}>{titulo}</Text>
            <Text style={styles.seccionTexto}>{resumen?.[clave]}</Text>
          </View>
        ))}
      </View>
    );
  }
  if (feedback?.transcripcion) {
    return (
      <View style={styles.comentario}>
        <Text style={styles.seccionTexto}>{feedback.transcripcion}</Text>
      </View>
    );
  }
  return null;
};

// Pide la URL temporal del audio y muestra el reproductor cuando la tiene
const NotaDeVoz = ({ rutaAudio }: { rutaAudio: string | null }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!rutaAudio) return;
    let activo = true;
    setCargando(true);
    setError(null);
    obtenerUrlAudio(rutaAudio)
      .then((urlAudio) => activo && setUrl(urlAudio))
      .catch((e) => activo && setError(textoDeError(e)))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [rutaAudio]);

  if (!rutaAudio) return <Text style={styles.aviso}>La terapeuta todavía no ha adjuntado el audio.</Text>;
  if (cargando) return <ActivityIndicator size="small" color="#0000ff" />;
  if (error) return <Text style={styles.error}>{error}</Text>;
  if (!url) return null;
  return <Reproductor url={url} />;
};

export const VerFeedback = ({ pacienteId }: { pacienteId: string | null }) => {
  const [practicas, setPracticas] = useState<PracticaConFeedback[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pacienteId) return;
    let activo = true;
    setCargando(true);
    setError(null);
    obtenerPracticasConFeedback(pacienteId)
      .then((lista) => activo && setPracticas(lista))
      .catch((e) => activo && setError(textoDeError(e)))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [pacienteId]);

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Feedback de la terapeuta</Text>

      {cargando && <ActivityIndicator size="small" color="#0000ff" />}
      {error && <Text style={styles.error}>{error}</Text>}

      {!cargando && !error && practicas.length === 0 && (
        <Text style={styles.textoVacio}>Todavía no hay feedback de la terapeuta para este paciente.</Text>
      )}

      {practicas.map((practica) => {
        const fecha = formatearFecha(practica.feedback?.enviado_en ?? practica.feedback?.fecha_evaluacion ?? null);
        const insignia = practica.feedback?.insignia;
        const autor = practica.terapeuta ? `Feedback de ${practica.terapeuta}` : 'Feedback de la terapeuta';
        return (
          <View key={practica.id} style={styles.tarjeta}>
            <View style={styles.cabecera}>
              <Text style={styles.modulo}>{practica.modulo}</Text>
              <Text style={styles.estado}>Con feedback</Text>
            </View>
            <Text style={styles.fecha}>{fecha ? `${autor} · ${fecha}` : autor}</Text>
            {insignia ? <Text style={styles.insignia}>{textoInsignia(insignia)}</Text> : null}
            <NotaDeVoz rutaAudio={practica.feedback?.audio_url ?? null} />
            <ComentarioEscrito feedback={practica.feedback} />
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 25 },
  titulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  textoVacio: { fontStyle: 'italic', color: '#666' },
  tarjeta: { backgroundColor: '#fff', borderRadius: 8, marginBottom: 15, padding: 15, elevation: 2 },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modulo: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  estado: { color: '#135200', fontWeight: 'bold', fontSize: 12, backgroundColor: '#d9f7be', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  fecha: { color: '#888', fontSize: 12, marginTop: 4, marginBottom: 8 },
  insignia: { alignSelf: 'flex-start', color: '#874d00', fontWeight: 'bold', fontSize: 12, backgroundColor: '#fff1b8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, marginBottom: 12 },
  barra: { height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  barraProgreso: { height: 6, backgroundColor: '#389e0d' },
  tiempo: { color: '#888', fontSize: 12, marginTop: 4, textAlign: 'right' },
  aviso: { fontStyle: 'italic', color: '#666' },
  comentario: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' },
  seccion: { marginBottom: 10 },
  seccionTitulo: { fontSize: 12, fontWeight: 'bold', color: '#555', marginBottom: 2 },
  seccionTexto: { fontSize: 14, color: '#333', lineHeight: 20 },
  error: { color: '#a8071a', fontWeight: 'bold' },
});
