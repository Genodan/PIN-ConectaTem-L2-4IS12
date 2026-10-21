import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MODULOS, Paciente } from '../../datos/prototipo';
import { PacienteBd, Terapeuta } from '../../services/fichasService';
import { colores, fuentes, radios } from '../../tema';
import { Contenido, useEsAncho } from '../estructura';
import { Avatar, Boton, Campo, CampoLectura, Chip, Etiqueta, Rejilla, Tarjeta, Titulo, TituloTarjeta } from '../ui';

const SEXOS = ['Niño', 'Niña', 'Prefiero no indicar'];

// Ficha editable de un paciente (solo la terapeuta puede cambiar estos datos)
export function FichaPaciente({ paciente, onGuardar }: { paciente: Paciente; onGuardar: (cambios: Partial<Paciente>) => void }) {
  const ancho = useEsAncho();
  const [nombre, setNombre] = useState(paciente.nombre);
  const [apellidos, setApellidos] = useState(paciente.apellidos);
  const [fechaNacimiento, setFechaNacimiento] = useState(paciente.fechaNacimiento);
  const [sexo, setSexo] = useState(paciente.sexo);
  const [diagnostico, setDiagnostico] = useState(paciente.diagnostico);
  const [hitos, setHitos] = useState<number[]>(paciente.hitosAsignados);
  const [guardado, setGuardado] = useState(true);

  // Envuelve cada setter para marcar que hay cambios sin guardar
  const cambiar = <T,>(setter: (v: T) => void) => (valor: T) => {
    setter(valor);
    setGuardado(false);
  };

  const alternarHito = (id: number) => {
    setHitos((prev) => (prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]));
    setGuardado(false);
  };

  const guardar = () => {
    onGuardar({ nombre, apellidos, fechaNacimiento, sexo, diagnostico, hitosAsignados: hitos });
    setGuardado(true);
  };

  return (
    <Contenido maxAncho={900}>
      <View style={styles.cabecera}>
        <Avatar texto={paciente.avatar} tamano={56} />
        <View>
          <Titulo>
            {paciente.nombre} {paciente.apellidos}
          </Titulo>
          <Text style={styles.subtitulo}>Solo el terapeuta puede editar estos datos.</Text>
        </View>
      </View>

      <Rejilla ancho={ancho}>
        <Tarjeta>
          <TituloTarjeta>Datos personales</TituloTarjeta>
          <View style={styles.fila}>
            <Campo etiqueta="Nombre" value={nombre} onChangeText={cambiar(setNombre)} />
            <Campo etiqueta="Apellidos" value={apellidos} onChangeText={cambiar(setApellidos)} />
          </View>
          <Campo etiqueta="Fecha de nacimiento" value={fechaNacimiento} onChangeText={cambiar(setFechaNacimiento)} placeholder="AAAA-MM-DD" />
          <View>
            <Etiqueta>Sexo</Etiqueta>
            <View style={styles.chips}>
              {SEXOS.map((s) => (
                <Chip key={s} texto={s} seleccionado={sexo === s} onPress={() => cambiar(setSexo)(s)} />
              ))}
            </View>
          </View>
        </Tarjeta>

        <Tarjeta>
          <TituloTarjeta>Información clínica</TituloTarjeta>
          <Campo etiqueta="Diagnóstico / motivo de consulta" value={diagnostico} onChangeText={cambiar(setDiagnostico)} />
          <View>
            <Etiqueta>Hitos asignados</Etiqueta>
            <View style={styles.chips}>
              {MODULOS.map((m) => (
                <Chip key={m.id} texto={`${m.emoji} ${m.titulo}`} seleccionado={hitos.includes(m.id)} onPress={() => alternarHito(m.id)} />
              ))}
            </View>
          </View>
        </Tarjeta>
      </Rejilla>

      {paciente.observacionesFamilia ? (
        <View style={styles.observaciones}>
          <TituloTarjeta color={colores.avisoTextoOscuro}>Observaciones de la familia</TituloTarjeta>
          <Text style={styles.soloLectura}>Solo lectura — lo escribe la familia desde su perfil.</Text>
          <Text style={styles.textoObservaciones}>“{paciente.observacionesFamilia}”</Text>
        </View>
      ) : null}

      <Boton titulo={guardado ? '✓ Cambios guardados' : 'Guardar cambios'} onPress={guardar} estilo={styles.guardar} />
    </Contenido>
  );
}

// Alta de un paciente nuevo: queda asignado a la terapeuta y se genera el código
// de invitación que la familia usa al registrarse. Sin onAlta (modo demo) el código es de ejemplo.
export function InvitarFamilia({ onAlta }: { onAlta?: (nombreNino: string, nombreFamilia: string) => Promise<string> }) {
  const ancho = useEsAncho();
  const [nombreNino, setNombreNino] = useState(onAlta ? '' : 'Leo');
  const [nombreFamilia, setNombreFamilia] = useState('');
  const [codigo, setCodigo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const generar = async () => {
    setError(null);
    if (!onAlta) return setCodigo('CT-LEO-7K4P');
    setGenerando(true);
    try {
      setCodigo(await onAlta(nombreNino, nombreFamilia));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo dar de alta al paciente.');
    } finally {
      setGenerando(false);
    }
  };

  const otraFamilia = () => {
    setCodigo(null);
    setNombreNino('');
    setNombreFamilia('');
    setCopiado(false);
  };

  return (
    <Contenido maxAncho={900}>
      <View style={styles.cabecera}>
        <View style={styles.iconoInvitar}>
          <Text style={{ fontSize: 20, color: colores.primario }}>＋</Text>
        </View>
        <View style={styles.flex1}>
          <Titulo>Invitar nueva familia</Titulo>
          <Text style={styles.subtitulo}>Da de alta al paciente: quedará asignado a ti y solo tú verás su ficha.</Text>
        </View>
      </View>

      <Rejilla ancho={ancho}>
        <Tarjeta>
          <View>
            <Text style={styles.tituloPaso}>1. Identifica al paciente</Text>
            <Text style={styles.ayuda}>La familia completará el resto de datos al registrarse.</Text>
          </View>
          <Campo etiqueta="Nombre del niño/a" value={nombreNino} onChangeText={setNombreNino} editable={!codigo} placeholder="Ej. Hugo" />
          <Campo etiqueta="Nombre de la familia" value={nombreFamilia} onChangeText={setNombreFamilia} editable={!codigo} placeholder="Ej. Marta Sanchis" />
          {error ? (
            <View accessibilityRole="alert" style={styles.error}>
              <Text style={styles.textoError}>{error}</Text>
            </View>
          ) : null}
          {codigo ? (
            <Boton titulo="＋ Dar de alta otra familia" variante="suave" onPress={otraFamilia} />
          ) : (
            <Boton titulo={generando ? 'Generando…' : 'Generar invitación segura'} deshabilitado={generando} onPress={generar} />
          )}
        </Tarjeta>

        <View style={[styles.resultado, codigo ? styles.resultadoListo : null]}>
          {codigo ? (
            <View>
              <View style={styles.check}>
                <Text style={{ fontSize: 20, color: colores.primario }}>✓</Text>
              </View>
              <Text style={styles.tituloListo}>Invitación lista</Text>
              <Text style={[styles.ayuda, { marginBottom: 20 }]}>
                Comparte este código con la familia de {nombreNino || 'tu paciente'}. Caduca en 7 días y solo puede usarse una vez.
              </Text>
              <View style={styles.codigo}>
                <View>
                  <Text style={styles.etiquetaCodigo}>CÓDIGO DE INVITACIÓN</Text>
                  <Text style={styles.textoCodigo}>{codigo}</Text>
                </View>
                <Boton titulo={copiado ? 'Copiado' : 'Copiar'} variante="suave" pequeno onPress={() => setCopiado(true)} />
              </View>
              <Text style={[styles.ayuda, { color: colores.primarioOscuro, marginTop: 16 }]}>
                🔒 {nombreNino || 'El paciente'} ya aparece en tus fichas. Cuando la familia se registre con el código, quedará vinculada a ti.
              </Text>
            </View>
          ) : (
            <View style={styles.centro}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>🔗</Text>
              <Text style={styles.tituloPaso}>Aquí aparecerá el código</Text>
              <Text style={styles.ayuda}>Todavía no se ha generado ninguna invitación.</Text>
            </View>
          )}
        </View>
      </Rejilla>
    </Contenido>
  );
}

// Ficha de un paciente guardado en Supabase. La tabla pacientes aún solo tiene
// nombre del niño y de la familia; los datos clínicos del prototipo llegarán con su UT.
export function FichaPacienteBd({
  paciente,
  terapeutas,
  onTransferir,
}: {
  paciente: PacienteBd;
  terapeutas: Terapeuta[];
  onTransferir: (terapeutaId: string) => Promise<void>;
}) {
  const vinculada = paciente.familia_id !== null;
  const alta = paciente.fecha_registro ? new Date(paciente.fecha_registro).toLocaleDateString('es-ES') : '—';
  return (
    <Contenido maxAncho={900}>
      <View style={styles.cabecera}>
        <Avatar texto={paciente.nombre_nino.charAt(0).toUpperCase()} tamano={56} />
        <View style={styles.flex1}>
          <Titulo>{paciente.nombre_nino}</Titulo>
          <Text style={styles.subtitulo}>Familia: {paciente.nombre_familia}</Text>
        </View>
      </View>
      <Tarjeta>
        <TituloTarjeta>Estado</TituloTarjeta>
        <View style={styles.fila}>
          <CampoLectura etiqueta="Fecha de alta" valor={alta} />
          <CampoLectura etiqueta="Familia" valor={vinculada ? 'Registrada y vinculada' : 'Pendiente de registrarse con el código'} />
        </View>
        <Text style={styles.ayuda}>Los datos clínicos (diagnóstico, hitos…) se añadirán cuando la tabla pacientes los tenga.</Text>
      </Tarjeta>
      <Transferir nombre={paciente.nombre_nino} terapeutas={terapeutas} onTransferir={onTransferir} />
    </Contenido>
  );
}

// Pasar el paciente a otra terapeuta (baja, cambio de centro...). Pide confirmación antes.
function Transferir({
  nombre,
  terapeutas,
  onTransferir,
}: {
  nombre: string;
  terapeutas: Terapeuta[];
  onTransferir: (terapeutaId: string) => Promise<void>;
}) {
  const [destinoId, setDestinoId] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [transfiriendo, setTransfiriendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const destino = terapeutas.find((t) => t.id === destinoId);

  const transferir = async () => {
    if (!destinoId) return;
    setError(null);
    setTransfiriendo(true);
    try {
      await onTransferir(destinoId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo transferir al paciente.');
      setTransfiriendo(false);
    }
  };

  return (
    <Tarjeta estilo={styles.transferir}>
      <TituloTarjeta>Cambio de terapeuta</TituloTarjeta>
      <Text style={styles.ayuda}>
        Si dejas el centro o vas a estar de baja, pasa a {nombre} a otra terapeuta. Ella verá su ficha y todo su historial; tú
        dejarás de verlo.
      </Text>
      {terapeutas.length === 0 ? (
        <Text style={styles.ayuda}>No hay otras terapeutas en la app.</Text>
      ) : (
        <View>
          <Etiqueta>Nueva terapeuta</Etiqueta>
          <View style={styles.chips}>
            {terapeutas.map((t) => (
              <Chip
                key={t.id}
                texto={t.nombre}
                seleccionado={destinoId === t.id}
                onPress={() => {
                  setDestinoId(t.id);
                  setConfirmando(false);
                }}
              />
            ))}
          </View>
        </View>
      )}
      {error ? (
        <View accessibilityRole="alert" style={styles.error}>
          <Text style={styles.textoError}>{error}</Text>
        </View>
      ) : null}
      {confirmando && destino ? (
        <View style={styles.confirmacion}>
          <Text style={styles.textoConfirmacion}>
            ¿Pasar a {nombre} a {destino.nombre}?
          </Text>
          <View style={styles.fila}>
            <Boton titulo={transfiriendo ? 'Transfiriendo…' : 'Sí, transferir'} deshabilitado={transfiriendo} onPress={transferir} />
            <Boton titulo="Cancelar" variante="contorno" deshabilitado={transfiriendo} onPress={() => setConfirmando(false)} />
          </View>
        </View>
      ) : (
        <Boton titulo="Transferir paciente" variante="contorno" deshabilitado={!destino} onPress={() => setConfirmando(true)} estilo={styles.botonIzquierda} />
      )}
    </Tarjeta>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  fila: { flexDirection: 'row', gap: 12 },
  centro: { alignItems: 'center' },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  subtitulo: { fontFamily: fuentes.texto, fontSize: 14, color: colores.textoApagado },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  observaciones: { marginTop: 20, backgroundColor: colores.avisoFondo, borderWidth: 1, borderColor: colores.avisoBorde, borderRadius: radios.grande, padding: 20, gap: 6 },
  soloLectura: { fontFamily: fuentes.texto, fontSize: 12, color: colores.textoTenue },
  textoObservaciones: { fontFamily: fuentes.texto, fontSize: 14, lineHeight: 20, color: colores.avisoTextoOscuro, marginTop: 8 },
  guardar: { marginTop: 20, alignSelf: 'flex-start' },
  iconoInvitar: { width: 44, height: 44, borderRadius: radios.medio, backgroundColor: colores.primarioSuave, alignItems: 'center', justifyContent: 'center' },
  tituloPaso: { fontFamily: fuentes.titulo, fontSize: 14, color: colores.texto },
  ayuda: { fontFamily: fuentes.texto, fontSize: 12, lineHeight: 18, color: colores.textoApagado, marginTop: 4 },
  resultado: { flex: 1, minHeight: 240, borderRadius: radios.grande, borderWidth: 1, borderColor: colores.borde, backgroundColor: colores.campoLectura, padding: 20, justifyContent: 'center' },
  resultadoListo: { backgroundColor: colores.primarioSuave, borderColor: colores.primario },
  check: { width: 48, height: 48, borderRadius: 24, backgroundColor: colores.blanco, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  tituloListo: { fontFamily: fuentes.titulo, fontSize: 18, color: colores.texto },
  codigo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: colores.blanco,
    borderWidth: 1,
    borderColor: colores.primarioBorde,
    borderRadius: radios.medio,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  etiquetaCodigo: { fontFamily: fuentes.textoFuerte, fontSize: 10, letterSpacing: 0.5, color: colores.textoApagado },
  textoCodigo: { fontFamily: fuentes.tituloFuerte, fontSize: 18, letterSpacing: 3, color: colores.primarioOscuro },
  error: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: radios.medio, paddingHorizontal: 14, paddingVertical: 10 },
  textoError: { fontFamily: fuentes.texto, fontSize: 13, color: '#B91C1C' },
  transferir: { marginTop: 20 },
  confirmacion: { backgroundColor: colores.avisoFondo, borderWidth: 1, borderColor: colores.avisoBorde, borderRadius: radios.medio, padding: 14, gap: 12 },
  textoConfirmacion: { fontFamily: fuentes.textoFuerte, fontSize: 14, color: colores.avisoTextoOscuro },
  botonIzquierda: { alignSelf: 'flex-start' },
});
