import React, { useRef, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import { repetirPractica } from '../services/practicasService';

// UT 1401 · Botón «Repetir práctica» de una práctica ya enviada (con o sin feedback).
// Al repetir se crea una práctica «Pendiente» nueva y se avisa con su id (onRepetida), para abrirla
// y que la familia grabe el clip y lo envíe. Al recargar la lista este componente desaparece.
export const RepetirPractica = ({
  practicaId,
  onRepetida,
}: {
  practicaId: string;
  onRepetida: (idPracticaNueva: string) => void;
}) => {
  const [repitiendo, setRepitiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Un doble clic rápido no debe crear dos prácticas: el estado se actualiza tarde, la referencia no
  const enCurso = useRef(false);

  const alPulsar = async () => {
    if (enCurso.current) return;
    enCurso.current = true;
    setRepitiendo(true);
    setError(null);
    try {
      const nueva = await repetirPractica(practicaId);
      onRepetida(nueva.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido repetir la práctica.');
    } finally {
      enCurso.current = false;
      setRepitiendo(false);
    }
  };

  return (
    <View style={styles.contenedor}>
      <Button title="Repetir práctica" onPress={alPulsar} disabled={repitiendo} />
      {repitiendo && <ActivityIndicator size="small" color="#0000ff" style={styles.cargando} />}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  contenedor: { marginTop: 12 },
  cargando: { marginTop: 8 },
  error: { color: '#a8071a', fontWeight: 'bold', marginTop: 8 },
});
