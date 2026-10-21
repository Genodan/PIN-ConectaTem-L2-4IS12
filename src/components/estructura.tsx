// Piezas de estructura compartidas por las pantallas de familia y terapeuta.
import React, { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ANCHO_ESCRITORIO, colores, fuentes } from '../tema';
import { Avatar, Boton, Insignia, Logo } from './ui';

// true en tablet/ordenador: se usa la distribución con barra lateral del prototipo
export function useEsAncho() {
  const { width } = useWindowDimensions();
  return width >= ANCHO_ESCRITORIO;
}

export function Cabecera({
  saludo,
  nombre,
  inicial,
  rol,
  avisos,
  onSalir,
}: {
  saludo?: string;
  nombre: string;
  inicial: string;
  rol?: string;
  avisos?: number;
  onSalir: () => void;
}) {
  const ancho = useEsAncho();
  const { top } = useSafeAreaInsets();
  const esTerapeuta = !!rol;
  return (
    <View style={[styles.cabecera, { paddingTop: top + 12 }]}>
      <View style={styles.fila}>
        <Logo />
        {rol && ancho ? <Insignia texto={rol} /> : null}
      </View>
      <View style={styles.fila}>
        {ancho ? (
          <Text style={styles.saludo}>
            {saludo ? `${saludo}, ` : ''}
            <Text style={styles.nombre}>{nombre}</Text>
          </Text>
        ) : null}
        <View>
          <Avatar
            texto={inicial}
            tamano={32}
            fondo={esTerapeuta ? colores.primario : colores.primarioSuave}
            color={esTerapeuta ? colores.blanco : colores.primario}
          />
          {avisos ? (
            <View style={styles.puntoAviso}>
              <Text style={styles.textoPuntoAviso}>{avisos}</Text>
            </View>
          ) : null}
        </View>
        <Boton titulo="Salir" variante="enlace" pequeno onPress={onSalir} estilo={styles.salir} />
      </View>
    </View>
  );
}

// Zona de contenido con scroll y el margen del prototipo (p-8 en escritorio)
export function Contenido({ children, maxAncho }: { children: ReactNode; maxAncho?: number }) {
  const ancho = useEsAncho();
  return (
    <ScrollView style={styles.flex1} contentContainerStyle={{ padding: ancho ? 32 : 16, paddingBottom: 48 }}>
      <View style={{ maxWidth: maxAncho, width: '100%' }}>{children}</View>
    </ScrollView>
  );
}

// Lista a la izquierda y detalle a la derecha (bandeja, fichas, tareas).
// En el móvil se ve la lista y, al elegir algo, el detalle con un botón para volver.
export function MaestroDetalle({
  cabeceraLista,
  lista,
  detalle,
  mostrandoDetalle,
  onVolver,
  textoVolver = '← Volver',
}: {
  cabeceraLista: ReactNode;
  lista: ReactNode;
  detalle: ReactNode;
  mostrandoDetalle: boolean;
  onVolver: () => void;
  textoVolver?: string;
}) {
  const ancho = useEsAncho();
  if (!ancho) {
    if (mostrandoDetalle) {
      return (
        <View style={styles.flex1}>
          <View style={styles.barraVolver}>
            <Boton titulo={textoVolver} variante="enlace" pequeno onPress={onVolver} />
          </View>
          {detalle}
        </View>
      );
    }
    return (
      <View style={[styles.flex1, styles.fondoBlanco]}>
        {cabeceraLista}
        <ScrollView contentContainerStyle={styles.lista}>{lista}</ScrollView>
      </View>
    );
  }
  return (
    <View style={styles.maestroDetalle}>
      <View style={styles.columnaLista}>
        {cabeceraLista}
        <ScrollView contentContainerStyle={styles.lista}>{lista}</ScrollView>
      </View>
      <View style={styles.flex1}>{detalle}</View>
    </View>
  );
}

// Pestañas superiores (Bandeja / Fichas / Tareas, Iniciar sesión / Registrarse...)
export function Pestanas<T extends string>({
  opciones,
  activa,
  onCambiar,
  tamanoTexto = 12,
}: {
  opciones: { id: T; texto: string; contador?: number }[];
  activa: T;
  onCambiar: (id: T) => void;
  tamanoTexto?: number;
}) {
  return (
    <View accessibilityRole="tablist" style={styles.pestanas}>
      {opciones.map((o) => {
        const sel = o.id === activa;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: sel }}
            onPress={() => onCambiar(o.id)}
            style={[styles.pestana, sel && styles.pestanaActiva]}
          >
            <Text style={[styles.textoPestana, { fontSize: tamanoTexto }, sel && styles.textoPestanaActiva]}>{o.texto}</Text>
            {o.contador ? (
              <View style={styles.contadorPestana}>
                <Text style={styles.textoContadorPestana}>{o.contador}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// Elemento seleccionable de una lista lateral
export function ElementoLista({ seleccionado, onPress, children }: { seleccionado: boolean; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: seleccionado }}
      onPress={onPress}
      style={({ pressed }) => [styles.elementoLista, seleccionado && styles.elementoListaSel, pressed && !seleccionado && styles.elementoListaPulsado]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  fondoBlanco: { backgroundColor: colores.tarjeta },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cabecera: {
    backgroundColor: colores.tarjeta,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saludo: { fontFamily: fuentes.texto, fontSize: 14, color: colores.textoApagado },
  nombre: { fontFamily: fuentes.textoFuerte, color: colores.texto },
  puntoAviso: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colores.acento,
    borderWidth: 2,
    borderColor: colores.blanco,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoPuntoAviso: { fontSize: 7, color: colores.blanco, fontFamily: fuentes.textoFuerte },
  salir: { marginLeft: 4 },
  barraVolver: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: colores.fondo },
  maestroDetalle: { flex: 1, flexDirection: 'row' },
  columnaLista: { width: 300, backgroundColor: colores.tarjeta, borderRightWidth: 1, borderRightColor: colores.borde },
  lista: { padding: 12, gap: 6 },
  pestanas: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colores.borde, backgroundColor: colores.tarjeta },
  pestana: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  pestanaActiva: { borderBottomColor: colores.primario },
  textoPestana: { fontFamily: fuentes.tituloMedio, color: colores.textoApagado },
  textoPestanaActiva: { color: colores.primario },
  contadorPestana: { width: 16, height: 16, borderRadius: 8, backgroundColor: colores.acento, alignItems: 'center', justifyContent: 'center' },
  textoContadorPestana: { fontFamily: fuentes.textoFuerte, fontSize: 10, color: colores.blanco },
  elementoLista: { borderRadius: 12, borderWidth: 1, borderColor: 'transparent', padding: 14 },
  elementoListaSel: { backgroundColor: colores.primarioSuave, borderColor: colores.primario },
  elementoListaPulsado: { backgroundColor: colores.fondo },
});
