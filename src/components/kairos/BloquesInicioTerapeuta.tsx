import React, { useEffect, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Image, ImageSource } from 'expo-image';
import { colores, fuentes, textos } from '../../tema/kairos';
import { INICIALES_DIAS, NOMBRES_MESES, inicioDelDia } from '../../services/calendarioService';
import {
  EvidenciaPorRevisar,
  PacienteConProgreso,
  PatronModulo,
  fechaLarga,
  horaRelativa,
  patronDeModulo,
  porcentaje,
} from '../../services/inicioTerapeutaService';
import { SesionDelDia, horaDeSesion } from '../../services/notasSesionService';

// Bloques del inicio de la terapeuta (Figma: «INICIO - TERAPEUTA»). Solo muestran datos.

export const PATRONES: Record<PatronModulo, ImageSource> = {
  'intencion-comunicativa': require('../../../assets/kairos/patron-intencion-comunicativa.png'),
  'reloj-de-la-calma': require('../../../assets/kairos/patron-reloj-de-la-calma.png'),
  'el-espejo': require('../../../assets/kairos/patron-el-espejo.png'),
  'manos-a-la-obra': require('../../../assets/kairos/patron-manos-a-la-obra.png'),
  'mis-primeras-palabras': require('../../../assets/kairos/patron-mis-primeras-palabras.png'),
};

const AVATARES: ImageSource[] = [
  require('../../../assets/kairos/avatar-1.png'),
  require('../../../assets/kairos/avatar-2.png'),
  require('../../../assets/kairos/avatar-3.png'),
  require('../../../assets/kairos/avatar-4.png'),
  require('../../../assets/kairos/avatar-5.png'),
  require('../../../assets/kairos/avatar-6.png'),
];

// Cada niño tiene siempre el mismo avatar (sale de su id: no cambia al renombrarlo ni al reordenar la lista)
export const avatarDe = (id: string): ImageSource => {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATARES[Math.abs(h) % AVATARES.length];
};

// ---- Fila de contadores (número de color + título + subtítulo) ----
export interface DatoIndicador {
  valor: number;
  color: string;
  titulo: string;
  subtitulo: string;
}

export const ResumenIndicadores = ({ indicadores, style }: { indicadores: DatoIndicador[]; style?: StyleProp<ViewStyle> }) => (
  <View style={[estilos.indicadores, style]}>
    {indicadores.map((i, n) => (
      <View
        key={i.titulo}
        style={[estilos.indicador, n < indicadores.length - 1 && estilos.indicadorConBorde]}
        accessibilityLabel={`${i.valor} ${i.titulo}`}
      >
        <Text style={[textos.numero, { color: i.color }]}>{i.valor}</Text>
        <View style={estilos.descripcion}>
          <Text style={textos.cuerpoGrande}>{i.titulo}</Text>
          <Text style={textos.cuerpo}>{i.subtitulo}</Text>
        </View>
      </View>
    ))}
  </View>
);

// ---- «Hagamos memoria»: los tres contadores del inicio ----
export const Indicadores = ({ sesiones, evidencias, pacientes }: { sesiones: number; evidencias: number; pacientes: number }) => (
  <ResumenIndicadores
    indicadores={[
      { valor: sesiones, color: colores.amarillo, titulo: 'Sesiones de hoy', subtitulo: 'Encuentros del día' },
      { valor: evidencias, color: colores.naranja, titulo: 'Evidencias por revisar', subtitulo: 'Falta tu visto bueno' },
      { valor: pacientes, color: colores.azul, titulo: 'Pacientes activos', subtitulo: 'Marca la diferencia en su vida' },
    ]}
  />
);

// ---- Cabecera de sección con «Ver todos →» ----
export const CabeceraSeccion = ({
  titulo,
  onVerTodos,
  textoEnlace = 'Ver todos →',
}: {
  titulo: string;
  onVerTodos?: () => void;
  textoEnlace?: string;
}) => (
  <View style={estilos.cabeceraSeccion}>
    <Text style={[textos.tituloSeccion, estilos.flex]}>{titulo}</Text>
    {onVerTodos && (
      <Pressable accessibilityRole="link" accessibilityLabel={`${textoEnlace.replace(' →', '')}: ${titulo}`} onPress={onVerTodos}>
        <Text style={textos.cuerpo}>{textoEnlace}</Text>
      </Pressable>
    )}
  </View>
);

// ---- «Evidencia por revisar» ----
export const TarjetaEvidencia = ({ evidencia, onPress, hoy }: { evidencia: EvidenciaPorRevisar; onPress: () => void; hoy?: Date }) => {
  const patron = patronDeModulo(evidencia.modulo);
  return (
    <Pressable accessibilityRole="button" testID="tarjeta-evidencia" style={estilos.tarjetaEvidencia} onPress={onPress}>
      <View style={[estilos.indicadorActividad, !patron && estilos.indicadorSinPatron]}>
        {patron && <Image source={PATRONES[patron]} style={estilos.patron} contentFit="cover" />}
      </View>
      <View style={estilos.textosEvidencia}>
        <View style={estilos.fila}>
          <Text style={[textos.cuerpo, estilos.flex]} numberOfLines={1}>
            {evidencia.nino}
          </Text>
          <Text style={textos.cuerpo}>{horaRelativa(evidencia.fechaEnvio, hoy)}</Text>
        </View>
        {/* Las prácticas aún no tienen título propio («Tarea #3 · Cuento 5 cosas» en Figma): se muestra el módulo */}
        <Text style={textos.cuerpoGrande}>{evidencia.modulo}</Text>
      </View>
    </Pressable>
  );
};

// ---- «Pacientes activos» con su progreso ----
export const TarjetaPaciente = ({ paciente, onVerFicha }: { paciente: PacienteConProgreso; onVerFicha: () => void }) => {
  const pct = porcentaje(paciente.completadas, paciente.total);
  return (
    <View style={estilos.tarjetaPaciente} testID="tarjeta-paciente">
      <Image source={avatarDe(paciente.id)} style={estilos.avatar} contentFit="cover" />
      <View style={estilos.datosPaciente}>
        <View style={estilos.fila}>
          <Text style={[textos.nombre, estilos.flex]}>{paciente.nombreNino}</Text>
          <Pressable accessibilityRole="link" onPress={onVerFicha}>
            <Text style={textos.micro}>Ver ficha →</Text>
          </Pressable>
        </View>
        <View style={estilos.progreso}>
          <View style={estilos.fila}>
            {/* «· N vencida» llegará con la fecha límite de las prácticas */}
            <Text style={[textos.micro, estilos.flex]}>{`${paciente.completadas} de ${paciente.total} tareas`}</Text>
            <Text style={textos.microSemibold}>{`${pct}%`}</Text>
          </View>
          <View style={estilos.barra}>
            <View style={[estilos.barraRelleno, { width: `${pct}%` }]} />
          </View>
        </View>
      </View>
    </View>
  );
};

// ---- Calendario del mes: el día elegido decide qué notas se ven ----
export const CalendarioInicio = ({
  hoy = new Date(),
  diaElegido,
  onElegirDia,
}: {
  hoy?: Date;
  diaElegido: Date;
  onElegirDia: (dia: Date) => void;
}) => {
  const elegido = inicioDelDia(diaElegido).getTime();
  const [vista, setVista] = useState({ anio: diaElegido.getFullYear(), mes: diaElegido.getMonth() });

  // Si el día cambia desde fuera (p. ej. con las flechas de «Notas del día»), el calendario muestra su mes
  useEffect(() => {
    const d = new Date(elegido);
    setVista({ anio: d.getFullYear(), mes: d.getMonth() });
  }, [elegido]);

  // Semanas de lunes a domingo, con los días de los meses vecinos en gris
  const primero = new Date(vista.anio, vista.mes, 1);
  const desfase = (primero.getDay() + 6) % 7;
  const inicio = new Date(vista.anio, vista.mes, 1 - desfase);
  const ultimo = new Date(vista.anio, vista.mes + 1, 0);
  const semanas = Math.ceil((desfase + ultimo.getDate()) / 7);
  const dias = Array.from({ length: semanas * 7 }, (_, i) => new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i));

  const irAMes = (cambio: number) =>
    setVista((v) => {
      const f = new Date(v.anio, v.mes + cambio, 1);
      return { anio: f.getFullYear(), mes: f.getMonth() };
    });
  const nombreMes = NOMBRES_MESES[vista.mes];

  // «Hoy» solo aparece cuando te has movido: vuelve al mes actual y marca el día de hoy
  const diaDeHoy = inicioDelDia(hoy).getTime();
  const estasEnHoy = vista.anio === hoy.getFullYear() && vista.mes === hoy.getMonth() && elegido === diaDeHoy;
  const volverAHoy = () => {
    setVista({ anio: hoy.getFullYear(), mes: hoy.getMonth() });
    onElegirDia(new Date(diaDeHoy));
  };

  return (
    <View style={estilos.calendario} testID="calendario-inicio">
      <View style={estilos.cabeceraMes}>
        <Text style={[estilos.tituloMes, estilos.flex]}>{`${nombreMes.charAt(0).toUpperCase()}${nombreMes.slice(1)} ${vista.anio}`}</Text>
        {estasEnHoy ? null : (
          <Pressable accessibilityRole="button" accessibilityLabel="Volver a hoy" style={estilos.botonHoy} onPress={volverAHoy}>
            <Text style={textos.cuerpoSemibold}>Hoy</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" accessibilityLabel="Mes anterior" style={estilos.botonMes} onPress={() => irAMes(-1)}>
          <Text style={estilos.flechaMes}>‹</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Mes siguiente" style={estilos.botonMes} onPress={() => irAMes(1)}>
          <Text style={estilos.flechaMes}>›</Text>
        </Pressable>
      </View>
      <View style={estilos.semana}>
        {INICIALES_DIAS.map((d) => (
          <Text key={d} style={estilos.inicialDia}>{d}</Text>
        ))}
      </View>
      {Array.from({ length: semanas }, (_, s) => (
        <View key={s} style={estilos.semana}>
          {dias.slice(s * 7, s * 7 + 7).map((d) => {
            const fueraDeMes = d.getMonth() !== vista.mes;
            const esElegido = d.getTime() === elegido;
            return (
              <Pressable
                key={d.getTime()}
                accessibilityRole="button"
                accessibilityState={{ selected: esElegido }}
                style={[estilos.dia, esElegido && estilos.diaElegido]}
                onPress={() => onElegirDia(d)}
              >
                <Text style={[textos.cuerpo, fueraDeMes && estilos.textoFueraDeMes]}>{d.getDate()}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
};

// ---- «Sesiones de hoy»: siempre las de hoy, aunque en el calendario se elija otro día ----
export const SesionesDeHoy = ({ sesiones, error }: { sesiones: SesionDelDia[]; error: string | null }) => (
  <View style={estilos.sesiones}>
    <Text style={textos.tituloSeccion}>Sesiones de hoy</Text>
    {error ? (
      <Text style={textos.cuerpo}>{error}</Text>
    ) : sesiones.length === 0 ? (
      <Text style={textos.cuerpo}>No hay sesiones programadas para hoy.</Text>
    ) : (
      <View style={estilos.listaSesiones}>
        {sesiones.map((s) => (
          <View key={s.id} style={estilos.filaSesion} testID="sesion-de-hoy">
            <Text style={estilos.horaSesion}>{`${horaDeSesion(s.empiezaEn)}h`}</Text>
            {/* «· En línea» (Figma) queda pendiente de decidir */}
            <Text style={[textos.cuerpo, estilos.flex]} numberOfLines={1}>
              {s.nino}
            </Text>
          </View>
        ))}
      </View>
    )}
  </View>
);

// ---- «Notas rápidas»: notas de la terapeuta sobre las sesiones del día elegido ----
export const NotasRapidas = ({
  dia,
  hoy = new Date(),
  sesiones,
  error,
  onAmpliar,
}: {
  dia: Date;
  hoy?: Date;
  sesiones: SesionDelDia[];
  error: string | null;
  onAmpliar: () => void;
}) => {
  const conNota = sesiones.filter((s) => s.nota);
  const esHoy = inicioDelDia(dia).getTime() === inicioDelDia(hoy).getTime();
  return (
    <View style={estilos.notas}>
      <View style={estilos.cabeceraNotas}>
        <View style={estilos.iconoNotas}>
          <Image source={require('../../../assets/kairos/notas.svg')} style={estilos.iconoPequeno} contentFit="contain" />
        </View>
        <View style={estilos.flex}>
          <Text style={textos.tituloSeccion}>Notas rápidas</Text>
          <Text style={textos.cuerpo}>{esHoy ? 'Hoy' : fechaLarga(dia)}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Abrir las notas del día" onPress={onAmpliar} hitSlop={8}>
          <Image source={require('../../../assets/kairos/expandir.svg')} style={estilos.iconoExpandir} contentFit="contain" />
        </Pressable>
      </View>
      {error ? (
        <Text style={textos.cuerpo}>{error}</Text>
      ) : sesiones.length === 0 ? (
        <Text style={textos.cuerpo}>No hay sesiones este día.</Text>
      ) : conNota.length === 0 ? (
        <Text style={textos.cuerpo}>Todavía no hay notas de este día.</Text>
      ) : (
        conNota.map((s, n) => (
          <View key={s.id} testID="nota-rapida" style={[estilos.nota, n < conNota.length - 1 && estilos.notaConBorde]}>
            <View style={estilos.fila}>
              <Text style={[textos.cuerpoGrande, estilos.flex]} numberOfLines={1}>
                {s.nino}
              </Text>
              <Text style={textos.cuerpo}>{horaDeSesion(s.empiezaEn)}</Text>
            </View>
            <Text style={textos.cuerpo} numberOfLines={2}>
              {s.nota?.texto}
            </Text>
          </View>
        ))
      )}
    </View>
  );
};

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  // Indicadores
  indicadores: { flexDirection: 'row', height: 164, padding: 16, borderRadius: 24, backgroundColor: colores.blanco },
  indicador: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  indicadorConBorde: { borderRightWidth: 1, borderRightColor: colores.gris },
  descripcion: { gap: 4 },
  cabeceraSeccion: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  // Evidencias
  tarjetaEvidencia: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 20, borderRadius: 16, backgroundColor: colores.blanco },
  indicadorActividad: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden', backgroundColor: colores.amarillo },
  indicadorSinPatron: { backgroundColor: colores.verde },
  patron: { width: 56, height: 56 },
  textosEvidencia: { flex: 1, gap: 10 },
  // Pacientes
  tarjetaPaciente: { flexDirection: 'row', gap: 10.8, paddingHorizontal: 16, paddingVertical: 20, borderRadius: 10.8, backgroundColor: colores.blanco },
  avatar: { width: 56, height: 56 },
  datosPaciente: { flex: 1, minHeight: 61, justifyContent: 'space-between' },
  progreso: { gap: 9 },
  barra: { height: 5.4, borderRadius: 2.7, backgroundColor: colores.barraProgresoFondo, overflow: 'hidden' },
  barraRelleno: { height: 5.4, backgroundColor: colores.verde },
  // Calendario
  calendario: { gap: 12, paddingHorizontal: 20, paddingVertical: 24, borderRadius: 32, backgroundColor: colores.blanco },
  cabeceraMes: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tituloMes: { ...textos.tituloSeccion, fontSize: 18, lineHeight: 25 },
  botonMes: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.fondo },
  flechaMes: { ...textos.tituloSeccion, lineHeight: 28 },
  botonHoy: { height: 28, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.amarilloSuave },
  semana: { flexDirection: 'row', gap: 4 },
  inicialDia: { ...textos.cuerpo, flex: 1, textAlign: 'center', color: colores.diaSemana },
  dia: { flex: 1, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  diaElegido: { backgroundColor: colores.amarillo },
  textoFueraDeMes: { color: colores.diaFueraDeMes },
  // Sesiones
  sesiones: { gap: 16, padding: 24 },
  listaSesiones: { gap: 12 },
  filaSesion: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  horaSesion: { ...textos.cuerpo, fontFamily: fuentes.bold, width: 81 },
  // Notas
  notas: { gap: 24, padding: 24, borderRadius: 32, backgroundColor: colores.blanco },
  cabeceraNotas: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  iconoNotas: { width: 32, height: 32, borderRadius: 10, padding: 7, opacity: 0.8, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.amarillo },
  iconoPequeno: { width: 18, height: 18 },
  iconoExpandir: { width: 24, height: 24 },
  nota: { gap: 8, paddingBottom: 16 },
  notaConBorde: { borderBottomWidth: 1, borderBottomColor: colores.gris, paddingBottom: 24 },
});
