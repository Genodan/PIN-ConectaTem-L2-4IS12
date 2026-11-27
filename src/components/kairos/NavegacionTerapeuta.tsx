import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image, ImageSource } from 'expo-image';
import { Href, useRouter } from 'expo-router';
import { colores, fuentes } from '../../tema/kairos';

export type PestanaTerapeuta = 'inicio' | 'pacientes' | 'practicas' | 'evidencias';

const PESTANAS: { clave: PestanaTerapeuta; texto: string; ruta: Href; icono: ImageSource }[] = [
  { clave: 'inicio', texto: 'Inicio', ruta: '/terapeuta', icono: require('../../../assets/kairos/nav-inicio.svg') },
  { clave: 'pacientes', texto: 'Pacientes', ruta: '/terapeuta/pacientes', icono: require('../../../assets/kairos/nav-pacientes.svg') },
  { clave: 'practicas', texto: 'Prácticas', ruta: '/terapeuta/practicas', icono: require('../../../assets/kairos/nav-practicas.svg') },
  { clave: 'evidencias', texto: 'Evidencias', ruta: '/terapeuta/evidencias', icono: require('../../../assets/kairos/nav-evidencias.svg') },
];

// Barra de navegación flotante (Figma: «Navegación flotante · Desktop · Terapeuta»)
export const NavegacionTerapeuta = ({ activa }: { activa: PestanaTerapeuta }) => {
  const router = useRouter();

  return (
    <View style={styles.contenedor} pointerEvents="box-none">
      <View style={styles.barra} accessibilityRole="tablist">
        {PESTANAS.map(({ clave, texto, ruta, icono }) => {
          const esActiva = clave === activa;
          return (
            <Pressable
              key={clave}
              accessibilityRole="tab"
              accessibilityState={{ selected: esActiva }}
              testID={`pestana-${clave}`}
              style={[styles.pestana, esActiva && styles.pestanaActiva]}
              onPress={() => {
                if (!esActiva) router.replace(ruta);
              }}
            >
              <Image source={icono} style={styles.icono} contentFit="contain" />
              <Text style={[styles.texto, esActiva && styles.textoActivo]}>{texto}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  contenedor: { position: 'absolute', left: 0, right: 0, bottom: 20, alignItems: 'center' },
  barra: {
    width: 640,
    maxWidth: '95%',
    height: 60,
    flexDirection: 'row',
    gap: 6,
    padding: 6,
    borderRadius: 16,
    backgroundColor: colores.blanco,
    shadowColor: '#172D26',
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pestana: { flex: 1, height: 48, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  pestanaActiva: { backgroundColor: colores.amarillo },
  icono: { width: 18, height: 18 },
  texto: { fontFamily: fuentes.navRegular, fontSize: 14, lineHeight: 20, color: '#000' },
  textoActivo: { fontFamily: fuentes.navSemibold },
});
