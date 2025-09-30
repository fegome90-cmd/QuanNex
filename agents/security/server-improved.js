#!/usr/bin/env node
/**
 * @fileoverview Security Agent Server - Versión mejorada con filtros
 * @description Agente de seguridad que filtra archivos de documentación
 */

import SecurityAgent from './server.js';

class ImprovedSecurityAgent extends SecurityAgent {
  /**
   * Escanear archivo solo si es código
   */
  async scanFile(filePath) {
    const ext = require('path').extname(filePath).toLowerCase();
    
    // Solo escanear archivos de código, NO documentación
    const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.json', '.env', '.config'];
    if (!codeExtensions.includes(ext)) {
      return;  // Skip .md, .txt, .html, etc
    }

    // Llamar a la implementación original
    return super.scanFile(filePath);
  }
}

export default ImprovedSecurityAgent;
