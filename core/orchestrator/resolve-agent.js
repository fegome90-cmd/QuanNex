/**
 * RESOLVER DE AGENTES
 * Resuelve rutas de agentes desde el registry
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../..");

const registryPath = path.join(PROJECT_ROOT, "config", "agents.registry.json");

let registry = null;

function loadRegistry() {
  if (registry === null) {
    try {
      const registryContent = fs.readFileSync(registryPath, "utf8");
      registry = JSON.parse(registryContent);
    } catch (error) {
      throw new Error(`Failed to load agents registry: ${error.message}`);
    }
  }
  return registry;
}

export const resolveAgent = (name) => {
  const reg = loadRegistry();
  if (!reg[name]) {
    throw new Error(`Agent '${name}' not found in registry`);
  }
  return path.resolve(PROJECT_ROOT, reg[name]);
};

export const listAgents = () => {
  const reg = loadRegistry();
  return Object.keys(reg);
};

export const getAgentPath = (name) => {
  const reg = loadRegistry();
  return reg[name] || null;
};
