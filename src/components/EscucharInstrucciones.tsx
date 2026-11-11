import React, { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import * as Speech from 'expo-speech';

// UT 1406 · Instrucciones de la terapeuta, con un botón para escucharlas en voz alta.
// Usa la voz del propio dispositivo (en web, la del navegador). Lee el texto tal cual: no lo cambia ni lo completa.
// En un iPhone en modo silencio no suena (limitación de expo-speech).
const OPCIONES_VOZ = { language: 'es-ES', rate: 0.9 };

export const EscucharInstrucciones = ({ texto }: { texto: string }) => {
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

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Instrucciones de tu terapeuta</Text>
      <Text style={styles.texto}>{texto}</Text>
      <Button title={hablando ? 'Parar' : 'Escuchar instrucciones'} onPress={alPulsar} />
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
