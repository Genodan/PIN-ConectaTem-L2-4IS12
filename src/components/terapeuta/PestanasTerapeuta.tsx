import { useRouter } from 'expo-router';

import { PRACTICAS } from '../../datos/prototipo';
import { Pestanas } from '../estructura';

type Seccion = 'bandeja' | 'fichas' | 'tareas';
const RUTAS = { bandeja: '/terapeuta', fichas: '/terapeuta/fichas', tareas: '/terapeuta/tareas' } as const;

// Pestañas de la columna izquierda del panel de la terapeuta
export function PestanasTerapeuta({ activa }: { activa: Seccion }) {
  const router = useRouter();
  const pendientes = PRACTICAS.filter((p) => p.estado === 'pendiente').length;
  return (
    <Pestanas<Seccion>
      opciones={[
        { id: 'bandeja', texto: '📥 Bandeja', contador: pendientes },
        { id: 'fichas', texto: '🗂️ Fichas' },
        { id: 'tareas', texto: '📋 Tareas' },
      ]}
      activa={activa}
      onCambiar={(id) => router.navigate(RUTAS[id])}
    />
  );
}
