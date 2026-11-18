import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { WebView } from 'react-native-webview';
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
  const videoRef = useRef<Video>(null);
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

  if (!url?.trim()) {
    return <Text style={styles.sinVideo}>Este módulo no tiene vídeo guía asignado.</Text>;
  }

  if (cargando) {
    return (
      <View style={styles.estadoCaja}>
        <ActivityIndicator size="small" color="#0050b3" />
        <Text style={styles.textoEstado}>Cargando vídeo guía...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorCaja}>
        <Text style={styles.errorTitulo}>⚠️ No se puede reproducir el vídeo guía</Text>
        <Text style={styles.errorDetalle}>{error}</Text>
      </View>
    );
  }

  // Reproductor embebido 16:9 para YouTube (Web y Móvil)
  if (youtubeId) {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.marcoVideo}>
          {React.createElement('iframe', {
            src: `https://www.youtube.com/embed/${youtubeId}?rel=0`,
            style: {
              width: '100%',
              height: '100%',
              border: 'none',
            },
            allow:
              'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
            allowFullScreen: true,
            title: 'Vídeo guía del módulo',
          })}
        </View>
      );
    }

    const htmlYouTube = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
          <style>
            html, body { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #000; overflow: hidden; }
            iframe { width: 100%; height: 100%; border: 0; }
          </style>
        </head>
        <body>
          <iframe
            src="https://www.youtube.com/embed/${youtubeId}?rel=0&playsinline=1"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowfullscreen
          ></iframe>
        </body>
      </html>
    `;

    return (
      <View style={styles.marcoVideo}>
        <WebView
          source={{ html: htmlYouTube, baseUrl: 'https://www.youtube.com' }}
          style={styles.rellenoCompleto}
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          nestedScrollEnabled
          mediaPlaybackRequiresUserAction={false}
          onError={() => {
            setError('No se pudo cargar el vídeo de YouTube en este dispositivo.');
          }}
        />
      </View>
    );
  }

  // Reproductor 16:9 para vídeos de Supabase Storage o enlaces directos
  if (uriFinal) {
    return (
      <View style={styles.bloqueVideo}>
        <View style={styles.marcoVideo}>
          <Video
            ref={videoRef}
            source={{ uri: uriFinal }}
            style={styles.rellenoCompleto}
            videoStyle={styles.rellenoCompleto}
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

        <TouchableOpacity
          style={styles.botonPantallaCompleta}
          onPress={() => videoRef.current?.presentFullscreenPlayer()}
        >
          <Text style={styles.textoPantallaCompleta}>⛶ Ver a pantalla completa</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  bloqueVideo: {
    width: '100%',
    maxWidth: 640,
    marginTop: 8,
    marginBottom: 16,
  },
  marcoVideo: {
    width: '100%',
    maxWidth: 640,
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    marginTop: 8,
    marginBottom: 8,
  },
  rellenoCompleto: {
    width: '100%',
    height: '100%',
  },
  botonPantallaCompleta: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#e6f7ff',
    borderWidth: 1,
    borderColor: '#91d5ff',
  },
  textoPantallaCompleta: {
    color: '#0050b3',
    fontSize: 12,
    fontWeight: 'bold',
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
});