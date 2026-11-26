import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Chat } from '../../components/Chat';
import { ConversacionesDeLaFamilia, obtenerConversacionesDeLaFamilia } from '../../services/mensajesService';

// UT 1095 · Mensajes de la familia con su terapeuta. El paciente llega del panel de la familia.
export default function MensajesFamiliaScreen() {
  const { pacienteId } = useLocalSearchParams<{ pacienteId?: string }>();
  const [conversaciones, setConversaciones] = useState<ConversacionesDeLaFamilia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [anteriorAbierta, setAnteriorAbierta] = useState<string | null>(null);

  useEffect(() => {
    if (!pacienteId) return;
    let activo = true;
    obtenerConversacionesDeLaFamilia(pacienteId)
      .then((datos) => activo && setConversaciones(datos))
      .catch((e) => activo && setError(e instanceof Error ? e.message : 'Error desconocido'));
    return () => {
      activo = false;
    };
  }, [pacienteId]);

  if (!pacienteId) return <Text style={styles.vacio}>Elige primero una familia en el panel.</Text>;
  if (error) return <Text style={styles.error}>{error}</Text>;
  if (!conversaciones) return <ActivityIndicator size="large" color="#0050b3" style={{ marginTop: 30 }} />;

  const { actual, anteriores } = conversaciones;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contenido}>
      {actual ? (
        <View style={styles.tarjeta}>
          <Text style={styles.titulo}>{`Mensajes con ${actual.nombre}`}</Text>
          <Text style={styles.subtitulo}>Para dudas cortas sobre las prácticas.</Text>
          <Chat pacienteId={pacienteId} terapeutaId={actual.terapeutaId} autor="paciente" nombreOtro={actual.nombre} />
        </View>
      ) : (
        <Text style={styles.vacio}>Todavía no tenéis terapeuta asignada.</Text>
      )}

      {anteriores.length > 0 && (
        <View style={styles.anteriores}>
          <Text style={styles.tituloAnteriores}>Conversaciones anteriores</Text>
          {anteriores.map((t) => (
            <View key={t.terapeutaId} style={styles.tarjeta}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setAnteriorAbierta(anteriorAbierta === t.terapeutaId ? null : t.terapeutaId)}
              >
                <Text style={styles.nombreAnterior}>{t.nombre}</Text>
              </Pressable>
              {anteriorAbierta === t.terapeutaId && (
                <Chat pacienteId={pacienteId} terapeutaId={t.terapeutaId} autor="paciente" nombreOtro={t.nombre} soloLectura />
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  contenido: { padding: 16, paddingBottom: 40, gap: 16 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 8, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  titulo: { fontSize: 18, fontWeight: 'bold', color: '#1F5C8C' },
  subtitulo: { fontSize: 13, color: '#666' },
  anteriores: { gap: 10 },
  tituloAnteriores: { fontSize: 15, fontWeight: 'bold', color: '#555' },
  nombreAnterior: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  vacio: { fontStyle: 'italic', color: '#666', textAlign: 'center', marginTop: 30 },
  error: { color: '#a8071a', fontWeight: 'bold', textAlign: 'center', marginTop: 30 },
});
