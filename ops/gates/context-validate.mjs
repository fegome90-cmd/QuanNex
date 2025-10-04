#!/usr/bin/env node
/**
 * Context Validate - Gate ejecutable para validar contexto contra réplica
 * Valida existencia y hash de chunks pinned en PRP.lock contra snapshot/réplica
 */
import fs from 'fs';
import yaml from 'yaml';
import { Client } from 'pg';

const CONFIG = {
  prp_lock: process.env.PRP_LOCK_PATH || 'prp/PRP.lock.yml',

  // Conexión a BD (read-only para seguridad)
  pg: {
    host: process.env.PGREAD_HOST || 'localhost',
    port: Number(process.env.PGREAD_PORT || 5433),
    user: process.env.PGREAD_USER || 'rag_read',
    password: process.env.PGREAD_PASSWORD || 'rag_read_only',
    database: process.env.PGREAD_DB || 'ragdb',
    ssl: process.env.PGREAD_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  },

  // Límites de validación
  max_pins: Number(process.env.MAX_PINS || 200),
  timeout_seconds: Number(process.env.VALIDATE_TIMEOUT || 15),
};

class ContextValidator {
  constructor() {
    this.drifts = [];
    this.validated_pins = 0;
    this.missing_pins = 0;
    this.hash_mismatches = 0;
  }

  async loadPRPLock() {
    if (!fs.existsSync(CONFIG.prp_lock)) {
      throw new Error(`PRP.lock not found: ${CONFIG.prp_lock}`);
    }

    const prpLock = yaml.parse(fs.readFileSync(CONFIG.prp_lock, 'utf-8'));

    if (!prpLock.evidence?.chunks_pinned) {
      console.log('⚠️  No chunks pinned in PRP.lock');
      return [];
    }

    // Limitar número de pins para evitar timeouts
    const pins = prpLock.evidence.chunks_pinned.slice(0, CONFIG.max_pins);

    console.log(`📋 Loaded ${pins.length} pinned chunks from PRP.lock`);
    return pins;
  }

  async validatePins(pins) {
    console.log('🔍 Validating context against replica/snapshot...');

    const pg = new Client(CONFIG.pg);

    try {
      await pg.connect();

      // Configurar timeout
      await pg.query(`SET statement_timeout = '${CONFIG.timeout_seconds}s'`);

      // Preparar datos para query batch
      const uris = pins.map(p => p.uri);
      const idxs = pins.map(p => p.idx);

      // Query optimizada con UNNEST para validar todos los pins en una sola consulta
      const { rows } = await pg.query(
        `
        WITH t AS (
          SELECT unnest($1::text[]) AS uri, unnest($2::int[]) AS chunk_idx
        )
        SELECT t.uri, t.chunk_idx, c.hash, c.content
        FROM t LEFT JOIN rag_chunks c
          ON c.uri = t.uri AND c.chunk_idx = t.chunk_idx AND c.deleted_at IS NULL
      `,
        [uris, idxs]
      );

      // Crear mapa de resultados
      const resultMap = new Map();
      rows.forEach(row => {
        const key = `${row.uri}#${row.chunk_idx}`;
        resultMap.set(key, {
          hash: row.hash,
          content: row.content,
          exists: true,
        });
      });

      // Validar cada pin
      for (const pin of pins) {
        const key = `${pin.uri}#${pin.idx}`;
        const result = resultMap.get(key);

        this.validated_pins++;

        if (!result) {
          // Pin no existe en BD
          this.missing_pins++;
          this.drifts.push({
            id: pin.id,
            uri: pin.uri,
            idx: pin.idx,
            reason: 'missing',
            policy: pin.policy || 'unknown',
          });
        } else if (pin.policy === 'strict') {
          // Pin strict: hash debe coincidir exactamente
          if (pin.hash && pin.hash !== result.hash) {
            this.hash_mismatches++;
            this.drifts.push({
              id: pin.id,
              uri: pin.uri,
              idx: pin.idx,
              reason: 'hash_mismatch',
              expected_hash: pin.hash,
              actual_hash: result.hash,
              policy: 'strict',
            });
          }
        } else {
          // Pin relaxed/ttl: solo verificar existencia
          // (hash puede cambiar sin romper PRP)
          if (result.hash && pin.hash && result.hash !== pin.hash) {
            console.log(
              `ℹ️  Pin ${pin.id} hash changed (relaxed policy): ${pin.hash} → ${result.hash}`
            );
          }
        }
      }
    } catch (error) {
      throw new Error(`Database validation failed: ${error.message}`);
    } finally {
      await pg.end();
    }
  }

  async run() {
    console.log('🚀 Starting Context Validation...');
    console.log(`📊 Config: max_pins=${CONFIG.max_pins}, timeout=${CONFIG.timeout_seconds}s`);

    try {
      const pins = await this.loadPRPLock();

      if (pins.length === 0) {
        console.log('✅ No pins to validate');
        return;
      }

      await this.validatePins(pins);

      // Reportar resultados
      console.log('\n📊 Context Validation Results:');
      console.log(`  📋 Total pins validated: ${this.validated_pins}`);
      console.log(`  ❌ Missing pins: ${this.missing_pins}`);
      console.log(`  🔄 Hash mismatches: ${this.hash_mismatches}`);
      console.log(`  🚨 Total drifts: ${this.drifts.length}`);

      if (this.drifts.length > 0) {
        console.log('\n🚨 Context Drifts Detected:');
        this.drifts.forEach(drift => {
          console.log(`  - ${drift.id}: ${drift.reason}`);
          console.log(`    URI: ${drift.uri}`);
          console.log(`    Policy: ${drift.policy}`);
          if (drift.expected_hash && drift.actual_hash) {
            console.log(`    Expected: ${drift.expected_hash}`);
            console.log(`    Actual: ${drift.actual_hash}`);
          }
          console.log('');
        });
      }

      // Determinar resultado
      const hasCriticalDrifts = this.drifts.some(
        d => d.reason === 'missing' || (d.policy === 'strict' && d.reason === 'hash_mismatch')
      );

      if (hasCriticalDrifts) {
        console.log('❌ Context validation FAILED - critical drifts detected');
        console.log('🔒 Blocking deployment - human review required');
        process.exit(2); // Exit code 2 = critical drift
      } else {
        console.log('✅ Context validation PASSED');
        process.exit(0);
      }
    } catch (error) {
      console.error('❌ Context validation crashed:', error.message);
      process.exit(1); // Exit code 1 = error
    }
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new ContextValidator();
  validator.run().catch(error => {
    console.error('❌ Context validation crashed:', error);
    process.exit(1);
  });
}

export default ContextValidator;
