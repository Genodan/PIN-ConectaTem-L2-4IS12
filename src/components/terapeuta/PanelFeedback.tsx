import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { INSIGNIAS, Practica } from '../../datos/prototipo';
import { colores, fuentes, radios } from '../../tema';
import { Contenido, useEsAncho } from '../estructura';
import { Avatar, Boton, Campo, Chip, Insignia, Rejilla, Tarjeta, Titulo, VideoSimulado } from '../ui';

type TipoFeedback = 'voz' | 'checklist' | 'texto';
type EstadoResumen = 'pendiente' | 'aceptado' | 'rechazado';

// Revisión de una práctica: vídeo, nota de la familia, resumen con IA y formulario de feedback
export function PanelFeedback({ practica, onEnviar }: { practica: Practica; onEnviar: () => void }) {
  const ancho = useEsAncho();
  const [tipo, setTipo] = useState<TipoFeedback>('checklist');
  const [estadoResumen, setEstadoResumen] = useState<EstadoResumen>('pendiente');
  const [insignia, setInsignia] = useState<string | null>(null);

  // Mismas reglas que el prototipo: hay que aceptar o rechazar el resumen de la IA antes de enviar,
  // y si se rechaza hay que escribir el feedback a mano (no vale la nota de voz)
  const puedeEnviar = estadoResumen === 'aceptado' || (estadoResumen === 'rechazado' && tipo !== 'voz');

  return (
    <Contenido>
      <View style={styles.cabecera}>
        <Avatar texto={practica.avatar} tamano={48} />
        <View>
          <Titulo tamano={20}>{practica.nino}</Titulo>
          <Text style={styles.subtitulo}>
            {practica.modulo} · {practica.fecha}
          </Text>
        </View>
      </View>

      <Rejilla ancho={ancho}>
        <View style={styles.columna}>
          <VideoSimulado etiqueta={practica.modulo} pie={`Práctica de ${practica.nino} · ${practica.fecha}`} />

          {practica.nota ? (
            <View style={styles.notaFamilia}>
              <Text style={styles.tituloNota}>NOTA DE LA FAMILIA</Text>
              <Text style={styles.textoNota}>“{practica.nota}”</Text>
            </View>
          ) : null}

          <ResumenIa
            texto={practica.resumenIa}
            estado={estadoResumen}
            onAceptar={() => setEstadoResumen('aceptado')}
            onRechazar={() => {
              setEstadoResumen('rechazado');
              setTipo('texto');
            }}
          />

          <Tarjeta estilo={styles.tarjetaCompacta}>
            <Text style={styles.tituloBloque}>
              Insignia de logro <Text style={styles.opcional}>(opcional)</Text>
            </Text>
            <View style={styles.chips}>
              {INSIGNIAS.map((ins) => (
                <Chip
                  key={ins}
                  texto={ins}
                  colorSeleccion="acento"
                  seleccionado={insignia === ins}
                  onPress={() => setInsignia(insignia === ins ? null : ins)}
                />
              ))}
            </View>
          </Tarjeta>
        </View>

        <View style={styles.columna}>
          <Tarjeta estilo={styles.tarjetaCompacta}>
            <Text style={styles.tituloBloque}>Tipo de feedback</Text>
            <View style={styles.tipos}>
              {[
                { id: 'voz' as const, icono: '🎙️', texto: 'Nota de voz' },
                { id: 'checklist' as const, icono: '✅', texto: 'Puntos clave' },
                { id: 'texto' as const, icono: '💬', texto: 'Mensaje' },
              ].map((t) => (
                <Pressable
                  key={t.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: tipo === t.id }}
                  onPress={() => setTipo(t.id)}
                  style={[styles.tipo, tipo === t.id && styles.tipoActivo]}
                >
                  <Text style={{ fontSize: 20 }}>{t.icono}</Text>
                  <Text style={styles.textoTipo}>{t.texto}</Text>
                </Pressable>
              ))}
            </View>
          </Tarjeta>

          {tipo === 'voz' ? <FeedbackVoz /> : null}
          {tipo === 'checklist' ? <FeedbackPuntosClave /> : null}
          {tipo === 'texto' ? (
            <Tarjeta estilo={styles.tarjetaCompacta}>
              <Campo
                etiqueta="Mensaje a la familia"
                filas={6}
                placeholder="Ej: ¡Muy buen trabajo esta semana! Lucas está empezando a anticipar la rutina..."
              />
            </Tarjeta>
          ) : null}

          <Boton titulo="Enviar feedback a la familia" deshabilitado={!puedeEnviar} onPress={onEnviar} />
        </View>
      </Rejilla>
    </Contenido>
  );
}

function ResumenIa({
  texto,
  estado,
  onAceptar,
  onRechazar,
}: {
  texto: string;
  estado: EstadoResumen;
  onAceptar: () => void;
  onRechazar: () => void;
}) {
  return (
    <View accessibilityLabel="Resumen del feedback con IA" style={styles.resumenIa}>
      <View style={styles.filaEntre}>
        <Text style={styles.tituloIa}>✨ Resumen del feedback con IA</Text>
        <View style={styles.simulado}>
          <Text style={styles.textoSimulado}>Ejemplo simulado</Text>
        </View>
      </View>
      <Text style={styles.textoIa}>{texto}</Text>
      <Text style={styles.avisoIa}>Borrador de apoyo al terapeuta · Revisar antes de compartir con la familia.</Text>
      <View style={styles.botonesIa}>
        <Boton titulo="✓ Aceptar resumen" pequeno onPress={onAceptar} />
        <Boton titulo="✕ Rechazar resumen" pequeno variante="contorno" onPress={onRechazar} />
      </View>
      <Text accessibilityRole="alert" style={styles.estadoIa}>
        {estado === 'aceptado'
          ? 'Resumen aceptado. Ya puedes enviar el feedback a la familia.'
          : estado === 'rechazado'
            ? 'Resumen rechazado. No se incluirá en el envío; redacta tu propio feedback.'
            : 'Acepta el resumen o recházalo para continuar con un feedback manual.'}
      </Text>
    </View>
  );
}

function FeedbackVoz() {
  const [grabado, setGrabado] = useState(false);
  const [transcripcion, setTranscripcion] = useState(
    'Lucas lo ha hecho muy bien esperando y buscando tu mirada antes de señalar. Podéis darle unos segundos más antes de ayudarle. Esta semana probad con el pompero y su cuento favorito.',
  );
  const [fuerte, setFuerte] = useState('Lucas espera y busca la mirada del adulto antes de señalar.');
  const [mejorar, setMejorar] = useState('Darle unos segundos más antes de anticipar la ayuda.');
  const [foco, setFoco] = useState('Practicar peticiones con el pompero y su cuento favorito.');

  if (!grabado) {
    return (
      <Tarjeta estilo={styles.tarjetaCompacta}>
        <Text style={styles.tituloBloque}>Grabar nota de voz</Text>
        <View style={styles.centro}>
          <Pressable accessibilityRole="button" accessibilityLabel="Grabar nota de voz" onPress={() => setGrabado(true)} style={styles.microfono}>
            <Text style={{ fontSize: 24 }}>🎙️</Text>
          </Pressable>
        </View>
        <Text style={[styles.ayuda, styles.textoCentro]}>Pulsa para simular una grabación · máx. 5 min</Text>
        <Text style={styles.ayuda}>✦ La app transcribirá y estructurará tu nota automáticamente.</Text>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta estilo={styles.tarjetaCompacta}>
      <View style={styles.filaEntre}>
        <View style={styles.flex1}>
          <View style={styles.fila}>
            <Text style={styles.tituloBloque}>Revisión del resumen</Text>
            <Insignia texto="Generado con IA" tipo="foco" mayusculas />
          </View>
          <Text style={styles.ayuda}>Edita cualquier detalle antes de aprobar y enviar.</Text>
        </View>
        <Boton titulo="Regrabar" variante="enlace" pequeno onPress={() => setGrabado(false)} />
      </View>

      <View style={styles.transcripcion}>
        <View style={styles.filaEntre}>
          <Text style={styles.etiquetaMini}>TRANSCRIPCIÓN · 1:18</Text>
          <Text style={styles.procesado}>Audio procesado</Text>
        </View>
        <Campo accessibilityLabel="Transcripción" filas={3} value={transcripcion} onChangeText={setTranscripcion} estiloCampo={styles.campoTransparente} />
      </View>

      {[
        { etiqueta: '✓ PUNTO FUERTE', valor: fuerte, cambiar: setFuerte, color: colores.primarioOscuro },
        { etiqueta: '↗ A MEJORAR', valor: mejorar, cambiar: setMejorar, color: colores.avisoTexto },
        { etiqueta: '◎ FOCO PARA ESTA SEMANA', valor: foco, cambiar: setFoco, color: colores.focoTexto },
      ].map((c) => (
        <View key={c.etiqueta}>
          <Text style={[styles.etiquetaMini, { color: c.color, marginBottom: 4 }]}>{c.etiqueta}</Text>
          <Campo accessibilityLabel={c.etiqueta} filas={2} value={c.valor} onChangeText={c.cambiar} estiloCampo={styles.campoBlanco} />
        </View>
      ))}

      <View style={styles.privacidadIa}>
        <Text style={styles.textoPrivacidadIa}>✓ El vídeo del niño no se envía a la IA. Solo se procesa tu nota de voz.</Text>
      </View>
    </Tarjeta>
  );
}

function FeedbackPuntosClave() {
  return (
    <Tarjeta>
      <View>
        <Text style={styles.tituloBloque}>Resumen estructurado</Text>
        <Text style={styles.ayuda}>La familia verá esto en el Historial de Logros.</Text>
      </View>
      {[
        { etiqueta: '✅ PUNTO FUERTE', color: colores.primarioOscuro, ejemplo: 'Ej: Lucas mantuvo el contacto visual durante 3 segundos.' },
        { etiqueta: '🔧 A MEJORAR', color: colores.avisoTexto, ejemplo: 'Ej: Intenta bajar a su altura cuando esperas su respuesta.' },
        { etiqueta: '🎯 FOCO PARA ESTA SEMANA', color: colores.focoTexto, ejemplo: 'Ej: Practicar 5 minutos al día con el pompero.' },
      ].map((c) => (
        <View key={c.etiqueta}>
          <Text style={[styles.etiquetaMini, { color: c.color, marginBottom: 6 }]}>{c.etiqueta}</Text>
          <Campo accessibilityLabel={c.etiqueta} filas={2} placeholder={c.ejemplo} />
        </View>
      ))}
    </Tarjeta>
  );
}

export function FeedbackEnviado({ onVolver }: { onVolver: () => void }) {
  return (
    <View style={styles.enviado}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>✅</Text>
      <Titulo estilo={styles.textoCentro}>Feedback enviado</Titulo>
      <Text style={[styles.ayudaGrande, styles.textoCentro]}>
        La familia recibirá una notificación y verá tu feedback en el Historial de Logros.
      </Text>
      <Boton titulo="Volver a la bandeja" variante="enlace" onPress={onVolver} estilo={{ alignItems: 'center' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  filaEntre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' },
  centro: { alignItems: 'center', paddingVertical: 20 },
  textoCentro: { textAlign: 'center' },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  subtitulo: { fontFamily: fuentes.texto, fontSize: 14, color: colores.textoApagado },
  columna: { gap: 16 },
  tarjetaCompacta: { padding: 16, gap: 12 },
  tituloBloque: { fontFamily: fuentes.tituloMedio, fontSize: 14, color: colores.texto },
  opcional: { fontFamily: fuentes.texto, color: colores.textoApagado },
  ayuda: { fontFamily: fuentes.texto, fontSize: 12, lineHeight: 18, color: colores.textoApagado },
  ayudaGrande: { fontFamily: fuentes.texto, fontSize: 14, lineHeight: 20, color: colores.textoApagado, maxWidth: 380, marginTop: 8, marginBottom: 24 },
  notaFamilia: { backgroundColor: colores.avisoFondo, borderWidth: 1, borderColor: colores.avisoBorde, borderRadius: radios.medio, paddingHorizontal: 16, paddingVertical: 12 },
  tituloNota: { fontFamily: fuentes.textoFuerte, fontSize: 11, letterSpacing: 0.5, color: colores.avisoTextoOscuro, marginBottom: 4 },
  textoNota: { fontFamily: fuentes.texto, fontSize: 14, lineHeight: 20, color: colores.avisoTextoOscuro },
  resumenIa: { backgroundColor: colores.primarioSuave, borderWidth: 1, borderColor: colores.iaBorde, borderRadius: radios.grande, padding: 16 },
  tituloIa: { fontFamily: fuentes.titulo, fontSize: 14, color: colores.primarioOscuro },
  simulado: { backgroundColor: colores.blanco, borderRadius: radios.completo, paddingHorizontal: 8, paddingVertical: 4 },
  textoSimulado: { fontFamily: fuentes.tituloMedio, fontSize: 10, color: colores.primarioOscuro },
  textoIa: { fontFamily: fuentes.texto, fontSize: 14, lineHeight: 21, color: colores.texto, marginTop: 12 },
  avisoIa: { fontFamily: fuentes.texto, fontSize: 12, lineHeight: 18, color: colores.primarioOscuro, borderTopWidth: 1, borderTopColor: colores.iaBorde, paddingTop: 8, marginTop: 12 },
  botonesIa: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  estadoIa: { fontFamily: fuentes.texto, fontSize: 12, lineHeight: 18, color: colores.primarioOscuro, marginTop: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tipos: { flexDirection: 'row', gap: 8 },
  tipo: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: radios.medio, borderWidth: 1, borderColor: colores.borde },
  tipoActivo: { borderColor: colores.primario, backgroundColor: colores.primarioSuave },
  textoTipo: { fontFamily: fuentes.tituloMedio, fontSize: 12, color: colores.texto },
  microfono: { width: 64, height: 64, borderRadius: 32, backgroundColor: colores.primarioSuave, borderWidth: 2, borderColor: colores.primario, alignItems: 'center', justifyContent: 'center' },
  transcripcion: { backgroundColor: colores.fondo, borderWidth: 1, borderColor: colores.borde, borderRadius: radios.medio, padding: 12, gap: 4 },
  etiquetaMini: { fontFamily: fuentes.textoFuerte, fontSize: 10, letterSpacing: 0.5, color: colores.textoApagado },
  procesado: { fontFamily: fuentes.textoFuerte, fontSize: 10, color: colores.primario },
  campoTransparente: { backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 0, fontSize: 12, color: colores.textoLectura },
  campoBlanco: { backgroundColor: colores.blanco, fontSize: 12 },
  privacidadIa: { backgroundColor: colores.primarioSuave, borderRadius: radios.medio, paddingHorizontal: 12, paddingVertical: 10 },
  textoPrivacidadIa: { fontFamily: fuentes.texto, fontSize: 12, lineHeight: 18, color: colores.primarioOscuro },
  enviado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48 },
});
