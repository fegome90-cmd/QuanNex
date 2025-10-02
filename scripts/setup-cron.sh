#!/bin/bash
# Setup Cron Job para QuanNex Daily Automation
# Configura la ejecución automática diaria del sistema de semáforo

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CRON_SCRIPT="$SCRIPT_DIR/quannex-daily-automation.sh"

# Función de ayuda
show_help() {
    echo "QuanNex Cron Setup"
    echo "=================="
    echo ""
    echo "Uso: $0 [opciones]"
    echo ""
    echo "Opciones:"
    echo "  --install     Instalar cron job diario"
    echo "  --uninstall   Desinstalar cron job"
    echo "  --status      Ver estado del cron job"
    echo "  --test        Probar ejecución del cron job"
    echo "  --help, -h    Mostrar esta ayuda"
    echo ""
    echo "Horarios disponibles:"
    echo "  --morning     Ejecutar a las 9:00 AM"
    echo "  --afternoon   Ejecutar a las 2:00 PM"
    echo "  --evening     Ejecutar a las 6:00 PM"
    echo "  --custom TIME Ejecutar a hora personalizada (formato HH:MM)"
    echo ""
    echo "Ejemplos:"
    echo "  $0 --install --morning    # Instalar para 9:00 AM"
    echo "  $0 --install --custom 14:30  # Instalar para 2:30 PM"
    echo "  $0 --status               # Ver estado actual"
    echo "  $0 --uninstall            # Desinstalar"
}

# Verificar si el script existe
if [[ ! -f "$CRON_SCRIPT" ]]; then
    echo "❌ Error: No se encontró el script de automatización en $CRON_SCRIPT"
    exit 1
fi

# Hacer el script ejecutable
chmod +x "$CRON_SCRIPT"

# Función para instalar cron job
install_cron() {
    local time="$1"
    local cron_entry="0 $time * * * cd $PROJECT_ROOT && $CRON_SCRIPT --verbose >> $PROJECT_ROOT/logs/quannex-cron.log 2>&1"
    
    echo "🔧 Instalando cron job para QuanNex..."
    echo "⏰ Horario: $time"
    echo "📁 Directorio: $PROJECT_ROOT"
    echo "📝 Log: $PROJECT_ROOT/logs/quannex-cron.log"
    echo ""
    
    # Crear directorio de logs si no existe
    mkdir -p "$PROJECT_ROOT/logs"
    
    # Verificar si ya existe un cron job para QuanNex
    if crontab -l 2>/dev/null | grep -q "quannex-daily-automation.sh"; then
        echo "⚠️ Ya existe un cron job para QuanNex. Desinstalando primero..."
        uninstall_cron
    fi
    
    # Agregar nuevo cron job
    if (crontab -l 2>/dev/null; echo "$cron_entry") | crontab -; then
        echo "✅ Cron job instalado exitosamente"
        echo "📋 Entrada: $cron_entry"
    else
        echo "❌ Error al instalar cron job"
        exit 1
    fi
}

# Función para desinstalar cron job
uninstall_cron() {
    echo "🗑️ Desinstalando cron job de QuanNex..."
    
    # Remover cron job existente
    if crontab -l 2>/dev/null | grep -v "quannex-daily-automation.sh" | crontab -; then
        echo "✅ Cron job desinstalado exitosamente"
    else
        echo "❌ Error al desinstalar cron job"
        exit 1
    fi
}

# Función para ver estado del cron job
status_cron() {
    echo "📊 Estado del cron job QuanNex:"
    echo "==============================="
    
    if crontab -l 2>/dev/null | grep -q "quannex-daily-automation.sh"; then
        echo "✅ Cron job instalado"
        echo ""
        echo "📋 Entrada actual:"
        crontab -l 2>/dev/null | grep "quannex-daily-automation.sh"
        echo ""
        echo "📁 Logs disponibles:"
        if [[ -f "$PROJECT_ROOT/logs/quannex-cron.log" ]]; then
            echo "  📝 Cron log: $PROJECT_ROOT/logs/quannex-cron.log"
            echo "  📊 Última ejecución: $(stat -f "%Sm" "$PROJECT_ROOT/logs/quannex-cron.log" 2>/dev/null || echo "N/A")"
        else
            echo "  ❌ No hay logs de cron disponibles"
        fi
    else
        echo "❌ Cron job no instalado"
    fi
}

# Función para probar ejecución
test_cron() {
    echo "🧪 Probando ejecución del cron job..."
    echo "====================================="
    
    # Ejecutar en modo dry-run primero
    echo "1️⃣ Ejecutando dry-run..."
    "$CRON_SCRIPT" --dry-run
    
    echo ""
    echo "2️⃣ Ejecutando con verbose..."
    "$CRON_SCRIPT" --verbose
}

# Procesar argumentos
TIME=""
ACTION=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --install)
            ACTION="install"
            shift
            ;;
        --uninstall)
            ACTION="uninstall"
            shift
            ;;
        --status)
            ACTION="status"
            shift
            ;;
        --test)
            ACTION="test"
            shift
            ;;
        --morning)
            TIME="9"
            shift
            ;;
        --afternoon)
            TIME="14"
            shift
            ;;
        --evening)
            TIME="18"
            shift
            ;;
        --custom)
            TIME="$2"
            shift 2
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo "Opción desconocida: $1"
            show_help
            exit 1
            ;;
    esac
done

# Ejecutar acción
case $ACTION in
    install)
        if [[ -z "$TIME" ]]; then
            echo "❌ Error: Debe especificar un horario con --morning, --afternoon, --evening o --custom"
            show_help
            exit 1
        fi
        install_cron "$TIME"
        ;;
    uninstall)
        uninstall_cron
        ;;
    status)
        status_cron
        ;;
    test)
        test_cron
        ;;
    "")
        echo "❌ Error: Debe especificar una acción"
        show_help
        exit 1
        ;;
    *)
        echo "❌ Error: Acción desconocida: $ACTION"
        show_help
        exit 1
        ;;
esac
