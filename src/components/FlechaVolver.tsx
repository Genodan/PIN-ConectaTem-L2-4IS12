import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { usePathname, useRouter } from 'expo-router';

// Pantalla «de arriba» según la ruta: /familia/mensajes → /familia, /familia → /
export const rutaAnterior = (ruta: string): string => {
  const partes = ruta.split('/').filter(Boolean);
  return partes.length > 1 ? `/${partes.slice(0, -1).join('/')}` : '/';
};

// Flecha de la cabecera para volver. El botón que pone Stack por defecto solo aparece si hay una pantalla
// anterior en el historial: al recargar la página (F5) o abrir una pantalla directamente no la hay
// y la flecha desaparecía. Esta siempre está: vuelve atrás si puede y, si no, sube a la pantalla de arriba
// (por ejemplo, de los mensajes al panel de la familia), no al inicio del todo.
export const FlechaVolver = () => {
  const router = useRouter();
  const ruta = usePathname();

  const alPulsar = () => {
    if (router.canGoBack()) router.back();
    else router.replace(rutaAnterior(ruta));
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Volver"
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
