import { StyleSheet, Text, View } from 'react-native';

// Panel principal de la familia (UT 1141) — pendiente del Sprint 1.
export default function PanelFamilia() {
  return (
    <View style={styles.container}>
      <Text style={styles.texto}>Panel principal de la familia</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  texto: { fontSize: 18 },
});
