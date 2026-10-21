import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Pestanas, useEsAncho } from '../components/estructura';
import { Boton, Campo, Logo } from '../components/ui';
import { Rol, useSesion } from '../sesion';
import { colores, fuentes, radios } from '../tema';

type Modo = 'login' | 'registro';

// Pantalla de acceso. Con Supabase configurado inicia sesión de verdad y lleva al panel
// del rol de la cuenta; en modo demo (sin .env.local) entra directamente con el rol elegido.
export default function Acceso() {
  const ancho = useEsAncho();
  const router = useRouter();
  const { modoDemo, iniciarSesion } = useSesion();
  const [rol, setRol] = useState<Rol>('familia');
  const [modo, setModo] = useState<Modo>('login');

  const irAlPanel = (r: Rol) => router.push(r === 'familia' ? '/familia' : '/terapeuta');
  const entrarDemo = () => irAlPanel(rol);
  const entrarConCuenta = async (email: string, contrasena: string) => {
    const usuario = await iniciarSesion(email, contrasena);
    irAlPanel(usuario.rol);
  };

  return (
    <View style={styles.pantalla}>
      {ancho ? <PanelMarca /> : null}

      <ScrollView style={styles.flex1} contentContainerStyle={styles.columnaFormulario}>
        {!ancho ? (
          <View style={styles.logoMovil}>
            <Logo tamano={24} />
            <Text style={styles.lemaMovil}>El puente entre el centro y tu hogar</Text>
          </View>
        ) : null}

        <View style={styles.formulario}>
          <View style={styles.selectorRol}>
            <BotonRol texto="👨‍👩‍👧 Soy familia" activo={rol === 'familia'} onPress={() => setRol('familia')} />
            <BotonRol texto="🩺 Soy terapeuta" activo={rol === 'terapeuta'} onPress={() => setRol('terapeuta')} />
          </View>

          <View style={styles.tarjeta}>
            <Pestanas
              opciones={[
                { id: 'login', texto: 'Iniciar sesión' },
                { id: 'registro', texto: 'Registrarse' },
              ]}
              activa={modo}
              onCambiar={setModo}
              tamanoTexto={14}
            />
            <View style={styles.cuerpo}>
              {modo === 'login' ? (
                <FormularioLogin rol={rol} modoDemo={modoDemo} onEntrarDemo={entrarDemo} onEntrar={entrarConCuenta} />
              ) : (
                <FormularioRegistro rol={rol} onEntrar={entrarDemo} />
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function PanelMarca() {
  return (
    <View style={styles.panelMarca}>
      <View>
        <Logo tamano={30} color={colores.blanco} />
        <Text style={styles.lema}>El puente entre el centro y tu hogar</Text>
      </View>
      <View style={{ gap: 32 }}>
        <View>
          <Text style={styles.claim}>Juntos,{'\n'}un paso{'\n'}cada día.</Text>
          <Text style={styles.textoMarca}>
            Una plataforma que conecta familias y terapeutas para llevar la atención temprana al hogar.
          </Text>
        </View>
        <View style={{ gap: 12 }}>
          {[
            { emoji: '🎬', texto: 'Vídeos de demostración de tu terapeuta' },
            { emoji: '📹', texto: 'Envía tus prácticas con notas' },
            { emoji: '💬', texto: 'Recibe feedback personalizado' },
          ].map((item) => (
            <View key={item.texto} style={styles.ventaja}>
              <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
              <Text style={styles.textoVentaja}>{item.texto}</Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={styles.legal}>Datos protegidos conforme al RGPD y normativa sanitaria.</Text>
    </View>
  );
}

function BotonRol({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      onPress={onPress}
      style={[styles.botonRol, activo && styles.botonRolActivo]}
    >
      <Text style={[styles.textoRol, activo && styles.textoRolActivo]}>{texto}</Text>
    </Pressable>
  );
}

function FormularioLogin({
  rol,
  modoDemo,
  onEntrarDemo,
  onEntrar,
}: {
  rol: Rol;
  modoDemo: boolean;
  onEntrarDemo: () => void;
  onEntrar: (email: string, contrasena: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  const enviar = async () => {
    if (modoDemo) return onEntrarDemo();
    setError(null);
    setEntrando(true);
    try {
      await onEntrar(email, contrasena);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido iniciar sesión.');
    } finally {
      setEntrando(false);
    }
  };

  return (
    <View style={styles.campos}>
      {error ? (
        <View accessibilityRole="alert" style={styles.error}>
          <Text style={styles.textoError}>{error}</Text>
        </View>
      ) : null}
      <Campo
        etiqueta="Correo electrónico"
        placeholder={rol === 'familia' ? 'tu@email.com' : 'terapeuta@centro.es'}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <Campo etiqueta="Contraseña" placeholder="••••••••" secureTextEntry value={contrasena} onChangeText={setContrasena} onSubmitEditing={enviar} />
      <View style={{ alignItems: 'flex-end' }}>
        <Boton titulo="¿Olvidaste tu contraseña?" variante="enlace" pequeno />
      </View>
      <Boton titulo={entrando ? 'Entrando…' : 'Entrar'} deshabilitado={entrando} onPress={enviar} />
      {modoDemo ? <Text style={styles.demo}>Modo demo: sin Supabase configurado se entra sin comprobar la cuenta.</Text> : null}
    </View>
  );
}

function FormularioRegistro({ rol, onEntrar }: { rol: Rol; onEntrar: () => void }) {
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
  return (
    <View style={styles.campos}>
      <View style={styles.dosColumnas}>
        <Campo etiqueta="Nombre" placeholder="Ana" />
        <Campo etiqueta="Apellidos" placeholder="García López" />
      </View>
      <Campo etiqueta="Correo electrónico" placeholder="tu@email.com" keyboardType="email-address" autoCapitalize="none" />
      {rol === 'familia' ? (
        <Campo
          etiqueta="Código de invitación"
          obligatorio
          placeholder="Ej. CTMAD-2024-ABC"
          autoCapitalize="characters"
          ayuda="Te lo facilita tu terapeuta al darte de alta."
        />
      ) : (
        <>
          <Campo etiqueta="Número de colegiado" placeholder="ej. 28/12345" />
          <Campo etiqueta="Centro de trabajo" placeholder="Centro Atención Temprana Madrid" />
        </>
      )}
      <Campo etiqueta="Contraseña" placeholder="Mínimo 8 caracteres" secureTextEntry />
      <View style={styles.privacidad}>
        <Switch
          value={aceptaPrivacidad}
          onValueChange={setAceptaPrivacidad}
          trackColor={{ true: colores.primario, false: colores.borde }}
          accessibilityLabel="Acepto la política de privacidad"
        />
        <Text style={styles.textoPrivacidad}>
          Acepto la <Text style={styles.enlace}>política de privacidad</Text> y el tratamiento de datos conforme al RGPD.
        </Text>
      </View>
      <Boton titulo="Crear cuenta" onPress={onEntrar} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  pantalla: { flex: 1, flexDirection: 'row', backgroundColor: colores.fondo },
  panelMarca: { width: '50%', backgroundColor: colores.primario, padding: 48, justifyContent: 'space-between' },
  lema: { fontFamily: fuentes.texto, fontStyle: 'italic', fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  claim: { fontFamily: fuentes.tituloFuerte, fontSize: 36, lineHeight: 42, color: colores.blanco, marginBottom: 16 },
  textoMarca: { fontFamily: fuentes.tituloMedio, fontSize: 16, lineHeight: 24, color: 'rgba(255,255,255,0.8)', maxWidth: 320 },
  ventaja: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  textoVentaja: { fontFamily: fuentes.tituloMedio, fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  legal: { fontFamily: fuentes.texto, fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  columnaFormulario: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
  logoMovil: { alignItems: 'center', marginBottom: 32 },
  lemaMovil: { fontFamily: fuentes.texto, fontStyle: 'italic', fontSize: 14, color: colores.textoApagado, marginTop: 4 },
  formulario: { width: '100%', maxWidth: 448 },
  selectorRol: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  botonRol: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radios.medio,
    borderWidth: 2,
    borderColor: colores.borde,
    backgroundColor: colores.tarjeta,
    alignItems: 'center',
  },
  botonRolActivo: { borderColor: colores.primario },
  textoRol: { fontFamily: fuentes.tituloMedio, fontSize: 14, color: colores.textoApagado },
  textoRolActivo: { color: colores.primario },
  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: radios.grande, borderWidth: 1, borderColor: colores.borde, overflow: 'hidden' },
  cuerpo: { padding: 28 },
  campos: { gap: 16 },
  dosColumnas: { flexDirection: 'row', gap: 12 },
  privacidad: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 4 },
  textoPrivacidad: { flex: 1, fontFamily: fuentes.texto, fontSize: 12, lineHeight: 18, color: colores.textoApagado },
  enlace: { color: colores.primario, textDecorationLine: 'underline' },
  error: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: radios.medio, paddingHorizontal: 16, paddingVertical: 12 },
  textoError: { fontFamily: fuentes.texto, fontSize: 14, color: '#B91C1C' },
  demo: { fontFamily: fuentes.texto, fontSize: 11, color: colores.textoTenue, textAlign: 'center' },
});
