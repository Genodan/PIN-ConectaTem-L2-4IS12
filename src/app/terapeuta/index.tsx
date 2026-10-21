import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ElementoLista, MaestroDetalle, useEsAncho } from '../../components/estructura';
import { FeedbackEnviado, PanelFeedback } from '../../components/terapeuta/PanelFeedback';
import { PestanasTerapeuta } from '../../components/terapeuta/PestanasTerapeuta';
import { Avatar, EstadoVacio, Insignia } from '../../components/ui';
import { PRACTICAS } from '../../datos/prototipo';
import { colores, fuentes } from '../../tema';

// Bandeja de la terapeuta: prácticas recibidas y panel para revisarlas y dar feedback
export default function Bandeja() {
  const ancho = useEsAncho();
  // En escritorio se abre ya la primera práctica, como en el prototipo; en el móvil, la lista
  const [seleccionadaId, setSeleccionadaId] = useState<number | null>(ancho ? PRACTICAS[0].id : null);
  const [enviado, setEnviado] = useState(false);
  const practica = PRACTICAS.find((p) => p.id === seleccionadaId) ?? null;

  const elegir = (id: number) => {
    setSeleccionadaId(id);
    setEnviado(false);
  };

  return (
    <MaestroDetalle
      cabeceraLista={<PestanasTerapeuta activa="bandeja" />}
      mostrandoDetalle={practica !== null}
      onVolver={() => setSeleccionadaId(null)}
      textoVolver="← Volver a la bandeja"
      lista={PRACTICAS.map((p) => (
        <ElementoLista key={p.id} seleccionado={p.id === seleccionadaId} onPress={() => elegir(p.id)}>
          <View style={styles.fila}>
            <Avatar
              texto={p.avatar}
              fondo={p.estado === 'pendiente' ? colores.primarioSuave : colores.apagado}
              color={p.estado === 'pendiente' ? colores.primario : colores.textoApagado}
            />
            <View style={styles.flex1}>
              <View style={styles.filaEntre}>
                <Text style={styles.nombre}>{p.nino}</Text>
                {p.estado === 'pendiente' ? <Insignia texto="NEW" tipo="nuevo" /> : null}
              </View>
              <Text style={styles.modulo} numberOfLines={1}>{p.modulo}</Text>
              <Text style={styles.fecha}>{p.fecha}</Text>
            </View>
          </View>
        </ElementoLista>
      ))}
      detalle={
        enviado ? (
          <FeedbackEnviado
            onVolver={() => {
              setEnviado(false);
              setSeleccionadaId(null);
            }}
          />
        ) : practica ? (
          <PanelFeedback key={practica.id} practica={practica} onEnviar={() => setEnviado(true)} />
        ) : (
          <EstadoVacio icono="📥" texto="Selecciona una práctica de la bandeja para revisarla." />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  filaEntre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  nombre: { fontFamily: fuentes.titulo, fontSize: 14, color: colores.texto },
  modulo: { fontFamily: fuentes.textoFuerte, fontSize: 12, color: colores.primario, marginBottom: 2 },
  fecha: { fontFamily: fuentes.texto, fontSize: 12, color: colores.textoTenue },
});
