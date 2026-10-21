import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Contenido, useEsAncho } from '../../components/estructura';
import { Aviso, Avatar, Boton, CabeceraSeccion, Campo, CampoLectura, Insignia, Rejilla, Tarjeta, TituloTarjeta } from '../../components/ui';
import { NINO, TERAPEUTA } from '../../datos/prototipo';
import { colores, fuentes, radios } from '../../tema';

// Perfil del niño visto por la familia: datos de solo lectura y sus propias observaciones
export default function PerfilNino() {
  const ancho = useEsAncho();
  const [observaciones, setObservaciones] = useState(NINO.observaciones);
  const [guardado, setGuardado] = useState(true);

  return (
    <Contenido maxAncho={900}>
      <CabeceraSeccion titulo="Perfil de tu hijo/a" subtitulo="Consulta los datos que gestiona el equipo terapéutico." />

      <View style={styles.aviso}>
        <Aviso
          icono="🔒"
          texto="Los datos personales y la información clínica los gestiona tu terapeuta. Si algo no es correcto, coméntaselo en vuestra próxima sesión."
        />
      </View>

      <Rejilla ancho={ancho}>
        <Tarjeta>
          <TituloTarjeta>Datos personales</TituloTarjeta>
          <View style={styles.fila}>
            <CampoLectura etiqueta="Nombre" valor={NINO.nombre} />
            <CampoLectura etiqueta="Apellidos" valor={NINO.apellidos} />
          </View>
          <View style={styles.fila}>
            <CampoLectura etiqueta="Fecha de nacimiento" valor={NINO.fechaNacimiento} />
            <CampoLectura etiqueta="Sexo" valor={NINO.sexo} />
          </View>
        </Tarjeta>

        <Tarjeta>
          <TituloTarjeta>Información clínica</TituloTarjeta>
          <CampoLectura etiqueta="Diagnóstico / motivo de consulta" valor={NINO.diagnostico} />
          <View>
            <Text style={styles.etiqueta}>Terapeuta asignado/a</Text>
            <View style={styles.terapeuta}>
              <Avatar texto={TERAPEUTA.inicial} tamano={24} />
              <Text style={styles.textoTerapeuta}>{TERAPEUTA.nombre} {TERAPEUTA.apellidos}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.etiqueta}>Hitos en progreso</Text>
            <View style={styles.hitos}>
              {NINO.hitosEnProgreso.map((h) => (
                <Insignia key={h} texto={h} />
              ))}
            </View>
          </View>
        </Tarjeta>
      </Rejilla>

      <Tarjeta estilo={styles.observaciones}>
        <View style={styles.filaEntre}>
          <TituloTarjeta>Tus observaciones</TituloTarjeta>
          <Text style={styles.editable}>EDITABLE</Text>
        </View>
        <Text style={styles.ayuda}>Esto sí lo escribes tú. {TERAPEUTA.nombre} lo verá antes de vuestra próxima sesión.</Text>
        <Campo
          accessibilityLabel="Tus observaciones"
          filas={3}
          value={observaciones}
          onChangeText={(t) => {
            setObservaciones(t);
            setGuardado(false);
          }}
        />
        <Boton
          titulo={guardado ? '✓ Observación guardada' : 'Guardar observación'}
          onPress={() => setGuardado(true)}
          estilo={styles.botonGuardar}
        />
      </Tarjeta>
    </Contenido>
  );
}

const styles = StyleSheet.create({
  aviso: { marginBottom: 24 },
  fila: { flexDirection: 'row', gap: 12 },
  filaEntre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  etiqueta: { fontFamily: fuentes.textoMedio, fontSize: 12, color: colores.textoApagado, marginBottom: 8 },
  terapeuta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colores.campoLectura,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.medio,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textoTerapeuta: { fontFamily: fuentes.texto, fontSize: 14, color: colores.texto },
  hitos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  observaciones: { marginTop: 20, gap: 12 },
  editable: { fontFamily: fuentes.textoFuerte, fontSize: 10, color: colores.primario },
  ayuda: { fontFamily: fuentes.texto, fontSize: 12, color: colores.textoApagado },
  botonGuardar: { alignSelf: 'flex-start' },
});
