import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Button,
  Alert,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {
  Modulo,
  obtenerModulosPropiosDeTerapeuta,
  crearModulo,
  actualizarModulo,
  subirVideoGuia,
} from '../services/modulosService';

type Mensaje = { tipo: 'ok' | 'error'; texto: string };

const mostrarAlerta = (titulo: string, mensaje?: string) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${titulo}${mensaje ? `\n\n${mensaje}` : ''}`);
  } else {
    Alert.alert(titulo, mensaje);
  }
};

export const GestionModulos = ({
  terapeutaIdActual,
  onModuloCambiado,
  inicialmenteAbierto = true,
}: {
  terapeutaIdActual: string;
  onModuloCambiado?: () => void;
  inicialmenteAbierto?: boolean;
}) => {
  const [desplegado, setDesplegado] = useState(inicialmenteAbierto);
  const [modulosPropios, setModulosPropios] = useState<Modulo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);

  // Estado del formulario
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [moduloEnEdicion, setModuloEnEdicion] = useState<Modulo | null>(null);

  const [titulo, setTitulo] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [materialesTexto, setMaterialesTexto] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [archivoVideo, setArchivoVideo] = useState<{ uri: string; name: string } | null>(null);

  const cargarModulos = useCallback(async () => {
    if (!terapeutaIdActual) return;
    setCargando(true);
    try {
      const datos = await obtenerModulosPropiosDeTerapeuta(terapeutaIdActual);
      setModulosPropios(datos || []);
    } catch (error: any) {
      setMensaje({ tipo: 'error', texto: error.message || 'Error al cargar los módulos' });
    } finally {
      setCargando(false);
    }
  }, [terapeutaIdActual]);

  useEffect(() => {
    limpiarFormulario();
    setMensaje(null);
    cargarModulos();
  }, [cargarModulos]);

  const limpiarFormulario = () => {
    setModuloEnEdicion(null);
    setTitulo('');
    setObjetivo('');
    setMaterialesTexto('');
    setVideoUrl('');
    setArchivoVideo(null);
    setMostrarFormulario(false);
  };

  const iniciarCreacion = () => {
    limpiarFormulario();
    setMostrarFormulario(true);
    setMensaje(null);
  };

  const iniciarEdicion = (modulo: Modulo) => {
    setModuloEnEdicion(modulo);
    setTitulo(modulo.titulo);
    setObjetivo(modulo.objetivo);
    setMaterialesTexto(
      Array.isArray(modulo.ideas_materiales)
        ? modulo.ideas_materiales.join(', ')
        : (modulo.ideas_materiales as any) || '',
    );
    setVideoUrl(modulo.video_guia_url || '');
    setArchivoVideo(null);
    setMostrarFormulario(true);
    setMensaje(null);
  };

  const seleccionarArchivoVideo = async () => {
    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: ['video/*', 'video/mp4', 'video/quicktime', 'video/webm'],
        copyToCacheDirectory: true,
      });

      if (!resultado.canceled && resultado.assets && resultado.assets.length > 0) {
        const file = resultado.assets[0];
        setArchivoVideo({
          uri: file.uri,
          name: file.name,
        });
        setVideoUrl(''); // Se prioriza el archivo adjunto
      }
    } catch (e) {
      mostrarAlerta('Error', 'No se pudo seleccionar el archivo de vídeo.');
    }
  };

  const guardar = async () => {
    if (!titulo.trim()) {
      setMensaje({ tipo: 'error', texto: 'El título del módulo es obligatorio.' });
      return;
    }
    if (!objetivo.trim()) {
      setMensaje({ tipo: 'error', texto: 'El objetivo del módulo es obligatorio.' });
      return;
    }

    setGuardando(true);
    setMensaje(null);

    try {
      let urlFinalVideo: string | null = videoUrl.trim() || null;

      // Si se adjuntó un archivo local, se sube al bucket 'videos guia'
      if (archivoVideo) {
        urlFinalVideo = await subirVideoGuia(archivoVideo.uri, archivoVideo.name);
      }

      // Convertir materiales separados por comas en array
      const ideasArray = materialesTexto
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean);

      if (moduloEnEdicion) {
        // Modo EDITAR módulo
        await actualizarModulo(moduloEnEdicion.id, terapeutaIdActual, {
          titulo: titulo.trim(),
          objetivo: objetivo.trim(),
          ideas_materiales: ideasArray,
          video_guia_url: urlFinalVideo,
        });
        setMensaje({
          tipo: 'ok',
          texto: `Módulo «${titulo.trim()}» actualizado correctamente.`,
        });
      } else {
        // Modo CREAR módulo
        await crearModulo({
          titulo: titulo.trim(),
          objetivo: objetivo.trim(),
          ideas_materiales: ideasArray,
          video_guia_url: urlFinalVideo,
          terapeuta_id: terapeutaIdActual,
        });
        setMensaje({
          tipo: 'ok',
          texto: `Módulo «${titulo.trim()}» creado correctamente. Ahora puedes asignarlo a tus pacientes.`,
        });
      }

      limpiarFormulario();
      await cargarModulos();
      onModuloCambiado?.();
    } catch (error: any) {
      setMensaje({ tipo: 'error', texto: error.message || 'Error al guardar el módulo' });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* CABECERA DESPLEGABLE */}
      <TouchableOpacity
        testID="boton-toggle-desplegable-modulos"
        style={styles.cabeceraColapsable}
        onPress={() => setDesplegado((prev) => !prev)}
        activeOpacity={0.7}
      >
        <View style={styles.cabeceraTextoContenedor}>
          <Text style={styles.tituloSeccion}>Módulos personalizados</Text>
          <Text style={styles.subtituloColapsable}>
            {desplegado ? 'Toca para plegar la sección' : 'Toca para abrir y crear/editar módulos'}
          </Text>
        </View>
        <View style={[styles.botonDesplegarIcono, desplegado && styles.botonDesplegarIconoAbierto]}>
          <Text style={styles.textoIconoDesplegar}>{desplegado ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {desplegado && (
        <View style={styles.contenidoDesplegable}>
          <View style={styles.cabeceraSeccion}>
            <Text style={styles.subtituloSeccionInterior}>Gestión de módulos propios</Text>
            {!mostrarFormulario && (
              <TouchableOpacity
                testID="boton-crear-modulo"
                accessibilityRole="button"
                style={styles.botonCrear}
                onPress={iniciarCreacion}
              >
                <Text style={styles.textoBotonCrear}>➕ Crear módulo</Text>
              </TouchableOpacity>
            )}
          </View>

      {/* MENSAJES DE ESTADO */}
      {mensaje && (
        <View style={mensaje.tipo === 'ok' ? styles.cajaMensajeOk : styles.cajaMensajeError}>
          <Text style={mensaje.tipo === 'ok' ? styles.textoMensajeOk : styles.textoMensajeError}>
            {mensaje.texto}
          </Text>
        </View>
      )}

      {/* FORMULARIO DE CREACIÓN / EDICIÓN */}
      {mostrarFormulario && (
        <View style={styles.tarjetaFormulario} testID="formulario-modulo">
          <Text style={styles.tituloFormulario}>
            {moduloEnEdicion ? `✏️ Editar módulo: ${moduloEnEdicion.titulo}` : '✨ Nuevo módulo personalizado'}
          </Text>

          <Text style={styles.labelCampo}>Nombre / Título del módulo *</Text>
          <TextInput
            testID="input-titulo-modulo"
            style={styles.inputTexto}
            placeholder="Ej: Juego de bloques y turnos"
            value={titulo}
            onChangeText={setTitulo}
            editable={!guardando}
          />

          <Text style={styles.labelCampo}>Objetivo / Descripción *</Text>
          <TextInput
            testID="input-objetivo-modulo"
            style={[styles.inputTexto, styles.inputArea]}
            placeholder="Describe el objetivo terapéutico de la actividad..."
            value={objetivo}
            onChangeText={setObjetivo}
            multiline
            numberOfLines={3}
            editable={!guardando}
          />

          <Text style={styles.labelCampo}>Ideas de materiales (separadas por comas)</Text>
          <TextInput
            testID="input-materiales-modulo"
            style={styles.inputTexto}
            placeholder="Ej: Bloques de madera, Caja, Pompero"
            value={materialesTexto}
            onChangeText={setMaterialesTexto}
            editable={!guardando}
          />

          <Text style={styles.labelCampo}>Vídeo guía (Bucket «videos-guia» o URL)</Text>
          <View style={styles.filaAdjuntarVideo}>
            <TouchableOpacity
              testID="boton-adjuntar-video"
              style={styles.botonAdjuntarVideo}
              onPress={seleccionarArchivoVideo}
              disabled={guardando}
            >
              <Text style={styles.textoBotonAdjuntar}>
                {archivoVideo ? '🔄 Cambiar vídeo' : '📁 Seleccionar archivo de vídeo'}
              </Text>
            </TouchableOpacity>

            {archivoVideo && (
              <TouchableOpacity onPress={() => setArchivoVideo(null)} style={styles.botonQuitarVideo}>
                <Text style={styles.textoQuitarVideo}>Quitar</Text>
              </TouchableOpacity>
            )}
          </View>

          {archivoVideo ? (
            <Text style={styles.textoArchivoAdjunto}>
              Vídeo adjunto para subir: <Text style={{ fontWeight: 'bold' }}>{archivoVideo.name}</Text>
            </Text>
          ) : (
            <TextInput
              testID="input-video-guia"
              style={styles.inputTexto}
              placeholder="O escribe una URL (ej: https://ejemplo.com/video.mp4)"
              value={videoUrl}
              onChangeText={setVideoUrl}
              editable={!guardando}
            />
          )}

          <View style={styles.filaBotonesFormulario}>
            <TouchableOpacity
              testID="boton-guardar-modulo"
              style={[styles.botonGuardar, guardando && styles.botonDeshabilitado]}
              onPress={guardar}
              disabled={guardando}
            >
              <Text style={styles.textoBotonGuardar}>
                {guardando ? 'Guardando...' : moduloEnEdicion ? 'Actualizar módulo' : 'Guardar módulo'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="boton-cancelar-modulo"
              style={styles.botonCancelar}
              onPress={limpiarFormulario}
              disabled={guardando}
            >
              <Text style={styles.textoBotonCancelar}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* LISTA DE MÓDULOS CREADOS POR EL TERAPEUTA */}
      {cargando ? (
        <ActivityIndicator size="small" color="#0050b3" style={{ marginVertical: 15 }} />
      ) : modulosPropios.length === 0 ? (
        <Text style={styles.textoVacio}>
          No tienes módulos personalizados creados todavía. Pulsa «Crear módulo» para añadir uno.
        </Text>
      ) : (
        <View style={styles.listaModulos}>
          {modulosPropios.map((mod) => {
            const materiales = Array.isArray(mod.ideas_materiales)
              ? mod.ideas_materiales.join(', ')
              : (mod.ideas_materiales as any) || 'No especificados';

            return (
              <View
                key={mod.id}
                style={styles.tarjetaModulo}
                testID="tarjeta-modulo-personalizado"
              >
                <View style={styles.cabeceraModulo}>
                  <Text style={styles.tituloModulo}>{mod.titulo}</Text>
                  <TouchableOpacity
                    testID={`boton-editar-modulo-${mod.id}`}
                    accessibilityRole="button"
                    style={styles.botonEditar}
                    onPress={() => iniciarEdicion(mod)}
                  >
                    <Text style={styles.textoBotonEditar}>✏️ Editar</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.textoObjetivo}>{mod.objetivo}</Text>

                <View style={styles.metadatosModulo}>
                  <Text style={styles.itemMeta}>
                    <Text style={styles.etiquetaMeta}>Materiales: </Text>
                    {materiales}
                  </Text>
                  <Text style={styles.itemMeta}>
                    <Text style={styles.etiquetaMeta}>Vídeo guía: </Text>
                    {mod.video_guia_url || 'Sin vídeo guía'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
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
  cabeceraColapsable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  cabeceraTextoContenedor: {
    flex: 1,
    marginRight: 10,
  },
  subtituloColapsable: {
    fontSize: 12,
    color: '#8c8c8c',
    marginTop: 2,
  },
  botonDesplegarIcono: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f5ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#adc6ff',
  },
  botonDesplegarIconoAbierto: {
    backgroundColor: '#e6f7ff',
    borderColor: '#91d5ff',
  },
  textoIconoDesplegar: {
    fontSize: 14,
    color: '#0050b3',
    fontWeight: 'bold',
  },
  contenidoDesplegable: {
    marginTop: 14,
  },
  cabeceraSeccion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subtituloSeccionInterior: {
    fontSize: 14,
    fontWeight: '600',
    color: '#595959',
  },
  tituloSeccion: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0050b3',
  },
  botonCrear: {
    backgroundColor: '#0050b3',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  textoBotonCrear: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  textoVacio: {
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
    marginVertical: 12,
  },
  cajaMensajeOk: {
    backgroundColor: '#f6ffed',
    borderWidth: 1,
    borderColor: '#b7eb8f',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  textoMensajeOk: {
    color: '#389e0d',
    fontWeight: 'bold',
    fontSize: 13,
  },
  cajaMensajeError: {
    backgroundColor: '#fff1f0',
    borderWidth: 1,
    borderColor: '#ffa39e',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  textoMensajeError: {
    color: '#cf1322',
    fontWeight: 'bold',
    fontSize: 13,
  },
  tarjetaFormulario: {
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bae7ff',
  },
  tituloFormulario: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#003a8c',
    marginBottom: 12,
  },
  labelCampo: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 4,
    marginTop: 8,
  },
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
  inputArea: {
    minHeight: 65,
    textAlignVertical: 'top',
  },
  filaAdjuntarVideo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  botonAdjuntarVideo: {
    backgroundColor: '#e6f7ff',
    borderWidth: 1,
    borderColor: '#91d5ff',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  textoBotonAdjuntar: {
    color: '#0050b3',
    fontSize: 12,
    fontWeight: '600',
  },
  botonQuitarVideo: {
    padding: 6,
  },
  textoQuitarVideo: {
    color: '#d9534f',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  textoArchivoAdjunto: {
    fontSize: 12,
    color: '#0050b3',
    marginBottom: 8,
  },
  filaBotonesFormulario: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  botonGuardar: {
    flex: 1,
    backgroundColor: '#28a745',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  textoBotonGuardar: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  botonCancelar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  textoBotonCancelar: {
    color: '#666',
    fontWeight: '600',
    fontSize: 13,
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  listaModulos: {
    gap: 10,
    marginTop: 6,
  },
  tarjetaModulo: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  cabeceraModulo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tituloModulo: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#262626',
    flex: 1,
  },
  botonEditar: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  textoBotonEditar: {
    color: '#0050b3',
    fontSize: 12,
    fontWeight: '600',
  },
  textoObjetivo: {
    fontSize: 13,
    color: '#555',
    marginBottom: 8,
    lineHeight: 18,
  },
  metadatosModulo: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 6,
    gap: 4,
  },
  itemMeta: {
    fontSize: 12,
    color: '#666',
  },
  etiquetaMeta: {
    fontWeight: 'bold',
    color: '#555',
  },
});
