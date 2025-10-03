import { spawnSync } from 'node:child_process';
import { which } from 'which';

export interface SafeExecOptions {
  timeout?: number;
  maxBuffer?: number;
  allowedCommands?: string[];
}

export class SafeExec {
  private static readonly DEFAULT_TIMEOUT = 30000; // 30s
  private static readonly DEFAULT_MAX_BUFFER = 1024 * 1024; // 1MB
  private static readonly ALLOWED_COMMANDS = [
    'npm',
    'node',
    'git',
    'ls',
    'cat',
    'echo',
    'mkdir',
    'rm',
    'cp',
    'mv',
  ];

  static async safeWhich(command: string): Promise<string | null> {
    try {
      return await which(command);
    } catch {
      return null;
    }
  }

  static exec(command: string, args: string[] = [], options: SafeExecOptions = {}) {
    const {
      timeout = SafeExec.DEFAULT_TIMEOUT,
      maxBuffer = SafeExec.DEFAULT_MAX_BUFFER,
      allowedCommands = SafeExec.ALLOWED_COMMANDS,
    } = options;

    // Validar comando
    if (!allowedCommands.includes(command)) {
      throw new Error(`Command '${command}' not in allowlist`);
    }

    // Validar que el binario existe
    const binaryPath = which.sync(command, { nothrow: true });
    if (!binaryPath) {
      throw new Error(`Command '${command}' not found in PATH`);
    }

    // Ejecutar con spawnSync (sin shell)
    const result = spawnSync(binaryPath, args, {
      timeout,
      maxBuffer,
      encoding: 'utf8',
    });

    if (result.error) {
      throw new Error(`Execution failed: ${result.error.message}`);
    }

    if (result.status !== 0) {
      throw new Error(`Command failed with status ${result.status}: ${result.stderr}`);
    }

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      status: result.status,
    };
  }
}
