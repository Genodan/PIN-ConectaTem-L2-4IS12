import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colores, fuentes, textos } from '../../tema/kairos';
import { avatarDe } from './BloquesInicioTerapeuta';

// Columna izquierda de «Pacientes» (Figma: «Listado de pacientes»)

export type PestanaListado = 'principales' | 'archivados';

// Pestañas Principales / Archivados (archivados = niños que la terapeuta traspasó a otra)
export const PestanasPacientes = ({ activa, onCambiar }: { activa: PestanaListado; onCambiar: (p: PestanaListado) => void }) => (
  <View style={estilos.pestanas} accessibilityRole="tablist">
    {(['principales', 'archivados'] as const).map((clave) => {
      const esActiva = clave === activa;
      return (
        <Pressable
          key={clave}
          accessibilityRole="tab"
          accessibilityState={{ selected: esActiva }}
          testID={`pestana-${clave}`}
          style={[estilos.pestana, esActiva && estilos.pestanaActiva]}
          onPress={() => onCambiar(clave)}
        >
          <Text style={esActiva ? textos.cuerpoSemibold : textos.cuerpo}>{clave === 'principales' ? 'Principales' : 'Archivados'}</Text>
        </Pressable>
      );
    })}
  </View>
);

export const BotonInvitarPaciente = ({ onPress }: { onPress: () => void }) => (
  <Pressable accessibilityRole="button" style={estilos.invitar} onPress={onPress} testID="boton-invitar-paciente">
    <View style={estilos.iconoInvitar}>
      <Image source={require('../../../assets/kairos/circulo-mas.svg')} style={estilos.circuloMas} contentFit="contain" />
    </View>
    <Text style={estilos.textoInvitar}>Invitar a un nuevo paciente</Text>
  </Pressable>
);

// Tarjeta del listado. En «Principales» lleva la última actividad y el progreso semanal;
// en «Archivados», a quién se traspasó y cuándo, sin progreso.
export const TarjetaPacienteListado = ({
  paciente,
  seleccionado,
  onPress,
  detalle,
  progreso,
}: {
  paciente: { id: string; nombre: string };
  seleccionado: boolean;
  onPress: () => void;
  detalle: string;
  progreso: number | null;
}) => {
  const tarjeta = (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: seleccionado }}
      accessibilityLabel={`${paciente.nombre}${seleccionado ? ', seleccionado' : ''}`}
      testID="paciente-listado"
      style={estilos.tarjeta}
      onPress={onPress}
    >
      <View style={estilos.fila}>
        <Image source={avatarDe(paciente.id)} style={estilos.avatar} contentFit="cover" />
        <View style={estilos.identidad}>
          <View style={estilos.filaNombre}>
            <Text style={estilos.nombre} numberOfLines={1}>
              {paciente.nombre}
            </Text>
            <Text style={textos.cuerpo}>{seleccionado ? 'Seleccionado' : 'Ver ficha →'}</Text>
          </View>
          <Text style={textos.cuerpo}>{detalle}</Text>
        </View>
      </View>
      {progreso === null ? null : (
        <View style={estilos.progreso}>
          <View style={estilos.filaNombre}>
            <Text style={[textos.cuerpo, estilos.flex]}>Progreso semanal</Text>
            <Text style={textos.cuerpo}>{`${progreso}%`}</Text>
          </View>
          <View style={estilos.barra}>
            <View style={[estilos.barraRelleno, { width: `${progreso}%` }]} />
          </View>
        </View>
      )}
    </Pressable>
  );

  // El seleccionado lleva una franja amarilla a la izquierda
  return seleccionado ? <View style={estilos.marcaSeleccion}>{tarjeta}</View> : tarjeta;
};

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  fila: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  pestanas: { flexDirection: 'row', gap: 16, height: 48, borderRadius: 8, overflow: 'hidden', backgroundColor: colores.bordeCabecera },
  pestana: { flex: 1, minHeight: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pestanaActiva: { backgroundColor: colores.azul },
  invitar: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 24, borderRadius: 16, borderWidth: 2, borderColor: colores.grisOscuro },
  iconoInvitar: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  circuloMas: { width: 22, height: 22 },
  textoInvitar: { fontFamily: fuentes.semibold, fontSize: 18, color: colores.grisOscuro },
  marcaSeleccion: { paddingLeft: 16, borderRadius: 16, backgroundColor: colores.amarillo },
  tarjeta: { gap: 8, padding: 20, borderRadius: 16, backgroundColor: colores.blanco },
  avatar: { width: 56, height: 56, borderRadius: 10 },
  identidad: { flex: 1, gap: 8 },
  filaNombre: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nombre: { flex: 1, fontFamily: fuentes.semibold, fontSize: 18, color: colores.texto },
  progreso: { gap: 10 },
  barra: { height: 6, borderRadius: 4, backgroundColor: colores.barraProgresoFondo, overflow: 'hidden' },
  barraRelleno: { height: 6, backgroundColor: colores.verde },
});
