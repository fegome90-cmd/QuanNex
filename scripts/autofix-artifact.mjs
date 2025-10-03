import fs from 'fs';
import path from 'path';

/**
 * Generador de artefactos JSON para AutoFix
 * Crea archivos de trazabilidad para auditoría y medición de ROI
 */

export function createArtifact({
  actions,
  risk,
  duration,
  result,
  branch,
  baseCommit,
  finalCommit,
}) {
  const timestamp = new Date().toISOString();
  const artifactDir = path.join(process.cwd(), 'artifacts', 'autofix');

  // Crear directorio si no existe
  fs.mkdirSync(artifactDir, { recursive: true });

  const artifact = {
    timestamp,
    branch,
    baseCommit,
    finalCommit,
    actions: actions.map(a => ({
      type: a.type,
      params: a,
      risk: risk,
    })),
    riskTotal: risk,
    durationMs: duration,
    durationSeconds: duration / 1000,
    result: {
      success: result.ok,
      dryRun: result.dryRun,
      log: result.log,
    },
    verifyResult: null, // Se llenará después si se ejecuta verify
    costAvoided: estimateCostAvoided(actions, duration),
    metadata: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd(),
    },
  };

  // Generar nombre de archivo único
  const filename = `${timestamp.replace(/[:.]/g, '-')}-${branch.replace(/\//g, '-')}.json`;
  const filepath = path.join(artifactDir, filename);

  // Escribir artefacto
  fs.writeFileSync(filepath, JSON.stringify(artifact, null, 2));

  console.log(`[AUTOFIX-ARTIFACT] Created: ${filepath}`);

  return { filepath, artifact };
}

export function estimateCostAvoided(actions, durationMs) {
  // Estimación conservadora: cada fix manual toma ~5 minutos promedio
  const avgManualFixMinutes = 5;
  const durationMinutes = durationMs / (1000 * 60);

  // Coste evitado = tiempo que habría tomado manualmente - tiempo automático
  const minutesSaved = Math.max(actions.length * avgManualFixMinutes - durationMinutes, 0);

  return {
    actionsCount: actions.length,
    avgManualFixMinutes,
    durationMinutes: Math.round(durationMinutes * 100) / 100,
    minutesSaved: Math.round(minutesSaved * 100) / 100,
    estimatedCostAvoided: minutesSaved > 0 ? `${minutesSaved} minutes` : '0 minutes',
  };
}

export function addVerifyResult(artifactPath, verifyResult) {
  try {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    artifact.verifyResult = verifyResult;
    artifact.timestampCompleted = new Date().toISOString();

    fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
    console.log(`[AUTOFIX-ARTIFACT] Updated with verify result: ${artifactPath}`);
  } catch (error) {
    console.error(`[AUTOFIX-ARTIFACT] Error updating artifact: ${error.message}`);
  }
}

// Función para generar labels de commit automáticamente
export function generateCommitLabels(actions, risk) {
  const labels = ['autofix'];

  // Agregar label de riesgo
  if (risk <= 1) labels.push('safe-change');
  else if (risk <= 2) labels.push('low-risk');
  else labels.push('medium-risk');

  // Agregar label de tipo de acción
  const actionTypes = [...new Set(actions.map(a => a.type))];
  if (actionTypes.includes('install_missing_dep') || actionTypes.includes('install_types')) {
    labels.push('dependency-fix');
  }
  if (actionTypes.includes('fix_import_path')) {
    labels.push('import-fix');
  }
  if (actionTypes.includes('add_npm_script') || actionTypes.includes('update_script')) {
    labels.push('script-fix');
  }
  if (actionTypes.includes('create_test_boiler')) {
    labels.push('test-coverage');
  }

  return labels;
}
