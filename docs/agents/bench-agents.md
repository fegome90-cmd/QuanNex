# Bench Agents - Benchmarks Reproducibles

**PR-K: Benchmarks reproducibles / métricas de rendimiento**

## 📋 Descripción

Bench Agents es un sistema completo de benchmarks reproducibles para agentes de IA, proporcionando métricas detalladas de rendimiento, análisis de tendencias y recomendaciones automáticas para optimización.

## 🚀 Características

### ✅ Funcionalidades Principales

- **Benchmarks Automatizados**: Ejecución automática de benchmarks en agentes
- **Métricas Detalladas**: P50, P95, P99, min, max, mean para duración, CPU, memoria
- **Análisis de Tendencias**: Seguimiento de rendimiento a lo largo del tiempo
- **Reportes HTML**: Visualización interactiva de resultados
- **Recomendaciones**: Sugerencias automáticas de optimización
- **Comparación**: Análisis comparativo entre diferentes versiones
- **Configuración Flexible**: Parámetros personalizables para diferentes escenarios

### 🏗️ Arquitectura

```
Bench Agents
├── BenchAgents - Ejecutor de benchmarks
├── BenchMetrics - Analizador de métricas
├── Reportes JSON - Datos estructurados
├── Reportes HTML - Visualización
└── Tests Automatizados - Validación
```

## 📦 Instalación

### Requisitos

- Node.js 18+
- npm o yarn
- Agentes configurados (context, prompting, rules)

### Instalación Local

```bash
# Clonar el repositorio
git clone <repo-url>
cd startkit-main

# Instalar dependencias
npm install

# Verificar instalación
npm run bench:test
```

## 🛠️ Uso

### CLI Interface

```bash
# Benchmark rápido (5 iteraciones)
npm run bench:agents:quick

# Benchmark completo (20 iteraciones)
npm run bench:agents:full

# Benchmark personalizado
npm run bench:agents -- --iterations 10 --warmup 3 --timeout 30000

# Analizar métricas
npm run bench:metrics

# Ejecutar tests
npm run bench:test
```

### API Programática

```javascript
import BenchAgents from './tools/bench-agents.mjs';
import BenchMetrics from './tools/bench-metrics.mjs';

// Configurar benchmark
const bench = new BenchAgents({
  iterations: 10,
  warmup: 3,
  timeout: 30000,
  agents: ['context', 'prompting', 'rules']
});

// Ejecutar benchmark
const report = await bench.runBenchmark();

// Analizar métricas
const metrics = new BenchMetrics();
const analysis = await metrics.analyzeMetrics();
```

## 📊 Métricas Disponibles

### **Duración (ms)**
- **P50**: Mediana de duración
- **P95**: Percentil 95 de duración
- **P99**: Percentil 99 de duración
- **Min/Max**: Duración mínima y máxima
- **Mean**: Duración promedio

### **CPU (ms)**
- **P50**: Mediana de uso de CPU
- **P95**: Percentil 95 de uso de CPU
- **P99**: Percentil 99 de uso de CPU
- **Min/Max**: Uso mínimo y máximo de CPU
- **Mean**: Uso promedio de CPU

### **Memoria (bytes)**
- **P50**: Mediana de uso de memoria
- **P95**: Percentil 95 de uso de memoria
- **P99**: Percentil 99 de uso de memoria
- **Min/Max**: Uso mínimo y máximo de memoria
- **Mean**: Uso promedio de memoria

### **Throughput (ops/sec)**
- **P50**: Mediana de throughput
- **P95**: Percentil 95 de throughput
- **P99**: Percentil 99 de throughput
- **Min/Max**: Throughput mínimo y máximo
- **Mean**: Throughput promedio

## 🔧 Configuración

### Opciones de Configuración

```javascript
const config = {
  iterations: 10,           // Número de iteraciones
  warmup: 3,               // Iteraciones de warmup
  timeout: 30000,          // Timeout por iteración (ms)
  outputDir: './reports/bench', // Directorio de salida
  agents: ['context', 'prompting', 'rules'], // Agentes a benchmarkear
  metrics: ['duration', 'cpu', 'memory', 'throughput'] // Métricas a medir
};
```

### Variables de Entorno

```bash
# Directorio de reportes
export BENCH_OUTPUT_DIR="./reports/bench"

# Número de iteraciones
export BENCH_ITERATIONS="10"

# Timeout por iteración
export BENCH_TIMEOUT="30000"
```

## 📈 Análisis de Tendencias

### **Tendencias Disponibles**

- **Mejorando**: Rendimiento mejorando > 5%
- **Empeorando**: Rendimiento empeorando > 5%
- **Estable**: Cambio < 5%

### **Métricas de Tendencia**

```javascript
{
  duration: {
    first_value: 100,
    last_value: 120,
    change_percent: 20,
    trend: 'worsening'
  },
  cpu: {
    first_value: 50,
    last_value: 45,
    change_percent: -10,
    trend: 'improving'
  }
}
```

## 💡 Recomendaciones Automáticas

### **Tipos de Recomendaciones**

#### **Performance (Alta Prioridad)**
- Duración promedio alta (>2000ms)
- Sugerencia: Revisar algoritmos y optimizar operaciones costosas

#### **CPU (Prioridad Media)**
- Uso de CPU alto (>500ms)
- Sugerencia: Implementar procesamiento asíncrono o paralelo

#### **Memoria (Prioridad Media)**
- Uso de memoria alto (>50MB)
- Sugerencia: Implementar optimización de memoria y garbage collection

#### **Reliability (Prioridad Crítica)**
- Tasa de éxito baja (<90%)
- Sugerencia: Implementar mejor manejo de errores y validación

#### **Trend (Prioridad Alta)**
- Rendimiento empeorando
- Sugerencia: Investigar cambios recientes que puedan estar causando degradación

## 📊 Reportes

### **Estructura de Reporte JSON**

```json
{
  "benchmark_info": {
    "timestamp": "2025-01-27T10:00:00Z",
    "version": "1.0.0",
    "config": { ... },
    "total_duration": 5000
  },
  "summary": {
    "total_agents": 3,
    "total_iterations": 30,
    "successful_iterations": 29,
    "success_rate": 0.97,
    "duration": { "p50": 150, "p95": 300, "p99": 500 },
    "cpu": { "p50": 75, "p95": 150, "p99": 250 },
    "memory": { "p50": 1024000, "p95": 2048000, "p99": 4096000 },
    "best_agent": { "agent": "context", ... },
    "worst_agent": { "agent": "rules", ... }
  },
  "agents": [ ... ],
  "recommendations": [ ... ]
}
```

### **Reporte HTML**

- **Resumen General**: Métricas principales y estadísticas
- **Resultados por Agente**: Análisis detallado de cada agente
- **Tendencias**: Gráficos de evolución del rendimiento
- **Recomendaciones**: Sugerencias de optimización
- **Comparación**: Análisis comparativo entre versiones

## 🧪 Testing

### **Tests Disponibles**

- ✅ **Inicialización**: Configuración y setup
- ✅ **Cálculo de Métricas**: Percentiles y estadísticas
- ✅ **Creación de Input**: Generación de datos de prueba
- ✅ **Generación de Reportes**: Creación de reportes JSON/HTML
- ✅ **Análisis de Tendencias**: Cálculo de tendencias
- ✅ **Comparación**: Análisis comparativo
- ✅ **Recomendaciones**: Generación de sugerencias

### **Ejecutar Tests**

```bash
# Ejecutar todos los tests
npm run bench:test

# Ejecutar tests específicos
node --test tests/bench-agents.test.js
```

## 🚀 Scripts NPM

### **Scripts Disponibles**

```json
{
  "bench:agents": "node tools/bench-agents.mjs",
  "bench:agents:quick": "node tools/bench-agents.mjs --iterations 5 --warmup 1",
  "bench:agents:full": "node tools/bench-agents.mjs --iterations 20 --warmup 5",
  "bench:metrics": "node tools/bench-metrics.mjs",
  "bench:test": "node --test tests/bench-agents.test.js"
}
```

### **Uso de Scripts**

```bash
# Benchmark rápido
npm run bench:agents:quick

# Benchmark completo
npm run bench:agents:full

# Analizar métricas
npm run bench:metrics

# Ejecutar tests
npm run bench:test
```

## 🔒 Seguridad y Robustez

### **Consideraciones de Seguridad**

- **Timeouts**: Prevención de ejecuciones infinitas
- **Validación**: Verificación de inputs y outputs
- **Aislamiento**: Ejecución en procesos separados
- **Limpieza**: Limpieza automática de recursos

### **Manejo de Errores**

- **Recuperación**: Continuación en caso de fallos individuales
- **Logging**: Registro detallado de errores
- **Validación**: Verificación de resultados
- **Fallback**: Valores por defecto en caso de error

## 🐛 Troubleshooting

### **Problemas Comunes**

#### Error: "Agente no encontrado"
```bash
# Solución: Verificar que el agente existe
ls agents/context/server.js
ls agents/prompting/server.js
ls agents/rules/server.js
```

#### Error: "Timeout después de Xms"
```bash
# Solución: Aumentar timeout
npm run bench:agents -- --timeout 60000
```

#### Error: "No se encontraron reportes"
```bash
# Solución: Ejecutar benchmark primero
npm run bench:agents:quick
npm run bench:metrics
```

### **Logs y Debugging**

```bash
# Habilitar logs detallados
DEBUG=bench:* npm run bench:agents

# Verificar configuración
node tools/bench-agents.mjs --help
```

## 📚 Referencias

### **Documentación Relacionada**

- [PR-K: Benchmarks Reproducibles](./PR-K-COMPLETADO.md)
- [Tests de Bench Agents](../tests/bench-agents.test.js)
- [Herramientas de Benchmark](../tools/bench-agents.mjs)

### **Enlaces Externos**

- [Node.js Performance](https://nodejs.org/en/docs/guides/simple-profiling/)
- [JavaScript Performance](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [Benchmarking Best Practices](https://benchmarkjs.com/)

## 🤝 Contribución

### **Cómo Contribuir**

1. Fork el repositorio
2. Crear una rama para tu feature
3. Implementar cambios
4. Ejecutar tests
5. Crear Pull Request

### **Estándares de Código**

- Usar ESLint para linting
- Escribir tests para nuevas funcionalidades
- Documentar cambios en CHANGELOG
- Seguir convenciones de naming

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](../LICENSE) para más detalles.

---

**Bench Agents v1.0.0** - Benchmarks reproducibles y métricas de rendimiento 🚀
