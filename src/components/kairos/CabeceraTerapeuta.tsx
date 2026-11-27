import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colores, textos } from '../../tema/kairos';

// Cabecera de la nueva interfaz (Figma: «Cabecera Terapeuta»): logo, «Espacio terapeuta», nombre y campana.
export const CabeceraTerapeuta = ({ nombre }: { nombre: string | null }) => (
  <View style={styles.cabecera}>
    <Image
      source={require('../../../assets/kairos/logo-cabecera.png')}
      style={styles.logo}
      contentFit="contain"
      accessibilityLabel="KAIRÓS"
    />
    <Text style={[textos.cuerpo, styles.espacio]}>Espacio terapeuta</Text>
    {nombre ? <Text style={textos.cuerpo}>{nombre}</Text> : null}
    {/* Campana de avisos: de momento solo visual (los mensajes se dejan para más adelante) */}
    <View style={styles.campana}>
      <Image source={require('../../../assets/kairos/campana.svg')} style={styles.iconoCampana} contentFit="contain" />
    </View>
  </View>
);

const styles = StyleSheet.create({
  cabecera: {
    height: 63,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    paddingLeft: 50,
    paddingRight: 56,
    backgroundColor: colores.blanco,
    borderBottomWidth: 1,
    borderBottomColor: colores.bordeCabecera,
  },
  logo: { width: 34, height: 31 },
  espacio: { flex: 1, color: colores.textoSecundario },
  campana: { padding: 8, borderRadius: 999, backgroundColor: colores.blanco },
  iconoCampana: { width: 18.6, height: 20 },
});
