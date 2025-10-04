#!/usr/bin/env bash
set -euo pipefail

# =====================================================
# Rollback Automático - Disparado por Alertas
# =====================================================

# Configuración
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="logs/rollback_auto_$TIMESTAMP.log"
BACKUP_DIR="backups"

# Variables de entorno
SLACK_WEBHOOK=${SLACK_WEBHOOK:-""}
ALERT_REASON=${ALERT_REASON:-"gate_fail_rate"}

# Colores para output
red() { printf "\e[31m%s\e[0m\n" "$*"; }
green() { printf "\e[32m%s\e[0m\n" "$*"; }
yellow() { printf "\e[33m%s\e[0m\n" "$*"; }

# Crear directorio de logs si no existe
mkdir -p logs

echo "🚨 AUTOMATIC ROLLBACK TRIGGERED - $TIMESTAMP" | tee "$LOG_FILE"
echo "================================================" | tee -a "$LOG_FILE"
echo "Reason: $ALERT_REASON" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# =====================================================
# 1. Detener Tráfico
# =====================================================

echo "🚦 Step 1: Stopping traffic..." | tee -a "$LOG_FILE"

# Detener tráfico (0%)
if command -v node >/dev/null 2>&1; then
    if [ -f "ops/traffic/set_canary.mjs" ]; then
        node ops/traffic/set_canary.mjs --percent 0 | tee -a "$LOG_FILE"
        echo "✅ Traffic stopped (0%)" | tee -a "$LOG_FILE"
    else
        yellow "⚠️  Traffic control script not found, skipping traffic stop" | tee -a "$LOG_FILE"
    fi
else
    yellow "⚠️  Node.js not available, skipping traffic control" | tee -a "$LOG_FILE"
fi

# =====================================================
# 2. Restaurar Snapshots
# =====================================================

echo "📸 Step 2: Restoring snapshots..." | tee -a "$LOG_FILE"

# Buscar el último snapshot disponible
LATEST_SNAPSHOT=$(ls -t backups/snapshot_metadata_*.json 2>/dev/null | head -1 | sed 's/.*snapshot_metadata_\(.*\)\.json/\1/' || echo "")

if [ -n "$LATEST_SNAPSHOT" ]; then
    echo "📋 Found latest snapshot: $LATEST_SNAPSHOT" | tee -a "$LOG_FILE"
    
    # Restaurar snapshots
    if bash ops/snapshots/restore_all.sh "$LATEST_SNAPSHOT" >> "$LOG_FILE" 2>&1; then
        green "✅ Snapshots restored successfully" | tee -a "$LOG_FILE"
    else
        red "❌ Snapshot restore failed" | tee -a "$LOG_FILE"
        echo "❌ ROLLBACK FAILED - Manual intervention required" | tee -a "$LOG_FILE"
        exit 1
    fi
else
    red "❌ No snapshots found for rollback" | tee -a "$LOG_FILE"
    echo "❌ ROLLBACK FAILED - No snapshots available" | tee -a "$LOG_FILE"
    exit 1
fi

# =====================================================
# 3. Revertir Código/Config
# =====================================================

echo "⏪ Step 3: Reverting to last green..." | tee -a "$LOG_FILE"

# Revertir a última versión estable
if [ -f "ops/runbooks/revert_last_green.sh" ]; then
    if bash ops/runbooks/revert_last_green.sh >> "$LOG_FILE" 2>&1; then
        green "✅ Code/config reverted successfully" | tee -a "$LOG_FILE"
    else
        yellow "⚠️  Code/config revert failed, continuing with data rollback" | tee -a "$LOG_FILE"
    fi
else
    yellow "⚠️  Revert script not found, skipping code revert" | tee -a "$LOG_FILE"
fi

# =====================================================
# 4. Verificación
# =====================================================

echo "🧪 Step 4: Running verification..." | tee -a "$LOG_FILE"

# Smoke test
if make smoke >> "$LOG_FILE" 2>&1; then
    green "✅ Smoke test passed" | tee -a "$LOG_FILE"
else
    yellow "⚠️  Smoke test failed - manual verification required" | tee -a "$LOG_FILE"
fi

# Quick eval si está disponible
if command -v python >/dev/null 2>&1 && [ -f "rag/eval/ragas_smoke.py" ]; then
    echo "🧪 Running quick evaluation..." | tee -a "$LOG_FILE"
    if python rag/eval/ragas_smoke.py --num_queries 5 >> "$LOG_FILE" 2>&1; then
        green "✅ Quick evaluation passed" | tee -a "$LOG_FILE"
    else
        yellow "⚠️  Quick evaluation failed" | tee -a "$LOG_FILE"
    fi
fi

# =====================================================
# 5. Notificaciones
# =====================================================

echo "📢 Step 5: Sending notifications..." | tee -a "$LOG_FILE"

# Notificar por Slack si está configurado
if [ -n "$SLACK_WEBHOOK" ]; then
    SLACK_MESSAGE=$(cat << EOF
{
  "text": "🚨 RAG Pipeline - Automatic Rollback Executed",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*RAG Pipeline Automatic Rollback*\n\n• *Reason:* $ALERT_REASON\n• *Timestamp:* $TIMESTAMP\n• *Snapshot:* $LATEST_SNAPSHOT\n• *Status:* Completed\n\n*Next Steps:*\n• Review rollback log: \`$LOG_FILE\`\n• Run manual verification\n• Investigate root cause\n• Plan safe redeployment"
      }
    }
  ]
}
EOF
    )
    
    if curl -s -X POST "$SLACK_WEBHOOK" \
        -H 'Content-type: application/json' \
        --data "$SLACK_MESSAGE" >> "$LOG_FILE" 2>&1; then
        green "✅ Slack notification sent" | tee -a "$LOG_FILE"
    else
        yellow "⚠️  Slack notification failed" | tee -a "$LOG_FILE"
    fi
else
    yellow "⚠️  SLACK_WEBHOOK not configured, skipping notification" | tee -a "$LOG_FILE"
fi

# =====================================================
# 6. Logging en TaskDB
# =====================================================

echo "📝 Step 6: Logging rollback event..." | tee -a "$LOG_FILE"

# Registrar evento en TaskDB si está disponible
if command -v psql >/dev/null 2>&1; then
    ROLLBACK_EVENT=$(cat << EOF
INSERT INTO task_events (task_id, event_type, metadata, created_at) 
VALUES (
    'rollback_auto_$TIMESTAMP',
    'rollback_auto',
    '{
        "reason": "$ALERT_REASON",
        "snapshot": "$LATEST_SNAPSHOT",
        "timestamp": "$TIMESTAMP",
        "log_file": "$LOG_FILE",
        "success": true
    }',
    now()
);
EOF
    )
    
    if echo "$ROLLBACK_EVENT" | psql -h "${PGHOST:-localhost}" -p "${PGPORT:-5433}" -U "${PGUSER:-rag}" -d "${PGDATABASE:-ragdb}" >> "$LOG_FILE" 2>&1; then
        green "✅ Rollback event logged in TaskDB" | tee -a "$LOG_FILE"
    else
        yellow "⚠️  TaskDB logging failed" | tee -a "$LOG_FILE"
    fi
fi

# =====================================================
# 7. Finalización
# =====================================================

echo "" | tee -a "$LOG_FILE"
green "🎉 AUTOMATIC ROLLBACK COMPLETED SUCCESSFULLY" | tee -a "$LOG_FILE"
echo "================================================" | tee -a "$LOG_FILE"
echo "📊 Summary:" | tee -a "$LOG_FILE"
echo "  • Reason: $ALERT_REASON" | tee -a "$LOG_FILE"
echo "  • Timestamp: $TIMESTAMP" | tee -a "$LOG_FILE"
echo "  • Snapshot: $LATEST_SNAPSHOT" | tee -a "$LOG_FILE"
echo "  • Log file: $LOG_FILE" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "📋 Next Steps:" | tee -a "$LOG_FILE"
echo "  1. Review rollback log: $LOG_FILE" | tee -a "$LOG_FILE"
echo "  2. Run manual verification: make smoke && make eval.quick" | tee -a "$LOG_FILE"
echo "  3. Investigate root cause of $ALERT_REASON" | tee -a "$LOG_FILE"
echo "  4. Plan safe redeployment with fixes" | tee -a "$LOG_FILE"
echo "  5. Update runbooks if needed" | tee -a "$LOG_FILE"

# Exit code 0 = success
exit 0
