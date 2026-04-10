import tseslint from 'typescript-eslint'

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/composables/useAuth', '**/composables/useRole'],
          message: 'Use useViewer() instead.'
        }]
      }]
    }
  },
  {
    // useViewer and the router guard are the only permitted consumers of useAuth/useRole
    files: [
      'src/composables/useViewer.ts',
      'src/router/index.ts',
    ],
    rules: { 'no-restricted-imports': 'off' }
  }
)
