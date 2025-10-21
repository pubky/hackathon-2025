const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env) => {
  const target = env.target || 'chrome';
  const isChrome = target === 'chrome';

  return {
    mode: 'development',
    devtool: 'cheap-module-source-map', // Don't use eval for source maps
    entry: {
      background: './src/background/background.js',
      popup: './src/ui/popup.js'
    },
    output: {
      path: path.resolve(__dirname, `dist/${target}`),
      filename: '[name].js',
      clean: true
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          {
            from: isChrome ? 'manifest.v3.json' : 'manifest.v2.json',
            to: 'manifest.json'
          },
          {
            from: 'src/ui/popup.html',
            to: 'popup.html'
          },
          {
            from: 'src/ui/popup.css',
            to: 'popup.css'
          },
          {
            from: 'icons',
            to: 'icons'
          }
        ]
      })
    ],
    resolve: {
      extensions: ['.js']
    }
  };
};

