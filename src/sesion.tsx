// Sesión del usuario (Supabase Auth). Si Supabase no está configurado (.env.local vacío,
// por ejemplo en GitHub Actions) la app funciona en "modo demo" con los datos del prototipo.
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { supabase } from './lib/supabase';

export type Rol = 'terapeuta' | 'familia';
export type Usuario = { id: string; nombre: string; rol: Rol };

type ContextoSesion = {
  usuario: Usuario | null;
  cargando: boolean;
  modoDemo: boolean;
  iniciarSesion: (email: string, contrasena: string) => Promise<Usuario>;
  cerrarSesion: () => Promise<void>;
};

const Contexto = createContext<ContextoSesion | null>(null);

// Evita que "Entrando…" se quede colgado si el servidor no responde
const LIMITE_MS = 15000;
function conTiempoLimite<T>(promesa: Promise<T>): Promise<T> {
  return new Promise((resolver, rechazar) => {
    const temporizador = setTimeout(
      () => rechazar(new Error('No se ha podido conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.')),
      LIMITE_MS,
    );
    promesa.then(resolver, rechazar).finally(() => clearTimeout(temporizador));
  });
}

// Una cuenta es de terapeuta si tiene fila en la tabla terapeutas (la crea el trigger handle_new_user)
async function cargarPerfil(id: string, email: string): Promise<Usuario> {
  if (!supabase) throw new Error('Supabase sin configurar');
  const { data, error } = await supabase.from('terapeutas').select('nombre').eq('id', id).maybeSingle();
  if (error) throw new Error('No se pudo cargar tu perfil: ' + error.message);
  if (data) return { id, nombre: data.nombre, rol: 'terapeuta' };
  return { id, nombre: email.split('@')[0], rol: 'familia' };
}

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(supabase !== null);

  // Recupera la sesión guardada al abrir la app (o al recargar la página en web)
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      const sesion = data.session;
      if (sesion) {
        try {
          setUsuario(await cargarPerfil(sesion.user.id, sesion.user.email ?? ''));
        } catch {
          setUsuario(null);
        }
      }
      setCargando(false);
    });
  }, []);

  const iniciarSesion = async (email: string, contrasena: string) => {
    if (!supabase) throw new Error('Supabase sin configurar');
    const { data, error } = await conTiempoLimite(supabase.auth.signInWithPassword({ email: email.trim(), password: contrasena }));
    if (error || !data.user) throw new Error('El correo o la contraseña no son correctos. Vuelve a intentarlo.');
    const perfil = await conTiempoLimite(cargarPerfil(data.user.id, data.user.email ?? ''));
    setUsuario(perfil);
    return perfil;
  };

  const cerrarSesion = async () => {
    if (supabase) await supabase.auth.signOut();
    setUsuario(null);
  };

  return (
    <Contexto.Provider value={{ usuario, cargando, modoDemo: supabase === null, iniciarSesion, cerrarSesion }}>
      {children}
    </Contexto.Provider>
  );
}

export function useSesion() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useSesion tiene que usarse dentro de <ProveedorSesion>');
  return contexto;
}
