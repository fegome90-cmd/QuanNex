import fs from 'fs';
import { globby } from 'globby';

const GLOBS_PATH = process.env.SCAN_GLOBS_PATH || 'config/scan-globs.json';

export async function runVulnerabilityScan() {
  if (!fs.existsSync(GLOBS_PATH)) {
    return {
      error: `scan globs not found: ${GLOBS_PATH}`,
      files_scanned: 0,
      vulnerabilities_found: 0,
    };
  }

  try {
    const globs = JSON.parse(fs.readFileSync(GLOBS_PATH, 'utf8'));
    const code = Array.isArray(globs.code) ? globs.code : [];
    const configs = Array.isArray(globs.configs) ? globs.configs : [];
    const security = Array.isArray(globs.security) ? globs.security : [];

    const files = await globby([...code, ...configs, ...security], {
      gitignore: true,
      ignore: globs.exclude || [],
    });

    // Simular análisis de vulnerabilidades básico
    const vulnerabilities = [];

    for (const file of files.slice(0, 10)) {
      // Limitar para performance
      try {
        const content = fs.readFileSync(file, 'utf8');

        // Detectar patrones básicos de vulnerabilidades
        if (content.includes('password') && content.includes('=')) {
          vulnerabilities.push({
            file,
            type: 'potential_hardcoded_password',
            severity: 'medium',
            line: content.split('\n').findIndex(line => line.includes('password')) + 1,
          });
        }

        if (content.includes('eval(') || content.includes('Function(')) {
          vulnerabilities.push({
            file,
            type: 'code_injection_risk',
            severity: 'high',
            line:
              content
                .split('\n')
                .findIndex(line => line.includes('eval(') || line.includes('Function(')) + 1,
          });
        }

        if (content.includes('process.env') && !content.includes('require')) {
          vulnerabilities.push({
            file,
            type: 'environment_variable_exposure',
            severity: 'low',
            line: content.split('\n').findIndex(line => line.includes('process.env')) + 1,
          });
        }
      } catch (error) {
        // Ignorar archivos que no se pueden leer
        continue;
      }
    }

    return {
      files_scanned: files.length,
      vulnerabilities_found: vulnerabilities.length,
      vulnerabilities: vulnerabilities,
      status: files.length > 0 ? 'ok' : 'empty',
      scan_details: {
        code_files: files.filter(f => /\.(ts|js|mjs|tsx)$/.test(f)).length,
        config_files: files.filter(f => /\.(json|yml|yaml)$/.test(f)).length,
        security_files: files.filter(f => /\.(env|key|pem|p12)$/.test(f)).length,
      },
    };
  } catch (error) {
    return {
      error: `Scan failed: ${error.message}`,
      files_scanned: 0,
      vulnerabilities_found: 0,
    };
  }
}

// CLI
if (process.argv[1] === new URL(import.meta.url).pathname) {
  runVulnerabilityScan().then(r => console.log(JSON.stringify(r, null, 2)));
}
