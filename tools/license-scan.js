#!/usr/bin/env node
import fs from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = process.cwd();
const PACKAGE_JSON_PATH = join(PROJECT_ROOT, 'package.json');

try {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  
  const licenseReport = deps.map(dep => {
    try {
      const depPackagePath = join(PROJECT_ROOT, 'node_modules', dep, 'package.json');
      const depPackage = JSON.parse(fs.readFileSync(depPackagePath, 'utf8'));
      
      return {
        name: dep,
        version: depPackage.version || 'UNKNOWN',
        license: depPackage.license || 'UNKNOWN',
        author: depPackage.author || 'UNKNOWN',
        repository: depPackage.repository || 'UNKNOWN'
      };
    } catch (error) {
      return {
        name: dep,
        version: 'READ_FAIL',
        license: 'READ_FAIL',
        author: 'READ_FAIL',
        repository: 'READ_FAIL',
        error: error.message
      };
    }
  });
  
  const report = {
    timestamp: new Date().toISOString(),
    total_dependencies: deps.length,
    dependencies: licenseReport,
    summary: {
      unknown_licenses: licenseReport.filter(d => d.license === 'UNKNOWN').length,
      read_failures: licenseReport.filter(d => d.license === 'READ_FAIL').length,
      known_licenses: licenseReport.filter(d => d.license !== 'UNKNOWN' && d.license !== 'READ_FAIL').length
    }
  };
  
  console.log(JSON.stringify(report, null, 2));
  
} catch (error) {
  console.error(JSON.stringify({
    error: 'Failed to scan licenses',
    message: error.message,
    timestamp: new Date().toISOString()
  }, null, 2));
  process.exit(1);
}
