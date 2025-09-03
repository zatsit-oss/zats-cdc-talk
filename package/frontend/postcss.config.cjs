module.exports = {
  plugins: {
    // Use require to ensure PostCSS loads the plugin correctly
    '@tailwindcss/postcss': require('@tailwindcss/postcss'),
    autoprefixer: require('autoprefixer'),
  },
}
