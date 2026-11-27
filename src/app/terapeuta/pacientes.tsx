import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image, ImageSource } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PantallaTerapeuta } from '../../components/kairos/PantallaTerapeuta';
import { BotonInvitarPaciente, PestanaListado, PestanasPacientes, TarjetaPacienteListado } from '../../components/kairos/ListadoPacientes';
import { FichaPaciente } from '../../components/kairos/FichaPaciente';
import { EditarPaciente, InvitarPaciente, NotasDelPaciente } from '../../components/kairos/VentanasPaciente';
import { useSesionTerapeuta } from '../../sesion/SesionTerapeuta';
import {
  DatosPaciente,
  FichaPaciente as DatosFicha,
  PacienteArchivado,
  PacienteDelListado,
  TerapeutaResumen,
  filtrarPacientes,
  obtenerArchivados,
  obtenerFichaPaciente,
  obtenerListadoPacientes,
  textoTraspaso,
  textoUltimaActividad,
} from '../../services/pacientesTerapeutaService';
import { ModuloResumen, obtenerModulos } from '../../services/practicasService';
import { asignarModuloAPaciente, desasignarModuloDePaciente, obtenerModulosAsignadosAPaciente } from '../../services/modulosPacienteService';
import { colores, textos } from '../../tema/kairos';

// Nueva interfaz (KAIRÓS) · Pestaña «Pacientes» (Figma: «PACIENTES - TERAPEUTA», versión de escritorio).
// «Archivados»: niños que la terapeuta traspasó a otra (ficha en solo lectura).
// Funciones que existían aquí y no salen en el diseño (asignar pacientes sin terapeuta, mensajes): ver docs/FUNCIONALIDADES.md

const textoDeError = (e: unknown) => (e instanceof Error ? e.message : 'Error desconocido');
type Ventana = 'editar' | 'invitar' | 'notas' | null;

export default function PacientesTerapeuta() {
  const router = useRouter();
  const { paciente: pacienteDeRuta } = useLocalSearchParams<{ paciente?: string }>();
  const { terapeutaActual, datosVersion, alCambiarDatos } = useSesionTerapeuta();

  const [lista, setLista] = useState<PacienteDelListado[]>([]);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [errorLista, setErrorLista] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [pestana, setPestana] = useState<PestanaListado>('principales');
  const [archivados, setArchivados] = useState<PacienteArchivado[]>([]);
  const [errorArchivados, setErrorArchivados] = useState<string | null>(null);
  const [avisoTraspaso, setAvisoTraspaso] = useState<string | null>(null);
  // Niño seleccionado en cada pestaña
  const [elegidos, setElegidos] = useState<Record<PestanaListado, string | null>>({ principales: pacienteDeRuta ?? null, archivados: null });
  const seleccionado = elegidos[pestana];
  const seleccionar = (id: string | null) => setElegidos((e) => ({ ...e, [pestana]: id }));

  const [ficha, setFicha] = useState<DatosFicha | null>(null);
  const [cargandoFicha, setCargandoFicha] = useState(false);
  const [errorFicha, setErrorFicha] = useState<string | null>(null);

  const [modulos, setModulos] = useState<ModuloResumen[]>([]);
  const [asignados, setAsignados] = useState<string[]>([]);
  const [moduloCambiando, setModuloCambiando] = useState<string | null>(null);
  const [avisoModulos, setAvisoModulos] = useState<string | null>(null);

  const [ventana, setVentana] = useState<Ventana>(null);

  // Si se llega desde «Ver ficha →» del inicio, se selecciona ese niño
  useEffect(() => {
    if (pacienteDeRuta) {
      setPestana('principales');
      setElegidos((e) => ({ ...e, principales: pacienteDeRuta }));
    }
  }, [pacienteDeRuta]);

  // Listado de pacientes (y módulos que puede asignar la terapeuta)
  const cargarLista = useCallback(async () => {
    if (!terapeutaActual) return;
    setCargandoLista(true);
    try {
      const [pacientes, mods] = await Promise.all([obtenerListadoPacientes(terapeutaActual), obtenerModulos(terapeutaActual)]);
      setLista(pacientes);
      setModulos(mods);
      setErrorLista(null);
      setElegidos((e) => ({
        ...e,
        principales: e.principales && pacientes.some((p) => p.id === e.principales) ? e.principales : pacientes[0]?.id ?? null,
      }));
    } catch (e) {
      setErrorLista(textoDeError(e));
    } finally {
      setCargandoLista(false);
    }
    // Archivados aparte: si falla (p. ej. falta la tabla de traspasos), el resto se sigue viendo
    try {
      const lista = await obtenerArchivados(terapeutaActual);
      setArchivados(lista);
      setErrorArchivados(null);
      setElegidos((e) => ({
        ...e,
        archivados: e.archivados && lista.some((a) => a.id === e.archivados) ? e.archivados : lista[0]?.id ?? null,
      }));
    } catch (e) {
      console.warn(textoDeError(e));
      setArchivados([]);
      setErrorArchivados('No se pudieron cargar los pacientes archivados.');
    }
  }, [terapeutaActual]);

  useEffect(() => {
    cargarLista();
  }, [cargarLista, datosVersion]);

  // Ficha y módulos asignados del niño seleccionado
  useEffect(() => {
    if (!seleccionado) {
      setFicha(null);
      return;
    }
    let activo = true;
    setCargandoFicha(true);
    setAvisoModulos(null);
    Promise.all([obtenerFichaPaciente(seleccionado), obtenerModulosAsignadosAPaciente(seleccionado)])
      .then(([datos, mods]) => {
        if (!activo) return;
        setFicha(datos);
        setAsignados(mods);
        setErrorFicha(null);
      })
      .catch((e) => activo && setErrorFicha(textoDeError(e)))
      .finally(() => activo && setCargandoFicha(false));
    return () => {
      activo = false;
    };
  }, [seleccionado]);

  const visibles = useMemo(() => filtrarPacientes(lista, busqueda), [lista, busqueda]);
  const archivadosVisibles = useMemo(() => filtrarPacientes(archivados, busqueda), [archivados, busqueda]);
  const enArchivados = pestana === 'archivados';
  const archivadoElegido = enArchivados ? archivados.find((a) => a.id === seleccionado) ?? null : null;

  const cambiarModulo = async (moduloId: string, asignar: boolean) => {
    if (!seleccionado) return;
    setModuloCambiando(moduloId);
    setAvisoModulos(null);
    try {
      if (asignar) await asignarModuloAPaciente(seleccionado, moduloId);
      else await desasignarModuloDePaciente(seleccionado, moduloId);
      setAsignados((a) => (asignar ? [...a, moduloId] : a.filter((id) => id !== moduloId)));
    } catch (e) {
      setAvisoModulos(textoDeError(e));
    } finally {
      setModuloCambiando(null);
    }
  };

  const alTraspasar = (terapeuta: TerapeutaResumen) => {
    const nombre = ficha?.datos.nombreNino ?? 'El paciente';
    setVentana(null);
    setElegidos((e) => ({ ...e, principales: null }));
    setAvisoTraspaso(`${nombre} se ha traspasado a ${terapeuta.nombre}. Lo encontrarás en «Archivados».`);
    alCambiarDatos(); // recarga los listados aquí y los datos de las demás pestañas
  };

  const alGuardarDatos = (datos: DatosPaciente) => {
    setFicha((f) => (f ? { ...f, datos } : f));
    setVentana(null);
    alCambiarDatos(); // recarga el listado (el nombre puede haber cambiado) y las demás pestañas
  };

  return (
    <PantallaTerapeuta pestana="pacientes">
      {/* Introducción y filtros */}
      <View style={estilos.cabecera}>
        <View style={estilos.introduccion}>
          <Text style={textos.titulo}>Pacientes</Text>
          <Text style={[textos.cuerpo, estilos.subtitulo]}>Consulta el progreso y prepara el siguiente paso de cada niño.</Text>
        </View>
        <View style={estilos.filtros}>
          <View style={[estilos.filtro, estilos.buscador]}>
            <Image source={require('../../../assets/kairos/almohadilla.svg')} style={estilos.icono20} contentFit="contain" />
            <TextInput
              style={[textos.cuerpo, estilos.flex, estilos.campoBusqueda]}
              placeholder="Buscar por nombre o identificador…"
              placeholderTextColor={colores.grisOscuro}
              accessibilityLabel="Buscar por nombre o identificador"
              value={busqueda}
              onChangeText={setBusqueda}
              autoCapitalize="none"
            />
          </View>
          {/* De momento solo de adorno */}
          <FiltroAdorno icono={require('../../../assets/kairos/luna.svg')} texto="Activos  ▾" />
          <FiltroAdorno icono={require('../../../assets/kairos/filtro.svg')} texto="Todos  ▾" />
        </View>
      </View>

      {!terapeutaActual ? (
        <Text style={textos.cuerpo}>Elige quién eres en «Inicio».</Text>
      ) : (
        <View style={estilos.columnas}>
          {/* Listado */}
          <View style={estilos.listado}>
            <PestanasPacientes
              activa={pestana}
              onCambiar={(p) => {
                setPestana(p);
                setAvisoTraspaso(null);
              }}
            />
            {enArchivados ? (
              <View style={estilos.bloqueListado}>
                <Text style={textos.tituloSeccion}>
                  {archivados.length === 1 ? '1 paciente archivado' : `${archivados.length} pacientes archivados`}
                </Text>
                {errorArchivados ? (
                  <Text style={textos.cuerpo}>{errorArchivados}</Text>
                ) : archivados.length === 0 ? (
                  <Text style={textos.cuerpo}>No has traspasado ningún paciente a otra terapeuta.</Text>
                ) : archivadosVisibles.length === 0 ? (
                  <Text style={textos.cuerpo}>Ningún paciente coincide con la búsqueda.</Text>
                ) : (
                  <View style={estilos.tarjetas}>
                    {archivadosVisibles.map((a) => (
                      <TarjetaPacienteListado
                        key={a.id}
                        paciente={a}
                        seleccionado={a.id === seleccionado}
                        onPress={() => seleccionar(a.id)}
                        detalle={textoTraspaso(a)}
                        progreso={null}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={estilos.bloqueListado}>
                <Text style={textos.tituloSeccion}>{lista.length === 1 ? '1 paciente activo' : `${lista.length} pacientes activos`}</Text>
                <BotonInvitarPaciente onPress={() => setVentana('invitar')} />
                {avisoTraspaso ? (
                  <View style={estilos.avisoTraspaso} testID="aviso-traspaso-hecho">
                    <Text style={textos.cuerpo}>{avisoTraspaso}</Text>
                  </View>
                ) : null}
                {cargandoLista && lista.length === 0 ? (
                  <ActivityIndicator size="large" color={colores.amarillo} />
                ) : errorLista ? (
                  <Text style={textos.cuerpo}>{errorLista}</Text>
                ) : lista.length === 0 ? (
                  <Text style={textos.cuerpo}>Todavía no tienes pacientes asignados.</Text>
                ) : visibles.length === 0 ? (
                  <Text style={textos.cuerpo}>Ningún paciente coincide con la búsqueda.</Text>
                ) : (
                  <View style={estilos.tarjetas}>
                    {visibles.map((p) => (
                      <TarjetaPacienteListado
                        key={p.id}
                        paciente={p}
                        seleccionado={p.id === seleccionado}
                        onPress={() => seleccionar(p.id)}
                        detalle={textoUltimaActividad(p.ultimaActividad)}
                        progreso={p.progresoSemanal}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Ficha */}
          <View style={estilos.flex}>
            {cargandoFicha && !ficha ? (
              <View style={estilos.fichaVacia}>
                <ActivityIndicator size="large" color={colores.amarillo} />
              </View>
            ) : errorFicha ? (
              <View style={estilos.fichaVacia}>
                <Text style={textos.cuerpo}>{errorFicha}</Text>
              </View>
            ) : ficha ? (
              <FichaPaciente
                key={ficha.datos.id}
                ficha={ficha}
                soloLectura={archivadoElegido ? { traspasadoA: archivadoElegido.traspasadoA, fecha: archivadoElegido.fecha } : null}
                modulos={modulos}
                modulosAsignados={asignados}
                moduloCambiando={moduloCambiando}
                avisoModulos={avisoModulos}
                onEditar={() => setVentana('editar')}
                onVerTodasLasNotas={() => setVentana('notas')}
                onAsignarPractica={() => router.replace('/terapeuta/practicas')}
                onCambiarModulo={cambiarModulo}
              />
            ) : !cargandoLista && (enArchivados ? archivados.length > 0 : lista.length > 0) ? (
              <View style={estilos.fichaVacia}>
                <Text style={textos.cuerpo}>Elige un paciente para ver su ficha.</Text>
              </View>
            ) : null}
          </View>
        </View>
      )}

      {ficha ? (
        <>
          {terapeutaActual ? (
            <EditarPaciente
              visible={ventana === 'editar'}
              datos={ficha.datos}
              terapeutaId={terapeutaActual}
              onCerrar={() => setVentana(null)}
              onGuardado={alGuardarDatos}
              onTraspasado={alTraspasar}
            />
          ) : null}
          <NotasDelPaciente
            visible={ventana === 'notas'}
            nombre={[ficha.datos.nombreNino, ficha.datos.apellidos].filter(Boolean).join(' ')}
            notas={ficha.notas}
            onCerrar={() => setVentana(null)}
          />
        </>
      ) : null}
      {terapeutaActual ? (
        <InvitarPaciente
          visible={ventana === 'invitar'}
          terapeutaId={terapeutaActual}
          onCerrar={() => setVentana(null)}
          onCreado={(nuevo) => {
            setVentana(null);
            setElegidos((e) => ({ ...e, principales: nuevo.id }));
            alCambiarDatos(); // recarga el listado aquí y los datos de las demás pestañas
          }}
        />
      ) : null}
    </PantallaTerapeuta>
  );
}

const FiltroAdorno = ({ icono, texto }: { icono: ImageSource; texto: string }) => (
  <View style={[estilos.filtro, estilos.flex]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Image source={icono} style={estilos.icono24} contentFit="contain" />
    <Text style={textos.cuerpo}>{texto}</Text>
  </View>
);

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  cabecera: { gap: 24, marginBottom: 40 },
  introduccion: { flexDirection: 'row', alignItems: 'flex-end', gap: 40, flexWrap: 'wrap' },
  subtitulo: { paddingBottom: 10 },
  filtros: { flexDirection: 'row', gap: 24 },
  filtro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colores.gris,
    backgroundColor: colores.blanco,
  },
  buscador: { width: 538, maxWidth: '40%' },
  campoBusqueda: { paddingVertical: 14 },
  icono20: { width: 20, height: 20 },
  icono24: { width: 24, height: 24 },
  columnas: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  listado: { width: 437, gap: 24 },
  bloqueListado: { gap: 24 },
  tarjetas: { gap: 16 },
  avisoTraspaso: { padding: 16, borderRadius: 12, backgroundColor: colores.amarilloSuave },
  fichaVacia: { padding: 40, borderRadius: 24, backgroundColor: colores.blanco, alignItems: 'center' },
});
