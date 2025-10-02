#!/usr/bin/env node
/**
 * Scan Gate - Falla si files_scanned === 0
 */

import { runVulnerabilityScan } from '../agents/security/agent.mjs';

async function main() {
  console.log('🔍 Scan Gate - Verificando archivos escaneados...\n');

  try {
    const r = await runVulnerabilityScan();

    if (r.error) {
      console.error(`❌ Error running scan: ${r.error}`);
      process.exit(1);
    }

    if (r.files_scanned === 0) {
      console.error('❌ [SCAN-GATE] 0 archivos escaneados. Revisa config/scan-globs.json y paths.');
      process.exit(1);
    }

    console.log(`✅ [SCAN-GATE] OK (${r.files_scanned} archivos escaneados)`);

    // Mostrar detalles del scan
    console.log('\n📊 Detalles del scan:');
    console.log(`  Archivos escaneados: ${r.files_scanned}`);
    console.log(`  Vulnerabilidades encontradas: ${r.vulnerabilities_found}`);

    if (r.scan_details) {
      console.log(`  Archivos de código: ${r.scan_details.code_files}`);
      console.log(`  Archivos de configuración: ${r.scan_details.config_files}`);
      console.log(`  Archivos de seguridad: ${r.scan_details.security_files}`);
    }

    if (r.vulnerabilities && r.vulnerabilities.length > 0) {
      console.log('\n⚠️ Vulnerabilidades detectadas:');
      r.vulnerabilities.forEach(vuln => {
        console.log(`  - ${vuln.file}:${vuln.line} (${vuln.severity}) ${vuln.type}`);
      });
    }
  } catch (error) {
    console.error(`❌ Scan gate failed: ${error.message}`);
    process.exit(1);
  }
}

main();
