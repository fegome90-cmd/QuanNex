# Guía Breve para Gestionar Proyectos con IA (Óptima y Segura)

## 1) Principios Rectores

1. **Valor primero, IA después**: define el resultado esperado, a quién sirve y cómo se medirá el impacto antes de elegir herramientas.
2. **Contexto explícito**: la calidad depende del "contexto" que entregas (rol, objetivos, restricciones, ejemplos). Diseña el contexto antes del prompt.
3. **Ciclos cortos + revisión humana**: planifica, ejecuta pequeño, valida, itera. Evita grandes "saltos de fe" automatizados.
4. **Trazabilidad**: guarda prompts, decisiones, artefactos y cambios con fecha/autor para auditar y aprender.
5. **Seguridad por diseño**: mínima exposición de datos, control de permisos y registro de toda acción sensible.
6. **Herramienta adecuada**: usa el CLI/IDE/agente que mejore tu flujo; no todos los pasos requieren el mismo modelo o interfaz.

---

## 2) Flujo Recomendado (de Inicio a Fin)

### A. Definición del Objetivo
- Problema, "hecho" esperado, métricas de éxito (entregables, tiempos, calidad).
- Criterios de aceptación (qué haría que el resultado sea "listo para producción").
- Riesgos conocidos y supuestos críticos (documentados).

### B. Diseño de Contexto (Context Engineering)
- Prepara un brief conciso: propósito, público, tono, restricciones (p. ej., privacidad), estructura de salida esperada.
- Añade ejemplos (buenos y malos) y roles ("actúa como PM senior").
- Indica fuentes permitidas y "lo que NO debe hacer" (p. ej., no ejecutar comandos sin confirmación).

#### Plantilla Breve de Contexto
- **Rol del modelo**: …
- **Objetivo y definiciones de éxito**: …
- **Entradas válidas** (fuentes/archivos): …
- **Restricciones** (privacidad, estilo, formato): …
- **Ejemplos ✅/❌**: …
- **Salida esperada** (estructura): …

### C. Planificación Asistida por IA
- Genera una lista de tareas con dependencias y prioridades.
- Pide razonamiento paso a paso para comprender decisiones y detectar omisiones.
- Si faltan datos, fuerza reverse prompting ("pregunta qué información falta antes de proponer un plan").

### D. Ejecución Operativa
- **Gemini CLI**: útil para crear/ajustar tareas, resumir avances, preparar issues y automatizar pasos desde la terminal con confirmaciones explícitas.
- **Claude Code**: práctico para flujos estructurados de construcción/revisión de entregables, generación de artefactos y apoyo al desarrollo.

### E. Revisión y Pruebas
- Valida contra los criterios de aceptación.
- Revisión humana de exactitud, sesgos, fuentes y cumplimiento (privacidad/PII).
- Registra cambios y motivos (qué, por qué, quién).

### F. Cierre del Ciclo y Aprendizaje
- Retrospectiva breve: qué funcionó, qué no, qué automatizar la próxima vez.
- Actualiza la plantilla de contexto y los prompts "ganadores".

---

## 3) Salvaguardas y Buenas Prácticas de Seguridad

### Datos y Acceso
- Minimiza PII y secretos; usa variables de entorno/gestores de secretos.
- Control de permisos por rol; revisa cada "acción en el sistema" antes de ejecutar.
- Redacta/anonimiza datos al compartir con modelos externos.

### Ejecución Controlada
- **"Modo confirmación"**: ninguna acción de archivos/comandos sin autorización explícita. (Aplica especialmente en CLI/IDEs con agentes).
- Entornos separados (pruebas vs. producción).

### Trazabilidad
- Guarda prompts/contextos, decisiones, versiones de artefactos y bitácoras.
- Etiqueta salidas generadas por IA vs. humanas.

### Calidad
- Pide explicaciones (por qué, alternativas) y citas o fuentes cuando corresponda.
- Usa ejemplos negativos para acotar estilo/alcance (few-shot).

---

## 4) Checklists Operativos

### Kick-off (antes de usar IA)
- [ ] Objetivo medible + criterios de aceptación
- [ ] Riesgos y restricciones (privacidad, compliance)
- [ ] Dueños por área y canales de comunicación
- [ ] Métricas de seguimiento

### Diseño de Contexto
- [ ] Rol claro + público/tono
- [ ] Ejemplos ✅/❌ y formato de salida
- [ ] Fuentes autorizadas / prohibidas
- [ ] Límites de acción (no ejecutar X sin confirmar)

### Ejecución
- [ ] Plan con dependencias y prioridades explicado
- [ ] Tareas en herramienta (CLI/PM/Repo)
- [ ] Confirmaciones habilitadas para acciones sensibles
- [ ] Registro de prompts y cambios

### Cierre
- [ ] Validación vs. criterios de aceptación
- [ ] Lecciones aprendidas + actualización de plantillas
- [ ] Archivos y prompts "buenos" guardados

---

## 5) Prompts Base (Copiables)

### Plan de Proyecto (con razonamiento):
```
"Actúa como PM senior. Objetivo: __. Público: __. Restricciones: __. Dame un plan por fases con tareas, dependencias y criterios de aceptación. Antes de proponerlo, enumera la información que te falta. Luego, explica por qué priorizas así y entrega la salida en tabla (tarea, responsable, esfuerzo, riesgo)."
```

### Refinamiento con Ejemplos (few-shot):
```
"Así luce un buen resumen (…); así luce uno malo (…). Ajusta tu salida para parecerse al bueno y evita rasgos del malo."
```

### Revisión Segura (acción con confirmación):
```
"Propón los comandos/archivos a modificar y detalla el efecto esperado. Espera mi confirmación antes de ejecutar."
```

---

## 6) Métricas Mínimas de Seguimiento

- **Plazo**: lead time por tarea, % tareas a tiempo.
- **Calidad**: defectos detectados post-entrega; re-trabajo.
- **Productividad**: tareas completadas por iteración; tiempo ahorrado vs. base.
- **Seguridad**: incidentes (datos/permiso), acciones sin confirmar (deberían ser 0).
- **Trazabilidad**: % entregas con prompt/contexto archivado.

---

## 7) Errores Frecuentes y Cómo Evitarlos

- **Poco contexto → salidas genéricas**: usa brief + ejemplos + formato de salida.
- **Plan sin justificación → riesgos ocultos**: exige razonamiento previo y supuestos.
- **Automatizar sin control → daños a archivos/entorno**: activa confirmaciones y sandbox.
- **Hilos "largos" → pérdida de coherencia**: resume estado y reinicia contexto periódicamente (plantilla viva).
