#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const YAML_PATH = join(PROJECT_ROOT, 'orchestration', 'PLAN.yaml');
const JSON_PATH = join(PROJECT_ROOT, 'orchestration', 'plan.json');

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });
  });
}

async function buildPlan() {
  try {
    console.log('🔨 Building plan.json from PLAN.yaml...');
    
    if (!existsSync(YAML_PATH)) {
      throw new Error(`PLAN.yaml not found at ${YAML_PATH}`);
    }

    // Check if yamljs is available
    try {
      await runCommand('yaml2json', ['--version']);
    } catch (error) {
      console.log('📦 Installing yamljs globally...');
      await runCommand('npm', ['install', '-g', 'yamljs']);
    }

    // Convert YAML to JSON
    const yamlContent = readFileSync(YAML_PATH, 'utf8');
    const jsonContent = await runCommand('yaml2json', [YAML_PATH]);
    
    // Parse and pretty-print JSON
    const parsed = JSON.parse(jsonContent);
    const formattedJson = JSON.stringify(parsed, null, 2);
    
    // Write to plan.json
    writeFileSync(JSON_PATH, formattedJson);
    
    console.log('✅ plan.json created successfully');
    console.log(`📁 Output: ${JSON_PATH}`);
    
    // Validate JSON
    console.log(`📊 Steps: ${parsed.steps?.length || 0}`);
    console.log(`📊 Name: ${parsed.name || 'Unnamed'}`);
    
  } catch (error) {
    console.error('❌ Error building plan:', error.message);
    process.exit(1);
  }
}

buildPlan();
