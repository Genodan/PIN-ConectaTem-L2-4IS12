import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { obtenerTodosLosPacientes } from '../../services/tareasService';
import {
  PracticaFamilia,
  obtenerPracticasDelPaciente,
  textoEstado,
} from '../../services/panelFamiliaService';
import { FeedbackDePractica } from '../../components/FeedbackDePractica';
import { CalendarioMes, MarcaDia } from '../../components/CalendarioFechas';
import {
  TipoHito,
  hitosPorDia,
  marcasPorDia,
  rangoDeHitos,
} from '../../services/hitosCalendarioService';
import { aTextoISO, formatearFecha, inicioDelDia, textoLargoDeFecha } from '../../services/calendarioService';
import { insigniasPorDia } from '../../services/rachaService';

// UT 1404 · Calendario de hitos (familia): los días en que el paciente alcanzó un hito
// (práctica «Con feedback») o envió una práctica que espera feedback.

const COLOR_MARCA: Record<TipoHito, string> = {
  feedback: '#2e9e4f',
  enviada: '#1f78d1',
};
// UT 1449: día en que la familia consiguió una insignia
const COLOR_INSIGNIA = '#d4a017';

export default function CalendarioHitosScreen() {
  const params = useLocalSearchParams<{ pacienteId?: string }>();

  const [nombreNino, setNombreNino] = useState<string | null>(null);
  const [pacienteActual, setPacienteActual] = useState<string | null>(params.pacienteId || null);
  const [practicas, setPracticas] = useState<PracticaFamilia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [diaElegido, setDiaElegido] = useState<Date | null>(null);

  const hoy = useMemo(() => inicioDelDia(new Date()), []);

  // Paciente: el que llega por parámetro o, si no, el primero (simulación de sesión, como en «Buscar feedbacks»)
  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const pacientes = await obtenerTodosLosPacientes();
        if (!vigente) return;
        const actual = (pacientes ?? []).find((p: any) => p.id === pacienteActual) ?? (pacienteActual ? null : pacientes?.[0]);
        if (actual) {
          setNombreNino(actual.nombre_nino ?? null);
          if (!pacienteActual) setPacienteActual(actual.id);
        } else if (!pacienteActual) {
          setCargando(false);
        }
      } catch (e) {
        console.error('Error al cargar pacientes:', e);
        if (vigente) {
          setError(true);
          setCargando(false);
        }
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    if (!pacienteActual) return;
    let vigente = true;
    (async () => {
      setCargando(true);
      setError(false);
      try {
        const datos = await obtenerPracticasDelPaciente(pacienteActual);
        if (vigente) setPracticas(datos ?? []);
      } catch (e) {
        console.error('Error al cargar prácticas:', e);
        if (vigente) setError(true);
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [pacienteActual]);

  const porDia = useMemo(() => hitosPorDia(practicas), [practicas]);
  const rango = useMemo(() => rangoDeHitos(porDia), [porDia]);
  const insignias = useMemo(() => insigniasPorDia(practicas), [practicas]);

  const marcas = useMemo(() => {
    const resultado: Record<string, MarcaDia[]> = {};
    for (const [dia, tipos] of Object.entries(marcasPorDia(porDia))) {
      resultado[dia] = tipos.map((tipo) => ({ id: tipo, color: COLOR_MARCA[tipo] }));
    }
    for (const dia of insignias.keys()) {
      resultado[dia] = [...(resultado[dia] ?? []), { id: 'insignia', color: COLOR_INSIGNIA }];
    }
    return resultado;
  }, [porDia, insignias]);

  // No se navega a meses posteriores al actual ni anteriores al de la primera práctica o insignia
  const min = useMemo(() => {
    const diasInsignia = [...insignias.keys()].map((clave) => {
      const [anio, mes, dia] = clave.split('-').map(Number);
      return new Date(anio, mes - 1, dia).getTime();
    });
    const primero = new Date(Math.min((rango?.primero ?? hoy).getTime(), ...diasInsignia));
    return new Date(primero.getFullYear(), primero.getMonth(), 1);
  }, [rango, hoy, insignias]);
  const max = rango && rango.ultimo.getTime() > hoy.getTime() ? rango.ultimo : hoy;

  const hitosDelDia = diaElegido ? porDia.get(aTextoISO(diaElegido)) ?? [] : [];
  const insigniasDelDia = diaElegido ? insignias.get(aTextoISO(diaElegido)) ?? [] : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.cabecera}>
        <Text style={styles.tituloPrincipal}>Calendario de hitos</Text>
        <Text style={styles.subtitulo}>
          {nombreNino ? `Hitos del paciente: ${nombreNino}` : 'Consulta los hitos del paciente'}
        </Text>
      </View>

      {cargando ? (
        <ActivityIndicator size="large" color="#0050b3" style={{ marginVertical: 20 }} />
      ) : error ? (
        <View style={styles.tarjetaVacia}>
          <Text style={styles.textoVacio}>No se han podido cargar las prácticas. Inténtalo de nuevo.</Text>
        </View>
      ) : (
        <>
          <CalendarioMes
            key={pacienteActual ?? 'sin-paciente'}
            testID="calendario-hitos"
            valor={diaElegido}
            min={min}
            max={max}
            mesInicial={hoy}
            marcas={marcas}
            onElegir={setDiaElegido}
          />

          <View style={styles.leyenda}>
            <View style={styles.itemLeyenda}>
              <View style={[styles.puntoLeyenda, { backgroundColor: COLOR_MARCA.feedback }]} />
              <Text style={styles.textoLeyenda}>Con feedback (hito alcanzado)</Text>
            </View>
            <View style={styles.itemLeyenda}>
              <View style={[styles.puntoLeyenda, { backgroundColor: COLOR_MARCA.enviada }]} />
              <Text style={styles.textoLeyenda}>Enviada, a la espera de feedback</Text>
            </View>
            <View style={styles.itemLeyenda}>
              <View style={[styles.puntoLeyenda, { backgroundColor: COLOR_INSIGNIA }]} />
              <Text style={styles.textoLeyenda}>Insignia conseguida</Text>
            </View>
          </View>

          {porDia.size === 0 ? (
            <View style={styles.tarjetaVacia}>
              <Text testID="texto-sin-hitos" style={styles.textoVacio}>
                Todavía no hay hitos ni prácticas enviadas para este paciente.
              </Text>
            </View>
          ) : diaElegido === null ? (
            <Text style={styles.textoAyuda}>Pulsa un día marcado para ver sus prácticas.</Text>
          ) : (
            <View testID="practicas-del-dia">
              <Text style={styles.tituloDia}>{`Prácticas del ${textoLargoDeFecha(diaElegido)}`}</Text>
              {/* UT 1449: insignias conseguidas ese día */}
              {insigniasDelDia.map((insignia) => (
                <View key={insignia.clave} style={styles.tarjetaInsignia} testID="tarjeta-dia-insignia">
                  <Text style={styles.tituloInsignia}>{`Insignia conseguida: ${insignia.titulo}`}</Text>
                  <Text style={styles.descripcionInsignia}>{insignia.descripcion}</Text>
                </View>
              ))}
              {hitosDelDia.length === 0 && insigniasDelDia.length > 0 ? null : hitosDelDia.length === 0 ? (
                <View style={styles.tarjetaVacia}>
                  <Text testID="texto-dia-sin-practicas" style={styles.textoVacio}>
                    Este día no hay prácticas.
                  </Text>
                </View>
              ) : (
                hitosDelDia.map(({ practica, tipo, fecha }) => (
                  <View key={practica.id} style={styles.tarjetaPractica} testID="tarjeta-dia-practica">
                    <View style={styles.cabeceraPractica}>
                      <Text style={styles.tituloModulo}>
                        Módulo: {practica.modulos?.titulo || 'Módulo asignado'}
                      </Text>
                      <Text style={[styles.badge, tipo === 'feedback' ? styles.badgeFeedback : styles.badgeEnviada]}>
                        {textoEstado(practica.estado)}
                      </Text>
                    </View>
                    <Text style={styles.fechaHito}>
                      {tipo === 'feedback' ? 'Evaluado el ' : 'Enviada el '}
                      {formatearFecha(fecha)}
                    </Text>
                    {tipo === 'feedback' && practica.feedback && (
                      <FeedbackDePractica feedback={practica.feedback} />
                    )}
                  </View>
                ))
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  contentContainer: { padding: 16, paddingBottom: 40 },
  cabecera: { marginBottom: 8 },
  tituloPrincipal: { fontSize: 22, fontWeight: 'bold', color: '#1F5C8C', marginBottom: 4 },
  subtitulo: { fontSize: 14, color: '#666' },
  leyenda: { marginTop: 12, marginBottom: 16, gap: 6, alignSelf: 'center' },
  itemLeyenda: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  puntoLeyenda: { width: 10, height: 10, borderRadius: 5 },
  textoLeyenda: { fontSize: 12, color: '#555' },
  textoAyuda: { fontSize: 13, color: '#777', textAlign: 'center', fontStyle: 'italic' },
  tituloDia: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  tarjetaVacia: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textoVacio: { fontSize: 14, color: '#777', textAlign: 'center', fontStyle: 'italic' },
  tarjetaPractica: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
  },
  cabeceraPractica: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 6,
  },
  tituloModulo: { fontSize: 15, fontWeight: 'bold', color: '#1F5C8C' },
  badge: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeFeedback: { color: '#1b6b36', backgroundColor: '#e3f5e8' },
  badgeEnviada: { color: '#0050b3', backgroundColor: '#e6f7ff' },
  fechaHito: { fontSize: 12, color: '#666', marginBottom: 8 },
  tarjetaInsignia: {
    backgroundColor: '#fffbe6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ffe58f',
  },
  tituloInsignia: { fontSize: 14, fontWeight: 'bold', color: '#874d00' },
  descripcionInsignia: { fontSize: 12, color: '#666', marginTop: 2 },
});
