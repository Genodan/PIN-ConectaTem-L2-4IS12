import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  ModuloResumen,
  PacienteResumen,
  crearPractica,
  obtenerModulos,
  obtenerPacientesDeTerapeuta,
} from '../services/practicasService';
import { obtenerModulosAsignadosAPaciente } from '../services/modulosPacienteService';

type Mensaje = { tipo: 'ok' | 'error'; texto: string };

const textoDeError = (error: unknown) => (error instanceof Error ? error.message : 'Error desconocido');

export const CrearPractica = ({
  terapeutaIdActual,
  recargarTrigger,
}: {
  terapeutaIdActual: string;
  recargarTrigger?: number;
}) => {
  const [pacientes, setPacientes] = useState<PacienteResumen[]>([]);
  const [todosModulos, setTodosModulos] = useState<ModuloResumen[]>([]);
  const [modulos, setModulos] = useState<ModuloResumen[]>([]);
  const [pacienteId, setPacienteId] = useState<string | null>(null);
  const [moduloId, setModuloId] = useState<string | null>(null);
  // UT 1406: instrucciones para la familia (opcionales); la familia podrá escucharlas en voz alta
  const [instrucciones, setInstrucciones] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);

  const cargarModulosParaPaciente = useCallback(
    async (pacId: string | null, catalogoModulos?: ModuloResumen[]) => {
      const base = catalogoModulos ?? todosModulos;
      if (!pacId) {
        setModulos(base);
        return;
      }
      try {
        let listaFiltrada = base;
        const asignados = await obtenerModulosAsignadosAPaciente(pacId);
        if (asignados && asignados.length > 0) {
          const setAsignados = new Set(asignados);
          listaFiltrada = base.filter((m) => setAsignados.has(m.id));
        }
        setModulos(listaFiltrada);
        setModuloId((idActual) => {
          if (idActual && listaFiltrada.some((m) => m.id === idActual)) {
            return idActual;
          }
          return listaFiltrada[0]?.id ?? null;
        });
      } catch {
        setModulos(base);
      }
    },
    [todosModulos],
  );

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [pacientesTerapeuta, listaBase] = await Promise.all([
        obtenerPacientesDeTerapeuta(terapeutaIdActual),
        obtenerModulos(terapeutaIdActual),
      ]);

      setPacientes(pacientesTerapeuta);
      setTodosModulos(listaBase);

      const targetPacienteId =
        pacienteId && pacientesTerapeuta.some((p) => p.id === pacienteId)
          ? pacienteId
          : pacientesTerapeuta[0]?.id ?? null;
      setPacienteId(targetPacienteId);

      let listaFiltrada = listaBase;
      if (targetPacienteId) {
        try {
          const asignados = await obtenerModulosAsignadosAPaciente(targetPacienteId);
          if (asignados && asignados.length > 0) {
            const setAsignados = new Set(asignados);
            listaFiltrada = listaBase.filter((m) => setAsignados.has(m.id));
          }
        } catch {
          // Si no hay asignaciones o falla la tabla, se usan todos los módulos
        }
      }

      setModulos(listaFiltrada);
      setModuloId((idActual) => {
        if (idActual && listaFiltrada.some((m) => m.id === idActual)) {
          return idActual;
        }
        return listaFiltrada[0]?.id ?? null;
      });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: textoDeError(error) });
    } finally {
      setCargando(false);
    }
  }, [terapeutaIdActual]);

  // Se recarga al cambiar de terapeuta o cuando se crea/edita un módulo o cambian asignaciones
  useEffect(() => {
    setMensaje(null);
    cargarDatos();
  }, [cargarDatos, recargarTrigger]);

  const guardar = async () => {
    if (!pacienteId || !moduloId) return;
    setGuardando(true);
    setMensaje(null);
    try {
      await crearPractica({ terapeutaId: terapeutaIdActual, pacienteId, moduloId, instrucciones });
      setInstrucciones('');
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
            <Picker
              testID="picker-paciente"
              selectedValue={pacienteId}
              onValueChange={(valor) => {
                setPacienteId(valor);
                cargarModulosParaPaciente(valor);
              }}
            >
              {pacientes.map((p) => (
                <Picker.Item key={p.id} label={`${p.nombre_nino} (${p.nombre_familia})`} value={p.id} />
              ))}
            </Picker>
          </View>

          <Text style={styles.etiqueta}>Módulo</Text>
          <View style={styles.pickerContainer}>
            <Picker
              testID="picker-modulo"
              selectedValue={moduloId}
              onValueChange={(valor) => setModuloId(valor)}
            >
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

          <Text style={styles.etiqueta}>Instrucciones para la familia (opcional)</Text>
          <TextInput
            style={styles.campoInstrucciones}
            accessibilityLabel="Instrucciones para la familia"
            value={instrucciones}
            onChangeText={setInstrucciones}
            placeholder="Explica cómo hacer la práctica en casa. La familia podrá escucharlo en voz alta."
            multiline
            maxLength={1500}
            editable={!guardando}
          />

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
  campoInstrucciones: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  detalleModulo: { backgroundColor: '#f5f5f5', padding: 12, borderRadius: 6, marginBottom: 15 },
  detalleTitulo: { fontWeight: 'bold', marginBottom: 4 },
  detalleTexto: { color: '#444', marginBottom: 2 },
  mensajeOk: { marginTop: 12, color: '#237804', fontWeight: 'bold' },
  mensajeError: { marginTop: 12, color: '#a8071a', fontWeight: 'bold' },
  botonActualizar: { marginTop: 15 },
});
