# 📋 Playbook de Retractación de Reportes

## 🎯 Propósito

Este playbook define el proceso estandarizado para retractar reportes en el sistema TaskDB, garantizando trazabilidad completa y generación automática de tareas de corrección.

## 📊 Contexto del Sistema

### Entidades Involucradas
- **Report**: Reporte a retractar
- **Task**: Tareas asociadas al reporte
- **Run**: Ejecuciones relacionadas
- **Event**: Eventos de retractación
- **Correction Task**: Nueva tarea generada automáticamente

### Estados de Reporte
- `draft`: Borrador
- `published`: Publicado
- `retracted`: Retractado

## 🚨 Proceso de Retractación

### 1. Iniciación de Retractación

#### Trigger
- Solicitud manual del autor
- Detección automática de problemas
- Auditoría externa que identifica errores

#### Validación Previa
```bash
# Verificar que el reporte existe y está publicado
taskdb report show <report-id>

# Verificar procedencia antes de retractar
taskdb verify <report-id>
```

### 2. Proceso de Retractación Automática

#### Paso 1: Crear Evento de Retractación
```javascript
// Crear evento de inicio de retractación
const retractionEvent = taskdb.createEvent(
  'retraction_initiated',
  reportId,
  'report',
  {
    reason: retractionReason,
    initiated_by: userId,
    original_status: 'published',
    target_status: 'retracted'
  },
  'system'
);
```

#### Paso 2: Actualizar Estado del Reporte
```javascript
// Actualizar reporte a estado retractado
const updatedReport = taskdb.updateReport(reportId, {
  status: 'retracted',
  retracted_at: new Date().toISOString(),
  retraction_reason: retractionReason,
  retracted_by: userId
});
```

#### Paso 3: Generar Tarea de Corrección Automática
```javascript
// Crear tarea de corrección dependiente
const correctionTask = taskdb.createTask({
  title: `Corrección requerida: ${report.title}`,
  description: `Corrección del reporte retractado: ${report.title}\n\nRazón de retractación: ${retractionReason}\n\nReporte original: ${reportId}`,
  priority: 'high',
  tags: ['correction', 'retraction', 'quality'],
  metadata: {
    original_report_id: reportId,
    retraction_reason: retractionReason,
    retracted_by: userId,
    dependent_tasks: report.report_provenance.task_ids
  }
});
```

#### Paso 4: Crear Run de Corrección
```javascript
// Crear run para la tarea de corrección
const correctionRun = taskdb.createRun({
  task_id: correctionTask.id,
  metadata: {
    correction_type: 'report_retraction',
    original_report_id: reportId,
    auto_generated: true
  }
});
```

#### Paso 5: Crear Gates de Validación
```javascript
// Crear gates para validar la corrección
const validationGates = [
  taskdb.createGate({
    name: 'content_validation',
    type: 'quality',
    run_id: correctionRun.id,
    checks: [
      {
        name: 'verify_corrected_content',
        status: 'pending',
        message: 'Verificar que el contenido corregido es preciso'
      },
      {
        name: 'verify_provenance_updated',
        status: 'pending',
        message: 'Verificar que la procedencia ha sido actualizada'
      }
    ]
  }),
  taskdb.createGate({
    name: 'stakeholder_approval',
    type: 'policy',
    run_id: correctionRun.id,
    checks: [
      {
        name: 'get_approval',
        status: 'pending',
        message: 'Obtener aprobación de stakeholders relevantes'
      }
    ]
  })
];
```

### 3. Notificaciones y Comunicación

#### Notificaciones Automáticas
```javascript
// Notificar a stakeholders relevantes
const notifications = [
  {
    type: 'email',
    recipients: report.metadata.stakeholders || [],
    subject: `Reporte Retractado: ${report.title}`,
    template: 'report_retraction_notification'
  },
  {
    type: 'slack',
    channel: '#quality-alerts',
    message: `🚨 Reporte retractado: ${report.title} - Tarea de corrección creada: ${correctionTask.id}`
  }
];
```

#### Documentación de Comunicación
```javascript
// Crear artifact de comunicación
const communicationArtifact = taskdb.createArtifact({
  name: `retraction-communication-${reportId}`,
  type: 'communication',
  uri: `communications/retraction-${reportId}-${Date.now()}.md`,
  hash: calculateHash(communicationContent),
  size_bytes: Buffer.byteLength(communicationContent),
  run_id: correctionRun.id,
  metadata: {
    communication_type: 'retraction_notice',
    original_report_id: reportId
  }
});
```

### 4. Seguimiento y Monitoreo

#### Métricas de Retractación
```javascript
// Actualizar métricas del sistema
const retractionMetrics = {
  total_retractions: stats.total_retractions + 1,
  retractions_by_reason: {
    [retractionReason]: (stats.retractions_by_reason[retractionReason] || 0) + 1
  },
  avg_correction_time: calculateAvgCorrectionTime(),
  correction_success_rate: calculateCorrectionSuccessRate()
};
```

#### Dashboard de Monitoreo
- Contador de reportes retractados
- Tiempo promedio de corrección
- Tasa de éxito de correcciones
- Razones más comunes de retractación

## 🔧 Implementación Técnica

### Comando CLI para Retractación
```bash
# Retractar reporte con razón
taskdb report retract <report-id> --reason "Error en datos" --notify-stakeholders

# Retractar múltiples reportes
taskdb report retract-batch --file retraction-list.json

# Verificar estado de retractación
taskdb report status <report-id>
```

### API Endpoints
```javascript
// POST /api/reports/:id/retract
{
  "reason": "Error en datos de origen",
  "notify_stakeholders": true,
  "auto_generate_correction": true,
  "correction_priority": "high"
}

// GET /api/reports/:id/retraction-status
{
  "status": "retracted",
  "retracted_at": "2025-01-03T10:30:00Z",
  "retraction_reason": "Error en datos de origen",
  "correction_task_id": "uuid",
  "correction_status": "in_progress"
}
```

### Validaciones de Negocio
```javascript
// Validar que el reporte puede ser retractado
function validateRetraction(report) {
  const validations = [
    {
      check: () => report.status === 'published',
      error: 'Solo reportes publicados pueden ser retractados'
    },
    {
      check: () => !report.retracted_at,
      error: 'El reporte ya ha sido retractado'
    },
    {
      check: () => hasPermission(user, 'retract', report),
      error: 'Usuario no tiene permisos para retractar este reporte'
    }
  ];
  
  for (const validation of validations) {
    if (!validation.check()) {
      throw new Error(validation.error);
    }
  }
}
```

## 📊 Casos de Uso Específicos

### Caso 1: Error en Datos de Origen
```bash
# Retractación por error de datos
taskdb report retract report-123 \
  --reason "Error en datos de origen detectado" \
  --correction-priority high \
  --assign-to data-team
```

### Caso 2: Error en Metodología
```bash
# Retractación por error metodológico
taskdb report retract report-456 \
  --reason "Error en metodología de análisis" \
  --correction-priority critical \
  --assign-to analysis-team
```

### Caso 3: Retractación en Lote
```json
// Archivo retraction-batch.json
{
  "retractions": [
    {
      "report_id": "report-123",
      "reason": "Error en datos",
      "priority": "high"
    },
    {
      "report_id": "report-456", 
      "reason": "Error metodológico",
      "priority": "critical"
    }
  ],
  "notify_stakeholders": true,
  "auto_generate_corrections": true
}
```

## 🔍 Auditoría y Trazabilidad

### Eventos Generados
1. `retraction_initiated`: Inicio del proceso
2. `retraction_completed`: Retractación completada
3. `correction_task_created`: Tarea de corrección creada
4. `correction_run_started`: Run de corrección iniciado
5. `stakeholders_notified`: Stakeholders notificados

### Logs de Auditoría
```javascript
// Log detallado de retractación
const auditLog = {
  timestamp: new Date().toISOString(),
  action: 'report_retraction',
  report_id: reportId,
  user_id: userId,
  reason: retractionReason,
  original_status: 'published',
  new_status: 'retracted',
  correction_task_id: correctionTask.id,
  stakeholders_notified: stakeholders.length,
  artifacts_created: artifacts.length
};
```

## 📈 Métricas y KPIs

### Métricas de Calidad
- Tasa de retractación: `retractions / total_reports`
- Tiempo promedio de corrección
- Tasa de éxito de correcciones
- Razones más comunes de retractación

### Alertas Automáticas
- Retractación de reporte crítico
- Tiempo de corrección excede SLA
- Múltiples retractaciones del mismo autor
- Corrección fallida

## 🚨 Escalación

### Nivel 1: Retractación Automática
- Proceso automático completo
- Notificaciones estándar
- Tarea de corrección generada

### Nivel 2: Revisión Manual
- Revisión por equipo de calidad
- Aprobación adicional requerida
- Comunicación extendida

### Nivel 3: Crisis de Confianza
- Notificación a ejecutivos
- Comunicación pública si es necesario
- Revisión completa del proceso

## 📝 Template de Comunicación

### Email de Notificación
```markdown
Subject: Reporte Retractado - [Título del Reporte]

Estimado/a [Nombre],

Le informamos que el reporte "[Título del Reporte]" ha sido retractado.

**Detalles:**
- Fecha de retractación: [Fecha]
- Razón: [Razón de retractación]
- Tarea de corrección: [ID de tarea]

**Próximos pasos:**
- Se ha creado automáticamente una tarea de corrección
- El equipo responsable trabajará en la corrección
- Se le notificará cuando esté disponible la versión corregida

**Impacto:**
- [Descripción del impacto si aplica]

Si tiene preguntas, por favor contacte a [Contacto].

Atentamente,
Equipo de Calidad
```

---

*Este playbook debe ser revisado y actualizado basándose en experiencias reales de retractación y feedback de stakeholders.*
