import { Stack } from 'expo-router';

// Navegador principal: cada fichero de src/app es una pantalla.
export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerTitleAlign: 'center' }}>
      <Stack.Screen name="index" options={{ title: 'ConecTEM' }} />
      <Stack.Screen name="familia/index" options={{ title: 'Familia' }} />
      <Stack.Screen name="terapeuta/index" options={{ title: 'Terapeuta' }} />
    </Stack>
  );
}
