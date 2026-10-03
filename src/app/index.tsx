import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

// Pantalla de inicio provisional: más adelante la sustituirá el inicio de sesión (UT 1092).
export default function Inicio() {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>ConecTEM</Text>
      <Text style={styles.lema}>El puente entre el centro de atención temprana y tu hogar</Text>

      <Link href="/familia" style={styles.boton}>Entrar como familia</Link>
      <Link href="/terapeuta" style={styles.boton}>Entrar como terapeuta</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  titulo: { fontSize: 32, fontWeight: 'bold' },
  lema: { fontSize: 16, textAlign: 'center', color: '#555', marginBottom: 16 },
  boton: {
    fontSize: 18, paddingVertical: 12, paddingHorizontal: 24,
    backgroundColor: '#1F5C8C', color: '#fff', borderRadius: 8, overflow: 'hidden',
  },
});
