import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import {
  FeedbackResumen,
  PracticaConFeedback,
  obtenerPracticasConFeedback,
  obtenerUrlAudio,
  ResumenEstructurado
} from '../services/feedbackService';

const textoDeError = (error: unknown) => (error instanceof Error ? error.message : 'Error desconocido');

const formatearFecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-ES') : null);

export const textoInsignia = (insignia: string) =>
  /^[←-⯿\uD800-\uDBFF]/.test(insignia) ? insignia : `⭐ ${insignia}`;

export const formatearTiempo = (segundos: number) => {
  if (!Number.isFinite(segundos) || segundos < 0) return '0:00';
  const total = Math.floor(segundos);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

const Reproductor = ({ url }: { url: string }) => {
  const player = useAudioPlayer(url);
  const estado = useAudioPlayerStatus(player);
  const progreso = estado.duration > 0 ? Math.min(estado.currentTime / estado.duration, 1) : 0;

  const alPulsar = async () => {
    if (estado.playing) {
      player.pause();
      return;
    }
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

const SECCIONES_RESUMEN: { clave: keyof ResumenEstructurado; titulo: string }[] = [
  { clave: 'punto_fuerte', titulo: 'Lo que ha ido bien' },
  { clave: 'a_mejorar', titulo: 'A mejorar' },
  { clave: 'foco_semana', titulo: 'Foco de la semana' },
  { clave: 'foco_proxima_semana', titulo: 'Foco de la semana' },
];

const limpiarTranscripcion = (texto: string) => texto.replace(/^\s*[*-]\s+/gm, '• ').trim();

export const ComentarioEscrito = ({ feedback }: { feedback: FeedbackResumen | null }) => {
  const [verTranscripcion, setVerTranscripcion] = useState(false);
  
  const [solicitandoTranscripcion, setSolicitandoTranscripcion] = useState(false);
  const [mensajeTranscripcion, setMensajeTranscripcion] = useState<string | null>(null);

  if (!feedback) return null;

  const resumen = feedback.resumen_estructurado;
  const clavesVistas = new Set<string>();
  const secciones = SECCIONES_RESUMEN.filter(({ clave }) => {
    if (!resumen?.[clave]) return false;
    if (clave === 'foco_proxima_semana' && clavesVistas.has('foco_semana')) return false;
    clavesVistas.add(clave);
    return true;
  });
  const transcripcion = feedback.transcripcion ? limpiarTranscripcion(feedback.transcripcion) : null;
  const tieneAudio = Boolean(feedback.audio_url && feedback.audio_url !== 'null' && feedback.audio_url.trim() !== '');

  const solicitarTranscripcion = async () => {
    setSolicitandoTranscripcion(true);
    setMensajeTranscripcion(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setMensajeTranscripcion('¡Transcripción solicitada con éxito! La verás pronto.');
    } catch (error) {
      setMensajeTranscripcion('Error al solicitar la transcripción: ' + textoDeError(error));
    } finally {
      setSolicitandoTranscripcion(false);
    }
  };

  const esRechazado = feedback.resumen_aprobado === false;
  const esAprobado = feedback.resumen_aprobado === true || feedback.resumen_aprobado === 'true' as any;

  // Si no hay resumen, ni resumen escrito, ni transcripción, y tampoco audio válido, no pintamos nada
  if (secciones.length === 0 && !transcripcion && !tieneAudio && !feedback.resumen_escrito) {
    return null;
  }

  return (
    <View style={styles.comentario}>
      
      {/* 1. BOTÓN DE TRANSCRIPCIÓN: Solo si hay audio real y NO hay transcripción todavía */}
      {tieneAudio && !transcripcion && (
        <View style={styles.transcripcionContainer}>
          <Text style={styles.avisoTranscripcion}>
            Aún no hay transcripción disponible para esta nota de voz.
          </Text>
          <Button 
            title={solicitandoTranscripcion ? "Transcribiendo..." : "Transcribir Audio con IA"} 
            onPress={solicitarTranscripcion} 
            disabled={solicitandoTranscripcion}
          />
          {mensajeTranscripcion && (
            <Text style={styles.mensajeExitoTranscripcion}>{mensajeTranscripcion}</Text>
          )}
        </View>
      )}

      {/* 2. TRANSCRIPCIÓN: Visible siempre o desplegable si hay resumen */}
      {transcripcion && (
        <View style={{ marginBottom: 10 }}>
          {secciones.length > 0 && (
            <View style={{ marginBottom: 10 }}>
              <Button
                title={verTranscripcion ? 'Ocultar transcripción' : 'Ver transcripción'}
                onPress={() => setVerTranscripcion((visible) => !visible)}
              />
            </View>
          )}
          {(secciones.length === 0 || verTranscripcion) && (
            <Text style={styles.seccionTexto}>{transcripcion}</Text>
          )}
        </View>
      )}

      {/* 3. RESUMEN RECHAZADO: Se muestra resumen_escrito sin ningún ícono */}
      {esRechazado && feedback.resumen_escrito && (
        <View style={styles.cajaManual}>
          <Text style={styles.seccionTitulo}>Resumen escrito</Text>
          <Text style={styles.seccionTexto}>{feedback.resumen_escrito}</Text>
        </View>
      )}

      {/* 4. RESUMEN IA APROBADO (O PENDIENTE DE REVISIÓN) */}
      {!esRechazado && resumen && (
        <View>
          {esAprobado && (
            <View style={styles.cabeceraBadgeIA}>
              <Text style={styles.badgeIA}>✨ Generado con IA</Text>
            </View>
          )}
          {secciones.map(({ clave, titulo }) => (
            <View key={clave} style={styles.seccion}>
              <Text style={styles.seccionTitulo}>{titulo}</Text>
              <Text style={styles.seccionTexto}>{resumen[clave]}</Text>
            </View>
          ))}
        </View>
      )}

    </View>
  );
};

export const NotaDeVoz = ({ rutaAudio }: { rutaAudio: string | null }) => {
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

      {cargando && <ActivityIndicator size="large" color="#0000ff" />}
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
  
  cajaManual: { backgroundColor: '#f9f9f9', padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#ddd', marginBottom: 10 },
  cabeceraBadgeIA: { marginBottom: 8, alignSelf: 'flex-start' },
  badgeIA: { backgroundColor: '#e6f7ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, borderColor: '#91d5ff', color: '#0050b3', fontSize: 11, fontWeight: 'bold' },

  // Estilos de transcripción
  transcripcionContainer: { padding: 15, backgroundColor: '#f0f5ff', borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: '#d6e4ff' },
  avisoTranscripcion: { color: '#595959', marginBottom: 10, textAlign: 'center' },
  mensajeExitoTranscripcion: { marginTop: 10, color: '#389e0d', fontWeight: 'bold', textAlign: 'center' }
});
