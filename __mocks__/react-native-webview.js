// Jest no tiene el módulo nativo de react-native-webview (RNCWebViewModule): se sustituye por una vista vacía.
// Lo usa ReproductorVideoGuia (vídeos de YouTube), que se carga desde src/app/familia/index.tsx.
const React = require('react');
const { View } = require('react-native');

const WebView = React.forwardRef((props, ref) => React.createElement(View, { testID: 'webview-mock', ...props, ref }));
WebView.displayName = 'WebView';

module.exports = { WebView, default: WebView };
