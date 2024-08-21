const webpack = require('webpack');
const { addWebpackAlias, override } = require('customize-cra');
const path = require('path');

module.exports = override(
  // Add the @ alias
  addWebpackAlias({
    '@': path.resolve(__dirname, 'src'),
  }),

  // Add fallbacks for node core modules
  (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "url": require.resolve("url/"),
      "util": require.resolve("util/"),
      "zlib": require.resolve("browserify-zlib"),
      "stream": require.resolve("stream-browserify"),
      "assert": require.resolve("assert/"),
      "constants": require.resolve("constants-browserify"),
      "crypto": require.resolve("crypto-browserify"),
      "path": require.resolve("path-browserify"),
      "fs": false,
      "net": false,
      "os": false,
    };

    // Ignore node_modules that are meant for Node.js environment
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(express|send)$/,
      })
    );

    return config;
  }
);