import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Contenido, useEsAncho } from '../../components/estructura';
import { Aviso, Insignia, Titulo } from '../../components/ui';
import { FEEDBACKS, TERAPEUTA } from '../../datos/prototipo';
import { colores, fuentes, radios } from '../../tema';

// Historial de logros: feedbacks recibidos con sus tres bloques (punto fuerte, a mejorar, foco)
export default function HistorialLogros() {
  const ancho = useEsAncho();
  const [feedbackId, setFeedbackId] = useState(FEEDBACKS[0].id);
  const feedback = FEEDBACKS.find((f) => f.id === feedbackId) ?? FEEDBACKS[0];
  const nuevos = FEEDBACKS.filter((f) => f.nuevo).length;

  const bloques = [
    { titulo: 'Punto fuerte', icono: '✓', texto: feedback.fuerte, color: colores.primarioOscuro, fondo: colores.primarioSuave },
    { titulo: 'A mejorar', icono: '↗', texto: feedback.mejorar, color: colores.avisoTexto, fondo: colores.avisoFondo },
    { titulo: 'Foco para esta semana', icono: '◎', texto: feedback.foco, color: colores.focoTexto, fondo: colores.focoFondo },
  ];

  return (
    <Contenido>
      <View style={styles.cabecera}>
        <View style={styles.fila}>
          <Titulo>Historial de logros</Titulo>
          {nuevos ? <Insignia texto={`${nuevos} nuevo`} tipo="nuevo" mayusculas /> : null}
        </View>
        <Text style={styles.subtitulo}>Repasa las pautas de {TERAPEUTA.nombre} y celebrad cada pequeño avance.</Text>
      </View>

      <View style={[styles.distribucion, ancho && styles.distribucionAncha]}>
        <View style={[styles.lista, ancho && styles.listaAncha]}>
          {FEEDBACKS.map((f) => {
            const sel = f.id === feedbackId;
            return (
              <Pressable
                key={f.id}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                onPress={() => setFeedbackId(f.id)}
                style={[styles.elemento, sel && styles.elementoSel]}
              >
                <View style={styles.filaEntre}>
                  <View style={styles.icono}>
                    <Text style={{ fontSize: 18 }}>{f.emoji}</Text>
                  </View>
                  {f.nuevo ? <View style={styles.puntoNuevo} /> : null}
                </View>
                <Text style={styles.modulo}>{f.modulo}</Text>
                <Text style={styles.fecha}>{f.fecha}</Text>
                <View style={{ marginTop: 12 }}>
                  <Insignia texto={f.insignia} tipo="aviso" />
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.detalle}>
          <View style={styles.cabeceraDetalle}>
            <View style={styles.fila}>
              <View style={styles.iconoGrande}>
                <Text style={{ fontSize: 24 }}>{feedback.emoji}</Text>
              </View>
              <View>
                <Text style={styles.tituloDetalle}>{feedback.modulo}</Text>
                <Text style={styles.fecha}>Feedback de {TERAPEUTA.nombre} · {feedback.fecha}</Text>
              </View>
            </View>
            <Insignia texto={feedback.insignia} tipo="aviso" />
          </View>

          <View style={styles.cuerpoDetalle}>
            <View style={styles.audio}>
              <Pressable accessibilityRole="button" accessibilityLabel="Reproducir nota de voz" style={styles.play}>
                <Text style={{ color: colores.blanco }}>▶</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <View style={styles.barra}>
                  <View style={styles.progreso} />
                </View>
                <View style={[styles.filaEntre, { marginTop: 6 }]}>
                  <Text style={styles.textoAudio}>Nota de voz de {TERAPEUTA.nombre}</Text>
                  <Text style={styles.textoAudio}>{feedback.audio}</Text>
                </View>
              </View>
            </View>

            {bloques.map((b) => (
              <View key={b.titulo} style={[styles.bloque, { backgroundColor: b.fondo }]}>
                <Text style={[styles.tituloBloque, { color: b.color }]}>
                  {b.icono} {b.titulo}
                </Text>
                <Text style={styles.textoBloque}>{b.texto}</Text>
              </View>
            ))}

            <Aviso icono="🔒" tipo="plano" texto={`Este resumen ha sido revisado y aprobado por ${TERAPEUTA.nombre}.`} />
          </View>
        </View>
      </View>
    </Contenido>
  );
}

const styles = StyleSheet.create({
  cabecera: { marginBottom: 24, gap: 4 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filaEntre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  subtitulo: { fontFamily: fuentes.texto, fontSize: 14, color: colores.textoApagado },
  distribucion: { gap: 20 },
  distribucionAncha: { flexDirection: 'row', alignItems: 'flex-start' },
  lista: { gap: 8 },
  listaAncha: { width: 240 },
  elemento: { padding: 16, borderRadius: radios.grande, borderWidth: 1, borderColor: colores.borde, backgroundColor: colores.tarjeta },
  elementoSel: { backgroundColor: colores.primarioSuave, borderColor: colores.primario },
  icono: { width: 36, height: 36, borderRadius: radios.medio, backgroundColor: colores.tarjeta, alignItems: 'center', justifyContent: 'center' },
  puntoNuevo: { width: 8, height: 8, borderRadius: 4, backgroundColor: colores.acento, marginTop: 4 },
  modulo: { fontFamily: fuentes.titulo, fontSize: 14, color: colores.texto, marginTop: 12 },
  fecha: { fontFamily: fuentes.texto, fontSize: 12, color: colores.textoApagado, marginTop: 2 },
  detalle: { flex: 1, backgroundColor: colores.tarjeta, borderRadius: radios.grande, borderWidth: 1, borderColor: colores.borde, overflow: 'hidden' },
  cabeceraDetalle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
  },
  iconoGrande: { width: 44, height: 44, borderRadius: radios.medio, backgroundColor: colores.primarioSuave, alignItems: 'center', justifyContent: 'center' },
  tituloDetalle: { fontFamily: fuentes.titulo, fontSize: 18, color: colores.texto },
  cuerpoDetalle: { padding: 24, gap: 16 },
  audio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colores.fondo,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.medio,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  play: { width: 36, height: 36, borderRadius: 18, backgroundColor: colores.primario, alignItems: 'center', justifyContent: 'center' },
  barra: { height: 6, backgroundColor: colores.borde, borderRadius: 3, overflow: 'hidden' },
  progreso: { width: '33%', height: '100%', backgroundColor: colores.primario, borderRadius: 3 },
  textoAudio: { fontFamily: fuentes.texto, fontSize: 10, color: colores.textoApagado },
  bloque: { borderRadius: radios.medio, paddingHorizontal: 16, paddingVertical: 14 },
  tituloBloque: { fontFamily: fuentes.textoFuerte, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  textoBloque: { fontFamily: fuentes.texto, fontSize: 14, lineHeight: 21, color: colores.texto },
});
