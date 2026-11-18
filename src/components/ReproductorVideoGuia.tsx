import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { supabase } from '../utils/supabase';
import { BUCKET_VIDEOS_GUIA } from '../services/modulosService';

interface ReproductorVideoGuiaProps {
  url?: string | null;
}

const extraerIdYouTube = (url: string): string | null => {
  const regex =
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

const esUrlYouTube = (url: string): boolean => {
  const lower = url.toLowerCase();
  return lower.includes('youtube.com') || lower.includes('youtu.be');
};

export const ReproductorVideoGuia = ({ url }: ReproductorVideoGuiaProps) => {
  const [uriFinal, setUriFinal] = useState<string | null>(null);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    const prepararVideo = async () => {
      setCargando(true);
      setError(null);
      setUriFinal(null);
      setYoutubeId(null);

      const urlLimpia = url?.trim();
      if (!urlLimpia) {
        if (activo) setCargando(false);
        return;
      }

      // 1. Caso YouTube
      if (esUrlYouTube(urlLimpia)) {
        const id = extraerIdYouTube(urlLimpia);
        if (!id) {
          if (activo) {
            setError('El enlace de YouTube no tiene un formato válido.');
            setCargando(false);
          }
          return;
        }
        if (activo) {
          setYoutubeId(id);
          setUriFinal(urlLimpia);
          setCargando(false);
        }
        return;
      }

      // 2. Caso URL externa directa (http/https)
      if (/^https?:\/\//i.test(urlLimpia)) {
        try {
          new URL(urlLimpia);
          if (activo) {
            setUriFinal(urlLimpia);
            setCargando(false);
          }
        } catch {
          if (activo) {
            setError('La dirección del vídeo no es una URL válida.');
            setCargando(false);
          }
        }
        return;
      }

      // 3. Caso archivo subido al bucket 'videos-guia' de Supabase
      try {
        const { data, error: storageError } = await supabase.storage
          .from(BUCKET_VIDEOS_GUIA)
          .createSignedUrl(urlLimpia, 3600);

        if (storageError || !data?.signedUrl) {
          // Fallback por si el bucket es público sin políticas de firma
          const { data: publicData } = supabase.storage
            .from(BUCKET_VIDEOS_GUIA)
            .getPublicUrl(urlLimpia);

          if (publicData?.publicUrl) {
            if (activo) setUriFinal(publicData.publicUrl);
          } else if (activo) {
            setError('No se encontró el archivo de vídeo en el servidor.');
          }
        } else if (activo) {
          setUriFinal(data.signedUrl);
        }
      } catch {
        if (activo) {
          setError('Error al conectar con el almacenamiento de vídeos.');
        }
      } finally {
        if (activo) setCargando(false);
      }
    };

    prepararVideo();

    return () => {
      activo = false;
    };
  }, [url]);

  // Sin vídeo configurado en el módulo
  if (!url?.trim()) {
    return <Text style={styles.sinVideo}>Este módulo no tiene vídeo guía asignado.</Text>;
  }

  // Cargando URL desde Supabase
  if (cargando) {
    return (
      <View style={styles.estadoCaja}>
        <ActivityIndicator size="small" color="#0050b3" />
        <Text style={styles.textoEstado}>Cargando vídeo guía...</Text>
      </View>
    );
  }

  // Error de formato, archivo inexistente o fallo de reproducción
  if (error) {
    return (
      <View style={styles.errorCaja}>
        <Text style={styles.errorTitulo}>⚠️ No se puede reproducir el vídeo guía</Text>
        <Text style={styles.errorDetalle}>{error}</Text>
      </View>
    );
  }

  // Reproductor para YouTube
  if (youtubeId) {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.contenedorReproductor}>
          {React.createElement('iframe', {
            src: `https://www.youtube.com/embed/${youtubeId}`,
            style: {
              width: '100%',
              height: 240,
              border: 'none',
              borderRadius: 8,
            },
            allow:
              'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
            allowFullScreen: true,
            title: 'Vídeo guía del módulo',
          })}
        </View>
      );
    }

    // En móvil (sin react-native-webview instalado) mostramos miniatura interactiva
    return (
      <TouchableOpacity
        style={styles.youtubeMovilCard}
        onPress={() => uriFinal && Linking.openURL(uriFinal)}
        activeOpacity={0.85}
      >
        <Image
          source={{ uri: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` }}
          style={styles.youtubeThumbnail}
          resizeMode="cover"
        />
        <View style={styles.youtubeOverlay}>
          <Text style={styles.youtubePlayIcon}>▶</Text>
          <Text style={styles.youtubePlayText}>Ver vídeo guía en YouTube</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Reproductor nativo/web para vídeos de Supabase Storage o enlaces directos (.mp4, .webm, .mov)
  if (uriFinal) {
    return (
      <View style={styles.contenedorReproductor}>
        <Video
          source={{ uri: uriFinal }}
          style={styles.videoNativo}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
          onError={() => {
            setError(
              'El archivo no existe, está dañado o el formato de vídeo no es compatible con este dispositivo.'
            );
          }}
        />
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  contenedorReproductor: {
    marginTop: 6,
    marginBottom: 15,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  videoNativo: {
    width: '100%',
    height: 230,
    backgroundColor: '#000',
  },
  sinVideo: {
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 15,
  },
  estadoCaja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f0f5ff',
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 15,
  },
  textoEstado: {
    color: '#0050b3',
    fontSize: 13,
  },
  errorCaja: {
    padding: 12,
    backgroundColor: '#fff2f0',
    borderColor: '#ffccc7',
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 15,
  },
  errorTitulo: {
    color: '#cf1322',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 2,
  },
  errorDetalle: {
    color: '#820014',
    fontSize: 12,
  },
  youtubeMovilCard: {
    marginTop: 6,
    marginBottom: 15,
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  youtubeThumbnail: {
    width: '100%',
    height: '100%',
    opacity: 0.75,
  },
  youtubeOverlay: {
    position: 'absolute',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  youtubePlayIcon: {
    color: '#fff',
    fontSize: 22,
    marginBottom: 2,
  },
  youtubePlayText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});