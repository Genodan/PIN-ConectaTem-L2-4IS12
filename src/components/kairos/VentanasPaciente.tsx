import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colores, textos } from '../../tema/kairos';
import { Aviso, BotonPrincipal, BotonSecundario, CampoTexto, VentanaKairos } from './Comunes';
import {
  CambiosPaciente,
  DatosPaciente,
  NotaDelPaciente,
  TerapeutaResumen,
  actualizarDatosPaciente,
  obtenerOtrasTerapeutas,
  traspasarPaciente,
  fechaDeNota,
  fechaParaFormulario,
} from '../../services/pacientesTerapeutaService';
import { LIMITE_NOMBRE_PACIENTE, PacienteCreado, crearPaciente } from '../../services/pacientesService';

// Ventanas que se abren encima de «Pacientes»

const textoDeError = (e: unknown) => (e instanceof Error ? e.message : 'Error desconocido');
type Mensaje = { tipo: 'ok' | 'error'; texto: string };

// ---- Todas las notas de las sesiones de un niño («Ver todas →» de la ficha) ----
export const NotasDelPaciente = ({
  visible,
  nombre,
  notas,
  onCerrar,
}: {
  visible: boolean;
  nombre: string;
  notas: NotaDelPaciente[];
  onCerrar: () => void;
}) => (
  <VentanaKairos visible={visible} titulo="Notas" subtitulo={nombre} onCerrar={onCerrar} testID="notas-del-paciente">
    {notas.map((n) => (
      <View key={n.id} style={estilos.nota}>
        <Text style={textos.cuerpoGrande}>{fechaDeNota(n.fechaSesion)}</Text>
        <Text style={textos.cuerpo}>{n.texto}</Text>
      </View>
    ))}
  </VentanaKairos>
);

// ---- Editar los datos de la ficha (lápiz) ----
const aFormulario = (d: DatosPaciente): CambiosPaciente => ({
  nombreNino: d.nombreNino,
  apellidos: d.apellidos ?? '',
  fechaNacimiento: fechaParaFormulario(d.fechaNacimiento),
  email: d.email ?? '',
  telefono: d.telefono ?? '',
  telefonoFijo: d.telefonoFijo ?? '',
  tutor1: d.tutor1 ?? '',
  tutor2: d.tutor2 ?? '',
  necesidadesObjetivos: d.necesidadesObjetivos ?? '',
});

export const EditarPaciente = ({
  visible,
  datos,
  terapeutaId,
  onCerrar,
  onGuardado,
  onTraspasado,
}: {
  visible: boolean;
  datos: DatosPaciente;
  terapeutaId: string;
  onCerrar: () => void;
  onGuardado: (datos: DatosPaciente) => void;
  onTraspasado: (terapeuta: TerapeutaResumen) => void;
}) => {
  const [form, setForm] = useState<CambiosPaciente>(aFormulario(datos));
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [traspasando, setTraspasando] = useState(false); // segundo paso: elegir terapeuta y confirmar

  // Cada vez que se abre, parte de los datos actuales
  useEffect(() => {
    if (visible) {
      setForm(aFormulario(datos));
      setMensaje(null);
      setTraspasando(false);
    }
  }, [visible, datos]);

  if (traspasando) {
    return (
      <VentanaKairos visible={visible} titulo="Traspasar a otra terapeuta" subtitulo={`${datos.nombreNino} · #${datos.identificador}`} onCerrar={onCerrar} testID="traspasar-paciente">
        <PasoTraspaso
          datos={datos}
          terapeutaId={terapeutaId}
          onCancelar={() => setTraspasando(false)}
          onTraspasado={onTraspasado}
        />
      </VentanaKairos>
    );
  }

  const cambiar = (campo: keyof CambiosPaciente) => (valor: string) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setMensaje(null);
  };

  const guardar = async () => {
    setGuardando(true);
    setMensaje(null);
    try {
      onGuardado(await actualizarDatosPaciente(datos.id, form));
    } catch (e) {
      setMensaje({ tipo: 'error', texto: textoDeError(e) });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <VentanaKairos visible={visible} titulo="Editar datos" subtitulo={`#${datos.identificador}`} onCerrar={onCerrar} testID="editar-paciente">
      <View style={estilos.fila}>
        <View style={estilos.flex}>
          <CampoTexto etiqueta="Nombre" value={form.nombreNino} onChangeText={cambiar('nombreNino')} maxLength={LIMITE_NOMBRE_PACIENTE} />
        </View>
        <View style={estilos.flex}>
          <CampoTexto etiqueta="Apellidos" value={form.apellidos} onChangeText={cambiar('apellidos')} />
        </View>
      </View>
      <CampoTexto etiqueta="Fecha de nacimiento" placeholder="DD/MM/AAAA" value={form.fechaNacimiento} onChangeText={cambiar('fechaNacimiento')} />
      <CampoTexto etiqueta="Correo electrónico" value={form.email} onChangeText={cambiar('email')} keyboardType="email-address" autoCapitalize="none" />
      <View style={estilos.fila}>
        <View style={estilos.flex}>
          <CampoTexto etiqueta="Teléfono" value={form.telefono} onChangeText={cambiar('telefono')} keyboardType="phone-pad" />
        </View>
        <View style={estilos.flex}>
          <CampoTexto etiqueta="Teléfono fijo" value={form.telefonoFijo} onChangeText={cambiar('telefonoFijo')} keyboardType="phone-pad" />
        </View>
      </View>
      <View style={estilos.fila}>
        <View style={estilos.flex}>
          <CampoTexto etiqueta="Tutor/a legal 1" value={form.tutor1} onChangeText={cambiar('tutor1')} />
        </View>
        <View style={estilos.flex}>
          <CampoTexto etiqueta="Tutor/a legal 2" value={form.tutor2} onChangeText={cambiar('tutor2')} />
        </View>
      </View>
      <CampoTexto
        etiqueta="Necesidades y objetivos"
        value={form.necesidadesObjetivos}
        onChangeText={cambiar('necesidadesObjetivos')}
        multiline
        style={estilos.areaTexto}
      />
      {mensaje ? <Aviso {...mensaje} /> : null}
      <BotonPrincipal texto={guardando ? 'Guardando…' : 'Guardar cambios'} onPress={guardar} desactivado={guardando} testID="boton-guardar-paciente" />

      {/* Acción poco frecuente y delicada: separada del resto */}
      <View style={estilos.separador} />
      <BotonSecundario texto="Traspasar a otra terapeuta" color={colores.rojo} onPress={() => setTraspasando(true)} testID="boton-traspasar" />
    </VentanaKairos>
  );
};

// Segundo paso de la ventana: elegir la terapeuta y confirmar
const PasoTraspaso = ({
  datos,
  terapeutaId,
  onCancelar,
  onTraspasado,
}: {
  datos: DatosPaciente;
  terapeutaId: string;
  onCancelar: () => void;
  onTraspasado: (terapeuta: TerapeutaResumen) => void;
}) => {
  const [terapeutas, setTerapeutas] = useState<TerapeutaResumen[] | null>(null);
  const [elegida, setElegida] = useState<TerapeutaResumen | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);

  useEffect(() => {
    let activo = true;
    obtenerOtrasTerapeutas(terapeutaId)
      .then((lista) => activo && setTerapeutas(lista))
      .catch((e) => {
        if (!activo) return;
        setTerapeutas([]);
        setMensaje({ tipo: 'error', texto: textoDeError(e) });
      });
    return () => {
      activo = false;
    };
  }, [terapeutaId]);

  const confirmar = async () => {
    if (!elegida || enviando) return;
    setEnviando(true);
    setMensaje(null);
    try {
      await traspasarPaciente(datos.id, terapeutaId, elegida.id);
      onTraspasado(elegida);
    } catch (e) {
      setMensaje({ tipo: 'error', texto: textoDeError(e) });
      setEnviando(false);
    }
  };

  return (
    <>
      <Text style={textos.cuerpoSemibold}>¿A qué terapeuta pasa?</Text>
      {terapeutas === null ? (
        <ActivityIndicator color={colores.amarillo} />
      ) : terapeutas.length === 0 && !mensaje ? (
        <Text style={textos.cuerpo}>No hay otras terapeutas a las que traspasarlo.</Text>
      ) : (
        <View style={estilos.opciones} accessibilityRole="radiogroup">
          {terapeutas.map((t) => {
            const marcada = elegida?.id === t.id;
            return (
              <Pressable
                key={t.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: marcada }}
                style={[estilos.opcion, marcada && estilos.opcionMarcada]}
                onPress={() => setElegida(t)}
              >
                <View style={[estilos.radio, marcada && estilos.radioMarcado]} />
                <Text style={textos.cuerpo}>{t.nombre}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {elegida ? (
        <View style={estilos.avisoTraspaso} testID="aviso-traspaso">
          <Text style={textos.cuerpo}>
            {`${datos.nombreNino} pasará a ${elegida.nombre}, que verá todo su historial. Tú dejarás de poder cambiar nada y lo verás en «Archivados», en solo lectura.`}
          </Text>
        </View>
      ) : null}
      {mensaje ? <Aviso {...mensaje} /> : null}
      <View style={estilos.fila}>
        <View style={estilos.flex}>
          <BotonSecundario texto="Cancelar" onPress={onCancelar} desactivado={enviando} />
        </View>
        <View style={estilos.flex}>
          <BotonPrincipal
            texto={enviando ? 'Traspasando…' : 'Confirmar traspaso'}
            onPress={confirmar}
            desactivado={!elegida || enviando}
            testID="boton-confirmar-traspaso"
            style={estilos.botonPeligro}
          />
        </View>
      </View>
    </>
  );
};

// ---- Invitar a un nuevo paciente (alta: queda asignado a la terapeuta) ----
export const InvitarPaciente = ({
  visible,
  terapeutaId,
  onCerrar,
  onCreado,
}: {
  visible: boolean;
  terapeutaId: string;
  onCerrar: () => void;
  onCreado: (paciente: PacienteCreado) => void;
}) => {
  const [nombreNino, setNombreNino] = useState('');
  const [nombreFamilia, setNombreFamilia] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);

  useEffect(() => {
    if (visible) {
      setNombreNino('');
      setNombreFamilia('');
      setMensaje(null);
    }
  }, [visible]);

  const crear = async () => {
    if (guardando) return;
    setGuardando(true);
    setMensaje(null);
    try {
      onCreado(await crearPaciente({ nombreNino, nombreFamilia, terapeutaId }));
    } catch (e) {
      setMensaje({ tipo: 'error', texto: textoDeError(e) });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <VentanaKairos visible={visible} titulo="Invitar a un nuevo paciente" onCerrar={onCerrar} testID="invitar-paciente">
      <Text style={textos.cuerpo}>El niño quedará en tu lista de pacientes. El resto de sus datos se pueden completar después desde su ficha.</Text>
      <CampoTexto etiqueta="Nombre del niño" value={nombreNino} onChangeText={setNombreNino} maxLength={LIMITE_NOMBRE_PACIENTE} />
      <CampoTexto etiqueta="Nombre de la familia" value={nombreFamilia} onChangeText={setNombreFamilia} maxLength={LIMITE_NOMBRE_PACIENTE} />
      {mensaje ? <Aviso {...mensaje} /> : null}
      <BotonPrincipal
        texto={guardando ? 'Guardando…' : 'Dar de alta'}
        onPress={crear}
        desactivado={guardando || !nombreNino.trim() || !nombreFamilia.trim()}
        testID="boton-crear-paciente"
      />
    </VentanaKairos>
  );
};

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  fila: { flexDirection: 'row', gap: 16 },
  nota: { gap: 12, padding: 20, borderRadius: 16, backgroundColor: colores.fondo },
  areaTexto: { minHeight: 96, textAlignVertical: 'top' },
  separador: { height: 1, marginVertical: 8, backgroundColor: colores.bordeCabecera },
  opciones: { gap: 8 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: colores.gris },
  opcionMarcada: { borderColor: colores.texto, backgroundColor: colores.fondo },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colores.grisOscuro },
  radioMarcado: { borderWidth: 6, borderColor: colores.texto },
  avisoTraspaso: { padding: 16, borderRadius: 12, backgroundColor: colores.amarilloSuave },
  botonPeligro: { backgroundColor: colores.rojo },
});
