import { TextStyle } from 'react-native';

// Nueva interfaz KAIRÓS · tokens del «Design system» de Figma (archivo de las diseñadoras, página «Design system»).
// Colores con nombre en Figma y los tonos auxiliares que usan las pantallas.
export const colores = {
  negro: '#222222', // «black»
  texto: '#242424',
  textoSecundario: '#595959',
  amarillo: '#FFB500', // «Yellow»
  amarilloSuave: '#FFD572', // «Low/Yellow»
  azul: '#8EBFE8', // «Blue»
  naranja: '#FC6E48', // «Orange»
  verde: '#00936D', // «Green»
  gris: '#C6C6C6', // «Grey»
  grisOscuro: '#777777', // «gris» (botón «Invitar a un nuevo paciente», textos de ayuda)
  verdeOscuro: '#00664C', // estado «Completada»
  rojo: '#A3321B', // estado «Vencida» y acciones delicadas (traspasar)
  fondo: '#F3F2F5', // fondo de pantalla
  blanco: '#FFFFFF',
  bordeCabecera: '#D5D5D5',
  barraProgresoFondo: '#DCE4E0',
  diaSemana: '#5A6560',
  diaFueraDeMes: '#7A847F',
};

// Familias cargadas en src/app/_layout.tsx con @expo-google-fonts
export const fuentes = {
  titulo: 'Changa_600SemiBold', // títulos de pantalla
  regular: 'DMSans_400Regular',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  navRegular: 'Inter_400Regular', // barra de navegación
  navSemibold: 'Inter_600SemiBold',
};

// Estilos de texto con nombre en Figma («Desktop/…», «Body semibold»)
export const textos: Record<string, TextStyle> = {
  titulo: { fontFamily: fuentes.titulo, fontSize: 48, lineHeight: 58, color: colores.texto }, // Desktop/Title
  tituloSeccion: { fontFamily: fuentes.bold, fontSize: 24, color: colores.texto }, // Desktop/Section Tittle
  numero: { fontFamily: fuentes.semibold, fontSize: 36 }, // Desktop/Numbers
  cuerpoGrande: { fontFamily: fuentes.semibold, fontSize: 16, color: colores.texto }, // Desktop/Big Bold Body
  cuerpo: { fontFamily: fuentes.regular, fontSize: 14, color: colores.texto }, // Desktop/Body
  cuerpoSemibold: { fontFamily: fuentes.semibold, fontSize: 14, color: colores.texto }, // Body semibold
  nombre: { fontFamily: fuentes.semibold, fontSize: 15, color: colores.texto }, // Mobile/Text/15 bold
  micro: { fontFamily: fuentes.regular, fontSize: 12, color: colores.texto }, // Mobile/Micro text/text
  microSemibold: { fontFamily: fuentes.semibold, fontSize: 12, color: colores.texto }, // Mobile/Micro text/semibold
};
