import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Contenido, useEsAncho } from '../../../components/estructura';
import { Aviso, Boton, Campo, EstadoVacio, Insignia, Rejilla, Tarjeta, Titulo, VideoSimulado } from '../../../components/ui';
import { MODULOS, TERAPEUTA } from '../../../datos/prototipo';
import { colores, fuentes, radios } from '../../../tema';

// Detalle de un módulo: vídeo de demostración de la terapeuta y envío de la práctica
export default function DetalleModulo() {
  const ancho = useEsAncho();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const modulo = MODULOS.find((m) => String(m.id) === id);

  const [nota, setNota] = useState('');
  const [videoAdjunto, setVideoAdjunto] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const volver = () => router.navigate('/familia/modulos');

  if (!modulo) return <EstadoVacio icono="🧩" texto="Este módulo no existe." />;
  if (enviado) return <PracticaEnviada onVolver={volver} />;

  return (
    <Contenido>
      <Boton titulo="← Volver a los módulos" variante="enlace" onPress={volver} estilo={styles.volver} />

      <View style={styles.cabecera}>
        <Text style={styles.emoji}>{modulo.emoji}</Text>
        <View>
          <Titulo>{modulo.titulo}</Titulo>
          <Text style={styles.subtitulo}>{modulo.subtitulo}</Text>
        </View>
      </View>

      <Rejilla ancho={ancho}>
        <Tarjeta estilo={styles.tarjeta}>
          <Text style={styles.tituloBloque}>🎬 Vídeo de demostración</Text>
          <Text style={styles.ayuda}>{modulo.descripcion}</Text>
          <VideoSimulado etiqueta={modulo.titulo} pie={`${TERAPEUTA.nombre} ${TERAPEUTA.apellidos} · ${modulo.duracionDemo}`} />
        </Tarjeta>

        <Tarjeta estilo={styles.tarjeta}>
          <Text style={styles.tituloBloque}>📹 Tu práctica</Text>
          <View style={styles.zonaVideo}>
            <Text style={{ fontSize: 30, marginBottom: 8 }}>📹</Text>
            <Text style={styles.tituloZona}>Grabar o subir vídeo</Text>
            <Text style={styles.ayuda}>Máx. 2 min · MP4, MOV</Text>
            <View style={styles.botonesVideo}>
              <Boton titulo="📷 Grabar" pequeno onPress={() => setVideoAdjunto(true)} />
              <Boton titulo="📁 Elegir" pequeno variante="gris" onPress={() => setVideoAdjunto(true)} />
            </View>
            {videoAdjunto ? <Text style={styles.adjuntado}>✓ Vídeo adjuntado</Text> : null}
          </View>
          <Aviso icono="🔒" tipo="plano" texto={`El vídeo se sube de forma privada. Solo ${TERAPEUTA.nombre} lo verá.`} />
          <Campo
            etiqueta={`Nota para ${TERAPEUTA.nombre}`}
            opcional
            filas={3}
            value={nota}
            onChangeText={setNota}
            placeholder="Ej: Lucas tardó mucho en señalar, pero al final lo hizo. ¿Estamos haciéndolo bien?"
          />
        </Tarjeta>
      </Rejilla>

      <View style={styles.enviar}>
        <Boton titulo={`Enviar práctica a ${TERAPEUTA.nombre} ✨`} deshabilitado={!videoAdjunto} onPress={() => setEnviado(true)} />
        {!videoAdjunto ? <Text style={styles.pista}>Adjunta tu vídeo para poder enviar la práctica.</Text> : null}
      </View>
    </Contenido>
  );
}

function PracticaEnviada({ onVolver }: { onVolver: () => void }) {
  return (
    <View style={styles.enviado}>
      <Text style={{ fontSize: 60, marginBottom: 16 }}>🎉</Text>
      <Titulo estilo={styles.centrado}>¡Práctica enviada!</Titulo>
      <Text style={[styles.ayudaGrande, styles.centrado]}>
        {TERAPEUTA.nombre} recibirá una notificación y te enviará feedback en breve. ¡Lo estáis haciendo genial!
      </Text>
      <Insignia texto="🏅 +1 práctica esta semana" />
      <Boton titulo="Volver a los módulos" variante="enlace" onPress={onVolver} estilo={{ marginTop: 24, alignItems: 'center' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  volver: { marginBottom: 24 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  emoji: { fontSize: 30 },
  subtitulo: { fontFamily: fuentes.texto, fontSize: 14, color: colores.textoApagado },
  tarjeta: { gap: 12 },
  tituloBloque: { fontFamily: fuentes.tituloMedio, fontSize: 14, color: colores.texto },
  ayuda: { fontFamily: fuentes.texto, fontSize: 12, lineHeight: 18, color: colores.textoApagado },
  zonaVideo: { borderWidth: 2, borderStyle: 'dashed', borderColor: colores.borde, borderRadius: radios.medio, padding: 20, alignItems: 'center' },
  tituloZona: { fontFamily: fuentes.tituloMedio, fontSize: 14, color: colores.texto },
  botonesVideo: { flexDirection: 'row', gap: 8, marginTop: 12 },
  adjuntado: { fontFamily: fuentes.textoFuerte, fontSize: 12, color: colores.primarioOscuro, marginTop: 12 },
  enviar: { marginTop: 20, alignItems: 'flex-start', gap: 8 },
  pista: { fontFamily: fuentes.texto, fontSize: 12, color: colores.textoTenue },
  enviado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  centrado: { textAlign: 'center' },
  ayudaGrande: { fontFamily: fuentes.texto, fontSize: 14, lineHeight: 20, color: colores.textoApagado, maxWidth: 380, marginTop: 8, marginBottom: 24 },
});
