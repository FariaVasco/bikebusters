const webpack = require('webpack');

module.exports = function override(config, env) {
  // Add fallbacks for node core modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "http": false,
    "https": false,
    "url": false,
    "util": false,
    "zlib": false,
    "stream": false,
    "assert": false,
    "constants": false,
    "crypto": false,
    "path": false,
    "fs": false,
    "net": false,
    "os": false,
  };

  // Ignore node_modules that are meant for Node.js environment
  config.plugins.push(
    new webpack.IgnorePlugin({
      resourceRegExp: /^(express|send|http|https|path|crypto|util|zlib|stream|assert|constants|fs|net|os)$/,
    })
  );

  return config;
};