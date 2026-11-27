import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { PantallaTerapeuta } from '../../components/kairos/PantallaTerapeuta';
import { RevisionTareas } from '../../components/RevisionTareas';
import { useSesionTerapeuta } from '../../sesion/SesionTerapeuta';
import { textos } from '../../tema/kairos';

// Pestaña «Evidencias». De momento es la bandeja que ya existía (revisar y dar feedback)
// hasta que se implemente su pantalla nueva de Figma («CORREGIR PRÁCTICAS - TERAPEUTA»).
export default function EvidenciasTerapeuta() {
  const { terapeutaActual } = useSesionTerapeuta();

  return (
    <PantallaTerapeuta pestana="evidencias">
      <Text style={[textos.titulo, styles.titulo]}>Evidencias</Text>
      {!terapeutaActual ? (
        <Text style={textos.cuerpo}>Elige quién eres en «Inicio».</Text>
      ) : (
        <RevisionTareas terapeutaIdActual={terapeutaActual} />
      )}
    </PantallaTerapeuta>
  );
}

const styles = StyleSheet.create({
  titulo: { marginBottom: 24 },
});
