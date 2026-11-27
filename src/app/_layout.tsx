import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { Changa_600SemiBold } from '@expo-google-fonts/changa';
import { DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { FlechaVolver } from '../components/FlechaVolver';
import { SesionTerapeutaProvider } from '../sesion/SesionTerapeuta';

// Navegador principal: cada fichero de src/app es una pantalla.
export default function RootLayout() {
  // Tipografías de la nueva interfaz (Design system de Figma). Mientras cargan se usa la del sistema.
  useFonts({ Changa_600SemiBold, DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold, Inter_400Regular, Inter_600SemiBold });

  return (
    <SesionTerapeutaProvider>
      <Stack screenOptions={{ headerTitleAlign: 'center' }}>
        <Stack.Screen name="index" options={{ title: 'ConecTEM' }} />
        <Stack.Screen name="familia/index" options={{ title: 'Familia', headerLeft: () => <FlechaVolver /> }} />
        <Stack.Screen name="familia/buscar" options={{ title: 'Buscar feedbacks', headerLeft: () => <FlechaVolver /> }} />
        <Stack.Screen name="familia/calendario" options={{ title: 'Calendario de hitos', headerLeft: () => <FlechaVolver /> }} />
        <Stack.Screen name="familia/mensajes" options={{ title: 'Mensajes', headerLeft: () => <FlechaVolver /> }} />
        {/* Nueva interfaz de la terapeuta: cabecera y barra de navegación propias, sin la del navegador */}
        <Stack.Screen name="terapeuta/index" options={{ title: 'Inicio', headerShown: false }} />
        <Stack.Screen name="terapeuta/pacientes" options={{ title: 'Pacientes', headerShown: false }} />
        <Stack.Screen name="terapeuta/practicas" options={{ title: 'Prácticas', headerShown: false }} />
        <Stack.Screen name="terapeuta/evidencias" options={{ title: 'Evidencias', headerShown: false }} />
        <Stack.Screen name="terapeuta/mensajes" options={{ title: 'Mensajes', headerLeft: () => <FlechaVolver /> }} />
      </Stack>
    </SesionTerapeutaProvider>
  );
}
