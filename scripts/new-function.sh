#!/usr/bin/env bash
set -e

name="$1"
test -n "$name" || { 
  echo "❌ Uso: $0 <FunctionName>"
  echo "💡 Ejemplo: $0 createUser"
  exit 1
}

# Crear directorio si no existe
mkdir -p "src/functions"

# Crear archivo con template
cat > "src/functions/${name}.ts" <<'TS'
import { withTask, insertEvent } from '../../core/taskdb/withTask';
import { requireTaskContext } from '../../core/taskdb/runtime-guard';

export async function FUNC_NAME(input: any) {
  return withTask(`FUNC:FUNC_NAME:${Date.now()}`, { func: 'FUNC_NAME' }, async (ctx) => {
    // Verificar contexto en funciones críticas
    requireTaskContext();
    
    // Log de entrada
    await insertEvent('guardrail.input', { 
      size: JSON.stringify(input).length,
      timestamp: Date.now()
    });
    
    try {
      // TODO: Implementar lógica de la función
      const result = { ok: true, data: input };
      
      // Log de salida
      await insertEvent('guardrail.output', { 
        success: true,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      // Log de error
      await insertEvent('guardrail.error', { 
        error: String(error),
        timestamp: Date.now()
      });
      throw error;
    }
  });
}
TS

# Reemplazar placeholder
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i "" "s/FUNC_NAME/${name}/g" "src/functions/${name}.ts"
else
  sed -i "s/FUNC_NAME/${name}/g" "src/functions/${name}.ts"
fi

echo "✅ Creada src/functions/${name}.ts con withTask"
echo "📝 Template incluye:"
echo "  - withTask wrapper obligatorio"
echo "  - Logs de entrada/salida/error"
echo "  - Runtime guard para funciones críticas"
echo "  - Instrumentación TaskDB completa"
