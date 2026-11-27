import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image, ImageSource } from 'expo-image';
import { colores, fuentes, textos } from '../../tema/kairos';
import { CabeceraSeccion, ResumenIndicadores, avatarDe } from './BloquesInicioTerapeuta';
import { BotonPrincipal } from './Comunes';
import { patronDeModulo } from '../../services/inicioTerapeutaService';
import {
  EstadoHistorial,
  FichaPaciente as DatosFicha,
  NotaDelPaciente,
  edadYNacimiento,
  fechaDeNota,
  subtituloDeModulo,
} from '../../services/pacientesTerapeutaService';
import { ModuloResumen } from '../../services/practicasService';

// Ficha del niño seleccionado (Figma: «Ficha del paciente seleccionado»)

const NOTAS_VISIBLES = 2;
const TAREAS_VISIBLES = 4;

interface Props {
  ficha: DatosFicha;
  modulos: ModuloResumen[];
  modulosAsignados: string[];
  moduloCambiando: string | null;
  avisoModulos: string | null;
  hoy?: Date;
  // Niño traspasado a otra terapeuta («Archivados»): se ve todo, pero no se puede cambiar nada
  soloLectura?: { traspasadoA: string; fecha: string } | null;
  onEditar: () => void;
  onVerTodasLasNotas: () => void;
  onAsignarPractica: () => void;
  onCambiarModulo: (moduloId: string, asignar: boolean) => void;
}

export const FichaPaciente = ({
  ficha,
  modulos,
  modulosAsignados,
  moduloCambiando,
  avisoModulos,
  hoy,
  soloLectura,
  onEditar,
  onVerTodasLasNotas,
  onAsignarPractica,
  onCambiarModulo,
}: Props) => {
  const { datos } = ficha;
  const [historialCompleto, setHistorialCompleto] = useState(false);
  const nombreCompleto = [datos.nombreNino, datos.apellidos].filter(Boolean).join(' ');
  const edad = edadYNacimiento(datos.fechaNacimiento, hoy);
  const tareas = historialCompleto ? ficha.historial : ficha.historial.slice(0, TAREAS_VISIBLES);

  return (
    <View style={estilos.ficha} testID="ficha-paciente">
      {soloLectura ? (
        <View style={estilos.avisoArchivado} testID="aviso-archivado">
          <Text style={textos.cuerpoSemibold}>{`Traspasado a ${soloLectura.traspasadoA} el ${fechaDeNota(soloLectura.fecha)}`}</Text>
          <Text style={textos.cuerpo}>Ficha en solo lectura: ya no es paciente tuyo.</Text>
        </View>
      ) : null}

      {/* Datos personales */}
      <View style={estilos.datos}>
        <View style={estilos.cabecera}>
          <View style={estilos.foto}>
            <Image source={avatarDe(datos.id)} style={estilos.avatar} contentFit="cover" />
          </View>
          <View style={estilos.identidad}>
            <View style={estilos.filaNombre}>
              <Text style={estilos.nombre}>{nombreCompleto}</Text>
              {soloLectura ? null : (
                <Pressable accessibilityRole="button" accessibilityLabel="Editar los datos del niño" onPress={onEditar} hitSlop={8}>
                  <Image source={require('../../../assets/kairos/editar.svg')} style={estilos.iconoEditar} contentFit="contain" />
                </Pressable>
              )}
            </View>
            {edad ? <Text style={estilos.datoGris}>{edad}</Text> : null}
            <Text style={estilos.datoGris}>{`#${datos.identificador}`}</Text>
          </View>
        </View>

        <View style={estilos.contacto}>
          <View style={estilos.fila}>
            <Entrada icono={require('../../../assets/kairos/correo.svg')} tamIcono={20} valor={datos.email} vacio="Correo electrónico" />
            <View style={[estilos.flex, estilos.fila, estilos.telefonos]}>
              <Entrada icono={require('../../../assets/kairos/telefono.svg')} tamIcono={24} valor={datos.telefono} vacio="Nº teléfono" />
              <Entrada icono={require('../../../assets/kairos/telefono.svg')} tamIcono={24} valor={datos.telefonoFijo} vacio="Nº teléfono fijo" />
            </View>
          </View>
          <View style={estilos.tutores}>
            <Text style={textos.cuerpoGrande}>Tutores legales</Text>
            <View style={estilos.fila}>
              <Entrada valor={datos.tutor1} vacio="Tutor/a legal" />
              <Entrada valor={datos.tutor2} vacio="Tutor/a legal" />
            </View>
          </View>
        </View>
      </View>

      <View style={estilos.secciones}>
        {/* Progreso */}
        <View style={estilos.seccion}>
          <Text style={textos.tituloSeccion}>Progreso</Text>
          <ResumenIndicadores
            style={estilos.indicadores}
            indicadores={[
              { valor: ficha.completadas, color: colores.amarillo, titulo: 'Tareas completadas', subtitulo: 'Evidencias recibidas' },
              { valor: ficha.pendientes, color: colores.naranja, titulo: 'Pendientes', subtitulo: 'Por hacer en casa' },
              { valor: ficha.sesionesAtendidas, color: colores.azul, titulo: 'Sesiones atendidas', subtitulo: 'Encuentros realizados' },
            ]}
          />
        </View>

        {/* Necesidades y objetivos */}
        <View style={estilos.seccionCorta}>
          <Text style={textos.tituloSeccion}>Necesidades y objetivos</Text>
          <View style={estilos.entradaAncha}>
            <Text style={datos.necesidadesObjetivos ? textos.cuerpo : estilos.textoVacio}>
              {datos.necesidadesObjetivos ?? 'Sin definir todavía.'}
            </Text>
          </View>
        </View>

        {/* Notas de las sesiones */}
        <View style={estilos.seccion}>
          <CabeceraSeccion titulo="Notas" textoEnlace="Ver todas →" onVerTodos={ficha.notas.length > 0 ? onVerTodasLasNotas : undefined} />
          <View style={estilos.cajaNotas}>
            {ficha.notas.length === 0 ? (
              <Text style={textos.cuerpo}>Todavía no hay notas de sus sesiones.</Text>
            ) : (
              ficha.notas.slice(0, NOTAS_VISIBLES).map((n, i, lista) => <NotaFicha key={n.id} nota={n} conBorde={i < lista.length - 1} />)
            )}
          </View>
        </View>

        {/* Historial de tareas */}
        <View style={estilos.seccionHistorial}>
          <CabeceraSeccion
            titulo="Historial de tareas"
            textoEnlace={historialCompleto ? 'Ver menos' : 'Ver todas →'}
            onVerTodos={ficha.historial.length > TAREAS_VISIBLES ? () => setHistorialCompleto((v) => !v) : undefined}
          />
          <View style={estilos.listaTareas}>
            {tareas.length === 0 ? (
              <Text style={textos.cuerpo}>Todavía no tiene prácticas.</Text>
            ) : (
              tareas.map((t) => (
                <View key={t.id} style={estilos.tarea} testID="tarea-historial">
                  {/* El aviso «!» de «Vencida» llegará con la fecha límite de las prácticas */}
                  <Text style={[textos.cuerpo, estilos.flex]}>{t.titulo}</Text>
                  <Text style={[textos.cuerpo, ESTILO_ESTADO[t.estado]]}>{t.estado}</Text>
                </View>
              ))
            )}
          </View>
          {soloLectura ? null : (
            <BotonPrincipal texto="Asignar nueva práctica" onPress={onAsignarPractica} testID="boton-asignar-practica" />
          )}
        </View>

        {/* Módulos que trabaja: la flecha asigna o quita el módulo */}
        <View style={estilos.seccionCorta}>
          {soloLectura ? null : modulosAsignados.length === 0 ? (
            <Text style={textos.cuerpo}>Aún no tiene módulos asignados, así que puede trabajar todos. Pulsa la flecha de un módulo para asignárselo.</Text>
          ) : null}
          {avisoModulos ? <Text style={[textos.cuerpo, estilos.textoError]}>{avisoModulos}</Text> : null}
          <ScrollView horizontal contentContainerStyle={estilos.carrusel} testID="carrusel-modulos">
            {modulos.map((m) => (
              <TarjetaModulo
                key={m.id}
                modulo={m}
                asignado={modulosAsignados.includes(m.id)}
                cambiando={moduloCambiando === m.id}
                soloLectura={!!soloLectura}
                onPress={() => onCambiarModulo(m.id, !modulosAsignados.includes(m.id))}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const ESTILO_ESTADO: Record<EstadoHistorial, object> = {
  Pendiente: {},
  'Por revisar': {},
  Completada: { color: colores.verdeOscuro },
};

// Campo de solo lectura con icono (estilo «Entrada» de Figma); si no hay dato, el texto va en gris
const Entrada = ({ icono, tamIcono = 20, valor, vacio }: { icono?: ImageSource; tamIcono?: number; valor: string | null; vacio: string }) => (
  <View style={[estilos.entrada, estilos.flex]}>
    {icono ? <Image source={icono} style={{ width: tamIcono, height: tamIcono }} contentFit="contain" /> : null}
    <Text style={[textos.cuerpo, !valor && estilos.textoVacio, estilos.flex]} numberOfLines={1}>
      {valor ?? vacio}
    </Text>
  </View>
);

const NotaFicha = ({ nota, conBorde }: { nota: NotaDelPaciente; conBorde: boolean }) => (
  <View style={[estilos.nota, conBorde && estilos.notaConBorde]} testID="nota-ficha">
    <Text style={textos.cuerpoGrande}>{fechaDeNota(nota.fechaSesion)}</Text>
    <Text style={textos.cuerpo}>{nota.texto}</Text>
  </View>
);

const TarjetaModulo = ({
  modulo,
  asignado,
  cambiando,
  soloLectura,
  onPress,
}: {
  modulo: ModuloResumen;
  asignado: boolean;
  cambiando: boolean;
  soloLectura: boolean;
  onPress: () => void;
}) => (
  <View style={[estilos.modulo, asignado && estilos.moduloAsignado]} testID="tarjeta-modulo">
    <View style={estilos.cabeceraModulo}>
      <Text style={textos.tituloSeccion}>{modulo.titulo}</Text>
      {asignado ? <Text style={textos.cuerpoSemibold}>Asignado</Text> : null}
    </View>
    <View style={estilos.pieModulo}>
      <Text style={estilos.subtituloModulo} numberOfLines={3}>
        {subtituloDeModulo(patronDeModulo(modulo.titulo), modulo.objetivo)}
      </Text>
      {soloLectura ? null : cambiando ? (
        <ActivityIndicator color={colores.verde} style={estilos.flechaModulo} />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={asignado ? `Quitar el módulo «${modulo.titulo}»` : `Asignar el módulo «${modulo.titulo}»`}
          onPress={onPress}
        >
          <Image source={require('../../../assets/kairos/flecha-modulo.svg')} style={estilos.flechaModulo} contentFit="contain" />
        </Pressable>
      )}
    </View>
  </View>
);

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  fila: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  ficha: { flex: 1, gap: 56, paddingHorizontal: 24, paddingVertical: 40, borderRadius: 24, backgroundColor: colores.blanco },
  datos: { gap: 32 },
  avisoArchivado: { gap: 4, padding: 16, borderRadius: 12, backgroundColor: colores.amarilloSuave },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 32, minHeight: 161 },
  // Sin fondo: el avatar ya trae sus esquinas redondeadas (con fondo, asomaba por las esquinas)
  foto: { width: 161, height: 161 },
  avatar: { width: 161, height: 161 },
  identidad: { flex: 1, gap: 8 },
  filaNombre: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  nombre: { flex: 1, fontFamily: fuentes.bold, fontSize: 32, color: colores.texto },
  iconoEditar: { width: 32, height: 32 },
  datoGris: { fontFamily: fuentes.bold, fontSize: 20, color: colores.gris },
  contacto: { gap: 12 },
  telefonos: { gap: 10 },
  tutores: { gap: 8 },
  entrada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 50,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colores.gris,
    backgroundColor: colores.blanco,
  },
  entradaAncha: { padding: 14, borderRadius: 8, borderWidth: 1, borderColor: colores.gris, backgroundColor: colores.blanco },
  textoVacio: { ...textos.cuerpo, color: colores.gris },
  textoError: { color: colores.naranja },
  secciones: { gap: 48 },
  seccion: { gap: 24 },
  seccionCorta: { gap: 12 },
  seccionHistorial: { gap: 32 },
  indicadores: { height: 157, backgroundColor: colores.fondo },
  cajaNotas: { gap: 12, padding: 24, borderRadius: 16, backgroundColor: colores.fondo },
  nota: { gap: 12, paddingVertical: 8 },
  notaConBorde: { borderBottomWidth: 1, borderBottomColor: colores.gris, paddingBottom: 24 },
  listaTareas: { gap: 16 },
  tarea: { flexDirection: 'row', gap: 16, minHeight: 38, borderBottomWidth: 1, borderBottomColor: colores.bordeCabecera },
  carrusel: { gap: 16, paddingBottom: 12 },
  modulo: { width: 306, height: 246, padding: 24, borderRadius: 24, justifyContent: 'space-between', backgroundColor: colores.fondo },
  moduloAsignado: { backgroundColor: colores.amarilloSuave },
  cabeceraModulo: { gap: 8 },
  pieModulo: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  subtituloModulo: { ...textos.cuerpo, color: colores.negro, width: 169 },
  flechaModulo: { width: 44, height: 44 },
});
