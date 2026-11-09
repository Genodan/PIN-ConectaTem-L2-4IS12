import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

// Flecha de la cabecera para volver. El botón que pone Stack por defecto solo aparece si hay una pantalla
// anterior en el historial: al recargar la página (F5) o abrir /familia o /terapeuta directamente no la hay
// y la flecha desaparecía. Esta siempre está: vuelve atrás si puede y, si no, va al inicio.
export const FlechaVolver = () => {
  const router = useRouter();

  const alPulsar = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Volver al inicio"
      onPress={alPulsar}
      hitSlop={12}
      style={styles.boton}
    >
      <Text style={styles.flecha}>←</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  boton: { paddingHorizontal: 12 },
  flecha: { fontSize: 24 },
});
