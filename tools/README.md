# StartKit QuanNex - Herramientas del Proyecto

## 📋 Registro Centralizado de Herramientas

Este directorio contiene todas las herramientas disponibles para el proyecto StartKit QuanNex. Cada herramienta está registrada en `registry.json` y puede ser accedida a través del `tool-manager.js`.

## 🛠️ Herramientas Disponibles

### **Estructura y Organización**
- `validate-structure.sh` - Valida que la estructura del proyecto se mantenga limpia
- `auto-organize.sh` - Auto-organiza archivos según las reglas estructurales
- `organize-project.sh` - Organiza el proyecto de forma limpia y escalable

### **Pathing y Mantenimiento**
- `quick-path-fixer.sh` - Arregla imports rotos automáticamente
- `robust-path-fixer.sh` - Detecta y arregla problemas de pathing de forma robusta
- `clean-project.sh` - Limpia el proyecto

### **Testing**
- `test-version.sh` - Ejecuta tests para una versión específica

### **Sistema**
- `start-quannex.sh` - Inicia el sistema StartKit QuanNex v3 completo
- `stop-quannex.sh` - Detiene el sistema StartKit QuanNex v3

### **Monitoreo**
- `health-monitor.js` - Sistema de monitoreo de salud de agentes
- `agent-server.js` - Servidor de agentes

### **MCP**
- `server-v2.js` - Servidor MCP v2 para QuanNex

## 🚀 Uso del Tool Manager

### **Listar Herramientas**
```bash
# Listar todas las herramientas
node tools/tool-manager.js list

# Listar herramientas por categoría
node tools/tool-manager.js list validation
node tools/tool-manager.js list maintenance
```

### **Obtener Información de Herramienta**
```bash
# Obtener información de una herramienta específica
node tools/tool-manager.js get validate-structure
node tools/tool-manager.js get quick-path-fixer
```

### **Ejecutar Herramienta**
```bash
# Ejecutar una herramienta
node tools/tool-manager.js execute validate-structure
node tools/tool-manager.js execute quick-path-fixer
```

### **Ejecutar Workflow**
```bash
# Ejecutar workflow completo
node tools/tool-manager.js workflow daily_maintenance
node tools/tool-manager.js workflow project_reorganization
```

### **Buscar Herramientas**
```bash
# Buscar herramientas por descripción
node tools/tool-manager.js search "path"
node tools/tool-manager.js search "structure"
```

## 📊 Workflows Disponibles

### **daily_maintenance**
1. `validate-structure` - Validar estructura
2. `clean-project` - Limpiar proyecto
3. `health-monitor` - Monitorear salud

### **project_reorganization**
1. `organize-project` - Organizar proyecto
2. `quick-path-fixer` - Arreglar paths
3. `validate-structure` - Validar estructura

### **system_startup**
1. `start-quannex` - Iniciar sistema

### **system_shutdown**
1. `stop-quannex` - Detener sistema

### **testing_cycle**
1. `test-version` - Ejecutar tests

## 🔧 Categorías de Herramientas

- **validation** - Herramientas para validar la integridad del proyecto
- **organization** - Herramientas para organizar y estructurar el proyecto
- **maintenance** - Herramientas para mantenimiento y reparación
- **testing** - Herramientas para testing y validación
- **system** - Herramientas para gestión del sistema
- **monitoring** - Herramientas para monitoreo y observabilidad
- **mcp** - Herramientas relacionadas con MCP

## 📝 Uso en Agentes

Los agentes pueden usar el Tool Manager para acceder a las herramientas:

```javascript
import ToolManager from './tools/tool-manager.js';

const toolManager = new ToolManager();

// Listar herramientas disponibles
const tools = toolManager.listTools();

// Ejecutar una herramienta
const result = await toolManager.executeTool('validate-structure');

// Ejecutar un workflow
const workflowResult = await toolManager.executeWorkflow('daily_maintenance');
```

## 🔍 Verificación de Dependencias

```bash
# Verificar dependencias de una herramienta
node tools/tool-manager.js deps validate-structure
node tools/tool-manager.js deps quick-path-fixer
```

## 📈 Estado del Sistema

Para verificar el estado actual del sistema:

```bash
# Iniciar sistema completo
./versions/v3/start-quannex.sh

# Verificar estado
ps aux | grep -E "(health-monitor|agent-server)"

# Ver logs
tail -f logs/health-monitor.log
```

## 🆘 Solución de Problemas

### **Imports Rotos**
```bash
# Arreglar automáticamente
./tools/quick-path-fixer.sh

# Validar que estén arreglados
./tools/robust-path-fixer.sh validate
```

### **Estructura Desorganizada**
```bash
# Auto-organizar archivos
./tools/auto-organize.sh

# Validar estructura
./tools/validate-structure.sh
```

### **Sistema No Responde**
```bash
# Detener sistema
./versions/v3/stop-quannex.sh

# Limpiar proyecto
./tools/clean-project.sh

# Reiniciar sistema
./versions/v3/start-quannex.sh
```

## 📚 Documentación Adicional

- `registry.json` - Registro completo de herramientas
- `tool-manager.js` - Interfaz de acceso para agentes
- `README-ORGANIZATION.md` - Guía de la nueva estructura
- `MANUAL-COMPLETO-CURSOR.md` - Manual completo del proyecto
