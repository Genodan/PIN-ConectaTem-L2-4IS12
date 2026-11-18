import React, { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { obtenerUrlAudioInstrucciones } from '../services/instruccionesAudioService';

// UT 1406 · Instrucciones de la terapeuta, con un botón para escucharlas en voz alta.
// Si la práctica tiene el audio generado con IA, se reproduce ese. Si todavía no existe o no se puede
// cargar, se lee con la voz del propio dispositivo (en web, la del navegador). En los dos casos se lee el
// texto tal cual: no se cambia ni se completa.
// En un iPhone en modo silencio la voz del dispositivo no suena (limitación de expo-speech).
const OPCIONES_VOZ = { language: 'es-ES', rate: 0.9 };

const TITULO_BOTON = 'Escuchar instrucciones';
const TITULO_BOTON_PARAR = 'Parar';

// Reproduce el audio generado con IA
const BotonAudioGenerado = ({ uri }: { uri: string }) => {
  const reproductor = useAudioPlayer(uri);
  const estado = useAudioPlayerStatus(reproductor);

  const alPulsar = async () => {
    if (estado.playing) {
      reproductor.pause();
      await reproductor.seekTo(0);
      return;
    }
    if (estado.didJustFinish) await reproductor.seekTo(0);
    reproductor.play();
  };

  return <Button title={estado.playing ? TITULO_BOTON_PARAR : TITULO_BOTON} onPress={alPulsar} />;
};

// Lee el texto con la voz del dispositivo
const BotonVozDelDispositivo = ({ texto }: { texto: string }) => {
  const [hablando, setHablando] = useState(false);

  // Si se cierra la práctica mientras habla, se calla
  useEffect(
    () => () => {
      Speech.stop();
    },
    [],
  );

  const alPulsar = () => {
    if (hablando) {
      Speech.stop();
      setHablando(false);
      return;
    }
    setHablando(true);
    Speech.speak(texto, {
      ...OPCIONES_VOZ,
      onDone: () => setHablando(false),
      onStopped: () => setHablando(false),
      onError: () => setHablando(false),
    });
  };

  return <Button title={hablando ? TITULO_BOTON_PARAR : TITULO_BOTON} onPress={alPulsar} />;
};

type EstadoAudio = { fase: 'cargando' } | { fase: 'listo'; uri: string } | { fase: 'sin-audio' };

export const EscucharInstrucciones = ({ texto, audioRuta }: { texto: string; audioRuta?: string | null }) => {
  const [audio, setAudio] = useState<EstadoAudio>(audioRuta ? { fase: 'cargando' } : { fase: 'sin-audio' });

  // Se pide la URL firmada del audio generado; si falla, se usa la voz del dispositivo
  useEffect(() => {
    if (!audioRuta) {
      setAudio({ fase: 'sin-audio' });
      return;
    }
    let activo = true;
    setAudio({ fase: 'cargando' });
    obtenerUrlAudioInstrucciones(audioRuta)
      .then((uri) => activo && setAudio({ fase: 'listo', uri }))
      .catch(() => activo && setAudio({ fase: 'sin-audio' }));
    return () => {
      activo = false;
    };
  }, [audioRuta]);

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Instrucciones de tu terapeuta</Text>
      <Text style={styles.texto}>{texto}</Text>
      {audio.fase === 'cargando' ? (
        <Button title="Cargando audio..." disabled onPress={() => undefined} />
      ) : audio.fase === 'listo' ? (
        <BotonAudioGenerado uri={audio.uri} />
      ) : (
        <BotonVozDelDispositivo texto={texto} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginBottom: 5,
    padding: 12,
    backgroundColor: '#f0f5ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d6e4ff',
    gap: 8,
  },
  titulo: { fontWeight: 'bold', color: '#0050b3' },
  texto: { fontSize: 15, color: '#333', lineHeight: 22 },
});
