import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { PantallaTerapeuta } from '../../components/kairos/PantallaTerapeuta';
import {
  CabeceraSeccion,
  CalendarioInicio,
  Indicadores,
  NotasRapidas,
  SesionesDeHoy,
  TarjetaEvidencia,
  TarjetaPaciente,
} from '../../components/kairos/BloquesInicioTerapeuta';
import { NotasDelDia } from '../../components/kairos/NotasDelDia';
import { useSesionTerapeuta } from '../../sesion/SesionTerapeuta';
import {
  EvidenciaPorRevisar,
  PacienteConProgreso,
  fechaDeHoy,
  obtenerEvidenciasPorRevisar,
  obtenerPacientesConProgreso,
} from '../../services/inicioTerapeutaService';
import { NotaDeSesion, SesionDelDia, obtenerSesionesDelDia } from '../../services/notasSesionService';
import { inicioDelDia } from '../../services/calendarioService';
import { colores, textos } from '../../tema/kairos';

// Nueva interfaz (KAIRÓS) · Inicio de la terapeuta (Figma: «INICIO - TERAPEUTA», versión de escritorio).
// Lo que antes estaba en esta pantalla está ahora en las pestañas Pacientes, Prácticas y Evidencias.
const MAXIMO_POR_LISTA = 4;
const textoDeError = (e: unknown) => (e instanceof Error ? e.message : 'Error desconocido');

export default function InicioTerapeuta() {
  const router = useRouter();
  const { terapeutas, terapeutaActual, nombreActual, cargando, elegirTerapeuta } = useSesionTerapeuta();

  const [evidencias, setEvidencias] = useState<EvidenciaPorRevisar[]>([]);
  const [pacientes, setPacientes] = useState<PacienteConProgreso[]>([]);
  const [errores, setErrores] = useState<{ evidencias?: string; pacientes?: string }>({});
  const [cargandoDatos, setCargandoDatos] = useState(false);

  // Día elegido en el calendario: decide qué notas se ven en «Notas rápidas» y en la ventana «Notas del día»
  const [diaElegido, setDiaElegido] = useState(() => inicioDelDia(new Date()));
  const [sesionesDia, setSesionesDia] = useState<SesionDelDia[]>([]);
  const [errorSesiones, setErrorSesiones] = useState<string | null>(null);
  const [cargandoSesiones, setCargandoSesiones] = useState(false);
  const [notasAbiertas, setNotasAbiertas] = useState(false);

  // «Sesiones de hoy» (bloque y contador): siempre las de hoy, sea cual sea el día elegido
  const [sesionesHoy, setSesionesHoy] = useState<SesionDelDia[]>([]);
  const [errorSesionesHoy, setErrorSesionesHoy] = useState<string | null>(null);

  // Cada bloque se carga por separado: si falla uno, los demás se siguen viendo
  useEffect(() => {
    if (!terapeutaActual) return;
    let activo = true;
    setCargandoDatos(true);
    (async () => {
      const [ev, pa] = await Promise.allSettled([
        obtenerEvidenciasPorRevisar(terapeutaActual),
        obtenerPacientesConProgreso(terapeutaActual),
      ]);
      if (!activo) return;
      setEvidencias(ev.status === 'fulfilled' ? ev.value : []);
      setPacientes(pa.status === 'fulfilled' ? pa.value : []);
      setErrores({
        evidencias: ev.status === 'rejected' ? textoDeError(ev.reason) : undefined,
        pacientes: pa.status === 'rejected' ? textoDeError(pa.reason) : undefined,
      });
      setCargandoDatos(false);
    })();
    return () => {
      activo = false;
    };
  }, [terapeutaActual]);

  useEffect(() => {
    if (!terapeutaActual) return;
    let activo = true;
    obtenerSesionesDelDia(terapeutaActual, new Date())
      .then((lista) => {
        if (!activo) return;
        setSesionesHoy(lista);
        setErrorSesionesHoy(null);
      })
      .catch((e) => {
        if (!activo) return;
        console.warn(textoDeError(e));
        setSesionesHoy([]);
        setErrorSesionesHoy('No se pudieron cargar las sesiones de hoy.');
      });
    return () => {
      activo = false;
    };
  }, [terapeutaActual]);

  // Sesiones (y sus notas) del día elegido
  const tiempoDia = diaElegido.getTime();
  useEffect(() => {
    if (!terapeutaActual) return;
    let activo = true;
    setCargandoSesiones(true);
    obtenerSesionesDelDia(terapeutaActual, new Date(tiempoDia))
      .then((lista) => {
        if (!activo) return;
        setSesionesDia(lista);
        setErrorSesiones(null);
      })
      .catch((e) => {
        if (!activo) return;
        // Por ejemplo, si aún no se han creado las tablas: aviso legible y detalle en consola
        console.warn(textoDeError(e));
        setSesionesDia([]);
        setErrorSesiones('No se pudieron cargar las notas de este día.');
      })
      .finally(() => activo && setCargandoSesiones(false));
    return () => {
      activo = false;
    };
  }, [terapeutaActual, tiempoDia]);

  const elegirDia = (dia: Date) => setDiaElegido(inicioDelDia(dia));
  const alGuardarNota = (sesionId: string, nota: NotaDeSesion | null) =>
    setSesionesDia((lista) => lista.map((s) => (s.id === sesionId ? { ...s, nota } : s)));

  const primerNombre = nombreActual?.split(' ')[0];

  return (
    <PantallaTerapeuta pestana="inicio">
      {/* «Login» simulado, como hasta ahora: elige quién eres */}
      <View style={styles.loginContainer}>
        <Text style={styles.tituloLogin}>¿Quién eres? (Simulación de Login)</Text>
        {cargando ? (
          <ActivityIndicator size="small" color="#0050b3" />
        ) : terapeutas.length === 0 ? (
          <Text style={styles.textoVacio}>No hay terapeutas. Ve a Supabase y crea al menos uno en la tabla «terapeutas».</Text>
        ) : (
          <View style={styles.pickerContainer}>
            <Picker selectedValue={terapeutaActual} onValueChange={(valor) => valor && elegirTerapeuta(valor)}>
              {terapeutas.map((t) => (
                <Picker.Item key={t.id} label={t.nombre} value={t.id} />
              ))}
            </Picker>
          </View>
        )}
      </View>

      <View style={styles.columnas}>
        {/* Columna principal (8 columnas en Figma) */}
        <View style={styles.principal}>
          <View style={styles.introduccion}>
            <Text style={textos.titulo}>{primerNombre ? `Hola, ${primerNombre}` : 'Hola'}</Text>
            <Text style={textos.cuerpo}>{fechaDeHoy()}</Text>
          </View>

          <View style={styles.bloque}>
            <Text style={textos.tituloSeccion}>Hagamos memoria</Text>
            <Indicadores sesiones={sesionesHoy.length} evidencias={evidencias.length} pacientes={pacientes.length} />
          </View>

          {cargandoDatos ? (
            <ActivityIndicator size="large" color={colores.amarillo} />
          ) : (
            <View style={styles.listas}>
              <View style={styles.listaEvidencias}>
                <CabeceraSeccion titulo="Evidencia por revisar" onVerTodos={() => router.replace('/terapeuta/evidencias')} />
                {errores.evidencias ? (
                  <Text style={textos.cuerpo}>{errores.evidencias}</Text>
                ) : evidencias.length === 0 ? (
                  <Text style={textos.cuerpo}>No hay evidencias por revisar.</Text>
                ) : (
                  evidencias.slice(0, MAXIMO_POR_LISTA).map((e) => (
                    <TarjetaEvidencia key={e.id} evidencia={e} onPress={() => router.replace('/terapeuta/evidencias')} />
                  ))
                )}
              </View>

              <View style={styles.listaPacientes}>
                <CabeceraSeccion titulo="Pacientes activos" onVerTodos={() => router.replace('/terapeuta/pacientes')} />
                {errores.pacientes ? (
                  <Text style={textos.cuerpo}>{errores.pacientes}</Text>
                ) : pacientes.length === 0 ? (
                  <Text style={textos.cuerpo}>Todavía no tienes pacientes asignados.</Text>
                ) : (
                  pacientes.slice(0, MAXIMO_POR_LISTA).map((p, i) => (
                    <TarjetaPaciente key={p.id} paciente={p} indice={i} onVerFicha={() => router.replace('/terapeuta/pacientes')} />
                  ))
                )}
              </View>
            </View>
          )}
        </View>

        {/* Columna lateral (4 columnas): calendario, sesiones y notas rápidas */}
        <View style={styles.lateral}>
          <View style={styles.agenda}>
            <CalendarioInicio diaElegido={diaElegido} onElegirDia={elegirDia} />
            <SesionesDeHoy sesiones={sesionesHoy} error={errorSesionesHoy} />
          </View>
          <NotasRapidas
            dia={diaElegido}
            sesiones={cargandoSesiones ? [] : sesionesDia}
            error={errorSesiones}
            onAmpliar={() => setNotasAbiertas(true)}
          />
        </View>
      </View>

      <NotasDelDia
        visible={notasAbiertas}
        dia={diaElegido}
        sesiones={sesionesDia}
        cargando={cargandoSesiones}
        error={errorSesiones}
        onCambiarDia={elegirDia}
        onCerrar={() => setNotasAbiertas(false)}
        onNotaGuardada={alGuardarNota}
      />
    </PantallaTerapeuta>
  );
}

const styles = StyleSheet.create({
  loginContainer: {
    padding: 16,
    marginBottom: 32,
    backgroundColor: '#e6f7ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#91d5ff',
  },
  tituloLogin: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#0050b3' },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, backgroundColor: '#fff' },
  textoVacio: { fontStyle: 'italic', color: '#666' },
  columnas: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  principal: { flex: 1, gap: 40 },
  introduccion: { gap: 8 },
  bloque: { gap: 24 },
  listas: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  listaEvidencias: { width: 437, gap: 12 },
  listaPacientes: { flex: 1, gap: 12 },
  lateral: { width: 437, gap: 24 },
  agenda: { borderRadius: 32, backgroundColor: colores.amarilloSuave, overflow: 'hidden' },
});
