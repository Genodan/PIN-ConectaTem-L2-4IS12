import { Redirect, Slot, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Cabecera } from '../../components/estructura';
import { TERAPEUTA } from '../../datos/prototipo';
import { useSesion } from '../../sesion';
import { colores } from '../../tema';

// Estructura común del área de la terapeuta. Cada pestaña (bandeja, fichas, tareas)
// es una pantalla con su lista a la izquierda y el detalle a la derecha.
export default function LayoutTerapeuta() {
  const router = useRouter();
  const { usuario, cargando, modoDemo, cerrarSesion } = useSesion();

  if (cargando) {
    return (
      <View style={[styles.pantalla, styles.centro]}>
        <ActivityIndicator color={colores.primario} />
      </View>
    );
  }
  // Con Supabase configurado, solo entra una terapeuta con sesión iniciada
  if (!modoDemo && usuario?.rol !== 'terapeuta') return <Redirect href="/" />;

  const nombre = usuario?.nombre ?? `${TERAPEUTA.nombre} ${TERAPEUTA.apellidos}`;
  const salir = async () => {
    await cerrarSesion();
    router.replace('/');
  };

  return (
    <View style={styles.pantalla}>
      <Cabecera nombre={nombre} inicial={nombre.charAt(0).toUpperCase()} rol="Terapeuta" avisos={2} onSalir={salir} />
      <Slot />
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  centro: { alignItems: 'center', justifyContent: 'center' },
});
