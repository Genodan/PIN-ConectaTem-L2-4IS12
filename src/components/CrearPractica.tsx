import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  ModuloResumen,
  PacienteResumen,
  crearPractica,
  obtenerModulos,
  obtenerPacientesDeTerapeuta,
} from '../services/practicasService';

type Mensaje = { tipo: 'ok' | 'error'; texto: string };

const textoDeError = (error: unknown) => (error instanceof Error ? error.message : 'Error desconocido');

export const CrearPractica = ({ terapeutaIdActual }: { terapeutaIdActual: string }) => {
  const [pacientes, setPacientes] = useState<PacienteResumen[]>([]);
  const [modulos, setModulos] = useState<ModuloResumen[]>([]);
  const [pacienteId, setPacienteId] = useState<string | null>(null);
  const [moduloId, setModuloId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [pacientesTerapeuta, listaModulos] = await Promise.all([
        obtenerPacientesDeTerapeuta(terapeutaIdActual),
        obtenerModulos(),
      ]);
      setPacientes(pacientesTerapeuta);
      setModulos(listaModulos);
      setPacienteId(pacientesTerapeuta[0]?.id ?? null);
      setModuloId(listaModulos[0]?.id ?? null);
    } catch (error) {
      setMensaje({ tipo: 'error', texto: textoDeError(error) });
    } finally {
      setCargando(false);
    }
  }, [terapeutaIdActual]);

  // Se recarga al cambiar de terapeuta (en el simulador de inicio de sesión)
  useEffect(() => {
    setMensaje(null);
    cargarDatos();
  }, [cargarDatos]);

  const guardar = async () => {
    if (!pacienteId || !moduloId) return;
    setGuardando(true);
    setMensaje(null);
    try {
      await crearPractica({ terapeutaId: terapeutaIdActual, pacienteId, moduloId });
      const paciente = pacientes.find((p) => p.id === pacienteId);
      const modulo = modulos.find((m) => m.id === moduloId);
      setMensaje({
        tipo: 'ok',
        texto: `Práctica «${modulo?.titulo}» creada para ${paciente?.nombre_nino}. La familia la verá como «Pendiente».`,
      });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: textoDeError(error) });
    } finally {
      setGuardando(false);
    }
  };

  const moduloActual = modulos.find((m) => m.id === moduloId);

  if (cargando) return <ActivityIndicator size="small" color="#0000ff" />;

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Crear práctica</Text>

      {pacientes.length === 0 ? (
        <Text style={styles.textoVacio}>
          Todavía no tienes pacientes asignados. Asigna uno en la sección de arriba.
        </Text>
      ) : (
        <View>
          <Text style={styles.etiqueta}>Paciente</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={pacienteId} onValueChange={(valor) => setPacienteId(valor)}>
              {pacientes.map((p) => (
                <Picker.Item key={p.id} label={`${p.nombre_nino} (${p.nombre_familia})`} value={p.id} />
              ))}
            </Picker>
          </View>

          <Text style={styles.etiqueta}>Módulo</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={moduloId} onValueChange={(valor) => setModuloId(valor)}>
              {modulos.map((m) => (
                <Picker.Item key={m.id} label={m.titulo} value={m.id} />
              ))}
            </Picker>
          </View>

          {moduloActual && (
            <View style={styles.detalleModulo}>
              <Text style={styles.detalleTitulo}>{moduloActual.titulo}</Text>
              <Text style={styles.detalleTexto}>Objetivo: {moduloActual.objetivo}</Text>
              <Text style={styles.detalleTexto}>
                Vídeo guía: {moduloActual.video_guia_url ?? 'sin vídeo'}
              </Text>
            </View>
          )}

          <Button
            title={guardando ? 'Guardando...' : 'Guardar práctica'}
            onPress={guardar}
            disabled={guardando || !pacienteId || !moduloId}
          />
        </View>
      )}

      {mensaje && (
        <Text style={mensaje.tipo === 'ok' ? styles.mensajeOk : styles.mensajeError}>{mensaje.texto}</Text>
      )}

      <View style={styles.botonActualizar}>
        <Button title="Actualizar lista de pacientes" onPress={cargarDatos} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { margin: 10, padding: 20, backgroundColor: '#fff', borderRadius: 10 },
  titulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  etiqueta: { fontSize: 13, color: '#555', marginBottom: 4 },
  textoVacio: { fontStyle: 'italic', color: '#666' },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginBottom: 15 },
  detalleModulo: { backgroundColor: '#f5f5f5', padding: 12, borderRadius: 6, marginBottom: 15 },
  detalleTitulo: { fontWeight: 'bold', marginBottom: 4 },
  detalleTexto: { color: '#444', marginBottom: 2 },
  mensajeOk: { marginTop: 12, color: '#237804', fontWeight: 'bold' },
  mensajeError: { marginTop: 12, color: '#a8071a', fontWeight: 'bold' },
  botonActualizar: { marginTop: 15 },
});
