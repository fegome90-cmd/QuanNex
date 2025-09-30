# 🎯 Ejemplo: Crear Proyecto Frontend con Claude Code

## Caso de Uso: Aplicación React E-commerce

### Paso 1: Ejecutar el Script
```bash
cd /Users/felipe/Desktop/claude-project-init-kit
./claude-project-init.sh
```

### Paso 2: Configuración
```
Introduce el nombre de tu nuevo proyecto: tienda-online-react
Selecciona el tipo de proyecto (1-6): 1
```

### Paso 3: Resultado Generado
```
tienda-online-react/
├── .claude/
│   ├── commands/
│   │   ├── test-ui.md           # Testing visual con Playwright
│   │   ├── create-component.md  # Generador de componentes
│   │   ├── review.md            # Review de código
│   │   ├── deploy.md            # Despliegue seguro
│   │   ├── optimize.md          # Optimización de performance
│   │   └── commit.md            # Commits semánticos
│   ├── agents/
│   │   ├── backend-architect.json
│   │   ├── react-expert.json
│   │   ├── code-reviewer.json
│   │   └── medical-reviewer.json
│   ├── mcp.json                 # Playwright MCP configurado
│   └── hooks.json               # Hooks con notificaciones
├── context/
├── CLAUDE.md                    # Configuración específica frontend
├── .gitignore                   # Optimizado para React
└── README.md                    # Generado automáticamente
```

### Paso 4: Inicializar Claude Code
```bash
cd tienda-online-react
claude
```

### Paso 5: Ejemplos de Uso

#### A. Crear Componente Product Card
```bash
/create-component ProductCard
```

**Claude ejecutará:**
1. Analizar patrones existentes del proyecto
2. Crear `src/components/ProductCard.tsx`
3. Generar tests con Testing Library
4. Actualizar exports en `index.ts`
5. Verificar con tests

#### B. Testing Visual
```bash
/test-ui
```

**Claude ejecutará:**
1. Iniciar `npm run dev` si no está corriendo
2. Ejecutar `npx playwright test --headed`
3. Tomar screenshots de cambios
4. Proporcionar feedback visual específico

#### C. Optimización de Performance
```bash
/optimize src/components/ProductList.tsx
```

**Claude analizará:**
- Complejidad algorítmica
- Re-renders innecesarios
- Bundle size impact
- Lazy loading opportunities

### Paso 6: Flujos de Trabajo Típicos

#### Desarrollo de Feature Nueva
```bash
# 1. Crear componente
/create-component ShoppingCart

# 2. Testing visual
/test-ui

# 3. Optimizar si es necesario
/optimize src/components/ShoppingCart.tsx

# 4. Review antes de commit
/review

# 5. Commit semántico
/commit
```

#### Delegación a Agentes Especializados
```bash
# Para arquitectura React compleja
@react-expert "Diseña la estructura de estado para un carrito de compras con productos variables"

# Para review exhaustivo
@code-reviewer "Revisa el componente ProductList para performance y mejores prácticas"

# Para arquitectura backend (si hay API)
@backend-architect "Diseña los endpoints necesarios para la funcionalidad de carrito"
```

### Comandos del CLAUDE.md Generado

```bash
# Desarrollo (PRIMARIO)
npm run dev                    # Servidor de desarrollo

# Testing (ESENCIAL)
npx playwright test           # Tests visuales/UI
npm test                     # Tests unitarios
npm run test:watch           # Tests en watch mode

# Calidad de código (ANTES DE COMMITS)
npm run lint                 # ESLint - DEBE pasar
npm run build               # Build de producción - DEBE funcionar
npm run type-check          # TypeScript checking
```

### Características Específicas Frontend

#### Playwright MCP Integrado
- Screenshots automáticos en `/test-ui`
- Testing de responsive design
- Validación de accessibility

#### Agentes Especializados
- **@react-expert**: Componentes modernos, hooks, Server Components
- **@backend-architect**: APIs y integración
- **@code-reviewer**: Security, performance, maintainability

#### CLAUDE.md Personalizado
- Comandos prioritarios para desarrollo frontend
- Patrones de React modernos documentados
- Flujo de trabajo optimizado para Claude Code

### Tips para Máximo Aprovechamiento

1. **Usa /test-ui frecuentemente** - Claude verá los cambios visualmente
2. **Delega complejidad a @react-expert** - Especialmente para arquitectura
3. **Siempre /review antes de commits** - Previene bugs
4. **Mantén el servidor dev corriendo** - Claude puede interactuar mejor

### Resultado Final

Un proyecto frontend completamente configurado para desarrollo ágil con Claude Code, con testing visual automático, agentes especializados y flujos de trabajo optimizados.