import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { colores, fuentes, textos } from '../../tema/kairos';

// Piezas comunes de la nueva interfaz (KAIRÓS)

// ---- Ventana que se abre encima de la pantalla (el fondo se ve oscurecido detrás) ----
// Se cierra con la ×, pulsando fuera, con Esc (web) o con «atrás» (Android).
export const VentanaKairos = ({
  visible,
  titulo,
  subtitulo,
  icono,
  acciones,
  onCerrar,
  testID,
  children,
}: {
  visible: boolean;
  titulo: string;
  subtitulo?: string;
  icono?: React.ReactNode;
  acciones?: React.ReactNode; // botones extra de la cabecera (p. ej. flechas)
  onCerrar: () => void;
  testID?: string;
  children: React.ReactNode;
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
    <View style={estilos.fondo}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityLabel={`Cerrar «${titulo}»`} onPress={onCerrar} />
      <View style={estilos.ventana} accessibilityViewIsModal testID={testID}>
        <View style={estilos.cabecera}>
          {icono}
          <View style={estilos.flex}>
            <Text style={textos.tituloSeccion}>{titulo}</Text>
            {subtitulo ? <Text style={textos.cuerpo}>{subtitulo}</Text> : null}
          </View>
          {acciones}
          <BotonCuadrado etiqueta="Cerrar" texto="×" onPress={onCerrar} textoGrande />
        </View>
        <ScrollView contentContainerStyle={estilos.contenido}>{children}</ScrollView>
      </View>
    </View>
  </Modal>
);

// ---- Botón pequeño cuadrado de la cabecera (‹ › ×) ----
export const BotonCuadrado = ({
  etiqueta,
  texto,
  onPress,
  textoGrande,
}: {
  etiqueta: string;
  texto: string;
  onPress: () => void;
  textoGrande?: boolean;
}) => (
  <Pressable accessibilityRole="button" accessibilityLabel={etiqueta} style={estilos.botonCuadrado} onPress={onPress}>
    <Text style={textoGrande ? estilos.textoBotonGrande : estilos.textoBotonCuadrado}>{texto}</Text>
  </Pressable>
);

// ---- Campo de texto con etiqueta (estilo «Entrada» de Figma) ----
export const CampoTexto = ({ etiqueta, style, ...props }: TextInputProps & { etiqueta: string }) => (
  <View style={estilos.campo}>
    <Text style={textos.cuerpoSemibold}>{etiqueta}</Text>
    <TextInput accessibilityLabel={etiqueta} placeholderTextColor={colores.gris} style={[estilos.entrada, style]} {...props} />
  </View>
);

// ---- Botón principal verde («Asignar nueva práctica», «Guardar») ----
export const BotonPrincipal = ({
  texto,
  onPress,
  desactivado,
  testID,
  style,
}: {
  texto: string;
  onPress: () => void;
  desactivado?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) => (
  <Pressable
    accessibilityRole="button"
    testID={testID}
    disabled={desactivado}
    accessibilityState={{ disabled: !!desactivado }}
    style={[estilos.botonPrincipal, desactivado && estilos.desactivado, style]}
    onPress={onPress}
  >
    <Text style={estilos.textoBotonPrincipal}>{texto}</Text>
  </Pressable>
);

// ---- Botón secundario (solo borde): acciones menos frecuentes o delicadas ----
// Al pasar el ratón por encima (web) se invierten los colores: fondo del color y texto blanco.
export const BotonSecundario = ({
  texto,
  onPress,
  desactivado,
  testID,
  color = colores.texto,
}: {
  texto: string;
  onPress: () => void;
  desactivado?: boolean;
  testID?: string;
  color?: string;
}) => {
  const [encima, setEncima] = useState(false);
  const invertido = encima && !desactivado;
  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      disabled={desactivado}
      accessibilityState={{ disabled: !!desactivado }}
      onHoverIn={() => setEncima(true)}
      onHoverOut={() => setEncima(false)}
      style={[
        estilos.botonSecundario,
        { borderColor: color, backgroundColor: invertido ? color : colores.blanco },
        desactivado && estilos.desactivado,
      ]}
      onPress={onPress}
    >
      <Text style={[estilos.textoBotonSecundario, { color: invertido ? colores.blanco : color }]}>{texto}</Text>
    </Pressable>
  );
};

// ---- Aviso de resultado (ok / error) ----
export const Aviso = ({ tipo, texto }: { tipo: 'ok' | 'error'; texto: string }) => (
  <Text style={[textos.cuerpo, tipo === 'error' && estilos.textoError]} accessibilityLiveRegion="polite">
    {texto}
  </Text>
);

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  fondo: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(34, 34, 34, 0.45)' },
  ventana: {
    width: 720,
    maxWidth: '100%',
    maxHeight: '85%',
    borderRadius: 32,
    backgroundColor: colores.blanco,
    paddingVertical: 24,
    shadowColor: '#172D26',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingBottom: 16 },
  contenido: { gap: 16, paddingHorizontal: 24, paddingTop: 8 },
  botonCuadrado: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.fondo },
  textoBotonCuadrado: { ...textos.tituloSeccion, lineHeight: 32 },
  textoBotonGrande: { ...textos.tituloSeccion, fontSize: 26, lineHeight: 32 },
  campo: { gap: 8 },
  entrada: {
    ...textos.cuerpo,
    minHeight: 48,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colores.gris,
    backgroundColor: colores.blanco,
  },
  botonPrincipal: { height: 52, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.verde },
  textoBotonPrincipal: { fontFamily: fuentes.regular, fontSize: 14, color: colores.fondo },
  botonSecundario: { height: 52, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  textoBotonSecundario: { fontFamily: fuentes.semibold, fontSize: 14 },
  desactivado: { opacity: 0.4 },
  textoError: { color: colores.naranja },
});
