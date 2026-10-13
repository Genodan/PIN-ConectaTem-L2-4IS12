import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { AsignacionPacientes } from '../../components/AsignacionPacientes';
import { supabase } from '../../utils/supabase';

export default function InicioTerapeuta() {
  const [terapeutas, setTerapeutas] = useState<any[]>([]);
  const [terapeutaActual, setTerapeutaActual] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  // Cargamos la lista de terapeutas desde Supabase al abrir la pantalla
  useEffect(() => {
    const cargarTerapeutas = async () => {
      const { data, error } = await supabase
        .from('terapeutas')
        .select('id, nombre'); // Traemos el ID y el Nombre de la base de datos

      if (!error && data) {
        setTerapeutas(data);
        // Si hay terapeutas, seleccionamos el primero por defecto
        if (data.length > 0) {
          setTerapeutaActual(data[0].id);
        }
      }
      setCargando(false);
    };

    cargarTerapeutas();
  }, []);

  if (cargando) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. SECCIÓN DE "LOGIN" FALSO */}
      <View style={styles.loginContainer}>
        <Text style={styles.tituloSecundario}>¿Quién eres? (Simulación de Login)</Text>
        
        {terapeutas.length === 0 ? (
          <Text style={styles.textoVacio}>
            No hay terapeutas. Ve a Supabase y crea al menos uno en la tabla "terapeutas".
          </Text>
        ) : (
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={terapeutaActual}
              onValueChange={(itemValue) => setTerapeutaActual(itemValue)}
            >
              {terapeutas.map((t) => (
                <Picker.Item key={t.id} label={t.nombre} value={t.id} />
              ))}
            </Picker>
          </View>
        )}
      </View>

      {/* 2. SECCIÓN DE ASIGNACIÓN (El componente que hicimos antes) */}
      <View style={styles.separador} />
      
      {terapeutaActual && (
        // Le pasamos el ID del terapeuta que hayas seleccionado en el desplegable de arriba
        <AsignacionPacientes terapeutaIdActual={terapeutaActual} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 20,
  },
  loginContainer: {
    padding: 20,
    backgroundColor: '#e6f7ff', // Un color azulito para diferenciarlo
    borderRadius: 10,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#91d5ff',
  },
  tituloSecundario: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#0050b3',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  separador: {
    height: 10,
  },
  textoVacio: {
    fontStyle: 'italic',
    color: '#666',
  }
});