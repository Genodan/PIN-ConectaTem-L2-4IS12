import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { colores, fuentes, textos } from '../../tema/kairos';
import { fechaLarga } from '../../services/inicioTerapeutaService';
import { NotaDeSesion, SesionDelDia, franjaDeSesion, guardarNotaDeSesion } from '../../services/notasSesionService';

// Ventana «Notas del día»: se abre encima del inicio (el inicio se sigue viendo detrás, oscurecido).
// Muestra las sesiones del día elegido en el calendario, cada una con su nota (una por sesión).

const textoDeError = (e: unknown) => (e instanceof Error ? e.message : 'Error desconocido');

interface Props {
  visible: boolean;
  dia: Date;
  sesiones: SesionDelDia[];
  cargando: boolean;
  error: string | null;
  onCambiarDia: (dia: Date) => void;
  onCerrar: () => void;
  onNotaGuardada: (sesionId: string, nota: NotaDeSesion | null) => void;
}

export const NotasDelDia = ({ visible, dia, sesiones, cargando, error, onCambiarDia, onCerrar, onNotaGuardada }: Props) => {
  const moverDia = (cambio: number) => onCambiarDia(new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + cambio));

  return (
    // onRequestClose: botón «atrás» en Android y tecla Esc en la web
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={estilos.fondo}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Cerrar las notas del día" onPress={onCerrar} />
        <View style={estilos.ventana} accessibilityViewIsModal testID="notas-del-dia">
          <View style={estilos.cabecera}>
            <View style={estilos.iconoNotas}>
              <Image source={require('../../../assets/kairos/notas.svg')} style={estilos.iconoPequeno} contentFit="contain" />
            </View>
            <View style={estilos.flex}>
              <Text style={textos.tituloSeccion}>Notas del día</Text>
              <Text style={textos.cuerpo}>{fechaLarga(dia)}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Día anterior" style={estilos.botonRedondo} onPress={() => moverDia(-1)}>
              <Text style={estilos.flecha}>‹</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Día siguiente" style={estilos.botonRedondo} onPress={() => moverDia(1)}>
              <Text style={estilos.flecha}>›</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" style={estilos.botonRedondo} onPress={onCerrar}>
              <Text style={estilos.cerrar}>×</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={estilos.lista}>
            {cargando ? (
              <ActivityIndicator size="large" color={colores.amarillo} />
            ) : error ? (
              <Text style={textos.cuerpo}>{error}</Text>
            ) : sesiones.length === 0 ? (
              <Text style={textos.cuerpo}>No hay sesiones este día.</Text>
            ) : (
              sesiones.map((s) => <NotaDeUnaSesion key={s.id} sesion={s} onGuardada={(nota) => onNotaGuardada(s.id, nota)} />)
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Una sesión con su nota: se escribe, se edita o, si se vacía, se borra
const NotaDeUnaSesion = ({ sesion, onGuardada }: { sesion: SesionDelDia; onGuardada: (nota: NotaDeSesion | null) => void }) => {
  const guardado = sesion.nota?.texto ?? '';
  const [texto, setTexto] = useState(guardado);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const hayCambios = texto.trim() !== guardado;

  const guardar = async () => {
    setGuardando(true);
    setAviso(null);
    try {
      const nota = await guardarNotaDeSesion(sesion.id, texto);
      setTexto(nota?.texto ?? '');
      onGuardada(nota);
      setAviso({ tipo: 'ok', texto: nota ? 'Nota guardada.' : 'Nota borrada.' });
    } catch (e) {
      setAviso({ tipo: 'error', texto: textoDeError(e) });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={estilos.sesion} testID="sesion-del-dia">
      <View style={estilos.fila}>
        <View style={estilos.flex}>
          <Text style={textos.cuerpoGrande}>{sesion.nino}</Text>
          {sesion.familia ? <Text style={textos.cuerpo}>{`Familia ${sesion.familia}`}</Text> : null}
        </View>
        <Text style={textos.cuerpoSemibold}>{franjaDeSesion(sesion.empiezaEn, sesion.duracionMin)}</Text>
      </View>
      <TextInput
        testID="campo-nota"
        accessibilityLabel={`Nota de la sesión con ${sesion.nino}`}
        style={estilos.campo}
        multiline
        value={texto}
        onChangeText={(t) => {
          setTexto(t);
          setAviso(null);
        }}
        placeholder="Escribe una nota sobre esta sesión…"
        placeholderTextColor={colores.diaFueraDeMes}
      />
      <View style={estilos.filaGuardar}>
        {aviso ? (
          <Text style={[textos.cuerpo, estilos.flex, aviso.tipo === 'error' && estilos.textoError]}>{aviso.texto}</Text>
        ) : (
          <View style={estilos.flex} />
        )}
        <Pressable
          accessibilityRole="button"
          testID="boton-guardar-nota"
          disabled={!hayCambios || guardando}
          accessibilityState={{ disabled: !hayCambios || guardando }}
          style={[estilos.boton, (!hayCambios || guardando) && estilos.botonDesactivado]}
          onPress={guardar}
        >
          <Text style={estilos.textoBoton}>{guardando ? 'Guardando…' : 'Guardar nota'}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  fondo: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(34, 34, 34, 0.45)' },
  ventana: {
    width: 720,
    maxWidth: '100%',
    maxHeight: '85%',
    borderRadius: 32,
    backgroundColor: colores.blanco,
    paddingVertical: 24,
    shadowColor: '#172D26',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingBottom: 16 },
  iconoNotas: { width: 32, height: 32, borderRadius: 10, padding: 7, opacity: 0.8, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.amarillo },
  iconoPequeno: { width: 18, height: 18 },
  botonRedondo: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.fondo },
  flecha: { ...textos.tituloSeccion, lineHeight: 32 },
  cerrar: { ...textos.tituloSeccion, fontSize: 26, lineHeight: 32 },
  lista: { gap: 16, paddingHorizontal: 24, paddingTop: 8 },
  sesion: { gap: 12, padding: 20, borderRadius: 20, backgroundColor: colores.fondo },
  campo: {
    ...textos.cuerpo,
    minHeight: 88,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colores.gris,
    backgroundColor: colores.blanco,
    textAlignVertical: 'top',
  },
  filaGuardar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  textoError: { color: colores.naranja },
  boton: { height: 40, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.verde },
  botonDesactivado: { opacity: 0.4 },
  textoBoton: { fontFamily: fuentes.semibold, fontSize: 14, color: colores.blanco },
});
