import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

// «Login» simulado de la terapeuta (el mismo selector «¿Quién eres?» de siempre), compartido entre las
// pestañas de la nueva interfaz (Inicio, Pacientes, Prácticas, Evidencias). Se sustituirá por el login real.
export interface TerapeutaSimulada {
  id: string;
  nombre: string;
}

interface ValorSesion {
  terapeutas: TerapeutaSimulada[];
  terapeutaActual: string | null;
  nombreActual: string | null;
  cargando: boolean;
  elegirTerapeuta: (id: string) => void;
  // Sube cuando se crea/edita un módulo o se da de alta un paciente: otras secciones recargan sus datos
  datosVersion: number;
  alCambiarDatos: () => void;
}

const SesionTerapeutaContext = createContext<ValorSesion | null>(null);

export const SesionTerapeutaProvider = ({ children }: { children: React.ReactNode }) => {
  const [terapeutas, setTerapeutas] = useState<TerapeutaSimulada[]>([]);
  const [terapeutaActual, setTerapeutaActual] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [datosVersion, setDatosVersion] = useState(0);

  useEffect(() => {
    let activo = true;
    (async () => {
      const { data, error } = await supabase.from('terapeutas').select('id, nombre');
      if (!activo) return;
      if (!error && data) {
        const lista = data as TerapeutaSimulada[];
        setTerapeutas(lista);
        // Si hay terapeutas, se elige la primera por defecto (como antes)
        setTerapeutaActual((actual) => actual ?? lista[0]?.id ?? null);
      }
      setCargando(false);
    })();
    return () => {
      activo = false;
    };
  }, []);

  const alCambiarDatos = useCallback(() => setDatosVersion((v) => v + 1), []);

  const nombreActual = terapeutas.find((t) => t.id === terapeutaActual)?.nombre ?? null;

  return (
    <SesionTerapeutaContext.Provider
      value={{
        terapeutas,
        terapeutaActual,
        nombreActual,
        cargando,
        elegirTerapeuta: setTerapeutaActual,
        datosVersion,
        alCambiarDatos,
      }}
    >
      {children}
    </SesionTerapeutaContext.Provider>
  );
};

export const useSesionTerapeuta = (): ValorSesion => {
  const valor = useContext(SesionTerapeutaContext);
  if (!valor) throw new Error('useSesionTerapeuta debe usarse dentro de SesionTerapeutaProvider');
  return valor;
};
