# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Primary Development

- `./claude-project-init.sh` - Main project initialization script with interactive prompts
- `./claude-project-init.sh --dry-run` - Show what would be created without writing files

### Archon MCP Server Management

- `make archon-bootstrap` - Bootstrap Archon MCP server (clone, configure, Docker Compose up)
- `make archon-check` - Verify Archon setup and configuration
- `make archon-smoke` - Run smoke tests against Archon services
- `make archon-edge` - Execute edge matrix tests

### Testing and Quality Assurance

- `./scripts/test-claude-init.sh` - Run complete integration tests for the initializer
- `./scripts/lint-shell.sh` - Lint shell scripts using shellcheck and shfmt
- `./scripts/scan-secrets.sh` - Scan for potential secrets in codebase
- `./scripts/verify-dependencies.sh` - Check required dependencies (Git, GitHub CLI, Node.js)
- `./scripts/test-unit.sh` - Run unit tests for individual components

### CI/CD Commands

- `./scripts/validate-project.sh` - Validate project structure and configuration
- `./scripts/collect-reports.sh` - Generate validation and initialization reports
- `./scripts/healthcheck.sh` - System health validation

## Architecture Overview

### Core System Design

This is a **shell-based project initialization kit** that scaffolds Claude Code projects with specialized templates and configurations. The architecture follows Toyota Production System principles with stability-first design.

**Note**: The `analisis-motor-rete/` directory contains a **demonstration example** of complex technical analysis capabilities, not a core component of the kit itself.

### Key Components

**Main Script (`claude-project-init.sh`)**:

- Interactive project initialization with 6 project types (frontend, backend, fullstack, medical, design, generic)
- Dependency validation, atomic operations with staging/rollback
- Template validation and placeholder substitution system
- Lock-based concurrency control

**Template System (`templates/`)**:

- JSON manifest with version compatibility checking
- Specialized CLAUDE.md files for each project type
- MCP server configurations, hooks, and healthcheck scripts
- Template validation ensures zero `{{placeholder}}` artifacts

**Script Ecosystem (`scripts/`)**:

- Modular testing framework with integration and unit tests
- Quality gates for linting, secrets scanning, and validation
- Archon MCP server integration scripts
- CI/CD automation and reporting tools

**Archon Integration (`external/archon/`)**:

- **Advanced MCP Server**: Knowledge management and AI collaboration platform (coleam00/archon)
- **Docker-based Services**: UI (3737), API (8181), MCP (8051), Agents Service
- **Knowledge Management**: Web crawling, document processing, semantic vector search with RAG
- **AI Collaboration**: Multi-model support (OpenAI, Ollama, Gemini) with real-time streaming
- **Task Management**: Hierarchical project tracking with AI-assisted task generation
- **Bootstrap Scripts**: `archon-bootstrap.sh`, `archon-setup-check.sh`, `archon-smoke.sh`

### Stability and Quality Gates

The project implements Toyota-inspired quality gates:

- **Gate A**: Permissions/space validation + safe cleanup
- **Gate B**: Template validation (JSON/structure/version) + zero placeholders
- **Gate C**: MCP/Hooks resilience + executable validation
- **Gate D**: Transactionality + functional healthcheck
- **Gate E**: Structured logging + template compatibility

### Project Types and Specialization

1. **Frontend**: React/Vue/Angular with Playwright testing
2. **Backend**: Node.js/Python/Go with scalable architecture
3. **Fullstack**: Integrated frontend + backend with DevOps
4. **Medical**: HIPAA compliance + security audit automation
5. **Design**: Anti-generic design system with uniqueness validation
6. **Generic**: Minimal base template for customization

## Development Guidelines

### Coding Standards

- **Shell Scripts**: Use `#!/bin/bash`, `set -e`, 2-space indent, snake_case functions
- **Error Handling**: Comprehensive trap handlers with safe cleanup
- **Validation**: Fail-fast preflight checks before disk operations
- **Atomic Operations**: Staging directories with atomic moves

### Template Development

- All templates must validate through `templates/manifest.json`
- Complete placeholder substitution required (zero `{{...}}` in output)
- Include project-specific CLAUDE.md with relevant commands/agents
- Maintain version compatibility with `min_init_version`

### Testing Protocol

- Integration tests via `test-claude-init.sh` for all project types
- Unit tests for individual script components
- Dry-run testing for validation without side effects
- CI pipeline with required checks: lint, init, flags, unit, secrets, edge

### Archon MCP Server Setup

- **Prerequisites**: Docker and Docker Compose required
- **Configuration**: Copy `.env.example` to `.env` in `external/archon/`
- **Supabase Setup**: Configure `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (service key 'legacy' for cloud)
- **Local Development**: Use `SUPABASE_URL=http://host.docker.internal:8000` for local Supabase
- **Services Access**: UI (http://localhost:3737), API (http://localhost:8181), MCP (http://localhost:8051)

### Archon Workflow Integration

- **Knowledge-First Development**: Use RAG queries before implementation
- **Multi-Model AI Support**: Leverage OpenAI, Ollama, Gemini through unified interface
- **Document Processing**: Crawl documentation, process PDFs, markdown for context
- **Task Management**: AI-assisted task generation with hierarchical project tracking
- **Real-time Collaboration**: Stream responses and share context across AI sessions

## Single-File Execution Model

### Main Entry Point

The primary script `claude-project-init.sh` is a monolithic shell script (700+ lines) that handles all project initialization logic including:

- Interactive project type selection (6 types: frontend, backend, fullstack, medical, design, generic)
- Template validation and placeholder substitution
- Dependency checking (Git, GitHub CLI, Node.js)
- Atomic file operations with staging/rollback capability
- Lock-based concurrency control to prevent multiple simultaneous runs

### Project Type Specialization

Each project type has its own specialized CLAUDE.md template in `templates/claude/[type]/CLAUDE.md`:

- **Frontend**: React/TypeScript with Playwright testing, component creation commands
- **Backend**: Node.js/Python/Go with API-focused architecture and database setup
- **Fullstack**: Combined frontend + backend with DevOps automation
- **Medical**: HIPAA compliance features and medical reviewer agent
- **Design**: Anti-generic system with uniqueness validation and 7 specialized design agents
- **Generic**: Minimal base configuration for custom projects

### Template System Architecture

- `templates/manifest.json`: Version control and dependency management for all templates
- JSON validation with `jq` when available for template integrity
- Zero placeholder policy - all `{{VARIABLE}}` tokens must be substituted during initialization
- Template dependency cycle detection to prevent circular references

## Key Configuration Files

### Safety and Defaults

- Templates disabled by default (`--use-templates=off`) until validated
- Hooks without auto-fix unless `CLAUDE_HOOKS_LINT_FIX=1`
- MCP server state controlled through proper enable/disable validation
- Project names restricted to `^[a-zA-Z0-9._-]{1,64}$`

### Environment Variables

- `CLAUDE_INIT_SKIP_DEPS=1` - Skip dependency validation
- `CLAUDE_HOOKS_LINT_FIX=1` - Enable auto-fix in hooks

### Archon Environment Variables

- `ARCHON_DIR` - Archon installation directory (default: `./external/archon`)
- `REPO_URL` - Archon repository URL (default: `https://github.com/coleam00/archon.git`)
- `SUPABASE_URL` - Supabase project URL for Archon database
- `SUPABASE_SERVICE_KEY` - Supabase service key (legacy format for cloud)
- `ARCHON_UI_PORT` - UI service port (default: 3737)
- `ARCHON_SERVER_PORT` - API service port (default: 8181)
- `ARCHON_MCP_PORT` - MCP service port (default: 8051)

### File Structure Conventions

- `.claude/` directory for Claude Code configuration
- `templates/` for project scaffolding templates
- `scripts/` for maintenance and testing utilities
- `docs/` for comprehensive documentation
- `reports/` for CI/CD validation artifacts
- `analisis-motor-rete/` for demonstration example (not core functionality)

## Critical Implementation Notes

### Concurrency and Safety

- File system operations use exclusive locks per destination
- Staging directories with atomic moves prevent partial states
- Comprehensive cleanup on interruption or failure
- UTF-8 encoding and LF line endings enforced

### Template System Integrity

- JSON validation using `jq` when available
- Dependency cycle detection in template relationships
- Checksum validation for template integrity
- Version compatibility enforcement

### Archon MCP Server Priority

- Archon task management takes precedence over TodoWrite for complex workflows
- Research-first development approach using knowledge base queries
- Task status tracking with clear progression markers
- Feature alignment with project capabilities and roadmap

## Script Ecosystem Organization

### Core Scripts (scripts/ directory)

- `test-claude-init.sh`: Comprehensive integration testing for all project types and flags
- `lint-shell.sh`: Shell script quality validation using shellcheck and shfmt
- `scan-secrets.sh`: Security scanning for accidentally committed secrets and credentials
- `verify-dependencies.sh`: Pre-flight dependency validation (Git, GitHub CLI, Node.js)
- `healthcheck.sh`: Post-initialization health validation for generated projects
- `validate-project.sh`: Project structure and configuration validation

### Specialized Testing Scripts

- `test-unit.sh`: Unit test runner for individual components
- `test-flags.sh`: Command-line flag parsing and validation testing
- `integration-test.sh`: Extended integration testing framework
- `security-audit.sh`: Security audit automation for generated projects

### Archon Integration Scripts

- `archon-bootstrap.sh`: Automated Archon MCP server setup and configuration
- `archon-setup-check.sh`: Archon service health and configuration validation
- `archon-smoke.sh`: Smoke tests against running Archon services

### Development Support Scripts

- `collect-reports.sh`: CI/CD report aggregation and validation artifact generation
- `deployment-check.sh`: Deployment readiness validation
- `eslint-check.sh`: JavaScript/TypeScript code quality validation
- `check-phi.sh`: PHI (Protected Health Information) compliance scanning for medical projects

### Toyota Production System Implementation

The codebase implements Toyota's principles through:

- **Quality Gates (Jidoka)**: 5 gates (A-E) that stop execution on validation failures
- **Just-in-Time**: Templates and features only activated when fully validated
- **Continuous Improvement (Kaizen)**: Built-in metrics collection and post-mortem documentation
- **Standardization**: Consistent error handling, logging, and cleanup patterns across all scripts
- **Poka-Yoke**: Fail-fast validation and defensive programming to prevent errors
