import fs from 'fs';
import yaml from 'yaml';
import { detectProfile } from './detect.mjs';

export function routePlaybook(cwd = process.cwd()) {
  const pb = yaml.parse(fs.readFileSync('config/playbooks.yaml', 'utf8'));
  const { profile } = detectProfile(cwd);
  const plan = pb.playbooks?.[profile]?.plan ?? pb.fallback.plan;
  return { profile, plan };
}
