import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PantallaTerapeuta } from '../../components/kairos/PantallaTerapeuta';
import { AsignacionPacientes } from '../../components/AsignacionPacientes';
import { AltaPaciente } from '../../components/AltaPaciente';
import { AsignacionModulosPaciente } from '../../components/AsignacionModulosPaciente';
import { useSesionTerapeuta } from '../../sesion/SesionTerapeuta';
import { textos } from '../../tema/kairos';

// Pestaña «Pacientes». De momento reúne lo que ya existía (asignar, dar de alta y módulos por paciente)
// hasta que se implemente su pantalla nueva de Figma («PACIENTES - TERAPEUTA»).
export default function PacientesTerapeuta() {
  const router = useRouter();
  const { terapeutaActual, datosVersion, alCambiarDatos } = useSesionTerapeuta();

  return (
    <PantallaTerapeuta pestana="pacientes">
      <Text style={[textos.titulo, styles.titulo]}>Pacientes</Text>
      {!terapeutaActual ? (
        <Text style={textos.cuerpo}>Elige quién eres en «Inicio».</Text>
      ) : (
        <View>
          {/* UT 1095: mensajes con las familias (hasta que la nueva interfaz les dé su sitio) */}
          <View style={styles.botonMensajes}>
            <Button
              testID="boton-mensajes-terapeuta"
              title="Mensajes"
              onPress={() => router.push({ pathname: '/terapeuta/mensajes', params: { terapeutaId: terapeutaActual } })}
            />
          </View>
          <AsignacionPacientes terapeutaIdActual={terapeutaActual} />
          <AltaPaciente terapeutaIdActual={terapeutaActual} onPacienteCreado={alCambiarDatos} />
          <AsignacionModulosPaciente
            terapeutaIdActual={terapeutaActual}
            recargarTrigger={datosVersion}
            onModulosAsignadosCambiados={alCambiarDatos}
            inicialmenteAbierto={false}
          />
        </View>
      )}
    </PantallaTerapeuta>
  );
}

const styles = StyleSheet.create({
  titulo: { marginBottom: 24 },
  botonMensajes: { marginHorizontal: 10, marginBottom: 10, alignSelf: 'flex-start' },
});
