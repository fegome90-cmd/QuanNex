# 🚀 QuanNex - Sistema MCP Autónomo

**QuanNex** es el sistema MCP (Model Context Protocol) autónomo del StartKit, diseñado para proporcionar conectividad cuántica y máxima potencia en el desarrollo de proyectos.

## 🎯 ¿Qué es QuanNex?

**QuanNex** combina los conceptos de:
- **Quantum** (Cuántico) - Potencia extrema y procesamiento avanzado
- **Nexus** (Conexión) - Punto de unión y conectividad total

Resultando en un sistema que ofrece **conectividad cuántica** para el desarrollo de proyectos.

## 🛠️ Características Principales

### ✅ **Funcionalidad Real**
- Agentes con procesamiento real (no simulados)
- Context extraction de archivos reales
- Prompt generation con templates reales
- Rules validation con políticas reales

### ✅ **Protocolo MCP Estándar**
- Implementación completa del protocolo MCP
- Compatible con Cursor IDE
- Herramientas estándar: `tools/list`, `tools/call`
- JSON-RPC 2.0 compliance

### ✅ **Sistema de Resiliencia**
- Monitoreo automático del servidor
- Health checks cada 30 segundos
- Reinicio automático con backoff exponencial
- Métricas en tiempo real

### ✅ **Configuración Simplificada**
- Un solo servidor MCP: `quannex`
- Configuración unificada en `.cursor/mcp.json`
- Variables de entorno optimizadas

## 🚀 Comandos QuanNex

### **Comandos Principales**
```bash
# Inicialización
npm run quannex:init              # Inicializar QuanNex
npm run quannex:contracts         # Tests de contratos
npm run quannex:resilience        # Sistema de resiliencia

# Monitoreo
npm run quannex:kpis              # Métricas y KPIs
npm run quannex:logs              # Logs estructurados
npm run quannex:demo              # Modo demostración
```

### **Comandos de Desarrollo**
```bash
# CI/CD
make ci-gate1                     # CI completo
make quannex:init                 # Inicialización
make quannex:contracts            # Tests de contratos
make quannex:resilience           # Sistema de resiliencia
```

## 📁 Configuración

### **`.cursor/mcp.json`**
```json
{
  "mcpServers": {
    "quannex": {
      "command": "node",
      "args": ["orchestration/mcp/server.js"],
      "env": {
        "NODE_ENV": "production",
        "MCP_AUTONOMOUS_MODE": "true",
        "MCP_NAME": "QuanNex"
      }
    }
  }
}
```

### **Variables de Entorno**
- `NODE_ENV=production` - Modo producción
- `MCP_AUTONOMOUS_MODE=true` - Modo autónomo
- `MCP_NAME=QuanNex` - Nombre del sistema

## 🧪 Herramientas Disponibles

QuanNex expone las siguientes herramientas MCP:

### **Workflow Management**
- `create_workflow` - Crear nuevos workflows
- `execute_workflow` - Ejecutar workflows
- `get_workflow_status` - Estado de workflows
- `list_workflows` - Listar workflows
- `load_workflow_template` - Cargar plantillas

### **Task Routing**
- `route_task` - Enrutar tareas a agentes
- `call_agent_direct` - Llamar agentes directamente

### **System Health**
- `agent_health_check` - Verificar salud de agentes

## 📊 Métricas y Monitoreo

### **Health Checks**
- ✅ Context Agent: Funcionalidad real de extracción
- ✅ Prompting Agent: Generación de prompts reales
- ✅ Rules Agent: Validación de políticas reales
- ✅ Orchestration: Servidor MCP estándar

### **KPIs Disponibles**
- Latencia de respuesta por agente
- Tasa de éxito de operaciones
- Número de reinicios automáticos
- Métricas de uso por herramienta

## 🔧 Arquitectura

```
QuanNex MCP Server
├── Orchestration Layer
│   ├── Workflow Management
│   ├── Task Routing
│   └── Agent Coordination
├── Agent Layer
│   ├── Context Agent (Real functionality)
│   ├── Prompting Agent (Real functionality)
│   └── Rules Agent (Real functionality)
├── Resilience System
│   ├── Health Monitoring
│   ├── Auto-restart
│   └── Metrics Collection
└── MCP Protocol Layer
    ├── JSON-RPC 2.0
    ├── Tools Interface
    └── Cursor Integration
```

## 🎯 Estado Actual

- ✅ **Funcionalidad**: 100% real (eliminados datos simulados)
- ✅ **Tests**: 100% passing (7/7 tests exitosos)
- ✅ **CI/CD**: 100% passing
- ✅ **Configuración**: Simplificada y optimizada
- ✅ **Monitoreo**: Sistema de resiliencia operativo

## 🚀 Próximos Pasos

1. **Dashboard de Monitoreo** - Interfaz visual para métricas
2. **Templates Avanzados** - Más plantillas de workflow
3. **Performance Optimization** - Cache y optimizaciones
4. **Documentación Avanzada** - Guías detalladas de uso

---

**QuanNex: Conectividad Cuántica para el Desarrollo Moderno** ⚡
