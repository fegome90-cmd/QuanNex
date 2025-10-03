# 📋 CLASIFICACIÓN DE ARCHIVOS PARA LINTING ESTRATÉGICO

**Fecha**: 2025-10-03  
**Objetivo**: Definir niveles de calidad de código por tipo de archivo  
**Estado**: 🔄 En desarrollo  

## 🎯 ESTRATEGIA DE CLASIFICACIÓN

### **NIVEL 1: CRÍTICO - CÓDIGO PERFECTO REQUERIDO** 🔴
*Archivos que deben tener código perfecto, sin errores de linting*

#### **Core System Files**
- `package.json` - Configuración del proyecto
- `tsconfig.json` - Configuración TypeScript
- `eslint.config.js` - Configuración ESLint
- `vitest.config.ts` - Configuración de tests
- `claude-project-init.sh` - Script principal del kit

#### **Security & Policy Files**
- `core/security/**` - Archivos de seguridad
- `core/rules-enforcer.js` - Enforzador de reglas
- `core/rules-protection-system.js` - Sistema de protección
- `core/integrity-validator.js` - Validador de integridad
- `scripts/audit-git-bypasses.mjs` - Auditoría de seguridad

#### **Configuration Files**
- `config/**` - Archivos de configuración
- `contracts/**` - Contratos del sistema
- `schemas/**` - Esquemas de validación
- `policies/**` - Políticas del sistema

#### **Main Entry Points**
- `orchestrator.js` - Orquestador principal
- `src/**` - Código fuente principal
- `packages/quannex-mcp/**` - Paquete MCP principal

### **NIVEL 2: ALTO - CÓDIGO LIMPIO REQUERIDO** 🟡
*Archivos que deben tener código limpio, con warnings permitidos*

#### **Active Agents**
- `agents/base/**` - Agentes base
- `agents/context/**` - Agentes de contexto
- `agents/security/**` - Agentes de seguridad
- `agents/metrics/**` - Agentes de métricas

#### **Core Libraries**
- `core/attribution-manager.js` - Gestor de atribución
- `core/centralized-logger.js` - Logger centralizado
- `core/auto-rules-hook.js` - Hook de reglas automáticas
- `core/taskdb-protection.js` - Protección de TaskDB

#### **Active Scripts**
- `scripts/quality-gate.mjs` - Gate de calidad
- `scripts/scan-gate.mjs` - Gate de escaneo
- `scripts/policy-check.mjs` - Verificación de políticas
- `scripts/report-validate.mjs` - Validación de reportes

#### **Tests & Validation**
- `tests/contracts/**` - Tests de contratos
- `tests/security/**` - Tests de seguridad
- `tests/integration/**` - Tests de integración

### **NIVEL 3: MEDIO - CÓDIGO FUNCIONAL** 🟢
*Archivos que deben funcionar, con errores menores permitidos*

#### **Utility Scripts**
- `scripts/**` (excepto los críticos) - Scripts utilitarios
- `tools/**` - Herramientas de desarrollo
- `utils/**` - Utilidades generales

#### **Examples & Templates**
- `examples/**` - Ejemplos de uso
- `templates/**` - Plantillas del sistema
- `docs/**` - Documentación

#### **Development Tools**
- `ops/**` - Operaciones de desarrollo
- `quality-tests/**` - Tests de calidad
- `experiments/**` - Experimentos

### **NIVEL 4: BAJO - CÓDIGO LEGACY** 🔵
*Archivos que pueden tener código legacy, sin verificación estricta*

#### **Archived & Legacy**
- `archived/**` - Archivos archivados
- `backups/**` - Backups del sistema
- `legacy/**` - Código legacy
- `versions/**` - Versiones anteriores

#### **Generated & Temporary**
- `dist/**` - Archivos compilados
- `node_modules/**` - Dependencias
- `logs/**` - Archivos de log
- `out/**` - Archivos de salida
- `tmp/**` - Archivos temporales

#### **Test Files**
- `test-files/**` - Archivos de prueba
- `test-server.mjs` - Servidor de prueba
- `debug-metrics.mjs` - Métricas de debug

## 🛠️ IMPLEMENTACIÓN DE LINTING SELECTIVO

### **Configuración ESLint por Niveles**

```javascript
// eslint.config.js
export default [
  // Nivel 1: Crítico - Código perfecto
  {
    files: [
      'package.json',
      'tsconfig.json', 
      'eslint.config.js',
      'claude-project-init.sh',
      'core/security/**',
      'core/rules-*.js',
      'core/integrity-validator.js',
      'scripts/audit-git-bypasses.mjs',
      'config/**',
      'contracts/**',
      'schemas/**',
      'policies/**',
      'orchestrator.js',
      'src/**',
      'packages/quannex-mcp/**'
    ],
    rules: {
      // Reglas estrictas - código perfecto
      'no-console': 'error',
      'no-debugger': 'error',
      'no-unused-vars': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error'
    }
  },

  // Nivel 2: Alto - Código limpio
  {
    files: [
      'agents/**',
      'core/attribution-manager.js',
      'core/centralized-logger.js',
      'core/auto-rules-hook.js',
      'core/taskdb-protection.js',
      'scripts/quality-gate.mjs',
      'scripts/scan-gate.mjs',
      'scripts/policy-check.mjs',
      'scripts/report-validate.mjs',
      'tests/contracts/**',
      'tests/security/**',
      'tests/integration/**'
    ],
    rules: {
      // Reglas moderadas - código limpio
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-unused-vars': 'warn',
      'prefer-const': 'warn',
      'no-var': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  },

  // Nivel 3: Medio - Código funcional
  {
    files: [
      'scripts/**',
      'tools/**',
      'utils/**',
      'examples/**',
      'templates/**',
      'docs/**',
      'ops/**',
      'quality-tests/**',
      'experiments/**'
    ],
    rules: {
      // Reglas básicas - código funcional
      'no-console': 'off',
      'no-debugger': 'error',
      'no-unused-vars': 'off',
      'prefer-const': 'off',
      'no-var': 'off'
    }
  },

  // Nivel 4: Bajo - Código legacy (excluido)
  {
    files: [
      'archived/**',
      'backups/**',
      'legacy/**',
      'versions/**',
      'dist/**',
      'node_modules/**',
      'logs/**',
      'out/**',
      'tmp/**',
      'test-files/**',
      'test-server.mjs',
      'debug-metrics.mjs'
    ],
    rules: {
      // Sin reglas - código legacy
    }
  }
];
```

## 📊 MÉTRICAS DE CALIDAD POR NIVEL

### **Nivel 1 - Crítico**
- **Errores**: 0 permitidos
- **Warnings**: 0 permitidos
- **Cobertura**: 100% requerida
- **Tests**: Obligatorios

### **Nivel 2 - Alto**
- **Errores**: 0 permitidos
- **Warnings**: Máximo 5 por archivo
- **Cobertura**: 90% requerida
- **Tests**: Recomendados

### **Nivel 3 - Medio**
- **Errores**: Máximo 2 por archivo
- **Warnings**: Máximo 10 por archivo
- **Cobertura**: 70% requerida
- **Tests**: Opcionales

### **Nivel 4 - Bajo**
- **Errores**: Sin verificación
- **Warnings**: Sin verificación
- **Cobertura**: Sin verificación
- **Tests**: Sin verificación

## 🎯 BENEFICIOS DE LA CLASIFICACIÓN

### **1. Desarrollo Más Eficiente**
- ✅ Enfoque en archivos críticos
- ✅ Menos interrupciones por errores menores
- ✅ Desarrollo más fluido

### **2. Calidad Garantizada**
- ✅ Archivos críticos con código perfecto
- ✅ Seguridad y estabilidad aseguradas
- ✅ Mantenibilidad mejorada

### **3. Flexibilidad Apropiada**
- ✅ Código legacy sin bloqueos
- ✅ Experimentos sin restricciones
- ✅ Documentación sin verificación estricta

## 📋 PLAN DE IMPLEMENTACIÓN

### **Fase 1: Configuración (1 día)**
1. ✅ Actualizar `eslint.config.js` con niveles
2. ✅ Probar configuración en archivos de cada nivel
3. ✅ Documentar reglas por nivel

### **Fase 2: Validación (2 días)**
1. 🔄 Ejecutar linting en todos los archivos
2. 🔄 Verificar que archivos críticos pasen
3. 🔄 Ajustar reglas según resultados

### **Fase 3: Documentación (1 día)**
1. 📝 Crear guías de desarrollo por nivel
2. 📝 Documentar estándares de calidad
3. 📝 Capacitar al equipo

## 🚀 PRÓXIMOS PASOS

1. **Implementar configuración ESLint por niveles**
2. **Probar en archivos representativos de cada nivel**
3. **Ajustar reglas según resultados**
4. **Documentar estándares de calidad**
5. **Capacitar al equipo en la nueva estrategia**

---

**Estado**: 🔄 En desarrollo  
**Próxima revisión**: 2025-10-04  
**Responsable**: Equipo de Desarrollo QuanNex
