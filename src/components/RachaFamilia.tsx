import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { InsigniaConseguida, ResumenRacha } from '../services/rachaService';

const semanas = (n: number) => `${n} ${n === 1 ? 'semana' : 'semanas'}`;

// Mensaje principal, siempre en positivo: nunca se habla de «perder» la racha
export const mensajeRacha = ({ rachaActual, practicasEnviadas }: ResumenRacha) => {
  if (practicasEnviadas === 0) return 'Cuando enviéis vuestra primera práctica, aquí veréis vuestro camino juntos.';
  if (rachaActual === 0) return 'Esta semana es una buena ocasión para practicar juntos.';
  return `Lleváis ${semanas(rachaActual)} seguidas practicando juntos.`;
};

// UT 1449 · Racha semanal y logros de la familia. Solo muestra datos: el cálculo está en rachaService.
export const RachaFamilia = ({ resumen }: { resumen: ResumenRacha }) => (
  <View style={styles.container}>
    <Text style={styles.titulo}>Vuestro camino</Text>
    <Text style={styles.mensaje}>{mensajeRacha(resumen)}</Text>

    {resumen.practicasEnviadas > 0 && (
      <Text style={styles.datos}>
        Vuestra mejor racha: {semanas(resumen.mejorRacha)} · Prácticas enviadas: {resumen.practicasEnviadas}
      </Text>
    )}

    {resumen.insignias.length > 0 && (
      <View style={styles.insignias}>
        {resumen.insignias.map((insignia) => (
          <View key={insignia.clave} style={styles.insignia} accessibilityLabel={`${insignia.titulo}. ${insignia.descripcion}`}>
            <Text style={styles.tituloInsignia}>{insignia.titulo}</Text>
            <Text style={styles.descripcionInsignia}>{insignia.descripcion}</Text>
          </View>
        ))}
      </View>
    )}
  </View>
);

// En el historial, encima de la práctica con la que se consiguió una insignia
export const MarcaInsignias = ({ insignias }: { insignias: InsigniaConseguida[] }) => (
  <View style={styles.marca}>
    {insignias.map((insignia) => (
      <Text key={insignia.clave} style={styles.textoMarca}>
        Aquí conseguisteis la insignia «{insignia.titulo}»
      </Text>
    ))}
  </View>
);

const styles = StyleSheet.create({
  marca: { marginTop: 4, marginBottom: 4, paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: '#ffd666' },
  textoMarca: { fontSize: 12, color: '#874d00', fontWeight: 'bold' },
  container: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fffbe6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffe58f',
    gap: 6,
  },
  titulo: { fontSize: 16, fontWeight: 'bold', color: '#874d00' },
  mensaje: { fontSize: 15, color: '#333' },
  datos: { fontSize: 13, color: '#666' },
  insignias: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  insignia: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffd666',
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 220,
  },
  tituloInsignia: { fontWeight: 'bold', color: '#874d00', fontSize: 13 },
  descripcionInsignia: { color: '#666', fontSize: 12 },
});
