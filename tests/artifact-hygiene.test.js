/* eslint-disable no-undef */
const { readFileSync, accessSync, constants } = require('node:fs');
const { join } = require('node:path');

const projectRoot = join(__dirname, '..');

describe('Artifact Hygiene Policy Compliance', () => {
  describe('Node Agents withSandbox Usage', () => {
    const agents = ['context', 'prompting', 'rules'];

    agents.forEach(agent => {
      test(`${agent} agent uses withSandbox for execution`, () => {
        const agentPath = join(projectRoot, 'agents', agent, 'agent.js');
        const content = readFileSync(agentPath, 'utf8');

        // Should use withSandbox for execution
        expect(content).toMatch(/withSandbox/);
        // spawnSync is allowed inside withSandbox
        expect(content).toMatch(/spawnSync/);
      });
    });
  });

  describe('Script Existence and Executability', () => {
    const scripts = ['run-clean.sh', 'save-if-passed.sh'];

    scripts.forEach(script => {
      test(`${script} exists and is executable`, () => {
        const scriptPath = join(projectRoot, 'scripts', script);

        // Check existence
        expect(() => readFileSync(scriptPath)).not.toThrow();

        // Check executability
        expect(() => accessSync(scriptPath, constants.X_OK)).not.toThrow();
      });
    });
  });

  describe('Git Ignore Blocks Temporary Artifacts', () => {
    test('.gitignore blocks temporary artifacts', () => {
      const gitignorePath = join(projectRoot, '.gitignore');
      const content = readFileSync(gitignorePath, 'utf8');

      const requiredPatterns = [
        'tmp/',
        '.reports/',
        'coverage/',
        'out/*.tmp.json',
        '*.log'
      ];

      requiredPatterns.forEach(pattern => {
        expect(content).toMatch(new RegExp(pattern.replace(/\*/g, '\\*').replace(/\//g, '\\/')));
      });
    });
  });

  describe('Docker Ignore Blocks Temporary Artifacts', () => {
    test('.dockerignore blocks temporary artifacts', () => {
      const dockerignorePath = join(projectRoot, '.dockerignore');
      const content = readFileSync(dockerignorePath, 'utf8');

      const requiredPatterns = [
        'tmp',
        '.reports',
        'coverage',
        'out/*.tmp.json',
        '*.log'
      ];

      requiredPatterns.forEach(pattern => {
        expect(content).toMatch(new RegExp(pattern.replace(/\*/g, '\\*')));
      });
    });
  });

  describe('Package.json Cleanup Scripts', () => {
    test('package.json has cleanup scripts', () => {
      const packagePath = join(projectRoot, 'package.json');
      const content = readFileSync(packagePath, 'utf8');
      const pkg = JSON.parse(content);

      expect(pkg.scripts).toHaveProperty('test:clean');
      expect(pkg.scripts['test:clean']).toBe('node tools/cleanup.mjs');
    });
  });

  describe('CI Workflow Cleanup Steps', () => {
    test('.github/workflows/agents-core.yml has cleanup steps', () => {
      const workflowPath = join(projectRoot, '.github', 'workflows', 'agents-core.yml');
      const content = readFileSync(workflowPath, 'utf8');

      // Check for cleanup in agents-contract job
      expect(content).toMatch(/rm -rf out\/\*\.json/);
      expect(content).toMatch(/node tools\/cleanup\.mjs/);
    });
  });

  describe('Pre-commit Hooks Block Temporaries', () => {
    test('.pre-commit-config.yaml blocks temporary artifacts', () => {
      const precommitPath = join(projectRoot, '.pre-commit-config.yaml');
      const content = readFileSync(precommitPath, 'utf8');

      // Check for block-temp-artifacts hook
      expect(content).toMatch(/block-temp-artifacts/);
      expect(content).toMatch(/tmp\/|\.reports\/|coverage\/|.*\.log$/);
    });
  });

  describe('Orchestration Plan Cleanup Rules', () => {
    test('orchestration/PLAN.yaml has cleanup rules', () => {
      const planPath = join(projectRoot, 'orchestration', 'PLAN.yaml');
      const content = readFileSync(planPath, 'utf8');

      // Check post_steps cleanup
      expect(content).toMatch(/post_steps:/);
      expect(content).toMatch(/name: cleanup/);
      expect(content).toMatch(/rm -rf tmp \.reports/);

      // Check pass_criteria
      expect(content).toMatch(/pass_criteria:/);
      expect(content).toMatch(/no_temp_leftovers:/);
      expect(content).toMatch(/!exists\('tmp\/\*\*'\) && !exists\('\.reports\/\*\*'\)/);
    });
  });
});
