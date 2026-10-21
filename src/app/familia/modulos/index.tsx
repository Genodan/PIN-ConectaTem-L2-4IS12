import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Contenido, useEsAncho } from '../../../components/estructura';
import { CabeceraSeccion } from '../../../components/ui';
import { MODULOS, TERAPEUTA } from '../../../datos/prototipo';
import { colores, fuentes, radios } from '../../../tema';

// Catálogo de los 5 módulos de estimulación
export default function CatalogoModulos() {
  const ancho = useEsAncho();
  const router = useRouter();

  return (
    <Contenido>
      <CabeceraSeccion
        titulo="Módulos para practicar"
        subtitulo={`Elige un módulo para ver el vídeo de ${TERAPEUTA.nombre} y enviar tu práctica.`}
      />
      <View style={styles.rejilla}>
        {MODULOS.map((m) => (
          <Pressable
            key={m.id}
            accessibilityRole="button"
            accessibilityLabel={`${m.titulo}. Ver y practicar`}
            onPress={() => router.push(`/familia/modulos/${m.id}`)}
            style={({ pressed }) => [styles.modulo, ancho ? styles.tercio : styles.completo, pressed && styles.moduloPulsado]}
          >
            <Text style={styles.emoji}>{m.emoji}</Text>
            <View style={styles.textos}>
              <Text style={styles.titulo}>{m.titulo}</Text>
              <Text style={styles.subtitulo}>{m.subtitulo}</Text>
            </View>
            <Text style={styles.accion}>▶️ Ver y practicar</Text>
          </Pressable>
        ))}
      </View>
    </Contenido>
  );
}

const styles = StyleSheet.create({
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  // Tres columnas fijas en escritorio (la última fila no se estira), una en el móvil
  tercio: { width: '31.5%' },
  completo: { width: '100%' },
  modulo: {
    gap: 12,
    padding: 20,
    backgroundColor: colores.tarjeta,
    borderRadius: radios.grande,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  moduloPulsado: { borderColor: colores.primario },
  emoji: { fontSize: 30 },
  textos: { gap: 2 },
  titulo: { fontFamily: fuentes.tituloMedio, fontSize: 14, color: colores.texto },
  subtitulo: { fontFamily: fuentes.texto, fontSize: 12, color: colores.textoApagado },
  accion: { fontFamily: fuentes.textoFuerte, fontSize: 12, color: colores.primario },
});
