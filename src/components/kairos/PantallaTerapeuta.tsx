import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { colores } from '../../tema/kairos';
import { useSesionTerapeuta } from '../../sesion/SesionTerapeuta';
import { CabeceraTerapeuta } from './CabeceraTerapeuta';
import { NavegacionTerapeuta, PestanaTerapeuta } from './NavegacionTerapeuta';

// Marco común de las pantallas de la terapeuta en la nueva interfaz: cabecera, contenido con scroll
// y barra de navegación flotante abajo.
export const PantallaTerapeuta = ({ pestana, children }: { pestana: PestanaTerapeuta; children: React.ReactNode }) => {
  const { nombreActual } = useSesionTerapeuta();

  return (
    <View style={styles.pantalla}>
      <CabeceraTerapeuta nombre={nombreActual} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.contenido}>
        {children}
      </ScrollView>
      <NavegacionTerapeuta activa={pestana} />
    </View>
  );
};

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  scroll: { flex: 1 },
  // Hueco abajo para que la barra flotante no tape el final del contenido
  contenido: { paddingHorizontal: 40, paddingTop: 64, paddingBottom: 110, width: '100%', maxWidth: 1440, alignSelf: 'center' },
});
