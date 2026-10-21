import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, useFonts } from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';

import { ProveedorSesion } from '../sesion';
import { colores } from '../tema';

// Navegador principal: cada fichero de src/app es una pantalla.
// Cada zona (familia, terapeuta) dibuja su propia cabecera, así que se oculta la de Stack.
export default function RootLayout() {
  const [fuentesCargadas, errorFuentes] = useFonts({
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // Si las fuentes fallan, se sigue con las del sistema en vez de dejar la app en blanco
  if (!fuentesCargadas && !errorFuentes) return null;

  return (
    <ProveedorSesion>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colores.fondo } }}>
        <Stack.Screen name="index" options={{ title: 'ConecTEM' }} />
        <Stack.Screen name="familia" options={{ title: 'Familia' }} />
        <Stack.Screen name="terapeuta" options={{ title: 'Terapeuta' }} />
      </Stack>
    </ProveedorSesion>
  );
}
