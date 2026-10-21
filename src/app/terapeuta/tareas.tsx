import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ElementoLista, MaestroDetalle } from '../../components/estructura';
import { PestanasTerapeuta } from '../../components/terapeuta/PestanasTerapeuta';
import { CrearTarea, TareasResumen } from '../../components/terapeuta/Tareas';
import { TAREAS } from '../../datos/prototipo';
import { colores, fuentes, radios } from '../../tema';

// Tareas de práctica que la terapeuta asigna a las familias
export default function Tareas() {
  const [creando, setCreando] = useState(false);
  // En el móvil, "ver resumen" muestra el panel de detalle aunque no se esté creando
  const [viendoResumen, setViendoResumen] = useState(false);

  return (
    <MaestroDetalle
      cabeceraLista={<PestanasTerapeuta activa="tareas" />}
      mostrandoDetalle={creando || viendoResumen}
      onVolver={() => {
        setCreando(false);
        setViendoResumen(false);
      }}
      textoVolver="← Volver a las tareas"
      lista={
        <>
          <Pressable accessibilityRole="button" onPress={() => setCreando(true)} style={styles.crear}>
            <Text style={styles.textoCrear}>＋ Crear nueva tarea</Text>
          </Pressable>
          {TAREAS.map((t) => (
            <ElementoLista
              key={t.id}
              seleccionado={false}
              onPress={() => {
                setCreando(false);
                setViendoResumen(true);
              }}
            >
              <View style={styles.filaEntre}>
                <Text style={styles.titulo}>{t.titulo}</Text>
                <View style={[styles.punto, { backgroundColor: t.estado === 'activa' ? colores.primario : colores.textoTenue }]} />
              </View>
              <Text style={styles.modulo} numberOfLines={1}>{t.modulo}</Text>
              <View style={[styles.filaEntre, { marginTop: 8 }]}>
                <Text style={styles.detalle}>{t.pacientes}</Text>
                <Text style={styles.detalle}>{t.frecuencia}</Text>
              </View>
            </ElementoLista>
          ))}
        </>
      }
      detalle={
        creando ? (
          <CrearTarea
            onVolver={() => {
              setCreando(false);
              setViendoResumen(true);
            }}
          />
        ) : (
          <TareasResumen onCrear={() => setCreando(true)} />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  filaEntre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  crear: { backgroundColor: colores.primario, borderRadius: radios.medio, paddingVertical: 10, alignItems: 'center', marginBottom: 8 },
  textoCrear: { fontFamily: fuentes.tituloMedio, fontSize: 12, color: colores.blanco },
  titulo: { fontFamily: fuentes.titulo, fontSize: 14, color: colores.texto, flexShrink: 1 },
  punto: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  modulo: { fontFamily: fuentes.textoFuerte, fontSize: 12, color: colores.primario, marginTop: 4 },
  detalle: { fontFamily: fuentes.texto, fontSize: 10, color: colores.textoApagado },
});
