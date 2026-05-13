// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    files: ['**/*.ts', '**/*.vue'],
    rules: {
      // Disallow any — use unknown and narrow explicitly
      'no-undef': 'off', // TypeScript handles this
    },
  },
)
