/**
 * .eslintrc.structure.js
 * Reglas de ESLint para validar estructura del proyecto
 */
module.exports = {
  rules: {
    // Regla personalizada para validar imports
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['../*'],
            message: 'Usa imports desde shared/ en lugar de ../',
          },
          {
            group: ['../../*'],
            message: 'Usa imports desde shared/ en lugar de ../../',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['versions/**/*.js'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['../orchestration/*'],
                message: 'Usa imports desde shared/ en lugar de ../orchestration/',
              },
              {
                group: ['../agents/*'],
                message: 'Usa imports desde shared/ en lugar de ../agents/',
              },
            ],
          },
        ],
      },
    },
  ],
};
