// Componentes básicos de la interfaz, traducidos del prototipo de Figma Make (Tailwind) a React Native.
import React, { ReactNode } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { colores, fuentes, radios } from '../tema';

// ---------- Textos ----------

export function Titulo({ children, tamano = 24, estilo }: { children: ReactNode; tamano?: number; estilo?: StyleProp<TextStyle> }) {
  return (
    <Text accessibilityRole="header" style={[styles.titulo, { fontSize: tamano }, estilo]}>
      {children}
    </Text>
  );
}

export function Subtitulo({ children, estilo }: { children: ReactNode; estilo?: StyleProp<TextStyle> }) {
  return <Text style={[styles.subtitulo, estilo]}>{children}</Text>;
}

// Título de una sección con su explicación debajo (h2 + p del prototipo)
export function CabeceraSeccion({ titulo, subtitulo, derecha }: { titulo: string; subtitulo?: string; derecha?: ReactNode }) {
  return (
    <View style={styles.cabeceraSeccion}>
      <View style={styles.flex1}>
        <Titulo>{titulo}</Titulo>
        {subtitulo ? <Subtitulo estilo={styles.mt4}>{subtitulo}</Subtitulo> : null}
      </View>
      {derecha}
    </View>
  );
}

// Título en mayúsculas de una tarjeta ("DATOS PERSONALES")
export function TituloTarjeta({ children, color = colores.texto }: { children: ReactNode; color?: string }) {
  return <Text style={[styles.tituloTarjeta, { color }]}>{children}</Text>;
}

// ---------- Botones ----------

type VarianteBoton = 'primario' | 'suave' | 'contorno' | 'enlace' | 'gris';

export function Boton({
  titulo,
  onPress,
  variante = 'primario',
  deshabilitado = false,
  pequeno = false,
  estilo,
}: {
  titulo: string;
  onPress?: () => void;
  variante?: VarianteBoton;
  deshabilitado?: boolean;
  pequeno?: boolean;
  estilo?: StyleProp<ViewStyle>;
}) {
  const v = deshabilitado ? estilosBoton.deshabilitado : estilosBoton[variante];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: deshabilitado }}
      disabled={deshabilitado}
      onPress={onPress}
      style={({ pressed }) => [
        styles.boton,
        pequeno && styles.botonPequeno,
        variante === 'enlace' && styles.botonEnlace,
        v.caja,
        pressed && !deshabilitado && variante !== 'enlace' && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        estilo,
      ]}
    >
      <Text style={[styles.textoBoton, pequeno && styles.textoBotonPequeno, v.texto]}>{titulo}</Text>
    </Pressable>
  );
}

const estilosBoton = {
  primario: StyleSheet.create({ caja: { backgroundColor: colores.primario }, texto: { color: colores.blanco } }),
  suave: StyleSheet.create({ caja: { backgroundColor: colores.primarioSuave }, texto: { color: colores.primarioOscuro } }),
  contorno: StyleSheet.create({
    caja: { backgroundColor: colores.tarjeta, borderWidth: 1, borderColor: colores.borde },
    texto: { color: colores.textoApagado },
  }),
  gris: StyleSheet.create({ caja: { backgroundColor: colores.apagado }, texto: { color: colores.texto } }),
  enlace: StyleSheet.create({ caja: {}, texto: { color: colores.primario } }),
  deshabilitado: StyleSheet.create({ caja: { backgroundColor: colores.apagado }, texto: { color: colores.textoTenue } }),
};

// ---------- Contenedores ----------

export function Tarjeta({ children, estilo }: { children: ReactNode; estilo?: StyleProp<ViewStyle> }) {
  return <View style={[styles.tarjeta, estilo]}>{children}</View>;
}

// Fila que en pantallas estrechas pasa a columna (los grid-cols-2 del prototipo)
export function Rejilla({ children, ancho, columnas = 2, hueco = 20 }: { children: ReactNode; ancho: boolean; columnas?: number; hueco?: number }) {
  const hijos = React.Children.toArray(children).filter(Boolean);
  if (!ancho) return <View style={{ gap: hueco }}>{hijos}</View>;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: hueco }}>
      {hijos.map((hijo, i) => (
        <View key={i} style={{ flexBasis: `${100 / columnas - 4}%`, flexGrow: 1 }}>
          {hijo}
        </View>
      ))}
    </View>
  );
}

// ---------- Formularios ----------

export function Etiqueta({ children, opcional = false, obligatorio = false }: { children: ReactNode; opcional?: boolean; obligatorio?: boolean }) {
  return (
    <Text style={styles.etiqueta}>
      {children}
      {opcional ? <Text style={styles.etiquetaOpcional}> (opcional)</Text> : null}
      {obligatorio ? <Text style={{ color: '#EF4444' }}> *</Text> : null}
    </Text>
  );
}

export function Campo({
  etiqueta,
  ayuda,
  opcional,
  obligatorio,
  filas,
  estiloCampo,
  ...props
}: TextInputProps & { etiqueta?: string; ayuda?: string; opcional?: boolean; obligatorio?: boolean; filas?: number; estiloCampo?: StyleProp<TextStyle> }) {
  return (
    <View style={styles.flex1}>
      {etiqueta ? <Etiqueta opcional={opcional} obligatorio={obligatorio}>{etiqueta}</Etiqueta> : null}
      <TextInput
        accessibilityLabel={etiqueta}
        placeholderTextColor={colores.textoTenue}
        multiline={!!filas}
        numberOfLines={filas}
        style={[styles.campo, filas ? { minHeight: filas * 22 + 20, textAlignVertical: 'top' } : null, estiloCampo]}
        {...props}
      />
      {ayuda ? <Text style={styles.ayuda}>{ayuda}</Text> : null}
    </View>
  );
}

// Dato que la familia puede ver pero no editar
export function CampoLectura({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.flex1}>
      <Text style={styles.etiquetaApagada}>{etiqueta}</Text>
      <View style={styles.campoLectura}>
        <Text style={styles.textoLectura}>{valor}</Text>
      </View>
    </View>
  );
}

// ---------- Pequeños elementos ----------

export function Chip({ texto, seleccionado = false, onPress, colorSeleccion = 'primario' }: { texto: string; seleccionado?: boolean; onPress?: () => void; colorSeleccion?: 'primario' | 'acento' }) {
  const sel = colorSeleccion === 'acento'
    ? { backgroundColor: colores.acento, borderColor: colores.acento, color: colores.blanco }
    : { backgroundColor: colores.primarioSuave, borderColor: colores.primario, color: colores.primarioOscuro };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: seleccionado }}
      onPress={onPress}
      style={[styles.chip, seleccionado ? { backgroundColor: sel.backgroundColor, borderColor: sel.borderColor } : null]}
    >
      <Text style={[styles.textoChip, seleccionado ? { color: sel.color } : null]}>{texto}</Text>
    </Pressable>
  );
}

type TipoInsignia = 'exito' | 'nuevo' | 'aviso' | 'foco' | 'gris';
const coloresInsignia: Record<TipoInsignia, { fondo: string; texto: string }> = {
  exito: { fondo: colores.primarioSuave, texto: colores.primarioOscuro },
  nuevo: { fondo: colores.nuevoFondo, texto: colores.avisoTexto },
  aviso: { fondo: colores.avisoFondo, texto: colores.avisoTexto },
  foco: { fondo: colores.focoFondo, texto: colores.focoTexto },
  gris: { fondo: colores.apagado, texto: colores.textoApagado },
};

// Pastilla de estado ("NEW", "Editable", "Generado con IA"...)
export function Insignia({ texto, tipo = 'exito', mayusculas = false }: { texto: string; tipo?: TipoInsignia; mayusculas?: boolean }) {
  const c = coloresInsignia[tipo];
  return (
    <View style={[styles.insignia, { backgroundColor: c.fondo }]}>
      <Text style={[styles.textoInsignia, { color: c.texto }, mayusculas && styles.mayusculas]}>{texto}</Text>
    </View>
  );
}

export function Avatar({ texto, tamano = 36, fondo = colores.primarioSuave, color = colores.primario }: { texto: string; tamano?: number; fondo?: string; color?: string }) {
  return (
    <View style={[styles.avatar, { width: tamano, height: tamano, backgroundColor: fondo }]}>
      <Text style={{ fontFamily: fuentes.tituloMedio, fontSize: tamano * 0.4, color }}>{texto}</Text>
    </View>
  );
}

// Círculo naranja con un número (avisos sin leer)
export function Contador({ valor }: { valor: number }) {
  return (
    <View style={styles.contador}>
      <Text style={styles.textoContador}>{valor}</Text>
    </View>
  );
}

// Aviso con icono: privacidad, ayudas...
export function Aviso({ icono, texto, tipo = 'info' }: { icono: string; texto: string; tipo?: 'info' | 'aviso' | 'plano' }) {
  const caja = tipo === 'info'
    ? { backgroundColor: colores.primarioSuave, borderColor: colores.primarioBorde, borderWidth: 1, padding: 12 }
    : tipo === 'aviso'
      ? { backgroundColor: colores.avisoFondo, borderColor: colores.avisoBorde, borderWidth: 1, padding: 12 }
      : {};
  const color = tipo === 'info' ? colores.primarioOscuro : tipo === 'aviso' ? colores.avisoTextoOscuro : colores.textoApagado;
  return (
    <View style={[styles.aviso, caja]}>
      <Text style={styles.textoAviso}>{icono}</Text>
      <Text style={[styles.textoAviso, styles.flex1, { color }]}>{texto}</Text>
    </View>
  );
}

// Hueco que ocupa un vídeo mientras no hay reproductor real
export function VideoSimulado({ etiqueta, pie }: { etiqueta: string; pie: string }) {
  return (
    <View style={styles.video}>
      <View style={styles.etiquetaVideo}>
        <Text style={styles.textoEtiquetaVideo}>{etiqueta}</Text>
      </View>
      <Text style={{ fontSize: 36, marginBottom: 8 }}>▶️</Text>
      <Text style={styles.pieVideo}>{pie}</Text>
    </View>
  );
}

export function EstadoVacio({ icono, texto }: { icono: string; texto: string }) {
  return (
    <View style={styles.vacio}>
      <Text style={{ fontSize: 36, marginBottom: 12 }}>{icono}</Text>
      <Text style={styles.textoVacio}>{texto}</Text>
    </View>
  );
}

export function Logo({ tamano = 18, color = colores.primario }: { tamano?: number; color?: string }) {
  return (
    <View style={styles.logo}>
      <Text style={{ fontSize: tamano + 2 }}>🌱</Text>
      <Text style={{ fontFamily: fuentes.tituloFuerte, fontSize: tamano, color }}>ConecTEM</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  mt4: { marginTop: 4 },
  titulo: { fontFamily: fuentes.titulo, color: colores.texto },
  subtitulo: { fontFamily: fuentes.texto, fontSize: 14, lineHeight: 20, color: colores.textoApagado },
  cabeceraSeccion: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 24 },
  tituloTarjeta: { fontFamily: fuentes.titulo, fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase' },
  boton: { borderRadius: radios.medio, paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  botonPequeno: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: radios.pequeno },
  botonEnlace: { paddingHorizontal: 0, paddingVertical: 4, alignItems: 'flex-start' },
  textoBoton: { fontFamily: fuentes.tituloMedio, fontSize: 15 },
  textoBotonPequeno: { fontSize: 12 },
  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: radios.grande, borderWidth: 1, borderColor: colores.borde, padding: 20, gap: 16 },
  etiqueta: { fontFamily: fuentes.textoMedio, fontSize: 13, color: colores.texto, marginBottom: 6 },
  etiquetaOpcional: { fontFamily: fuentes.texto, color: colores.textoApagado },
  etiquetaApagada: { fontFamily: fuentes.textoMedio, fontSize: 12, color: colores.textoApagado, marginBottom: 6 },
  campo: {
    fontFamily: fuentes.texto,
    fontSize: 14,
    color: colores.texto,
    backgroundColor: colores.fondo,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.medio,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ayuda: { fontFamily: fuentes.texto, fontSize: 12, color: colores.textoApagado, marginTop: 4 },
  campoLectura: { backgroundColor: colores.campoLectura, borderWidth: 1, borderColor: colores.borde, borderRadius: radios.medio, paddingHorizontal: 12, paddingVertical: 10 },
  textoLectura: { fontFamily: fuentes.texto, fontSize: 14, color: colores.textoLectura },
  chip: { borderRadius: radios.completo, borderWidth: 1, borderColor: colores.borde, backgroundColor: colores.fondo, paddingHorizontal: 12, paddingVertical: 6 },
  textoChip: { fontFamily: fuentes.tituloMedio, fontSize: 12, color: colores.textoApagado },
  insignia: { borderRadius: radios.completo, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  textoInsignia: { fontFamily: fuentes.textoFuerte, fontSize: 11 },
  mayusculas: { textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.4 },
  avatar: { borderRadius: radios.completo, alignItems: 'center', justifyContent: 'center' },
  contador: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colores.acento, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  textoContador: { fontFamily: fuentes.textoFuerte, fontSize: 10, color: colores.blanco },
  aviso: { flexDirection: 'row', gap: 8, borderRadius: radios.medio, alignItems: 'flex-start' },
  textoAviso: { fontFamily: fuentes.texto, fontSize: 12, lineHeight: 18 },
  video: { backgroundColor: colores.oscuro, borderRadius: radios.grande, aspectRatio: 16 / 9, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  etiquetaVideo: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: radios.pequeno, paddingHorizontal: 8, paddingVertical: 4 },
  textoEtiquetaVideo: { fontFamily: fuentes.textoFuerte, fontSize: 12, color: colores.blanco },
  pieVideo: { fontFamily: fuentes.texto, fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48 },
  textoVacio: { fontFamily: fuentes.tituloMedio, fontSize: 14, color: colores.textoApagado, textAlign: 'center' },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
