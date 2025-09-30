# 🛠️ Troubleshooting Guide - Claude Project Init

## 🚨 Problemas Comunes y Soluciones

### 1. Script No Se Ejecuta

#### Problema: `Permission denied` al ejecutar
```bash
bash: ./claude-project-init.sh: Permission denied
```

**Solución:**
```bash
chmod +x claude-project-init.sh
./claude-project-init.sh
```

#### Problema: `Command not found`
```bash
claude-project-init.sh: command not found
```

**Solución:**
```bash
# Usar ruta completa
./claude-project-init.sh

# O navegar al directorio correcto
cd /Users/felipe/Desktop/claude-project-init-kit
./claude-project-init.sh
```

### 2. Dependencias Faltantes

#### Problema: Git no encontrado
```
[FALTA] El comando 'git' no está instalado.
```

**Soluciones:**
```bash
# macOS
xcode-select --install

# Linux (Ubuntu/Debian)
sudo apt-get install git

# Linux (CentOS/RHEL)
sudo yum install git

# Windows
# Descargar desde https://git-scm.com/downloads
```

#### Problema: GitHub CLI no encontrado
```
[FALTA] El comando 'gh' no está instalado.
```

**Soluciones:**
```bash
# macOS
brew install gh

# Linux
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh

# Windows
# Descargar desde https://cli.github.com/
```

#### Problema: npm no encontrado
```
[FALTA] El comando 'npm' no está instalado.
```

**Solución:**
```bash
# Instalar Node.js (incluye npm)
# Visitar https://nodejs.org/ y descargar la versión LTS

# Verificar instalación
node --version
npm --version
```

### 3. Errores Durante la Creación del Proyecto

#### Problema: Directorio ya existe
```
Error: El directorio 'mi-proyecto' ya existe. Saliendo.
```

**Soluciones:**
```bash
# Opción 1: Usar nombre diferente
./claude-project-init.sh
# Introducir nombre diferente

# Opción 2: Remover directorio existente
rm -rf mi-proyecto
./claude-project-init.sh

# Opción 3: Hacer backup del existente
mv mi-proyecto mi-proyecto-backup
./claude-project-init.sh
```

#### Problema: Nombre de proyecto vacío
```
El nombre del proyecto no puede estar vacío. Saliendo.
```

**Solución:**
- Introducir un nombre válido cuando el script lo pida
- No presionar Enter sin escribir un nombre

### 4. Problemas con Tipos de Proyecto

#### Problema: Tipo de proyecto inválido
```
# Script continúa pero usa "generic"
```

**Solución:**
- Seleccionar número entre 1-6:
  - 1: Frontend
  - 2: Backend  
  - 3: Fullstack
  - 4: Medical
  - 5: Premium Design System
  - 6: Generic

### 5. Problemas con Sistema Anti-Genérico (Tipo 5)

#### Problema: Memoria no se inicializa correctamente
**Síntomas:**
- Falta `.claude/memory/project_context.json`
- Directorios `variants/` no creados

**Solución:**
```bash
# Verificar que seleccionaste tipo 5
# Re-ejecutar el script con tipo 5

# Manual fix si es necesario:
mkdir -p .claude/memory/{market_research,personas,design_tokens,iteration_history}
mkdir -p variants/{A,B,C} design_tokens reports/{visual_diff,accessibility,performance}
```

#### Problema: Agentes de diseño no aparecen
**Síntomas:**
- Solo 4 agentes en lugar de 11
- Faltan comandos /anti-iterate, /design-review

**Verificación:**
```bash
# Contar agentes
ls -la .claude/agents/ | wc -l

# Verificar comandos de diseño
ls .claude/commands/anti-iterate.md
ls .claude/commands/design-review.md
```

### 6. Problemas con Proyectos Médicos (Tipo 4)

#### Problema: Agente médico no se crea
**Síntomas:**
- No aparece `@medical-reviewer`
- Faltan hooks HIPAA

**Verificación:**
```bash
# Verificar agente médico
cat .claude/agents/medical-reviewer.json

# Verificar hooks HIPAA
grep -i hipaa .claude/hooks.json
```

### 7. Problemas con Playwright MCP

#### Problema: MCP no se configura
**Síntomas:**
- Archivo `.claude/mcp.json` faltante o vacío
- Tests visuales no funcionan

**Solución:**
```bash
# Verificar archivo MCP
cat .claude/mcp.json

# Debe contener:
{
  "mcps": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}

# Recrear si es necesario
echo '{
  "mcps": {
    "playwright": {
      "command": "npx", 
      "args": ["@playwright/mcp@latest"]
    }
  }
}' > .claude/mcp.json
```

### 8. Problemas con CLAUDE.md

#### Problema: CLAUDE.md genérico o incorrecto
**Síntomas:**
- Comandos no específicos para el tipo de proyecto
- Falta documentación de agentes

**Solución:**
```bash
# Verificar tipo específico en CLAUDE.md
grep -i "frontend\|backend\|medical\|design" CLAUDE.md

# Si no hay contenido específico, usar template
cp /ruta/al/kit/templates/claude-md-template.md CLAUDE.md
# Editar manualmente para tu tipo de proyecto
```

### 9. Problemas con Git

#### Problema: Git no se inicializa
**Síntomas:**
- No existe directorio `.git/`
- No hay commit inicial

**Solución:**
```bash
# Re-inicializar git
git init -b main
git add .
git commit -m "feat: initial project setup

🤖 Generated with Claude Project Init

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 10. Testing del Script

#### Problema: Quiero verificar que todo funciona
**Solución:**
```bash
# Ejecutar script de testing completo
cd /Users/felipe/Desktop/claude-project-init-kit
./core/scripts/test-claude-init.sh

# Verificar dependencias
./core/scripts/verify-dependencies.sh
```

## 🔍 Verificación Manual

### Checklist de Verificación Post-Instalación

#### Para Todos los Proyectos:
- [ ] Directorio `.claude/` existe
- [ ] 6 comandos en `.claude/commands/`
- [ ] 4+ agentes en `.claude/agents/`
- [ ] Archivo `.claude/mcp.json` con Playwright
- [ ] Archivo `.claude/hooks.json` configurado
- [ ] `CLAUDE.md` con contenido específico
- [ ] `.gitignore` apropiado
- [ ] Repository git inicializado

#### Para Proyectos de Diseño (Tipo 5):
- [ ] 9 comandos totales (3 adicionales de diseño)
- [ ] 11 agentes totales (7 adicionales de diseño)
- [ ] Directorios `variants/A`, `variants/B`, `variants/C`
- [ ] Directorio `design_tokens/`
- [ ] Directorios en `reports/`
- [ ] Sistema de memoria `.claude/memory/`
- [ ] `project_context.json` inicializado

#### Para Proyectos Médicos (Tipo 4):
- [ ] Agente `medical-reviewer.json`
- [ ] Hooks HIPAA en `hooks.json`
- [ ] Contenido médico en `CLAUDE.md`

## 🆘 Soporte Adicional

### Logs y Debugging

#### Ejecutar con verbose output:
```bash
bash -x ./claude-project-init.sh 2>&1 | tee debug.log
```

#### Verificar sintaxis del script:
```bash
bash -n ./claude-project-init.sh
echo $? # Should be 0
```

### Recursos de Ayuda

1. **Documentación del Kit:**
   - `README.md` - Guía rápida
   - `GUIA_COMPLETA.md` - Guía detallada de Claude Code
   - `docs/FEATURES.md` - Lista completa de características

2. **Ejemplos Prácticos:**
   - `ejemplos/ejemplo-frontend.md`
   - `ejemplos/ejemplo-design.md`
   - `ejemplos/ejemplo-medical.md`

3. **Templates:**
   - `templates/claude-md-template.md`
   - `templates/hooks-template.json`
   - `templates/mcp-template.json`

### Crear Issue Report

Si el problema persiste, crea un reporte con:

```
## Problema
[Descripción del problema]

## Pasos para Reproducir
1. 
2. 
3. 

## Comportamiento Esperado
[Qué esperabas que pasara]

## Comportamiento Actual
[Qué pasó realmente]

## Entorno
- OS: [macOS/Linux/Windows]
- Shell: [bash/zsh]
- Node.js version: [output de `node --version`]
- Git version: [output de `git --version`]

## Logs
```
[Incluir output del comando con -x]
```
```

---

**💡 Tip:** Siempre ejecuta `./core/scripts/verify-dependencies.sh` antes de reportar problemas para verificar que todas las dependencias estén correctamente instaladas.