# 🩺 TaskDB Recovery Runbook

## 📋 Propósito

Este runbook proporciona pasos detallados para recuperar la integridad del TaskDB en caso de corrupción, fallos de datos o inconsistencias del sistema.

## 🚨 Escenarios de Recuperación

### 1. Corrupción de Datos Detectada

#### Síntomas
- TaskDB Doctor reporta múltiples errores críticos
- Datos inconsistentes entre tablas
- Archivos de datos corruptos o ilegibles

#### Pasos de Recuperación

1. **Detener operaciones**
   ```bash
   # Detener todos los procesos que usan TaskDB
   pkill -f taskdb
   ```

2. **Crear backup de emergencia**
   ```bash
   # Backup del estado actual (aunque esté corrupto)
   cp data/taskdb.json data/taskdb-corrupt-backup-$(date +%Y%m%d-%H%M%S).json
   ```

3. **Ejecutar diagnóstico completo**
   ```bash
   taskdb doctor --verbose --strict
   ```

4. **Aplicar fixes automáticos**
   ```bash
   taskdb doctor --fix --verbose
   ```

5. **Verificar integridad post-reparación**
   ```bash
   taskdb doctor --ci
   ```

6. **Si la reparación automática falla**
   ```bash
   # Restaurar desde backup más reciente
   cp data/taskdb-backup-latest.json data/taskdb.json
   taskdb doctor --verify
   ```

### 2. Pérdida Completa de Datos

#### Síntomas
- Archivo `taskdb.json` no existe o está vacío
- Errores de "archivo no encontrado"
- Sistema no puede inicializar

#### Pasos de Recuperación

1. **Verificar backups disponibles**
   ```bash
   ls -la data/taskdb-backup-*.json
   ls -la .reports/taskdb-backups/
   ```

2. **Restaurar desde backup más reciente**
   ```bash
   # Encontrar backup más reciente
   LATEST_BACKUP=$(ls -t data/taskdb-backup-*.json | head -1)
   
   # Restaurar
   cp "$LATEST_BACKUP" data/taskdb.json
   
   # Verificar integridad
   taskdb doctor --verify
   ```

3. **Si no hay backups disponibles**
   ```bash
   # Reinicializar sistema desde cero
   taskdb init --force
   
   # Restaurar políticas base
   taskdb doctor --fix
   ```

### 3. Inconsistencias de Relaciones

#### Síntomas
- Runs huérfanos (sin task padre)
- Gates huérfanos (sin run padre)
- Artifacts huérfanos (sin run padre)

#### Pasos de Recuperación

1. **Identificar huérfanos**
   ```bash
   taskdb doctor --verbose | grep -i orphan
   ```

2. **Aplicar limpieza automática**
   ```bash
   taskdb doctor --fix --verbose
   ```

3. **Verificar limpieza**
   ```bash
   taskdb doctor --ci
   ```

### 4. Corrupción de Hashes de Artifacts

#### Síntomas
- Artifacts con hashes inválidos o vacíos
- Verificación de integridad falla
- Archivos de artifacts no encontrados

#### Pasos de Recuperación

1. **Identificar artifacts problemáticos**
   ```bash
   taskdb doctor --verbose | grep -i "hash"
   ```

2. **Recalcular hashes automáticamente**
   ```bash
   taskdb doctor --fix --verbose
   ```

3. **Para artifacts con archivos faltantes**
   ```bash
   # Marcar como corruptos o eliminar
   taskdb artifact cleanup --remove-missing
   ```

### 5. Fallos de Performance

#### Síntomas
- Queries lentas
- Sistema lento al cargar
- Muchos eventos antiguos

#### Pasos de Recuperación

1. **Analizar performance**
   ```bash
   taskdb stats
   taskdb doctor --verbose | grep -i performance
   ```

2. **Archivar eventos antiguos**
   ```bash
   taskdb doctor --fix --archive-old-events
   ```

3. **Optimizar base de datos**
   ```bash
   taskdb optimize --vacuum
   ```

## 🔧 Herramientas de Recuperación

### TaskDB Doctor

```bash
# Diagnóstico básico
taskdb doctor

# Diagnóstico verbose
taskdb doctor --verbose

# Reparación automática
taskdb doctor --fix

# Modo CI (falla si hay problemas críticos)
taskdb doctor --ci

# Modo estricto (no permite problemas altos)
taskdb doctor --strict
```

### Verificación de Integridad

```bash
# Verificar integridad básica
taskdb verify --check-all

# Verificar reportes específicos
taskdb verify <report-id>

# Verificar artifacts
taskdb artifact verify --check-hashes
```

### Backup y Restauración

```bash
# Crear backup manual
taskdb backup --output taskdb-backup-manual.json

# Restaurar desde backup
taskdb restore --input taskdb-backup-manual.json

# Listar backups disponibles
taskdb backup --list
```

## 📊 Monitoreo Post-Recuperación

### Métricas a Verificar

1. **Integridad del sistema**
   ```bash
   taskdb doctor --ci
   ```

2. **Estadísticas básicas**
   ```bash
   taskdb stats
   ```

3. **Verificación de procedencia**
   ```bash
   taskdb verify --check-recent-reports
   ```

### Alertas a Configurar

- TaskDB Doctor falla en CI
- Más de 5 problemas críticos detectados
- Tasa de verificación de procedencia < 95%
- Huérfanos detectados > 0

## 🚨 Escalación

### Nivel 1: Reparación Automática
- Ejecutar `taskdb doctor --fix`
- Verificar con `taskdb doctor --ci`

### Nivel 2: Reparación Manual
- Revisar logs detallados
- Aplicar fixes específicos
- Restaurar desde backups

### Nivel 3: Recuperación Completa
- Reconstruir sistema desde cero
- Restaurar datos desde backups externos
- Verificar integridad completa

## 📝 Documentación de Incidentes

Para cada incidente de recuperación, documentar:

1. **Timestamp del incidente**
2. **Síntomas observados**
3. **Pasos de recuperación ejecutados**
4. **Resultado de la recuperación**
5. **Tiempo de recuperación total**
6. **Acciones preventivas implementadas**

### Template de Reporte

```markdown
## Incidente TaskDB - [Fecha]

**Timestamp**: [ISO 8601]
**Severidad**: [Critical/High/Medium/Low]
**Duración**: [Tiempo total]

### Síntomas
- [Descripción de síntomas]

### Causa Raíz
- [Análisis de causa raíz]

### Acciones Tomadas
1. [Paso 1]
2. [Paso 2]
3. [Paso N]

### Resultado
- [Estado final del sistema]
- [Métricas post-recuperación]

### Acciones Preventivas
- [Mejoras implementadas]
- [Monitoreo adicional]
```

## 🔄 Mantenimiento Preventivo

### Tareas Regulares

1. **Diario**
   ```bash
   taskdb doctor --ci
   ```

2. **Semanal**
   ```bash
   taskdb doctor --fix
   taskdb backup --auto
   ```

3. **Mensual**
   ```bash
   taskdb optimize --full
   taskdb archive --old-events
   ```

### Monitoreo Continuo

- Health checks automáticos cada 5 minutos
- Alertas en caso de degradación
- Backup automático cada 6 horas
- Verificación de integridad cada 24 horas

---

*Este runbook debe ser revisado y actualizado regularmente basándose en incidentes reales y mejoras del sistema.*
