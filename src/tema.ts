// Tema visual de ConecTEM, sacado del prototipo de Figma Make (src/index.css).
// Usad siempre estos valores en vez de escribir colores o fuentes a mano.

export const colores = {
  fondo: '#F7F5F0',
  texto: '#1E2A22',
  tarjeta: '#FFFFFF',
  primario: '#3D8B7A',
  primarioOscuro: '#2D6E5F',
  primarioSuave: '#EAF4F1',
  primarioBorde: '#CFE4DD',
  secundarioTexto: '#2D5F55',
  apagado: '#EEE9E0',
  textoApagado: '#7A8077',
  textoTenue: '#B0ACA5',
  textoLectura: '#4A4F47',
  campoLectura: '#F0EEE8',
  borde: '#DDD9D0',
  acento: '#F59C4A',
  // Avisos y bloques del feedback (punto fuerte / a mejorar / foco)
  avisoFondo: '#FEF9F0',
  avisoBorde: '#F5D9A8',
  avisoTexto: '#C47A1A',
  avisoTextoOscuro: '#7A5A1A',
  nuevoFondo: '#FEF0DC',
  focoFondo: '#F4EFF7',
  focoTexto: '#765589',
  iaBorde: '#B8D8CF',
  oscuro: '#1E2A22',
  blanco: '#FFFFFF',
};

// Nombres con los que se cargan en src/app/_layout.tsx (useFonts)
export const fuentes = {
  titulo: 'Nunito_700Bold',
  tituloFuerte: 'Nunito_800ExtraBold',
  tituloMedio: 'Nunito_600SemiBold',
  texto: 'Inter_400Regular',
  textoMedio: 'Inter_500Medium',
  textoFuerte: 'Inter_600SemiBold',
};

export const radios = { pequeno: 8, medio: 12, grande: 16, completo: 999 };

// A partir de este ancho se usa la distribución de escritorio del prototipo (barra lateral)
export const ANCHO_ESCRITORIO = 768;
