#!/usr/bin/env node
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');
const YAML_PATH = join(PROJECT_ROOT, 'orchestration', 'PLAN.yaml');
const JSON_PATH = join(PROJECT_ROOT, 'orchestration', 'plan.json');

async function buildPlan() {
  try {
    console.log('🔨 Building plan.json from PLAN.yaml...');

    if (!existsSync(YAML_PATH)) {
      throw new Error(`PLAN.yaml not found at ${YAML_PATH}`);
    }

    // Read and parse YAML
    const yamlContent = readFileSync(YAML_PATH, 'utf8');
    const parsed = yaml.load(yamlContent);

    // Pretty-print JSON
    const formattedJson = JSON.stringify(parsed, null, 2);

    // Write to plan.json
    writeFileSync(JSON_PATH, formattedJson);

    console.log('✅ plan.json created successfully');
    console.log(`📁 Output: ${JSON_PATH}`);
    console.log(`📊 Steps: ${parsed.steps?.length || 0}`);
    console.log(`📊 Name: ${parsed.name || 'Unnamed'}`);
  } catch (err) {
    console.error('❌ Error building plan:', err.message);
    process.exit(1);
  }
}

buildPlan();
