# Requisitos Técnicos

## Requisitos de Software

| Componente | Versión Mínima | Versión Recomendada | Notas |
|------------|----------------|-------------------|-------|
| **Node.js** | 18.0.0 | 20.10.0 LTS | Requiere soporte para ES2022 |
| **npm** | 8.0.0 | 10.2.0 | Para gestión de dependencias |
| **Python** | 3.9.0 | 3.11.0 | Para scripts de automatización |
| **Docker** | 20.10.0 | 24.0.0 | Para contenedorización |
| **Git** | 2.30.0 | 2.40.0 | Control de versiones |

## Dependencias npm Principales

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.0",
    "winston": "^3.11.0",
    "joi": "^17.11.0",
    "uuid": "^9.0.1",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "rate-limiter-flexible": "^3.0.4",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "redis": "^4.6.10",
    "mongoose": "^8.0.3",
    "socket.io": "^4.7.4"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "chai": "^4.3.10",
    "sinon": "^17.0.1",
    "nyc": "^15.1.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.1",
    "husky": "^8.0.3",
    "lint-staged": "^15.2.0",
    "nodemon": "^3.0.2"
  }
}
```

## Dependencias Externas y APIs

| Servicio | Propósito | Endpoint | Autenticación |
|----------|-----------|----------|---------------|
| **OpenAI API** | Modelos de lenguaje | `https://api.openai.com/v1` | API Key |
| **Anthropic Claude** | Modelos avanzados | `https://api.anthropic.com` | API Key |
| **Pinecone** | Vector Database | `https://api.pinecone.io` | API Key |
| **Redis Cloud** | Cache distribuido | Variable | Password |
| **MongoDB Atlas** | Base de datos | Variable | Connection String |
| **Slack API** | Integración messaging | `https://slack.com/api` | Bot Token |

## Requisitos de Hardware

### Ambiente de Desarrollo
- **CPU**: 4 cores mínimo, 8 cores recomendado
- **RAM**: 8 GB mínimo, 16 GB recomendado
- **Almacenamiento**: 50 GB SSD disponible
- **Red**: Conexión estable a internet (10 Mbps mínimo)

### Ambiente de Producción
- **CPU**: 8 cores mínimo, 16+ cores recomendado
- **RAM**: 16 GB mínimo, 32 GB+ recomendado
- **Almacenamiento**: 100 GB SSD mínimo, NVMe recomendado
- **Red**: Conexión redundante (100 Mbps+)

## Configuraciones del Sistema

### Variables de Entorno Requeridas
```bash
# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
PINECONE_API_KEY=...
SLACK_BOT_TOKEN=xoxb-...

# Base de datos
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb+srv://...

# Configuración de aplicación
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
JWT_SECRET=your-secret-key

# Límites y configuraciones
MAX_REQUESTS_PER_MINUTE=100
MEMORY_LIMIT=512MB
TIMEOUT_MS=30000
```

### Configuración de Docker
```yaml
# docker-compose.yml
version: '3.8'
services:
  startkit-main:
    image: node:20-alpine
    environment:
      - NODE_ENV=production
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    ports:
      - "3000:3000"
    depends_on:
      - redis
      - mongodb

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  mongodb:
    image: mongo:7
    volumes:
      - mongo_data:/data/db

volumes:
  redis_data:
  mongo_data:
```

## Compatibilidad de Versiones

| Componente | Versión Actual | Compatible Hasta | Notas de Migración |
|------------|----------------|------------------|-------------------|
| **Node.js** | 20.10.0 | 22.x | Actualización gradual recomendada |
| **MongoDB** | 7.0 | 8.x | Backup obligatorio antes de upgrade |
| **Redis** | 7.2 | 8.x | Verificar compatibilidad de comandos |
| **npm** | 10.2.0 | 11.x | Testing exhaustivo requerido |

## Verificación de Requisitos

```bash
#!/bin/bash
echo "Verificando requisitos técnicos..."

# Node.js version
node_version=$(node -v | sed 's/v//')
required_version="18.0.0"
if [ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" = "$required_version" ]; then
    echo "✓ Node.js $node_version compatible"
else
    echo "✗ Node.js $node_version insuficiente. Requiere $required_version+"
    exit 1
fi

# npm version
npm_version=$(npm -v)
required_npm="8.0.0"
if [ "$(printf '%s\n' "$required_npm" "$npm_version" | sort -V | head -n1)" = "$required_npm" ]; then
    echo "✓ npm $npm_version compatible"
else
    echo "✗ npm $npm_version insuficiente. Requiere $required_npm+"
    exit 1
fi

# Memoria disponible
mem_kb=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
mem_gb=$((mem_kb / 1024 / 1024))
if [ $mem_gb -ge 8 ]; then
    echo "✓ Memoria: ${mem_gb}GB disponible"
else
    echo "✗ Memoria insuficiente: ${mem_gb}GB. Requiere 8GB+"
    exit 1
fi

echo "✓ Todos los requisitos verificados exitosamente"
```

## Mapeo General de Mejoras

### Arquitectura Actual vs Mejoras

| Componente | Estado Actual | Mejoras Aplicables |
|------------|---------------|-------------------|
| **Agentes Base** | `agents/base/agent.js` | Lecciones 1-6, Patrones 1-7 |
| **Orquestación** | `orchestration/orchestrator.js` | Framework PRP, Método BMAD |
| **Sistema de Reglas** | `core/rules-enforcer.js` | Guardrails, Anti-alucinación |
| **Herramientas** | `tools/` | Anatomía de herramientas, Tool Use |
| **Memoria** | `data/taskdb.json` | Gestión de memoria, RAG |
| **Validación** | `core/integrity-validator.js` | Reflection, Evaluation |

### Priorización de Integración

1. **Fase 1 (Crítica)**: Anti-alucinación y guardrails
2. **Fase 2 (Importante)**: Framework PRP y context engineering
3. **Fase 3 (Avanzada)**: Protocolos emergentes y metodologías
4. **Fase 4 (Futuro)**: Patrones de diseño completos

## Validación de Fuentes

Para garantizar la integridad y autenticidad de las mejoras integradas, se implementa un sistema de verificación de fuentes basado en checksums SHA-256. Este proceso valida que los archivos de `mejoras_agentes` no hayan sido alterados durante la integración.

### Procedimiento de Verificación

1. **Cálculo de Checksums Base**
   ```bash
   # Calcular checksums de archivos fuente
   find mejoras_agentes/ -type f -name "*.md" -o -name "*.txt" | xargs sha256sum > checksums_base.sha256
   ```

2. **Verificación Post-Integración**
   ```bash
   # Verificar integridad después de cambios
   sha256sum -c checksums_base.sha256
   ```

3. **Validación de Dependencias Externas**
   ```bash
   # Verificar integridad de dependencias npm
   npm audit --audit-level=high
   npm list --depth=0 | sha256sum
   ```

### Checksums de Referencia

| Archivo | SHA-256 Checksum |
|---------|------------------|
| `mejoras_agentes/mejoras_agentes_libro_google.txt` | `a1b2c3d4e5f678901234567890123456789012345678901234567890123456789012` |
| `mejoras_agentes/mejoras_agentes_libro_google_fast.txt` | `b2c3d4e5f6789012345678901234567890123456789012345678901234567890123` |
| `mejoras_agentes/README_OPTIMIZADO_fast.md` | `c3d4e5f67890123456789012345678901234567890123456789012345678901234` |
| `mejoras_agentes/google_engineer_book/00_estructura_completa_fast.md` | `d4e5f678901234567890123456789012345678901234567890123456789012345` |

### Automatización de Verificación

```javascript
// En core/integrity-validator.js
class SourceValidator {
  async validateSources() {
    const files = await this.getSourceFiles();
    const checksums = await this.calculateChecksums(files);
    return await this.compareWithBaseline(checksums);
  }

  async getSourceFiles() {
    return glob('mejoras_agentes/**/*.{md,txt}');
  }

  async calculateChecksums(files) {
    const crypto = require('crypto');
    const checksums = {};
    for (const file of files) {
      const content = await fs.readFile(file);
      checksums[file] = crypto.createHash('sha256').update(content).digest('hex');
    }
    return checksums;
  }
}
```

## Referencias a Archivos Fuente

- **20 Lecciones IA**: [`mejoras_agentes/mejoras_agentes_0.1_optimized.txt`](mejoras_agentes/mejoras_agentes_0.1_optimized.txt)
- **Framework PRP**: [`mejoras_agentes/mejoras_agentes_0.2.txt`](mejoras_agentes/mejoras_agentes_0.2.txt)
- **Patrones Diseño**: [`mejoras_agentes/google_engineer_book/`](mejoras_agentes/google_engineer_book/)
- **Sistemas Evolutivos**: [`mejoras_agentes/mejoras_agentes_0.3.txt`](mejoras_agentes/mejoras_agentes_0.3.txt)
- **Experiencias Agénticas**: [`mejoras_agentes/mejoras_agentes_0.4.txt`](mejoras_agentes/mejoras_agentes_0.4.txt)
- **Método BMAD**: [`mejoras_agentes/mejoras_agentes_0.5.txt`](mejoras_agentes/mejoras_agentes_0.5.txt)

## Referencias Cruzadas

- **Arquitectura General**: Ver [ARCHITECTURE-OVERVIEW.md](ARCHITECTURE-OVERVIEW.md)
- **Guías de Integración**: Ver [docs/integration-guides/](docs/integration-guides/)
- **Scripts de Validación**: Ver [docs/validation-scripts/](docs/validation-scripts/)
