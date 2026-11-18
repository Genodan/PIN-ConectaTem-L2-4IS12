// Jest no tiene el módulo nativo de expo-av (ExponentAV): se sustituye por un componente de vídeo vacío.
// Lo usa ReproductorVideoGuia, que se carga desde src/app/familia/index.tsx.
const React = require('react');
const { View } = require('react-native');

const Video = React.forwardRef((props, ref) => React.createElement(View, { testID: 'video-mock', ...props, ref }));
Video.displayName = 'Video';

module.exports = {
  Video,
  ResizeMode: { CONTAIN: 'contain', COVER: 'cover', STRETCH: 'stretch' },
};
