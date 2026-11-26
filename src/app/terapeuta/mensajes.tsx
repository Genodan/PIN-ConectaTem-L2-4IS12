import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Chat } from '../../components/Chat';
import { ConversacionDeLaTerapeuta, obtenerConversacionesDeLaTerapeuta } from '../../services/mensajesService';

const formatearHora = (iso: string) =>
  new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// UT 1095 · Mensajes de la terapeuta: una conversación por paciente, cada una aparte de las demás.
export default function MensajesTerapeutaScreen() {
  const { terapeutaId } = useLocalSearchParams<{ terapeutaId?: string }>();
  const [conversaciones, setConversaciones] = useState<ConversacionDeLaTerapeuta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pacienteElegido, setPacienteElegido] = useState<string | null>(null);

  const cargar = useCallback(() => {
    if (!terapeutaId) return;
    obtenerConversacionesDeLaTerapeuta(terapeutaId)
      .then(setConversaciones)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error desconocido'));
  }, [terapeutaId]);

  useEffect(cargar, [cargar]);

  if (!terapeutaId) return <Text style={styles.vacio}>Elige primero quién eres en el panel de la terapeuta.</Text>;
  if (error) return <Text style={styles.error}>{error}</Text>;
  if (!conversaciones) return <ActivityIndicator size="large" color="#0050b3" style={{ marginTop: 30 }} />;

  const elegida = conversaciones.find((c) => c.pacienteId === pacienteElegido);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contenido}>
      {elegida ? (
        <View style={styles.tarjeta}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setPacienteElegido(null);
              cargar(); // al volver, la lista muestra el último mensaje actualizado
            }}
          >
            <Text style={styles.volver}>← Todas las conversaciones</Text>
          </Pressable>
          <Text style={styles.titulo}>{`${elegida.nombreNino} (${elegida.nombreFamilia})`}</Text>
          <Chat
            pacienteId={elegida.pacienteId}
            terapeutaId={terapeutaId}
            autor="terapeuta"
            nombreOtro={`Familia de ${elegida.nombreNino}`}
            destinatario={`la familia de ${elegida.nombreNino}`}
          />
        </View>
      ) : conversaciones.length === 0 ? (
        <Text style={styles.vacio}>Todavía no tienes pacientes asignados.</Text>
      ) : (
        conversaciones.map((c) => (
          <Pressable
            key={c.pacienteId}
            accessibilityRole="button"
            testID="conversacion-paciente"
            style={styles.tarjeta}
            onPress={() => setPacienteElegido(c.pacienteId)}
          >
            <Text style={styles.nombre}>{`${c.nombreNino} (${c.nombreFamilia})`}</Text>
            <Text style={styles.ultimo} numberOfLines={1}>
              {c.ultimoMensaje
                ? `${c.ultimoMensaje.enviado_por === 'terapeuta' ? 'Tú: ' : ''}${c.ultimoMensaje.texto} · ${formatearHora(c.ultimoMensaje.fecha_envio)}`
                : 'Sin mensajes todavía'}
            </Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  contenido: { padding: 16, paddingBottom: 40, gap: 10 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 8, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 6 },
  titulo: { fontSize: 18, fontWeight: 'bold', color: '#1F5C8C' },
  volver: { color: '#0050b3', fontWeight: 'bold', marginBottom: 4 },
  nombre: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  ultimo: { fontSize: 13, color: '#666' },
  vacio: { fontStyle: 'italic', color: '#666', textAlign: 'center', marginTop: 30 },
  error: { color: '#a8071a', fontWeight: 'bold', textAlign: 'center', marginTop: 30 },
});
