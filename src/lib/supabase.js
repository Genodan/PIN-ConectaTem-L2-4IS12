// Cliente de Supabase según la guía oficial de Expo (docs.expo.dev/guides/using-supabase).
// En iOS/Android, expo-sqlite proporciona el localStorage donde se guarda la sesión;
// en web se usa el localStorage del navegador.
import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// La clave "publishable" está pensada para ir en la app: la seguridad de los datos
// depende de las políticas RLS de la base de datos. La clave secreta (service_role)
// y la de Gemini NUNCA van aquí: solo en los secretos de las Edge Functions.
export const supabaseConfigurado = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = supabaseConfigurado
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        storage: localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

if (!supabaseConfigurado) {
  console.warn('Supabase sin configurar: copia .env.example a .env.local y rellena los valores.');
}

// Renueva el token de sesión solo mientras la app está en primer plano.
if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
