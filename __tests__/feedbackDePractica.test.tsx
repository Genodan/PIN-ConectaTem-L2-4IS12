import React from 'react';
import { render } from '@testing-library/react-native';
import { FeedbackDePractica } from '../src/components/FeedbackDePractica';

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn() }),
  useAudioPlayerStatus: () => ({ playing: false, didJustFinish: false, currentTime: 0, duration: 60 }),
}));

jest.mock('../src/utils/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://storage/audio.m4a' }, error: null }),
      }),
    },
  },
}));

describe('Componente FeedbackDePractica', () => {
  const resumenIAEjemplo = {
    a_mejorar: 'Sin indicaciones',
    foco_semana: 'Esperar un par de segundos más antes de darle el refuerzo para ver si mantiene la atención más tiempo.',
    punto_fuerte: 'Le ha ido muy bien interactuando con los bloques y logró imitar el movimiento de aplaudir.',
  };

  // UT 1353: antes de que la terapeuta apruebe, la familia solo oye la nota de voz
  it('antes de la aprobación solo muestra el audio: ni transcripción ni resumen de la IA', async () => {
    const feedback = {
      transcripcion: 'Hola familia, el niño ha trabajado muy bien hoy.',
      resumen_aprobado: false,
      resumen_escrito: null,
      resumen_estructurado: resumenIAEjemplo,
      audio_url: 'tarea-1-123.m4a',
    };

    const screen = await render(<FeedbackDePractica feedback={feedback} />);

    expect(await screen.findByText('Escuchar evaluación del terapeuta')).toBeOnTheScreen();
    expect(screen.queryByText('Transcripción de la nota de voz:')).toBeNull();
    expect(screen.queryByText('Hola familia, el niño ha trabajado muy bien hoy.')).toBeNull();
    expect(screen.queryByText('✨ Generado con IA')).toBeNull();
    expect(screen.queryByText(/Le ha ido muy bien interactuando con los bloques/)).toBeNull();
  });

  it('si el resumen IA se acepta, muestra el resumen estructurado y la etiqueta de Generado con IA', async () => {
    const feedback = {
      transcripcion: 'Transcripción de prueba.',
      resumen_aprobado: true,
      resumen_escrito: null,
      resumen_estructurado: resumenIAEjemplo,
      audio_url: null,
    };

    const screen = await render(<FeedbackDePractica feedback={feedback} />);

    // Transcripción visible
    expect(screen.getByText('Transcripción de prueba.')).toBeOnTheScreen();

    // Etiqueta de generado con IA
    expect(screen.getByText('✨ Generado con IA')).toBeOnTheScreen();

    // Apartados del resumen
    expect(screen.getByText(/Le ha ido muy bien interactuando con los bloques/)).toBeOnTheScreen();
    expect(screen.getByText(/Sin indicaciones/)).toBeOnTheScreen();
    expect(screen.getByText(/Esperar un par de segundos más/)).toBeOnTheScreen();
  });

  it('si el resumen se rechaza, muestra el campo resumen_escrito sin ningún icono', async () => {
    const feedback = {
      transcripcion: 'Transcripción de prueba.',
      resumen_aprobado: false,
      resumen_escrito: 'Resumen manual redactado por el terapeuta sin IA.',
      resumen_estructurado: resumenIAEjemplo,
      audio_url: null,
    };

    const screen = await render(<FeedbackDePractica feedback={feedback} />);

    // Transcripción visible
    expect(screen.getByText('Transcripción de prueba.')).toBeOnTheScreen();

    // NO debe aparecer la insignia de IA
    expect(screen.queryByText('✨ Generado con IA')).toBeNull();

    // Aparece el resumen escrito sin iconos
    expect(screen.getByText('Resumen escrito:')).toBeOnTheScreen();
    expect(screen.getByText('Resumen manual redactado por el terapeuta sin IA.')).toBeOnTheScreen();

    // Los puntos del resumen IA no deben mostrarse
    expect(screen.queryByText(/Le ha ido muy bien interactuando con los bloques/)).toBeNull();
  });

  it('soporta tanto foco_semana como foco_proxima_semana en el resumen IA', async () => {
    const feedbackConFocoProxima = {
      transcripcion: 'Nota de voz.',
      resumen_aprobado: true,
      resumen_escrito: null,
      resumen_estructurado: {
        punto_fuerte: 'Buen contacto visual.',
        a_mejorar: 'Paciencia en turnos.',
        foco_proxima_semana: 'Repetir la práctica dos veces al día.',
      },
      audio_url: null,
    };

    const screen = await render(<FeedbackDePractica feedback={feedbackConFocoProxima} />);

    expect(screen.getByText('✨ Generado con IA')).toBeOnTheScreen();
    expect(screen.getByText(/Repetir la práctica dos veces al día./)).toBeOnTheScreen();
  });
});
