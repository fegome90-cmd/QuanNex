# CLAUDE.md Template

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Quick Start Commands

### [PROJECT_TYPE] Development - PRIORITY COMMANDS
```bash
# Development server (PRIMARY COMMAND)
npm run dev                    # Start development server
npm start                     # Alternative start command

# Testing (ESSENTIAL for development workflow)  
npx playwright test           # Run visual/UI tests
npm test                     # Run unit tests
npm run test:watch           # Run tests in watch mode

# Code quality checks (RUN BEFORE COMMITS)
npm run lint                 # ESLint linting - MUST pass
npm run build               # Production build test - MUST succeed
npm run type-check          # TypeScript type checking
```

### 🎯 CLAUDE CODE [PROJECT_TYPE] OPTIMIZATIONS
```bash
# For Playwright integration (visual testing)
npm run dev                  # Keep running in background
npx playwright test --headed # See browser interactions

# For component development
npm run storybook           # Component development environment
```

## 💡 CLAUDE CODE WORKFLOW PREFERENCES

### 🎯 Key Principles for Claude Code
- **Always run development server first** when working on code
- **Use Playwright for visual verification** - take screenshots of changes
- **Follow the "Explorar → Planificar → Ejecutar → Confirmar" pattern**
- **Commit frequently** with semantic commit messages

### 📱 Development with Claude Code
- **PRIMARY PATTERN**: Make change → Test → Verify visually
- **ITERATION PATTERN**: Code → Screenshot → Compare → Refine  
- **TESTING PATTERN**: Write test first → Implement → Verify passes

## 🏗️ Project Architecture

### Key Directories
- **Source Code**: Look for `src/`, `lib/`, `components/`, or `pages/` directories
- **Tests**: Usually in `tests/`, `__tests__/`, or `*.test.*` files
- **Configuration**: Check `package.json`, `tsconfig.json`, config files
- **Documentation**: `docs/`, `README.md`, or `.md` files

### Development Workflow
- Use semantic commit messages (feat:, fix:, docs:, style:, refactor:, test:)
- Run linting and tests before commits
- Check build process before deploying
- Use TypeScript strict mode when available
- Follow existing code patterns and conventions

## 📋 Custom Commands Available
After initialization, you'll have access to these custom commands:
- `/test-ui` - Test UI changes with Playwright
- `/create-component` - Create new components following patterns
- `/review` - Comprehensive code review
- `/deploy` - Safe deployment with checks
- `/optimize` - Performance analysis and optimization
- `/commit` - Create semantic commits with conventional format

## 🤖 Specialized Agents Available  
- `@backend-architect` - Backend architecture and API design
- `@react-expert` - React component development
- `@code-reviewer` - Comprehensive code reviews
[CONDITIONAL_AGENTS]

## 🔧 Tools Integration
- **Playwright MCP**: Configured for visual testing and browser automation
- **GitHub CLI**: Available for repository management and PR creation
- **Linting & Formatting**: Configured based on project needs
- **Type Checking**: TypeScript support enabled where applicable