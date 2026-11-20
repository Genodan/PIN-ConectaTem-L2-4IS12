import { render, screen } from '@testing-library/react-native';

import { MarcaInsignias, RachaFamilia } from '../src/components/RachaFamilia';
import { PracticaFamilia } from '../src/services/panelFamiliaService';
import { calcularRacha } from '../src/services/rachaService';

// Prueba de aceptación de la UT 1449 "Mejora del sistema de insignias" (Worki).
// Datos inventados; «hoy» es el viernes 20/11/2026.
const HOY = new Date(2026, 10, 20, 12);
const dia = (mes: number, d: number) => new Date(2026, mes - 1, d, 10).toISOString();
const ESPEJO = { id: 'espejo', titulo: 'El Espejo', objetivo: null, video_guia_url: null, ideas_materiales: null };

const enviada = (id: string, fechaEnvio: string, feedbackEn: string | null = null): PracticaFamilia => ({
  id,
  estado: feedbackEn ? 'evaluada' : 'completada',
  fecha_asignacion: null,
  fecha_envio: fechaEnvio,
  modulos: ESPEJO,
  feedback: feedbackEn ? { transcripcion: null, resumen_estructurado: null, enviado_en: feedbackEn, audio_url: null } : null,
});

const pintar = async (practicas: PracticaFamilia[]) => render(<RachaFamilia resumen={calcularRacha(practicas, HOY)} />);

describe('UT 1449 · Racha semanal e insignias de la familia', () => {
  it('Marta ve cuántas semanas seguidas llevan practicando, su mejor racha y las insignias conseguidas', async () => {
    // Condición: la familia de Hugo ha enviado prácticas las 4 últimas semanas y repitió una tras el feedback
    await pintar([
      enviada('p1', dia(10, 28), dia(10, 30)),
      enviada('p2', dia(11, 4)),
      enviada('p3', dia(11, 11)),
      enviada('p4', dia(11, 18)),
    ]);

    expect(screen.getByText('Lleváis 4 semanas seguidas practicando juntos.')).toBeOnTheScreen();
    expect(screen.getByText('Vuestra mejor racha: 4 semanas · Prácticas enviadas: 4')).toBeOnTheScreen();
    expect(screen.getByText('Primer paso')).toBeOnTheScreen();
    expect(screen.getByText('Constancia')).toBeOnTheScreen();
    expect(screen.getByText('Lo volvemos a intentar')).toBeOnTheScreen();
  });

  it('si una semana no practican, el mensaje sigue siendo positivo y se conserva lo conseguido', async () => {
    await pintar([enviada('p1', dia(10, 21)), enviada('p2', dia(10, 28)), enviada('p3', dia(11, 4))]);

    expect(screen.getByText('Esta semana es una buena ocasión para practicar juntos.')).toBeOnTheScreen();
    expect(screen.getByText('Vuestra mejor racha: 3 semanas · Prácticas enviadas: 3')).toBeOnTheScreen();
    // Nunca se habla de perder la racha
    expect(screen.queryByText(/perd|perdi|has perdido|fallad/i)).toBeNull();
  });

  it('una familia que aún no ha enviado nada ve un mensaje de bienvenida, sin insignias ni contadores', async () => {
    await pintar([]);

    expect(screen.getByText('Cuando enviéis vuestra primera práctica, aquí veréis vuestro camino juntos.')).toBeOnTheScreen();
    expect(screen.queryByText(/mejor racha/)).toBeNull();
    expect(screen.queryByText('Primer paso')).toBeNull();
  });
});

describe('UT 1449 · Marca de la insignia en el historial', () => {
  it('encima de la práctica donde se consiguió, se indica qué insignia fue', async () => {
    const resumen = calcularRacha([enviada('p1', dia(11, 18))], HOY);

    await render(<MarcaInsignias insignias={resumen.insignias} />);

    expect(screen.getByText('Aquí conseguisteis la insignia «Primer paso»')).toBeOnTheScreen();
  });
});
