import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MODULOS, PACIENTES, TAREAS } from '../../datos/prototipo';
import { colores, fuentes, radios } from '../../tema';
import { Contenido, useEsAncho } from '../estructura';
import { Boton, CabeceraSeccion, Campo, Chip, Etiqueta, Insignia, Tarjeta, Titulo } from '../ui';

const FRECUENCIAS = ['1', '2', '3', '5'];

// Tarjetas con las tareas ya enviadas a las familias
export function TareasResumen({ onCrear }: { onCrear: () => void }) {
  const ancho = useEsAncho();
  return (
    <Contenido maxAncho={1000}>
      <CabeceraSeccion
        titulo="Tareas asignadas"
        subtitulo="Consulta las prácticas que has enviado a las familias."
        derecha={ancho ? <Boton titulo="＋ Crear nueva tarea" onPress={onCrear} /> : undefined}
      />
      {!ancho ? <Boton titulo="＋ Crear nueva tarea" onPress={onCrear} estilo={{ marginBottom: 16 }} /> : null}
      <View style={styles.rejilla}>
        {TAREAS.map((t) => (
          <View key={t.id} style={[styles.tarjetaTarea, { flexBasis: ancho ? '30%' : '100%' }]}>
            <View style={styles.filaEntre}>
              <Insignia texto={t.estado} tipo={t.estado === 'activa' ? 'exito' : 'gris'} mayusculas />
              <Text style={styles.puntos}>•••</Text>
            </View>
            <Text style={styles.tituloTarea}>{t.titulo}</Text>
            <Text style={styles.modulo}>{t.modulo}</Text>
            <View style={styles.pieTarea}>
              <Text style={styles.ayuda}>{t.pacientes}</Text>
              <Text style={styles.ayuda}>{t.frecuencia}</Text>
            </View>
          </View>
        ))}
      </View>
    </Contenido>
  );
}

// Formulario en tres pasos para crear una tarea y asignarla a una o varias familias
export function CrearTarea({ onVolver }: { onVolver: () => void }) {
  const ancho = useEsAncho();
  const [titulo, setTitulo] = useState('');
  const [instrucciones, setInstrucciones] = useState('');
  const [moduloId, setModuloId] = useState<number | null>(null);
  const [pacientes, setPacientes] = useState<number[]>([]);
  const [frecuencia, setFrecuencia] = useState('3');
  const [fechaLimite, setFechaLimite] = useState('2026-10-07');
  const [creada, setCreada] = useState(false);

  const modulo = MODULOS.find((m) => m.id === moduloId);
  const puedeCrear = Boolean(titulo.trim() && modulo && pacientes.length > 0);
  const alternarPaciente = (id: number) =>
    setPacientes((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  if (creada) {
    return (
      <Contenido>
        <View style={styles.creada}>
          <View style={styles.checkGrande}>
            <Text style={{ fontSize: 28, color: colores.primario }}>✓</Text>
          </View>
          <Insignia texto="Tarea publicada" />
          <Titulo estilo={styles.centrado}>{titulo}</Titulo>
          <Text style={[styles.ayuda, styles.centrado]}>
            Ya aparece en el panel de {pacientes.length === 1 ? 'la familia seleccionada' : 'las familias seleccionadas'}.
          </Text>
          <View style={styles.resumenCreada}>
            {[
              { etiqueta: 'MÓDULO', valor: modulo?.titulo ?? '' },
              { etiqueta: 'FAMILIAS', valor: String(pacientes.length) },
              { etiqueta: 'OBJETIVO', valor: `${frecuencia} prácticas` },
            ].map((d) => (
              <View key={d.etiqueta} style={styles.dato}>
                <Text style={styles.etiquetaMini}>{d.etiqueta}</Text>
                <Text style={styles.valorDato}>{d.valor}</Text>
              </View>
            ))}
          </View>
          <View style={styles.filaBotones}>
            <Boton titulo="Ver todas las tareas" variante="contorno" onPress={onVolver} estilo={styles.flex1} />
            <Boton
              titulo="Crear otra tarea"
              estilo={styles.flex1}
              onPress={() => {
                setCreada(false);
                setTitulo('');
                setInstrucciones('');
                setModuloId(null);
                setPacientes([]);
              }}
            />
          </View>
        </View>
      </Contenido>
    );
  }

  return (
    <Contenido maxAncho={1100}>
      <Boton titulo="← Volver a tareas" variante="enlace" pequeno onPress={onVolver} />
      <CabeceraSeccion
        titulo="Crear nueva tarea"
        subtitulo="Prepara una práctica concreta y asígnala a una o varias familias."
        derecha={ancho ? <Insignia texto="Borrador sin publicar" tipo="aviso" /> : undefined}
      />

      <View style={[styles.distribucion, ancho && styles.distribucionAncha]}>
        <View style={[styles.columnaPrincipal, ancho && styles.flex1]}>
          <Tarjeta>
            <Paso numero={1} titulo="¿Qué vais a practicar?" ayuda="Elige el módulo y explica la actividad." />
            <View style={styles.modulos}>
              {MODULOS.map((m) => {
                const sel = moduloId === m.id;
                return (
                  <Pressable
                    key={m.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: sel }}
                    onPress={() => setModuloId(m.id)}
                    style={[styles.opcionModulo, { flexBasis: ancho ? '18%' : '30%' }, sel && styles.opcionSel]}
                  >
                    <Text style={{ fontSize: 20 }}>{m.emoji}</Text>
                    <Text style={styles.textoModulo}>{m.titulo}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Campo etiqueta="Título de la tarea" value={titulo} onChangeText={setTitulo} placeholder="Ej. Pedir el pompero durante el juego" />
            <Campo
              etiqueta="Instrucciones para la familia"
              filas={4}
              value={instrucciones}
              onChangeText={setInstrucciones}
              placeholder="Explica la actividad paso a paso y qué debe observar la familia..."
              ayuda="La familia verá estas indicaciones antes de grabar su práctica."
            />
          </Tarjeta>

          <Tarjeta>
            <Paso numero={2} titulo="¿Para quién es?" ayuda="Puedes enviar la misma tarea a varias familias." />
            <View style={styles.pacientes}>
              {PACIENTES.map((p) => {
                const sel = pacientes.includes(p.id);
                return (
                  <Pressable
                    key={p.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: sel }}
                    onPress={() => alternarPaciente(p.id)}
                    style={[styles.opcionPaciente, { flexBasis: ancho ? '30%' : '100%' }, sel && styles.opcionSel]}
                  >
                    <View style={[styles.avatarPaciente, sel && styles.avatarSel]}>
                      <Text style={[styles.letra, sel && { color: colores.blanco }]}>{sel ? '✓' : p.avatar}</Text>
                    </View>
                    <View style={styles.flex1}>
                      <Text style={styles.nombrePaciente}>
                        {p.nombre} {p.apellidos}
                      </Text>
                      <Text style={styles.diagnostico}>{p.diagnostico}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Tarjeta>
        </View>

        <Tarjeta estilo={ancho ? styles.lateral : undefined}>
          <Paso numero={3} titulo="Objetivo y publicación" ayuda="Define el ritmo recomendado." />
          <View>
            <Etiqueta>Número de prácticas</Etiqueta>
            <View style={styles.chips}>
              {FRECUENCIAS.map((f) => (
                <Chip key={f} texto={`${f} ${f === '1' ? 'práctica' : 'prácticas'}`} seleccionado={frecuencia === f} onPress={() => setFrecuencia(f)} />
              ))}
            </View>
          </View>
          <Campo etiqueta="Fecha límite" value={fechaLimite} onChangeText={setFechaLimite} placeholder="AAAA-MM-DD" />

          <View style={styles.resumen}>
            <Text style={styles.etiquetaMini}>RESUMEN</Text>
            {[
              { etiqueta: 'Módulo', valor: modulo ? `${modulo.emoji} ${modulo.titulo}` : 'Sin elegir' },
              { etiqueta: 'Familias', valor: String(pacientes.length) },
              { etiqueta: 'Objetivo', valor: `${frecuencia} prácticas` },
            ].map((d) => (
              <View key={d.etiqueta} style={styles.filaEntre}>
                <Text style={styles.ayuda}>{d.etiqueta}</Text>
                <Text style={styles.valorResumen}>{d.valor}</Text>
              </View>
            ))}
          </View>

          <View style={styles.notificacion}>
            <Text style={styles.textoNotificacion}>🔔 Las familias recibirán una notificación al publicar.</Text>
          </View>

          <Boton titulo="Publicar tarea" deshabilitado={!puedeCrear} onPress={() => setCreada(true)} />
          {!puedeCrear ? <Text style={[styles.pista, styles.centrado]}>Completa título, módulo y al menos una familia.</Text> : null}
        </Tarjeta>
      </View>
    </Contenido>
  );
}

function Paso({ numero, titulo, ayuda }: { numero: number; titulo: string; ayuda: string }) {
  return (
    <View style={styles.paso}>
      <View style={styles.numeroPaso}>
        <Text style={styles.textoNumero}>{numero}</Text>
      </View>
      <View style={styles.flex1}>
        <Text style={styles.tituloPaso}>{titulo}</Text>
        <Text style={styles.ayuda}>{ayuda}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  centrado: { textAlign: 'center' },
  filaEntre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  ayuda: { fontFamily: fuentes.texto, fontSize: 12, lineHeight: 18, color: colores.textoApagado },
  pista: { fontFamily: fuentes.texto, fontSize: 10, color: colores.textoTenue },
  etiquetaMini: { fontFamily: fuentes.textoFuerte, fontSize: 10, letterSpacing: 0.5, color: colores.textoApagado },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  tarjetaTarea: { flexGrow: 1, backgroundColor: colores.tarjeta, borderWidth: 1, borderColor: colores.borde, borderRadius: radios.grande, padding: 20 },
  puntos: { color: colores.textoTenue },
  tituloTarea: { fontFamily: fuentes.titulo, fontSize: 16, color: colores.texto, marginTop: 16 },
  modulo: { fontFamily: fuentes.textoFuerte, fontSize: 12, color: colores.primario, marginTop: 4 },
  pieTarea: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colores.borde, marginTop: 16, paddingTop: 12 },
  distribucion: { gap: 20 },
  distribucionAncha: { flexDirection: 'row', alignItems: 'flex-start' },
  columnaPrincipal: { gap: 20 },
  lateral: { width: 300 },
  paso: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  numeroPaso: { width: 28, height: 28, borderRadius: 14, backgroundColor: colores.primario, alignItems: 'center', justifyContent: 'center' },
  textoNumero: { fontFamily: fuentes.textoFuerte, fontSize: 12, color: colores.blanco },
  tituloPaso: { fontFamily: fuentes.titulo, fontSize: 14, color: colores.texto },
  modulos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcionModulo: { flexGrow: 1, minHeight: 96, padding: 12, borderRadius: radios.medio, borderWidth: 1, borderColor: colores.borde },
  opcionSel: { borderColor: colores.primario, backgroundColor: colores.primarioSuave },
  textoModulo: { fontFamily: fuentes.textoFuerte, fontSize: 11, lineHeight: 14, color: colores.texto, marginTop: 8 },
  pacientes: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  opcionPaciente: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radios.medio, borderWidth: 1, borderColor: colores.borde },
  avatarPaciente: { width: 36, height: 36, borderRadius: 18, backgroundColor: colores.primarioSuave, alignItems: 'center', justifyContent: 'center' },
  avatarSel: { backgroundColor: colores.primario },
  letra: { fontFamily: fuentes.textoFuerte, fontSize: 14, color: colores.primario },
  nombrePaciente: { fontFamily: fuentes.textoFuerte, fontSize: 12, color: colores.texto },
  diagnostico: { fontFamily: fuentes.texto, fontSize: 10, color: colores.textoApagado, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  resumen: { backgroundColor: colores.fondo, borderWidth: 1, borderColor: colores.borde, borderRadius: radios.medio, padding: 16, gap: 10 },
  valorResumen: { fontFamily: fuentes.textoFuerte, fontSize: 12, color: colores.texto, flexShrink: 1, textAlign: 'right' },
  notificacion: { backgroundColor: colores.primarioSuave, borderRadius: radios.medio, padding: 12 },
  textoNotificacion: { fontFamily: fuentes.texto, fontSize: 12, lineHeight: 18, color: colores.primarioOscuro },
  creada: { alignSelf: 'center', width: '100%', maxWidth: 520, backgroundColor: colores.tarjeta, borderWidth: 1, borderColor: colores.borde, borderRadius: radios.grande, padding: 32, alignItems: 'center', gap: 12 },
  checkGrande: { width: 64, height: 64, borderRadius: 32, backgroundColor: colores.primarioSuave, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  resumenCreada: { flexDirection: 'row', gap: 12, marginVertical: 12, alignSelf: 'stretch' },
  dato: { flex: 1, backgroundColor: colores.fondo, borderRadius: radios.medio, padding: 12 },
  valorDato: { fontFamily: fuentes.textoFuerte, fontSize: 12, color: colores.texto, marginTop: 4 },
  filaBotones: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
});
