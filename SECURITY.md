# Seguridad y Manejo de Secretos

Alcance

- Este repositorio y los proyectos generados por el inicializador.

Principios

- Mínimo privilegio en CI y scripts. Hooks “safe by default”.
- Nunca incluir secretos en el repo ni en `CLAUDE.md` o `.claude/memory/`.

Clasificación de datos

- Público: documentación, plantillas, código del inicializador.
- Sensible: tokens/API keys (prohibidos en el repo), PHI (si “medical”, prohibido en cliente/logs).

Secretos

- Usar variables de entorno y gestores seguros (GitHub Secrets, 1Password, etc.).
- `.env` fuera de control de versiones; proveer `*.env.example`.
- Escáner: `scripts/scan-secrets.sh` (en CI y pre-commit opcional) + `.secretsallow` para falsos positivos.

Reporte de vulnerabilidades

- Abrir un Security Advisory o contactar por los canales del repositorio.
- Incluir: impacto, pasos de reproducción, alcance y mitigación sugerida.

Cumplimiento (proyectos “medical”)

- PHI: no registrar ni exponer en UI o logs. Revisar con `npm run test:hipaa` (si aplica).
- Data at rest/in transit: cifrado obligatorio cuando aplique.
