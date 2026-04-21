import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // Enforce consistent typing
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    // Vue
    'vue/multi-word-component-names': 'off', // pages like index.vue are fine
    'vue/require-default-prop': 'error',
    'vue/component-api-style': ['error', ['script-setup']],
    // General
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'eqeqeq': ['error', 'always'],
  },
})
