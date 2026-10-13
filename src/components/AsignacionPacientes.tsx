import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { obtenerPacientesParaAsignar, vincularPaciente } from '../services/pacientesService';

export const AsignacionPacientes = ({ terapeutaIdActual }: { terapeutaIdActual: string }) => {
  const [pacientesDisponibles, setPacientesDisponibles] = useState<any[]>([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargarPacientes = async () => {
    try {
      // Pasamos el ID actual para no mostrar los pacientes que ya son nuestros
      const datos = await obtenerPacientesParaAsignar(terapeutaIdActual);
      setPacientesDisponibles(datos || []);
      if (datos && datos.length > 0) setPacienteSeleccionado(datos[0].id);
      else setPacienteSeleccionado(null);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // Escuchamos los cambios en terapeutaIdActual para recargar la lista si cambias de terapeuta en el simulador
  useEffect(() => {
    if (terapeutaIdActual) {
      cargarPacientes();
    }
  }, [terapeutaIdActual]);

  const manejarAsignacion = async () => {
    if (!pacienteSeleccionado) return;
    setCargando(true);

    try {
      await vincularPaciente(pacienteSeleccionado, terapeutaIdActual);
      Alert.alert('Éxito', '¡Paciente asignado y transferido a tu cartera!');
      await cargarPacientes(); 
    } catch (error: any) {
      Alert.alert('Aviso', error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Asignar o Transferir Paciente</Text>

      {pacientesDisponibles.length === 0 ? (
        <Text style={styles.textoVacio}>Todos los pacientes ya están en tu cartera.</Text>
      ) : (
        <View>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={pacienteSeleccionado}
              onValueChange={(itemValue) => setPacienteSeleccionado(itemValue)}
            >
              {pacientesDisponibles.map((paciente) => (
                <Picker.Item 
                  key={paciente.id} 
                  label={`${paciente.nombre_nino} ${paciente.nombre_familia}`} 
                  value={paciente.id} 
                />
              ))}
            </Picker>
          </View>
          <Button 
            title={cargando ? "Asignando..." : "Asignar a mi cartera"} 
            onPress={manejarAsignacion} 
            disabled={cargando}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', borderRadius: 10, margin: 10 },
  titulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  textoVacio: { fontStyle: 'italic', color: '#666' },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginBottom: 15 }
});