import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  AutorMensaje,
  Mensaje,
  enviarMensaje,
  obtenerMensajes,
  suscribirseAMensajes,
  unirMensajes,
} from '../services/mensajesService';

const textoDeError = (error: unknown) => (error instanceof Error ? error.message : 'Error desconocido');

// «26/11, 10:05»
const formatearHora = (iso: string) =>
  new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

interface PropsChat {
  pacienteId: string;
  terapeutaId: string;
  autor: AutorMensaje; // quién usa el chat: sus mensajes salen a la derecha
  nombreOtro: string; // etiqueta de sus mensajes: la terapeuta (para la familia) o la familia (para la terapeuta)
  destinatario?: string; // cómo se nombra en una frase («Escribe a la familia de Lucas»); por defecto, nombreOtro
  soloLectura?: boolean; // conversación con una terapeuta anterior
}

// UT 1095 · Conversación entre la familia y su terapeuta, con los mensajes nuevos en tiempo real
export const Chat = ({ pacienteId, terapeutaId, autor, nombreOtro, destinatario, soloLectura = false }: PropsChat) => {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);
    setMensajes([]);
    obtenerMensajes(pacienteId, terapeutaId)
      .then((lista) => activo && setMensajes((actuales) => unirMensajes(actuales, lista)))
      .catch((e) => activo && setError(textoDeError(e)))
      .finally(() => activo && setCargando(false));

    const dejarDeEscuchar = suscribirseAMensajes(pacienteId, terapeutaId, (nuevo) => {
      if (activo) setMensajes((actuales) => unirMensajes(actuales, [nuevo]));
    });
    return () => {
      activo = false;
      dejarDeEscuchar();
    };
  }, [pacienteId, terapeutaId]);

  const enviar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const enviado = await enviarMensaje({ pacienteId, terapeutaId, autor, texto });
      setMensajes((actuales) => unirMensajes(actuales, [enviado]));
      setTexto('');
    } catch (e) {
      setError(textoDeError(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={styles.container}>
      {cargando ? (
        <ActivityIndicator size="small" color="#0050b3" />
      ) : mensajes.length === 0 ? (
        <Text style={styles.vacio}>
          {soloLectura ? 'No hay mensajes en esta conversación.' : `Todavía no hay mensajes. Escribe a ${destinatario ?? nombreOtro}.`}
        </Text>
      ) : (
        <View testID="lista-mensajes">
          {mensajes.map((m) => {
            const propio = m.enviado_por === autor;
            return (
              <View
                key={m.id}
                testID={propio ? 'mensaje-propio' : 'mensaje-recibido'}
                style={[styles.burbuja, propio ? styles.propio : styles.recibido]}
              >
                <Text style={styles.autor}>{propio ? 'Tú' : nombreOtro}</Text>
                <Text style={styles.texto}>{m.texto}</Text>
                <Text style={styles.hora}>{formatearHora(m.fecha_envio)}</Text>
              </View>
            );
          })}
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {soloLectura ? (
        <Text style={styles.aviso}>Conversación con una terapeuta anterior: solo lectura.</Text>
      ) : (
        <View style={styles.escribir}>
          <TextInput
            style={styles.campo}
            accessibilityLabel="Escribe un mensaje"
            placeholder="Escribe un mensaje..."
            value={texto}
            onChangeText={setTexto}
            multiline
            maxLength={1000}
            editable={!enviando}
          />
          <Button title={enviando ? 'Enviando...' : 'Enviar'} onPress={enviar} disabled={enviando || !texto.trim()} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 8 },
  vacio: { fontStyle: 'italic', color: '#666', textAlign: 'center', marginVertical: 12 },
  burbuja: { maxWidth: '80%', borderRadius: 10, padding: 10, marginVertical: 3 },
  propio: { alignSelf: 'flex-end', backgroundColor: '#d6e4ff' },
  recibido: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  autor: { fontSize: 11, fontWeight: 'bold', color: '#555', marginBottom: 2 },
  texto: { fontSize: 15, color: '#222' },
  hora: { fontSize: 11, color: '#888', marginTop: 4, textAlign: 'right' },
  error: { color: '#a8071a', fontWeight: 'bold' },
  aviso: { fontStyle: 'italic', color: '#666', fontSize: 13 },
  escribir: { gap: 8, marginTop: 6 },
  campo: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
});
