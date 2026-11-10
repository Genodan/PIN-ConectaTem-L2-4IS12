import { Stack } from 'expo-router';
import { FlechaVolver } from '../components/FlechaVolver';

// Navegador principal: cada fichero de src/app es una pantalla.
export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerTitleAlign: 'center' }}>
      <Stack.Screen name="index" options={{ title: 'ConecTEM' }} />
      <Stack.Screen name="familia/index" options={{ title: 'Familia', headerLeft: () => <FlechaVolver /> }} />
      <Stack.Screen name="familia/buscar" options={{ title: 'Buscar feedbacks', headerLeft: () => <FlechaVolver /> }} />
      <Stack.Screen name="terapeuta/index" options={{ title: 'Terapeuta', headerLeft: () => <FlechaVolver /> }} />
    </Stack>
  );
}
