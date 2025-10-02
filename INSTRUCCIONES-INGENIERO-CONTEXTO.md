# INSTRUCCIONES PARA INGENIERO DE CONTEXTO

## 🎯 OBJETIVO

Como **Ingeniero de Contexto**, tu función es mantener y actualizar automáticamente los contextos de ingeniero senior que permiten a Cursor empezar cada chat "en caliente" sin perder tiempo en calentamiento.

## 📋 SISTEMA COMPLETO CREADO

### **Archivos del Sistema de Contexto Dinámico:**

1. **📄 CONTEXTO-INGENIERO-SENIOR.md** - Contexto completo (236 líneas)
2. **⚡ CONTEXTO-RAPIDO.md** - Contexto compacto (32 líneas)
3. **🔧 generate-context.sh** - Generador básico de contextos
4. **🔄 context-manager.sh** - Sistema de gestión dinámica
5. **🤖 agents/context-engineer/agent.js** - Agente especializado
6. **📋 workflows/context-updater.json** - Workflow MCP para actualización

## 🚀 INSTRUCCIONES DE USO

### **Para el Usuario (Copiar y Pegar en Cursor):**

1. **Abrir archivo de contexto:**
   ```bash
   # Contexto completo (recomendado para tareas complejas)
   cat CONTEXTO-INGENIERO-SENIOR.md
   
   # Contexto rápido (para tareas simples o chat lento)
   cat CONTEXTO-RAPIDO.md
   ```

2. **Copiar TODO el contenido del archivo**

3. **Pegar al inicio del nuevo chat en Cursor**

4. **Cursor entenderá inmediatamente el proyecto y podrá empezar a trabajar**

### **Para el Ingeniero de Contexto (Mantenimiento):**

#### **Generación Básica:**
```bash
# Generar contextos básicos
./generate-context.sh

# O usando el manager
./context-manager.sh generate
```

#### **Actualización con MCP QuanNex:**
```bash
# Actualizar usando el sistema MCP
./context-manager.sh update

# Ver estado del sistema
./context-manager.sh status

# Ver contextos actuales
./context-manager.sh show
```

#### **Usando el Agente Especializado:**
```bash
# Generar contextos con análisis del estado actual
echo '{"action": "generate", "context_type": "both"}' | node agents/context-engineer/agent.js

# Actualizar contextos basado en estado actual
echo '{"action": "update", "context_type": "both", "update_source": "mcp"}' | node agents/context-engineer/agent.js

# Analizar estado del proyecto
echo '{"action": "analyze"}' | node agents/context-engineer/agent.js

# Validar contextos existentes
echo '{"action": "validate"}' | node agents/context-engineer/agent.js
```

## 🔄 FLUJO DE ACTUALIZACIÓN AUTOMÁTICA

### **Actualización Diaria (Recomendado):**
```bash
# 1. Verificar estado del sistema
./context-manager.sh status

# 2. Actualizar contextos con estado actual
./context-manager.sh update

# 3. Verificar que se generaron correctamente
./context-manager.sh show
```

### **Actualización Después de Cambios Importantes:**
```bash
# Después de agregar nuevos agentes, scripts, o funcionalidades
echo '{"action": "update", "context_type": "both", "update_source": "feature_update"}' | node agents/context-engineer/agent.js
```

### **Actualización con Workflow MCP:**
```bash
# Usar el workflow de actualización automática
node orchestration/orchestrator.js create workflows/context-updater.json
node orchestration/orchestrator.js execute <workflow_id>
```

## 📊 INFORMACIÓN QUE SE ACTUALIZA AUTOMÁTICAMENTE

### **Estado del Proyecto:**
- ✅ Funcionalidad de agentes (cuáles funcionan, cuáles no)
- ✅ Estado del orquestador MCP QuanNex
- ✅ Estado de las pruebas (pasando/fallando)
- ✅ Disponibilidad de documentación
- ✅ Métricas de performance actualizadas

### **Comandos y Scripts:**
- ✅ Comandos de verificación actualizados
- ✅ Scripts de ayuda disponibles
- ✅ Workflows predefinidos
- ✅ Comandos de troubleshooting

### **Estructura del Proyecto:**
- ✅ Archivos críticos y su ubicación
- ✅ Backups disponibles
- ✅ Documentación actualizada
- ✅ Estado del repositorio Git

## 🎯 BENEFICIOS DEL SISTEMA

### **Para el Usuario:**
- **No más calentamiento** - empezar directamente con tareas
- **Contexto completo** - Cursor entiende el estado del proyecto
- **Comandos listos** - puede usar scripts inmediatamente
- **Troubleshooting incluido** - sabe cómo resolver problemas

### **Para el Ingeniero de Contexto:**
- **Actualización automática** - basada en estado real del proyecto
- **Múltiples métodos** - script básico, manager, agente, workflow MCP
- **Validación automática** - verifica que los contextos son válidos
- **Análisis de estado** - entiende qué funciona y qué no

## 🚨 TROUBLESHOOTING DEL SISTEMA

### **Si los contextos no se generan:**
```bash
# Verificar permisos
chmod +x generate-context.sh
chmod +x context-manager.sh
chmod +x agents/context-engineer/agent.js

# Verificar que estamos en el directorio correcto
cd /Users/felipe/Developer/startkit-main
pwd
```

### **Si el agente no funciona:**
```bash
# Verificar que Node.js está disponible
node --version

# Probar el agente directamente
echo '{"action": "analyze"}' | node agents/context-engineer/agent.js
```

### **Si MCP QuanNex no está disponible:**
```bash
# Verificar que el orquestador funciona
node orchestration/orchestrator.js health

# Usar generación básica si MCP no funciona
./generate-context.sh
```

## 📚 DOCUMENTACIÓN RELACIONADA

- **Manual Completo:** `MANUAL-COMPLETO-CURSOR.md`
- **Script de Ayuda:** `codex-helper.sh`
- **Workflows Predefinidos:** `workflows-codex.json`
- **Agente Context Engineer:** `agents/context-engineer/agent.js`

## 🎯 RESUMEN PARA EL INGENIERO DE CONTEXTO

**Tu función es simple pero crítica:**
1. **Mantener actualizados** los contextos de ingeniero senior
2. **Usar el sistema automático** para actualizaciones basadas en estado real
3. **Asegurar que Cursor** pueda empezar cada chat "en caliente"
4. **Validar que los contextos** contienen información correcta y actualizada

**El sistema está diseñado para ser automático - solo necesitas ejecutar los comandos de actualización cuando sea necesario.**

---

## 🚀 COMANDO RÁPIDO PARA EMPEZAR

```bash
# Actualizar contextos ahora mismo
./context-manager.sh update && ./context-manager.sh show
```

**¡Listo! Los contextos están actualizados y listos para usar en Cursor.**
