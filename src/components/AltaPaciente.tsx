import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { LIMITE_NOMBRE_PACIENTE, crearPaciente } from '../services/pacientesService';

// UT 1354 · La terapeuta da de alta un paciente nuevo y queda asignado a ella.
// (Sin código de invitación ni cuenta: todavía no hay registro ni inicio de sesión.)

type Mensaje = { tipo: 'ok' | 'error'; texto: string };

export const AltaPaciente = ({
  terapeutaIdActual,
  onPacienteCreado,
}: {
  terapeutaIdActual: string;
  onPacienteCreado?: () => void;
}) => {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nombreNino, setNombreNino] = useState('');
  const [nombreFamilia, setNombreFamilia] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  // Candado inmediato: dos pulsaciones seguidas no crean dos pacientes (el estado se actualiza más tarde)
  const guardandoRef = useRef(false);

  const cerrarFormulario = () => {
    setMostrarFormulario(false);
    setNombreNino('');
    setNombreFamilia('');
  };

  // Al cambiar de terapeuta (simulador de inicio de sesión) se descarta lo que había a medias
  useEffect(() => {
    cerrarFormulario();
    setMensaje(null);
  }, [terapeutaIdActual]);

  const abrirFormulario = () => {
    cerrarFormulario();
    setMostrarFormulario(true);
    setMensaje(null);
  };

  const guardar = async () => {
    if (guardandoRef.current) return;
    guardandoRef.current = true;
    setGuardando(true);
    setMensaje(null);

    try {
      const paciente = await crearPaciente({ nombreNino, nombreFamilia, terapeutaId: terapeutaIdActual });
      cerrarFormulario();
      setMensaje({
        tipo: 'ok',
        texto: `Paciente «${paciente.nombre_nino}» añadido a tu cartera. Ya puedes crearle prácticas.`,
      });
      onPacienteCreado?.();
    } catch (error: any) {
      setMensaje({ tipo: 'error', texto: error?.message || 'Error al guardar el paciente' });
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.cabeceraSeccion}>
        <Text style={styles.tituloSeccion}>Pacientes</Text>
        {!mostrarFormulario && (
          <TouchableOpacity
            testID="boton-nuevo-paciente"
            accessibilityRole="button"
            style={styles.botonNuevo}
            onPress={abrirFormulario}
          >
            <Text style={styles.textoBotonNuevo}>➕ Nuevo paciente</Text>
          </TouchableOpacity>
        )}
      </View>

      {mensaje && (
        <View
          testID="mensaje-paciente"
          style={mensaje.tipo === 'ok' ? styles.cajaMensajeOk : styles.cajaMensajeError}
        >
          <Text style={mensaje.tipo === 'ok' ? styles.textoMensajeOk : styles.textoMensajeError}>
            {mensaje.texto}
          </Text>
        </View>
      )}

      {mostrarFormulario && (
        <View style={styles.tarjetaFormulario} testID="formulario-paciente">
          <Text style={styles.tituloFormulario}>✨ Nuevo paciente</Text>

          <Text style={styles.labelCampo}>Nombre del paciente *</Text>
          <TextInput
            testID="input-nombre-paciente"
            style={styles.inputTexto}
            value={nombreNino}
            onChangeText={setNombreNino}
            maxLength={LIMITE_NOMBRE_PACIENTE}
            placeholder="Nombre del niño o de la niña"
            placeholderTextColor="#999"
          />

          <Text style={styles.labelCampo}>Nombre de la familia *</Text>
          <TextInput
            testID="input-nombre-familia"
            style={styles.inputTexto}
            value={nombreFamilia}
            onChangeText={setNombreFamilia}
            maxLength={LIMITE_NOMBRE_PACIENTE}
            placeholder="Nombre de la familia o del tutor"
            placeholderTextColor="#999"
          />

          <View style={styles.filaBotonesFormulario}>
            <TouchableOpacity
              testID="boton-guardar-paciente"
              accessibilityRole="button"
              style={[styles.botonGuardar, guardando && styles.botonDeshabilitado]}
              onPress={guardar}
              disabled={guardando}
            >
              <Text style={styles.textoBotonGuardar}>{guardando ? 'Guardando...' : 'Guardar paciente'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="boton-cancelar-paciente"
              accessibilityRole="button"
              style={styles.botonCancelar}
              onPress={cerrarFormulario}
              disabled={guardando}
            >
              <Text style={styles.textoBotonCancelar}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 10,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cabeceraSeccion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tituloSeccion: { fontSize: 18, fontWeight: 'bold', color: '#0050b3' },
  botonNuevo: { backgroundColor: '#0050b3', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 6 },
  textoBotonNuevo: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  cajaMensajeOk: {
    backgroundColor: '#f6ffed',
    borderWidth: 1,
    borderColor: '#b7eb8f',
    borderRadius: 6,
    padding: 10,
    marginTop: 12,
  },
  textoMensajeOk: { color: '#389e0d', fontWeight: 'bold', fontSize: 13 },
  cajaMensajeError: {
    backgroundColor: '#fff1f0',
    borderWidth: 1,
    borderColor: '#ffa39e',
    borderRadius: 6,
    padding: 10,
    marginTop: 12,
  },
  textoMensajeError: { color: '#cf1322', fontWeight: 'bold', fontSize: 13 },
  tarjetaFormulario: {
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#bae7ff',
  },
  tituloFormulario: { fontSize: 15, fontWeight: 'bold', color: '#003a8c', marginBottom: 4 },
  labelCampo: { fontSize: 12, fontWeight: 'bold', color: '#444', marginBottom: 4, marginTop: 8 },
  inputTexto: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333',
  },
  filaBotonesFormulario: { flexDirection: 'row', gap: 10, marginTop: 14 },
  botonGuardar: { flex: 1, backgroundColor: '#28a745', paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  textoBotonGuardar: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  botonCancelar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  textoBotonCancelar: { color: '#666', fontWeight: '600', fontSize: 13 },
  botonDeshabilitado: { opacity: 0.6 },
});
