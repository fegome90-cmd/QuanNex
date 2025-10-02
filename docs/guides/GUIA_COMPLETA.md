# 🚀 Guía Definitiva de Claude Code: De Cero a Experto Agéntico (Versión Mejorada)

Esta guía consolida las mejores prácticas y flujos de trabajo, **enriquecida con ejemplos concretos para cada sección** basados en el repositorio [OneRedOak/claude-code-workflows](https://github.com/OneRedOak/claude-code-workflows.git), para ayudarte a dominar Claude Code.

## 📋 Tabla de Contenidos

- [1. ¿Qué es Claude Code?](#-1-qué-es-claude-code)
- [2. Configuración Inicial: Prepara tu Entorno](#️-2-configuración-inicial-prepara-tu-entorno)
- [3. Conceptos Fundamentales: Los Bloques de Construcción](#-3-conceptos-fundamentales-los-bloques-de-construcción)
  - [a. `CLAUDE.md`: El Cerebro del Agente](#a-claudemd-el-cerebro-del-agente)
  - [b. Comandos Personalizados (`/`): Plantillas de Flujos de Trabajo](#b-comandos-personalizados--plantillas-de-flujos-de-trabajo)
  - [c. Permisos y Seguridad](#c-permisos-y-seguridad)
- [4. Flujos de Trabajo Esenciales para el Día a Día](#-4-flujos-de-trabajo-esenciales-para-el-día-a-día)
  - [a. El Flujo Maestro: Explorar → Planificar → Ejecutar → Confirmar](#a-el-flujo-maestro-explorar--planificar--ejecutar--confirmar)
  - [b. Desarrollo Guiado por Pruebas (TDD)](#b-desarrollo-guiado-por-pruebas-tdd)
  - [c. Diseño de UI Iterativo (con Playwright)](#c-diseño-de-ui-iterativo-con-playwright)
- [5. Técnicas Avanzadas: Paralelismo y Automatización](#-5-técnicas-avanzadas-paralelismo-y-automatización)
  - [a. `git worktrees`: Trabajo en Paralelo](#a-git-worktrees-trabajo-en-paralelo)
  - [b. Subagentes: Delega y Especializa](#b-subagentes-delega-y-especializa)
  - [c. Modo sin Cabeza (`headless`): Automatización Total](#c-modo-sin-cabeza-headless-automatización-total)
- [6. Recursos y Ejemplos Prácticos](#-6-recursos-y-ejemplos-prácticos)
- [7. Especialidades del Proyecto y Agentes Avanzados](#-7-especialidades-del-proyecto-y-agentes-avanzados)
  - [a. Organización por Especialidades](#a-organización-por-especialidades)
  - [b. Agentes Especializados Avanzados](#b-agentes-especializados-avanzados)
- [Apéndice: Ejemplos Completos del Repositorio](#-apéndice-ejemplos-completos-del-repositorio-claude-code-workflows)

---

### 🤖 **1. ¿Qué es Claude Code?**

- **No es un simple chatbot:** Es un **agente de IA de bajo nivel** diseñado para integrarse en tu terminal. Su poder reside en su flexibilidad y su capacidad para realizar **tareas complejas de múltiples pasos**.
- **Diferencia con Cursor/IDEs:** Mientras que herramientas como Cursor son excelentes para ediciones rápidas, Claude Code brilla en tareas a gran escala.

💡 **Ejemplo de Caso de Uso:**

- **Tarea:** Añadir un nuevo proveedor de autenticación (ej. Google Auth) a tu aplicación.
- **Uso con Cursor/IDE:** Ideal para editar el archivo `auth.ts` una vez que ya sabes exactamente qué cambios hacer.
- **Uso con Claude Code:** Ideal para orquestar todo el proceso: "Analiza nuestro sistema de autenticación actual en `src/lib/auth.ts`. Luego, lee la documentación oficial de NextAuth para el proveedor de Google. Propón un plan de implementación paso a paso, incluyendo la gestión de variables de entorno. Una vez que apruebe el plan, impleméntalo."

---

### 🛠️ **2. Configuración Inicial: Prepara tu Entorno**

1. **Inicializa tu Proyecto:**

   ```bash
   /init
   ```

   💡 **Ejemplo de lo que sucede:** Esto escanea tu proyecto y crea el archivo `.claude/CLAUDE.md` con un resumen inicial de la estructura de carpetas, dependencias y posibles comandos.

2. **Instala el CLI de GitHub:**

   ```bash
   # Sigue las instrucciones de instalación para tu sistema
   # https://github.com/cli/cli#installation
   ```

   💡 **Ejemplo de por qué es útil:** Podrás usar `prompts` como: "Crea una nueva issue en GitHub con el título 'Bug en el login' y descríbela. Luego, crea una nueva rama llamada `fix/login-bug` y haz checkout a ella."

3. **Dale "Ojos" a Claude con Playwright MCP:**

   ```bash
   claude mcp add playwright npx @playwright/mcp@latest
   ```

   💡 **Ejemplo de Configuración Avanzada:** Después de añadirlo, puedes editar el archivo `.claude/mcp.json` para personalizar el comportamiento, por ejemplo, para que el navegador se abra visiblemente (`headed`) en lugar de en segundo plano.

   ```json
   {
     "playwright": {
       "command": "npx",
       "args": [
         "@playwright/mcp@latest",
         "--browser=chromium",
         "--headless=false" // Cambiado a false para ver el navegador
       ]
     }
   }
   ```

---

### 🧠 **3. Conceptos Fundamentales: Los Bloques de Construcción**

#### **a. `CLAUDE.md`: El Cerebro del Agente**

Es la memoria a largo plazo de Claude para tu proyecto.

💡 **Ejemplo de Contexto:** Un `CLAUDE.md` bien estructurado podría verse así:

```markdown
# Guía de Contexto para Claude - Proyecto WCAI2

## Comandos Comunes

- `npm run dev`: Inicia el servidor de desarrollo.
- `npm run test`: Ejecuta la suite de pruebas con Vitest.

## Arquitectura Clave

- `src/app/`: Componentes del lado del servidor (Next.js App Router).
- `src/components/`: Componentes de UI reutilizables.

## Guía de Estilo Visual

- **Principio clave:** Minimalista y accesible.
- **Referencia:** `context/DESIGN_PRINCIPLES.md` contiene nuestros principios de diseño detallados.
```

⚠️ **Qué Evitar en `CLAUDE.md`**

- **Secretos y API Keys:** Nunca incluyas credenciales o información sensible en texto plano. Usa variables de entorno.
- **Contenido de archivos muy grandes:** No pegues miles de líneas de código. Es mejor pedirle a Claude que lea el archivo por su ruta.
- **Contexto irrelevante:** Evita añadir información que no sea útil para las tareas habituales del proyecto, para no "distraer" al agente con datos innecesarios.

#### **b. Comandos Personalizados (`/`): Plantillas de Flujos de Trabajo**

Guarda `prompts` en `.claude/commands` para reutilizarlos.

💡 **Ejemplo de `Prompt` Guardado:** El archivo `.claude/commands/review.md` podría contener:

```markdown
Actúa como un ingeniero de software senior.

1.  Usa `git diff HEAD~1` para ver los últimos cambios.
2.  Verifica que los cambios se adhieran a nuestra `GUIA_DE_ESTILO.md`.
3.  Busca errores comunes: código comentado, logs de consola, etc.
4.  Proporciona un resumen de tus hallazgos en formato de lista.
```

Ahora, cualquiera puede ejecutar `/review` para una revisión consistente.

#### **c. Permisos y Seguridad**

Claude pide permiso para acciones que modifican archivos.

💡 **Ejemplo de Interacción:**

```bash
[?] Allow Claude to run 'git commit -m "feat: add card component"'? (Y/n/a/d)
# Y: Sí (Yes) - Permite esta acción una sola vez.
# n: No - Niega esta acción una sola vez.
# a: Siempre (Always) - Permite siempre este patrón de comando (ej. `git commit:*`).
# d: Negar (Deny) - Niega siempre este patrón de comando.
```

Para ver los permisos que has guardado, usa `/permissions`.

---

### ✨ **4. Flujos de Trabajo Esenciales para el Día a Día**

#### **a. El Flujo Maestro: Explorar → Planificar → Ejecutar → Confirmar**

1. **Explorar:**
   - 💡 **Prompt de Ejemplo:** "Lee `src/lib/auth.ts` y `src/lib/db.ts`. Explícame cómo interactúan, pero no escribas código."

2. **Planificar:**
   - 💡 **Prompt de Ejemplo:** "**Think hard** y crea un plan para añadir un endpoint `/api/users/{id}`. Define la ruta, el método, la validación de entrada y la respuesta esperada."

3. **Ejecutar:**
   - 💡 **Prompt de Ejemplo:** "El plan es sólido. Ahora, implementa el nuevo endpoint en un archivo `src/app/api/users/[id]/route.ts`."

4. **Confirmar:**
   - 💡 **Prompt de Ejemplo:** "Escribe un mensaje de commit semántico para estos cambios y crea una Pull Request."

#### **b. Desarrollo Guiado por Pruebas (TDD)**

1. **Escribir Pruebas:**
   - 💡 **Prompt de Ejemplo:** "Crea un archivo `tests/math.test.ts`. Escribe una prueba para una función `subtract` que aún no existe, y haz que verifique que `5 - 2` es `3`."
2. **Verificar Fallo:**
   - 💡 **Prompt de Ejemplo:** "Ejecuta la prueba y confirma que falla porque la función `subtract` no está definida."
3. **Escribir Código:**
   - 💡 **Prompt de Ejemplo:** "Ahora, crea el archivo `src/utils/math.ts` e implementa la función `subtract` para que la prueba pase."

#### **c. Diseño de UI Iterativo (con Playwright)**

1. **Proporciona un Objetivo Visual:** Pega una captura de pantalla de una maqueta.
2. **Inicia el Bucle Iterativo:**
   - 💡 **Prompt de Ejemplo:** "Implementa esta maqueta en `src/pages/HomePage.tsx`. Usa Playwright para tomar una captura de pantalla. Compara tu captura con la maqueta y sigue haciendo cambios hasta que coincidan. Muéstrame cada iteración."

---

### 🎩 **5. Técnicas Avanzadas: Paralelismo y Automatización**

#### **a. `git worktrees`: Trabajo en Paralelo**

Permite tener múltiples ramas del repositorio en directorios separados. Esta técnica es más eficiente que clonar el repositorio múltiples veces porque todos los `worktrees` comparten la misma base de datos de Git, ahorrando espacio en disco y manteniendo un historial de commits unificado y limpio.

💡 **Ejemplo de Comandos:**

```bash
# Crea un nuevo worktree para una nueva característica
git worktree add ../mi-proyecto-feature-a feature-a

# Navega al nuevo directorio y empieza a trabajar con Claude
cd ../mi-proyecto-feature-a
claude
```

#### **b. Subagentes: Delega y Especializa**

Crea agentes en `.claude/agents` para tareas específicas.

💡 **Ejemplo de Configuración:** El archivo `.claude/agents/design-reviewer.json` podría ser:

```json
{
  "name": "design-reviewer",
  "description": "Realiza una revisión de diseño experta usando Playwright.",
  "persona": "Actúa como un diseñador de producto líder de Stripe.",
  "tools": ["bash", "playwright"],
  "prompt": [
    "Se te ha pedido que revises los últimos cambios.",
    "1. Usa `git diff` para identificar los componentes modificados.",
    "2. Navega a la página correspondiente usando Playwright.",
    "3. Compara el diseño con los principios en `context/DESIGN_PRINCIPLES.md`.",
    "4. Genera un informe con sugerencias de mejora."
  ]
}
```

#### **c. Modo sin Cabeza (`headless`): Automatización Total**

Usa `claude -p "tu prompt"` para integrar Claude en `pipelines`.

💡 **Ejemplo en GitHub Actions:** Añade esto a tu archivo `.github/workflows/main.yml` para revisiones de PR automáticas.

```yaml
- name: Automated Code Review by Claude
  run: |
    gh pr diff ${{ github.event.pull_request.number }} | claude -p "Eres un revisor de código experto. Revisa este diff y proporciona feedback conciso sobre posibles bugs, violaciones de estilo o mejoras de rendimiento. Usa el formato de comentarios de GitHub."
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

### 📚 **6. Recursos y Ejemplos Prácticos**

El repositorio **[OneRedOak/claude-code-workflows](https://github.com/OneRedOak/claude-code-workflows.git)** es tu mejor amigo para aprender.

💡 **Ejemplo de lo que encontrarás:**

- ✅ Un archivo `CLAUDE.md` de ejemplo, bien estructurado.
- ✅ Comandos (`/`) listos para usar en la carpeta `.claude/commands/`.
- ✅ Configuraciones de subagentes (`@`) en la carpeta `.claude/agents/`.
- ✅ Ejemplos de flujos de trabajo para CI/CD en la carpeta `.github/workflows/`.

---

### 🚀 **7. Especialidades del Proyecto y Agentes Avanzados**

Esta sección describe la organización del proyecto por especialidades y los nuevos agentes avanzados que se pueden utilizar.

#### **a. Organización por Especialidades**

El proyecto se organiza en las siguientes especialidades, cada una con su propio directorio:

- **1-prompt-engineering**: Diseño y optimización de prompts.
- **2-context-engineering**: Diseño de contexto explícito y gestión de la memoria del proyecto.
- **3-project-management**: Planificación estratégica, gestión de riesgos y cronogramas.
- **4-quality-assurance**: Validación sistemática, testing y quality gates.
- **5-security-compliance**: Auditoría de seguridad, compliance y gestión de datos sensibles.
- **6-metrics-analytics**: Seguimiento de métricas, análisis de tendencias y dashboards.
- **7-design-systems**: Sistema anti-genérico, generación de diseños y validación visual.
- **8-technical-architecture**: Arquitectura de backend y frontend, integración de herramientas.
- **9-micro-saas**: Metodología de factoría, desarrollo de MVPs y gestión de portfolio.
- **10-continuous-learning**: Retrospectivas, captura de lecciones aprendidas y mejora continua.

#### **b. Agentes Especializados Avanzados**

Además de los agentes base, se han añadido los siguientes agentes especializados:

- **@context-engineer**: Especialista en diseñar contextos explícitos para maximizar la calidad de los outputs de la IA.
- **@retrospectiva-facilitator**: Facilita retrospectivas ágiles para capturar lecciones aprendidas y fomentar la mejora continua.
- **@plan-strategist**: Project Manager senior que crea planes detallados con razonamiento explícito y gestión de riesgos.
- **@qa-validator**: Ingeniero de QA que realiza validaciones sistemáticas contra criterios de aceptación predefinidos.
- **@metrics-analyst**: Analista de datos que sigue la productividad, calidad y rendimiento del proyecto.
- **@security-auditor**: Auditor de seguridad que identifica vulnerabilidades y asegura el cumplimiento de las buenas prácticas.
- **@gantt-generator**: Especialista en la generación de diagramas de Gantt adaptativos para la visualización de cronogramas de proyectos.

---

# 📎 Apéndice: Ejemplos Completos del Repositorio `claude-code-workflows`

Esta sección contiene ejemplos completos de los archivos de configuración y `prompts` que encontrarías en el repositorio de ejemplo, para que puedas copiarlos y adaptarlos directamente.

## 📄 Archivo: `CLAUDE.md` (Raíz del Proyecto)

Este archivo sirve como la memoria principal y el contexto de alto nivel para Claude.

```markdown
# Guía de Contexto para Claude - Proyecto WCAI2

Este proyecto es una aplicación web construida con Next.js, TypeScript y Tailwind CSS. El backend es un servidor FastAPI en Python.

## 📜 Principios Fundamentales

1.  **Escribir código limpio y mantenible:** Sigue los principios SOLID.
2.  **La cobertura de pruebas es obligatoria:** Mínimo 80% para nuevas funcionalidades.
3.  **La comunicación es asíncrona:** Usa issues y PRs de GitHub.

## ⚙️ Comandos Comunes

- `npm install`: Instalar dependencias del frontend.
- `npm run dev`: Iniciar el servidor de desarrollo de Next.js.
- `npm run test`: Ejecutar la suite de pruebas de Vitest.
- `npm run lint`: Ejecutar ESLint y Prettier para verificar el estilo del código.
- `cd server && pip install -r requirements.txt`: Instalar dependencias del backend.
- `cd server && uvicorn main:app --reload`: Iniciar el servidor de FastAPI.

## 🏗️ Arquitectura Clave

- `src/app/`: Componentes del lado del servidor (Next.js App Router).
- `src/components/`: Componentes de UI reutilizables (React).
- `src/lib/`: Lógica de cliente (hooks, utils).
- `context/`: Documentos de contexto adicionales para Claude (principios de diseño, etc.).
- `server/`: El código de la API de FastAPI.

## 🎨 Guía de Estilo Visual

- **Principio clave:** Minimalista, funcional y accesible.
- **Framework de UI:** Tailwind CSS. No uses CSS en línea o archivos .css separados.
- **Colores:** Primario: `#007bff`, Secundario: `#6c757d`, Error: `#dc3545`.
- **Tipografía:** `Inter`, 16px base.
- **Referencia Detallada:** `context/DESIGN_PRINCIPLES.md` contiene nuestros principios de diseño detallados. **DEBES** leerlo antes de realizar cambios de UI.
```

## ⚙️ Comando Personalizado: `.claude/commands/test.md`

Un comando para generar pruebas de forma estandarizada.

```markdown
Actúa como un ingeniero de software experto en Quality Assurance.

Se te ha pedido que escribas pruebas para el archivo: `$ARGUMENTS`.

1.  Lee el archivo `$ARGUMENTS` para entender su funcionalidad, props y lógica interna.
2.  Crea un nuevo archivo de prueba siguiendo la convención `*.test.ts` o `*.spec.ts` en el mismo directorio.
3.  Escribe una suite de pruebas exhaustiva utilizando Vitest y React Testing Library.
4.  La suite debe incluir:
    - Una prueba de renderizado simple para asegurar que el componente no falle al montarse.
    - Pruebas para cada una de las `props` para verificar que se renderizan y funcionan correctamente.
    - Pruebas de interacción del usuario (ej. `fireEvent.click`) si el componente tiene elementos interactivos.
    - Pruebas de `snapshots` para detectar cambios inesperados en la UI.
5.  Asegúrate de que todas las pruebas sean atómicas y no dependan de otras.
6.  Una vez escritas las pruebas, ejecútalas para confirmar que todo funciona como se espera.
```

## 🤖 Subagente: `.claude/agents/refactor-expert.json`

Un agente especializado en refactorizar código siguiendo las mejores prácticas.

```json
{
  "name": "refactor-expert",
  "description": "Un agente experto en refactorización de código que aplica los principios SOLID y de código limpio.",
  "persona": "Actúas como un arquitecto de software senior con décadas de experiencia en la creación de sistemas escalables y mantenibles. Eres un purista del código limpio y un defensor de los patrones de diseño.",
  "tools": ["bash", "playwright"],
  "prompt": [
    "Se te ha pedido refactorizar el archivo: {{.Args}}.",
    "1. Lee y analiza profundamente el archivo para identificar 'code smells': funciones largas, lógica duplicada, nombres de variables poco claros, bajo cumplimiento de SOLID.",
    "2. Lee los archivos relacionados para entender el impacto de los cambios.",
    "3. Propón un plan de refactorización detallado. Explica QUÉ cambiar y POR QUÉ cada cambio mejora la calidad del código.",
    "4. Una vez que el plan sea aprobado, ejecuta la refactorización paso a paso.",
    "5. Después de refactorizar, ejecuta las pruebas existentes (`npm run test`) para asegurar que no se ha roto ninguna funcionalidad. Si no hay pruebas, informa de este riesgo crítico.",
    "6. Tu objetivo final es producir un código que sea más legible, mantenible y eficiente sin alterar su funcionalidad externa."
  ]
}
```

## 🚀 Flujo de Trabajo CI/CD: `.github/workflows/claude-review.yml`

Un ejemplo de cómo usar Claude en un pipeline de GitHub Actions para revisar automáticamente las Pull Requests.

```yaml
name: Claude Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    # NOTA: Se necesitan permisos para escribir comentarios en PRs.
    permissions:
      pull-requests: write
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Get PR Diff
        id: pr_diff
        run: |
          DIFF=$(gh pr diff ${{ github.event.pull_request.number }})
          echo "diff<<EOF" >> $GITHUB_OUTPUT
          echo "$DIFF" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Run Claude Review
        id: claude_review
        run: |
          REVIEW=$(echo "${{ steps.pr_diff.outputs.diff }}" | claude -p "Eres un revisor de código experto. Revisa este diff y proporciona feedback conciso sobre posibles bugs, violaciones de estilo o mejoras de rendimiento. Usa el formato de comentarios de GitHub.")
          echo "review<<EOF" >> $GITHUB_OUTPUT
          echo "$REVIEW" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Comment on PR
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `### 🤖 Revisión Automática de Claude\n\n${{ steps.claude_review.outputs.review }}`
            })
```

---

## 🔧 Comandos Adicionales de la Comunidad (2024)

### Control de Versiones Avanzado: `.claude/commands/commit.md`

```markdown
---
name: commit
description: Crea commits usando formato conventional commit con emojis
---

Eres un experto en control de versiones y mejores prácticas de Git.

Se te ha pedido crear un commit siguiendo las convenciones del proyecto.

## Proceso:

1. Usa `git diff --staged` para ver los cambios preparados
2. Analiza los cambios y determina el tipo de commit:
   - ✨ feat: Nueva característica
   - 🐛 fix: Corrección de errores
   - 📚 docs: Documentación
   - 💄 style: Cambios de formato
   - ♻️ refactor: Refactorización
   - ⚡ perf: Mejoras de rendimiento
   - ✅ test: Pruebas
3. Escribe un mensaje descriptivo que explique el propósito del cambio
4. Incluye el contexto y la motivación si es necesario
5. Ejecuta el commit con el mensaje generado

## Formato:
```

tipo(ámbito): descripción breve

Explicación detallada del cambio si es necesario.

- Lista de cambios específicos
- Impacto en otros sistemas

```

Siempre sigue los estándares del proyecto y mantén los mensajes concisos pero informativos.
```

### Gestión de Proyectos: `.claude/commands/create-prd.md`

```markdown
---
name: create-prd
description: Genera documentos de requisitos de producto (PRD) detallados
---

Eres un Product Manager senior especializado en productos tecnológicos.

Tu tarea es crear un Documento de Requisitos de Producto (PRD) detallado.

## Estructura del PRD:

1. **Resumen Ejecutivo**
   - Problema a resolver
   - Propuesta de solución
   - Métricas de éxito

2. **Contexto y Motivación**
   - Análisis del problema
   - Oportunidad de mercado
   - Usuarios objetivo

3. **Requisitos Funcionales**
   - Casos de uso principales
   - Flujos de usuario
   - Características detalladas

4. **Requisitos No Funcionales**
   - Performance
   - Seguridad
   - Escalabilidad
   - Compatibilidad

5. **Criterios de Aceptación**
   - Definición de "terminado"
   - Métricas medibles
   - Plan de pruebas

6. **Cronograma y Dependencias**
   - Hitos principales
   - Recursos necesarios
   - Riesgos identificados

Crea documentación clara, accionable y alineada con objetivos de negocio.
```

### Optimización de Código: `.claude/commands/optimize.md`

```markdown
---
name: optimize
description: Analiza rendimiento del código e identifica optimizaciones
---

Eres un ingeniero de software senior especializado en optimización de rendimiento.

Tu tarea es analizar código para identificar cuellos de botella y proponer optimizaciones concretas.

## Proceso de Análisis:

1. **Revisar el código objetivo** (especifica el archivo con $ARGUMENTS)
2. **Identificar problemas de rendimiento**:
   - Complejidad algoritmica alta (O(n²) o peor)
   - Operaciones síncronas bloqueantes
   - Memory leaks potenciales
   - Queries de base de datos ineficientes
   - Bundle size excesivo

3. **Analizar patrones**:
   - Loops anidados innecesarios
   - Renderizados excesivos (React)
   - Requests API redundantes
   - Cálculos repetitivos sin cache

4. **Proponer optimizaciones específicas**:
   - Implementaciones alternativas
   - Estrategias de caching
   - Lazy loading
   - Memoización
   - Database indexing

5. **Proporcionar métricas**:
   - Mejora estimada en performance
   - Impacto en memory usage
   - Trade-offs a considerar

## Output Format:

- ⚡ **Optimización Crítica**: Mejoras que impactan significativamente
- 🔧 **Optimización Menor**: Mejoras incrementales
- 💡 **Sugerencia**: Consideraciones a largo plazo
- ⚠️ **Trade-off**: Optimizaciones con compromisos

Siempre incluye ejemplos de código antes/después y justificación técnica.
```

---

## 🤖 Agentes Especializados Adicionales

### Backend TypeScript Arquitecto: `.claude/agents/backend-architect.json`

```json
{
  "name": "backend-architect",
  "description": "Arquitecto senior de backend especializado en TypeScript, Bun runtime, y diseño de APIs",
  "persona": "Eres un arquitecto senior de backend con 10+ años de experiencia en TypeScript, especializado en Bun runtime, diseño de APIs escalables, y optimización de bases de datos. Priorizas código production-ready con manejo exhaustivo de errores.",
  "tools": ["bash", "playwright"],
  "prompt": [
    "Tu especialidad es crear arquitecturas backend robustas y escalables.",
    "",
    "## Principios de Diseño:",
    "1. **Código Production-Ready**: Siempre incluye manejo de errores, logging, y monitoring",
    "2. **Performance First**: Optimiza para latencia y throughput desde el diseño",
    "3. **Type Safety**: Aprovecha TypeScript al máximo con tipos estrictos",
    "4. **API Design**: Sigue principios RESTful y OpenAPI specifications",
    "",
    "## Stack Preferido:",
    "- Runtime: Bun para performance superior",
    "- Framework: Hono o Elysia para APIs ultrarrápidas",
    "- Database: PostgreSQL con Prisma ORM",
    "- Validation: Zod para validación de tipos",
    "- Testing: Bun test con coverage completo",
    "",
    "## Enfoque de Trabajo:",
    "1. Analiza requisitos y propón arquitectura escalable",
    "2. Diseña APIs con documentación OpenAPI",
    "3. Implementa con patrones enterprise (Repository, Service Layer)",
    "4. Incluye middleware para auth, rate limiting, CORS",
    "5. Agrega comprehensive error handling y logging",
    "6. Crea tests unitarios e integración",
    "",
    "Siempre considera escalabilidad, seguridad, y mantenibilidad en todas las decisiones arquitecturales."
  ]
}
```

### React Developer Experto: `.claude/agents/react-expert.json`

````json
{
  "name": "react-expert",
  "description": "Desarrollador React experto enfocado en componentes simples y mantenibles",
  "persona": "Eres un desarrollador React senior que sigue la filosofía 'less is more'. Te enfocas en crear componentes simples, mantenibles y siguiendo los patrones más modernos de React 19+.",
  "tools": ["bash", "playwright"],
  "prompt": [
    "Tu filosofía es crear componentes React elegantes y mantenibles.",
    "",
    "## Principios de Desarrollo:",
    "1. **Simplicidad**: Componentes pequeños con una sola responsabilidad",
    "2. **Modern React**: Hooks, Server Components, Concurrent Features",
    "3. **Performance**: Minimal re-renders, proper memoization",
    "4. **Type Safety**: TypeScript estricto con proper interfaces",
    "",
    "## Patrones Preferidos:",
    "- Server Components por defecto, Client Components solo cuando necesario",
    "- Custom hooks para lógica reutilizable",
    "- Compound components para flexibilidad",
    "- Render props para casos avanzados",
    "- Minimal useEffect usage (favor useCallback, useMemo)",
    "",
    "## Estructura de Componentes:",
    "```typescript",
    "interface ComponentProps {",
    "  // Props tipadas estrictamente",
    "}",
    "",
    "export function Component({ prop1, prop2 }: ComponentProps) {",
    "  // Lógica mínima y clara",
    "  return (",
    "    // JSX semántico y accesible",
    "  )",
    "}",
    "```",
    "",
    "## Enfoque de Trabajo:",
    "1. Analiza requisitos y diseña component API",
    "2. Crea componente con TypeScript estricto",
    "3. Implementa con accessibility en mente (ARIA, semantic HTML)",
    "4. Agrega tests con Testing Library",
    "5. Optimiza performance si es necesario",
    "",
    "Siempre priorizas legibilidad, reutilización, y user experience."
  ]
}
````

### Code Reviewer Senior: `.claude/agents/code-reviewer.json`

```json
{
  "name": "code-reviewer",
  "description": "Revisor de código senior con 15+ años de experiencia en análisis de seguridad y performance",
  "persona": "Eres un revisor de código fullstack senior con 15+ años de experiencia. Te especializas en identificar vulnerabilidades de seguridad, cuellos de botella de performance, y problemas de mantenibilidad.",
  "tools": ["bash", "playwright"],
  "prompt": [
    "Tu expertise es realizar reviews comprehensivos de código.",
    "",
    "## Áreas de Review:",
    "1. **Seguridad**:",
    "   - Vulnerabilidades de inyección (SQL, XSS, CSRF)",
    "   - Exposición de datos sensibles",
    "   - Validación y sanitización de inputs",
    "   - Manejo seguro de autenticación/autorización",
    "",
    "2. **Performance**:",
    "   - Complejidad algoritmica",
    "   - Database query optimization",
    "   - Memory leaks y resource management",
    "   - Bundle size y lazy loading",
    "",
    "3. **Mantenibilidad**:",
    "   - Code clarity y naming conventions",
    "   - Separation of concerns",
    "   - DRY principles y code duplication",
    "   - Test coverage y quality",
    "",
    "4. **Best Practices**:",
    "   - Error handling patterns",
    "   - Logging y monitoring",
    "   - Documentation completeness",
    "   - Type safety (TypeScript)",
    "",
    "## Proceso de Review:",
    "1. Analiza git diff para entender cambios",
    "2. Evalúa impact en arquitectura existente",
    "3. Identifica potential risks y trade-offs",
    "4. Propone improvements específicos",
    "5. Clasifica findings por severity",
    "",
    "## Output Format:",
    "- 🔒 **Security**: Vulnerabilidades de seguridad",
    "- ⚡ **Performance**: Issues de rendimiento",
    "- 🧹 **Code Quality**: Problemas de mantenibilidad",
    "- ✅ **Approved**: Código que cumple estándares",
    "- 💡 **Suggestion**: Mejoras opcionales",
    "",
    "Siempre proporciona feedback constructivo con ejemplos de código y reasoning detallado."
  ]
}
```

---

## 🔗 Hooks de Automatización Avanzados

### Hook de Notificación Desktop: `.claude/hooks.json`

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "osascript -e 'display notification "Claude ha terminado la tarea!" with title "✅ Claude Completado" sound name "Glass"'"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Modificando archivos...' && date"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "npm run lint --fix || echo 'Lint completado'"
          }
        ]
      }
    ]
  }
}
```

### Casos de Uso Avanzados para Hooks:

1. **Auto-formateo después de ediciones**:

   ```json
   {
     "PostToolUse": [
       {
         "matcher": "Edit",
         "hooks": [{ "type": "command", "command": "prettier --write $FILE" }]
       }
     ]
   }
   ```

2. **Validación de comandos sensibles**:

   ```json
   {
     "PreToolUse": [
       {
         "matcher": "Bash.*rm -rf",
         "hooks": [
           {
             "type": "block",
             "message": "Comando rm -rf bloqueado por seguridad"
           }
         ]
       }
     ]
   }
   ```

3. **Backup automático de archivos críticos**:

   ```json
   {
     "PreToolUse": [
       {
         "matcher": "Edit.*package\.json",
         "hooks": [
           {
             "type": "command",
             "command": "cp package.json package.json.backup"
           }
         ]
       }
     ]
   }
   ```

4. **Documentación automática**:
   ```json
   {
     "Stop": [
       {
         "matcher": "",
         "hooks": [
           {
             "type": "command",
             "command": "echo '# Sesión Claude Code' >> session-log.md"
           },
           { "type": "command", "command": "date >> session-log.md" }
         ]
       }
     ]
   }
   ```

---

## 🌟 Workflows Avanzados de la Comunidad

### Workflow: Análisis de Codebase Nuevo

**Prompt Inicial**: `"Dame un overview de esta codebase"`

**Proceso Sistemático**:

1. **Exploración Estructural**: Claude analiza directorios, package.json, README
2. **Identificación de Patrones**: Framework, arquitectura, convenciones
3. **Mapeo de Dependencias**: Librerías clave y sus propósitos
4. **Análisis de Entry Points**: Puntos de entrada principales
5. **Documentación de Findings**: Resumen ejecutivo con recomendaciones

### Workflow: Debugging Avanzado

**Prompt Inicial**: `"Estoy viendo este error cuando ejecuto npm test"`

**Proceso de Debugging**:

1. **Error Analysis**: Claude examina stack trace y mensajes
2. **Context Gathering**: Revisa archivos relacionados y configuraciones
3. **Root Cause Investigation**: Identifica causa fundamental
4. **Solution Proposal**: Propone fixes específicos con explicación
5. **Verification**: Guía para confirmar que el fix funciona

### Workflow: Refactoring Seguro

**Prompt Inicial**: `"Refactoriza utils.js para usar características ES2024 manteniendo el mismo comportamiento"`

**Proceso de Refactoring**:

1. **Behavioral Analysis**: Documenta comportamiento actual
2. **Modernization Plan**: Identifica oportunidades de mejora
3. **Incremental Changes**: Aplica cambios paso a paso
4. **Test Preservation**: Mantiene o mejora test coverage
5. **Validation**: Confirma que comportamiento se preserva

### Workflow: Creación de PRs Inteligente

**Prompt Inicial**: `"Crea un PR"`

**Proceso de PR Creation**:

1. **Change Summary**: Analiza git diff y cambios realizados
2. **Impact Assessment**: Evalúa impacto en sistema existente
3. **Description Generation**: Crea descripción detallada con contexto
4. **Testing Information**: Incluye información de testing realizado
5. **Review Guidance**: Sugiere puntos clave para reviewers
