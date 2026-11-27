import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PantallaTerapeuta } from '../../components/kairos/PantallaTerapeuta';
import { CrearPractica } from '../../components/CrearPractica';
import { GestionModulos } from '../../components/GestionModulos';
import { useSesionTerapeuta } from '../../sesion/SesionTerapeuta';
import { textos } from '../../tema/kairos';

// Pestaña «Prácticas». De momento reúne lo que ya existía (crear prácticas y gestionar módulos)
// hasta que se implemente su pantalla nueva de Figma («ENCARGAR PRÁCTICA - TERAPEUTA»).
export default function PracticasTerapeuta() {
  const { terapeutaActual, datosVersion, alCambiarDatos } = useSesionTerapeuta();

  return (
    <PantallaTerapeuta pestana="practicas">
      <Text style={[textos.titulo, styles.titulo]}>Prácticas</Text>
      {!terapeutaActual ? (
        <Text style={textos.cuerpo}>Elige quién eres en «Inicio».</Text>
      ) : (
        <View>
          <CrearPractica terapeutaIdActual={terapeutaActual} recargarTrigger={datosVersion} />
          <GestionModulos terapeutaIdActual={terapeutaActual} onModuloCambiado={alCambiarDatos} inicialmenteAbierto={false} />
        </View>
      )}
    </PantallaTerapeuta>
  );
}

const styles = StyleSheet.create({
  titulo: { marginBottom: 24 },
});
