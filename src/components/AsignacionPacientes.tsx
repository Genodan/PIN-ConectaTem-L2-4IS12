import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { obtenerPacientesLibres, vincularPaciente } from '../services/pacientesService';

export const AsignacionPacientes = ({ terapeutaIdActual }: { terapeutaIdActual: string }) => {
  const [pacientesLibres, setPacientesLibres] = useState<any[]>([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargarPacientes = async () => {
    try {
      const datos = await obtenerPacientesLibres();
      setPacientesLibres(datos || []);
      if (datos && datos.length > 0) setPacienteSeleccionado(datos[0].id);
      else setPacienteSeleccionado(null);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  useEffect(() => {
    cargarPacientes();
  }, []);

  const manejarAsignacion = async () => {
    if (!pacienteSeleccionado) return;
    setCargando(true);

    try {
      await vincularPaciente(pacienteSeleccionado, terapeutaIdActual);
      Alert.alert('Éxito', '¡Paciente asignado correctamente a tu cartera!');
      await cargarPacientes(); // Refresca el desplegable
    } catch (error: any) {
      Alert.alert('Aviso', error.message);
      await cargarPacientes(); 
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Asignar Nuevo Paciente</Text>

      {pacientesLibres.length === 0 ? (
        <Text style={styles.textoVacio}>No hay pacientes libres en este momento.</Text>
      ) : (
        <View>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={pacienteSeleccionado}
              onValueChange={(itemValue) => setPacienteSeleccionado(itemValue)}
            >
              {pacientesLibres.map((paciente) => (
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