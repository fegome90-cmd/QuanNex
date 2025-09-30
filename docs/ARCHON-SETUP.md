# Archon Setup — Guía Rápida (Segura)

## 1) Clonar Archon
```bash
git clone https://github.com/coleam00/archon.git external/archon
cd external/archon
```

## 2) Configurar entorno
```bash
cp .env.example .env
# Edita .env y añade credenciales Supabase:
# SUPABASE_URL=https://tu-proyecto.supabase.co
# SUPABASE_SERVICE_KEY=<service-key-legacy>
# Para local:
# SUPABASE_URL=http://host.docker.internal:8000
```

## 3) Migraciones
- En Supabase (SQL Editor), ejecuta el contenido de `migration/complete_setup.sql`.

## 4) Levantar servicios
```bash
docker compose up --build -d
```
- UI: http://localhost:3737
- API: http://localhost:8181
- MCP: http://localhost:8051

## 5) Onboarding en UI
- Abre http://localhost:3737 y completa onboarding (API key).

## 6) Verificar desde este repo
```bash
# Ruta por defecto: ./external/archon
make archon-check
make archon-smoke
```

## 7) Configurar MCP para Claude Code
```bash
# Agregar Archon como servidor MCP (SSE transport)
claude mcp add --transport sse --scope user archon http://localhost:8051/mcp

# Verificar conexión
claude mcp list
```

## 8) Configurar MCP para Cursor (opcional)
El archivo `.cursor/mcp.json` ya está configurado con el endpoint correcto:
```json
{
  "mcpServers": {
    "archon": {
      "url": "http://localhost:8051/mcp"
    }
  }
}
```

## 9) Ejecutar edge matrix (opcional)
```bash
make archon-edge
```

## Notas sobre MCP
- Archon MCP usa **transporte SSE** (Server-Sent Events), no HTTP estándar
- Endpoint correcto: `http://localhost:8051/mcp`
- Los logs de Archon muestran las conexiones MCP entrantes
- Si hay problemas de conexión, verificar que los servicios estén corriendo con `docker compose ps`

Notas
- No se instalan herramientas en el host (Docker/Compose requeridos).
- Respeta política de estabilidad: sin sudo; plantillas OFF por defecto.
