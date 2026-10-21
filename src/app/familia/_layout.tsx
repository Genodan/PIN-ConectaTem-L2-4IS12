import { Href, Redirect, Slot, usePathname, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Cabecera, useEsAncho } from '../../components/estructura';
import { Avatar, Contador } from '../../components/ui';
import { FAMILIA, NINO, PRACTICAS_SEMANA, TERAPEUTA } from '../../datos/prototipo';
import { useSesion } from '../../sesion';
import { colores, fuentes, radios } from '../../tema';

const SECCIONES: { ruta: Href; prefijo: string; icono: string; texto: string; avisos?: number }[] = [
  { ruta: '/familia', prefijo: '/familia', icono: '👶', texto: 'Perfil del niño' },
  { ruta: '/familia/modulos', prefijo: '/familia/modulos', icono: '🧩', texto: 'Módulos de práctica' },
  { ruta: '/familia/historial', prefijo: '/familia/historial', icono: '🏅', texto: 'Historial de logros', avisos: 2 },
];

// Estructura común del área de la familia: cabecera + menú (lateral en escritorio, arriba en el móvil)
export default function LayoutFamilia() {
  const ancho = useEsAncho();
  const router = useRouter();
  const ruta = usePathname();
  const { usuario, cargando, modoDemo, cerrarSesion } = useSesion();
  const activa = (prefijo: string) => (prefijo === '/familia' ? ruta === '/familia' : ruta.startsWith(prefijo));

  if (cargando) return <View style={styles.pantalla} />;
  // Con Supabase configurado, solo entra una familia con sesión iniciada.
  // El contenido sigue siendo el del prototipo hasta que se programen sus UT.
  if (!modoDemo && usuario?.rol !== 'familia') return <Redirect href="/" />;

  const salir = async () => {
    await cerrarSesion();
    router.replace('/');
  };

  return (
    <View style={styles.pantalla}>
      <Cabecera saludo="Hola" nombre={usuario?.nombre ?? FAMILIA.nombre} inicial={(usuario?.nombre ?? FAMILIA.nombre).charAt(0).toUpperCase()} onSalir={salir} />

      {ancho ? (
        <View style={styles.cuerpo}>
          <View style={styles.lateral}>
            <View style={styles.fichaNino}>
              <View style={styles.fila}>
                <Avatar texto="👶" tamano={48} />
                <View>
                  <Text style={styles.nombreNino}>{NINO.nombreCorto}</Text>
                  <Text style={styles.edad}>{NINO.edad}</Text>
                </View>
              </View>
              <View style={styles.terapeutaAsignada}>
                <Text style={styles.textoTerapeuta}>🩺 {TERAPEUTA.nombre} {TERAPEUTA.apellidos}</Text>
              </View>
            </View>

            <View style={styles.menu}>
              {SECCIONES.map((s) => (
                <Pressable
                  key={s.texto}
                  accessibilityRole="link"
                  accessibilityState={{ selected: activa(s.prefijo) }}
                  onPress={() => router.navigate(s.ruta)}
                  style={[styles.opcion, activa(s.prefijo) && styles.opcionActiva]}
                >
                  <Text style={[styles.textoOpcion, activa(s.prefijo) && styles.textoOpcionActiva]}>
                    {s.icono}  {s.texto}
                  </Text>
                  {s.avisos ? <Contador valor={s.avisos} /> : null}
                </Pressable>
              ))}
            </View>

            <RachaSemanal />
          </View>
          <View style={styles.principal}>
            <Slot />
          </View>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.menuMovil} contentContainerStyle={styles.menuMovilContenido}>
            {SECCIONES.map((s) => (
              <Pressable
                key={s.texto}
                accessibilityRole="link"
                accessibilityState={{ selected: activa(s.prefijo) }}
                onPress={() => router.navigate(s.ruta)}
                style={[styles.opcionMovil, activa(s.prefijo) && styles.opcionActiva]}
              >
                <Text style={[styles.textoOpcion, activa(s.prefijo) && styles.textoOpcionActiva]}>
                  {s.icono} {s.texto}
                </Text>
                {s.avisos ? <Contador valor={s.avisos} /> : null}
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.principal}>
            <Slot />
          </View>
        </>
      )}
    </View>
  );
}

function RachaSemanal() {
  const hechas = PRACTICAS_SEMANA.filter(Boolean).length;
  return (
    <View style={styles.pieLateral}>
      <View style={styles.racha}>
        <Text style={styles.tituloRacha}>Esta semana</Text>
        <Text style={styles.numeroRacha}>
          {hechas} <Text style={styles.unidadRacha}>prácticas</Text>
        </Text>
        <View style={styles.dias}>
          {PRACTICAS_SEMANA.map((hecha, i) => (
            <View key={i} style={[styles.dia, hecha && styles.diaHecho]}>
              {hecha ? <Text style={styles.check}>✓</Text> : null}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cuerpo: { flex: 1, flexDirection: 'row' },
  principal: { flex: 1 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lateral: { width: 272, backgroundColor: colores.tarjeta, borderRightWidth: 1, borderRightColor: colores.borde },
  fichaNino: { padding: 20, borderBottomWidth: 1, borderBottomColor: colores.borde, gap: 12 },
  nombreNino: { fontFamily: fuentes.titulo, fontSize: 16, color: colores.texto },
  edad: { fontFamily: fuentes.texto, fontSize: 12, color: colores.textoApagado },
  terapeutaAsignada: { backgroundColor: colores.primarioSuave, borderRadius: radios.pequeno, paddingHorizontal: 10, paddingVertical: 6 },
  textoTerapeuta: { fontFamily: fuentes.tituloMedio, fontSize: 12, color: colores.primarioOscuro },
  menu: { flex: 1, padding: 12, gap: 4 },
  opcion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderRadius: radios.medio },
  opcionActiva: { backgroundColor: colores.primarioSuave },
  textoOpcion: { fontFamily: fuentes.tituloMedio, fontSize: 14, color: colores.textoApagado },
  textoOpcionActiva: { color: colores.primario },
  pieLateral: { padding: 16, borderTopWidth: 1, borderTopColor: colores.borde },
  racha: { backgroundColor: colores.avisoFondo, borderWidth: 1, borderColor: colores.avisoBorde, borderRadius: radios.medio, padding: 10, alignItems: 'center' },
  tituloRacha: { fontFamily: fuentes.tituloMedio, fontSize: 12, color: colores.avisoTexto },
  numeroRacha: { fontFamily: fuentes.tituloFuerte, fontSize: 24, color: colores.texto },
  unidadRacha: { fontFamily: fuentes.tituloMedio, fontSize: 14, color: colores.textoApagado },
  dias: { flexDirection: 'row', gap: 4, marginTop: 8 },
  dia: { width: 20, height: 20, borderRadius: 10, backgroundColor: colores.apagado, alignItems: 'center', justifyContent: 'center' },
  diaHecho: { backgroundColor: colores.primario },
  check: { fontSize: 10, color: colores.blanco },
  menuMovil: { flexGrow: 0, backgroundColor: colores.tarjeta, borderBottomWidth: 1, borderBottomColor: colores.borde },
  menuMovilContenido: { padding: 8, gap: 6 },
  opcionMovil: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radios.medio },
});
