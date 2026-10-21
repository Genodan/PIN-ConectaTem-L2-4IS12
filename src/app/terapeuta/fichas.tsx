import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ElementoLista, MaestroDetalle } from '../../components/estructura';
import { FichaPaciente, FichaPacienteBd, InvitarFamilia } from '../../components/terapeuta/FichaPaciente';
import { PestanasTerapeuta } from '../../components/terapeuta/PestanasTerapeuta';
import { Avatar, EstadoVacio } from '../../components/ui';
import { Paciente, PACIENTES } from '../../datos/prototipo';
import {
  darDeAltaPaciente,
  obtenerMisPacientes,
  obtenerOtrasTerapeutas,
  PacienteBd,
  Terapeuta,
  transferirPaciente,
} from '../../services/fichasService';
import { useSesion } from '../../sesion';
import { colores, fuentes, radios } from '../../tema';

// Elemento de la lista: paciente real de Supabase o, en modo demo, del prototipo
type Elemento =
  | { clave: string; nombre: string; detalle: string; tipo: 'bd'; paciente: PacienteBd }
  | { clave: string; nombre: string; detalle: string; tipo: 'demo'; paciente: Paciente };

// Fichas de los pacientes de la terapeuta, alta de pacientes nuevos y transferencia a otra terapeuta
export default function Fichas() {
  const { usuario, modoDemo } = useSesion();
  const [mios, setMios] = useState<PacienteBd[]>([]);
  const [terapeutas, setTerapeutas] = useState<Terapeuta[]>([]);
  const [pacientesDemo, setPacientesDemo] = useState(PACIENTES);
  const [error, setError] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [invitando, setInvitando] = useState(false);

  const terapeutaId = usuario?.id;

  const leer = useCallback(async () => {
    if (modoDemo || !terapeutaId) return null;
    return Promise.all([obtenerMisPacientes(terapeutaId), obtenerOtrasTerapeutas()]);
  }, [modoDemo, terapeutaId]);

  const cargar = useCallback(async () => {
    try {
      const datos = await leer();
      if (!datos) return;
      setMios(datos[0]);
      setTerapeutas(datos[1]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar tus pacientes.');
    }
  }, [leer]);

  // Carga inicial. Se ignora la respuesta si la pantalla se cierra antes de que llegue.
  useEffect(() => {
    let activa = true;
    leer()
      .then((datos) => {
        if (!activa || !datos) return;
        setMios(datos[0]);
        setTerapeutas(datos[1]);
      })
      .catch((e) => activa && setError(e instanceof Error ? e.message : 'No se pudieron cargar tus pacientes.'));
    return () => {
      activa = false;
    };
  }, [leer]);

  // Da de alta al paciente (queda asignado a esta terapeuta) y refresca la lista
  const alta = async (nombreNino: string, nombreFamilia: string) => {
    const codigo = await darDeAltaPaciente(nombreNino, nombreFamilia);
    await cargar();
    return codigo;
  };

  // El paciente pasa a otra terapeuta y desaparece de esta lista
  const transferir = async (pacienteId: string, terapeutaId: string) => {
    await transferirPaciente(pacienteId, terapeutaId);
    setSeleccionado(null);
    await cargar();
  };

  const elementos: Elemento[] = modoDemo
    ? pacientesDemo.map((p) => ({ clave: String(p.id), nombre: `${p.nombre} ${p.apellidos}`, detalle: p.diagnostico, tipo: 'demo', paciente: p }))
    : mios.map((p) => ({
        clave: `mio-${p.id}`,
        nombre: p.nombre_nino,
        detalle: p.familia_id ? `Familia: ${p.nombre_familia}` : `Familia: ${p.nombre_familia} · pendiente de registro`,
        tipo: 'bd',
        paciente: p,
      }));
  const elegido = elementos.find((e) => e.clave === seleccionado) ?? null;

  const actualizarDemo = (id: number, cambios: Partial<Paciente>) =>
    setPacientesDemo((prev) => prev.map((p) => (p.id === id ? { ...p, ...cambios } : p)));

  const fila = (e: Elemento) => (
    <ElementoLista
      key={e.clave}
      seleccionado={e.clave === seleccionado}
      onPress={() => {
        setSeleccionado(e.clave);
        setInvitando(false);
      }}
    >
      <View style={styles.fila}>
        <Avatar texto={e.nombre.charAt(0).toUpperCase()} />
        <View style={styles.flex1}>
          <Text style={styles.nombre}>{e.nombre}</Text>
          <Text style={styles.detalle} numberOfLines={1}>
            {e.detalle}
          </Text>
        </View>
        <Text style={styles.flecha}>›</Text>
      </View>
    </ElementoLista>
  );

  return (
    <MaestroDetalle
      cabeceraLista={<PestanasTerapeuta activa="fichas" />}
      mostrandoDetalle={invitando || elegido !== null}
      onVolver={() => {
        setInvitando(false);
        setSeleccionado(null);
      }}
      textoVolver="← Volver a las fichas"
      lista={
        <>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setInvitando(true);
              setSeleccionado(null);
            }}
            style={styles.invitar}
          >
            <Text style={styles.textoInvitar}>＋ Invitar nueva familia</Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!error && elementos.length === 0 ? (
            <Text style={styles.vacio}>Todavía no tienes pacientes. Da de alta al primero con “Invitar nueva familia”.</Text>
          ) : null}
          {elementos.map(fila)}
        </>
      }
      detalle={
        invitando ? (
          <InvitarFamilia onAlta={modoDemo ? undefined : alta} />
        ) : elegido?.tipo === 'bd' ? (
          <FichaPacienteBd
            key={elegido.clave}
            paciente={elegido.paciente}
            terapeutas={terapeutas}
            onTransferir={(terapeutaId) => transferir(elegido.paciente.id, terapeutaId)}
          />
        ) : elegido?.tipo === 'demo' ? (
          <FichaPaciente key={elegido.clave} paciente={elegido.paciente} onGuardar={(c) => actualizarDemo(elegido.paciente.id, c)} />
        ) : (
          <EstadoVacio icono="🗂️" texto="Selecciona un paciente para ver su ficha." />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  invitar: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colores.primario,
    backgroundColor: colores.primarioSuave,
    borderRadius: radios.medio,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  textoInvitar: { fontFamily: fuentes.tituloMedio, fontSize: 12, color: colores.primarioOscuro },
  nombre: { fontFamily: fuentes.titulo, fontSize: 14, color: colores.texto },
  detalle: { fontFamily: fuentes.texto, fontSize: 12, color: colores.textoApagado },
  flecha: { fontSize: 18, color: colores.borde },
  error: { fontFamily: fuentes.texto, fontSize: 12, color: '#B91C1C', padding: 8 },
  vacio: { fontFamily: fuentes.texto, fontSize: 12, lineHeight: 18, color: colores.textoApagado, padding: 8 },
});
