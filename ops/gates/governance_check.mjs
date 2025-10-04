#!/usr/bin/env node
/**
 * Governance Check - Gate ejecutable para validar gobernanza de conocimiento
 * Valida owner, review_date y cuarentena automática de documentos críticos
 */
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { Client } from 'pg';

const CONFIG = {
  // Rutas de configuración
  sources_config: 'rag/config/sources.yaml',
  prp_lock: 'prp/PRP.lock.yml',

  // Conexión a BD (read-only para seguridad)
  pg: {
    host: process.env.PGREAD_HOST || 'localhost',
    port: Number(process.env.PGREAD_PORT || 5433),
    user: process.env.PGREAD_USER || 'rag_read',
    password: process.env.PGREAD_PASSWORD || 'rag_read_only',
    database: process.env.PGREAD_DB || 'ragdb',
    ssl: process.env.PGREAD_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  },
};

class GovernanceChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.critical_docs = [];
    this.expired_docs = [];
  }

  async checkSourcesConfig() {
    console.log('🔍 Checking sources configuration...');

    if (!fs.existsSync(CONFIG.sources_config)) {
      console.log('⚠️  Sources config not found, creating template...');
      this.createSourcesTemplate();
      return;
    }

    try {
      const sourcesConfig = yaml.parse(fs.readFileSync(CONFIG.sources_config, 'utf-8'));

      for (const source of sourcesConfig.sources || []) {
        if (source.critical) {
          this.critical_docs.push({
            uri: source.uri,
            owner: source.owner,
            review_date: source.review_date,
            ttl_days: source.ttl_days,
          });
        }
      }

      console.log(`✅ Found ${this.critical_docs.length} critical sources`);
    } catch (error) {
      this.errors.push(`Failed to parse sources config: ${error.message}`);
    }
  }

  createSourcesTemplate() {
    const template = {
      sources: [
        {
          uri: 'docs/adr/adr-002.md',
          owner: 'quannex-core',
          review_date: '2025-02-27',
          critical: true,
          ttl_days: 90,
        },
        {
          uri: 'docs/adr/adr-003.md',
          owner: 'quannex-core',
          review_date: '2025-02-27',
          critical: true,
          ttl_days: 90,
        },
      ],
    };

    fs.writeFileSync(CONFIG.sources_config, yaml.stringify(template));
    console.log('📝 Created sources template - please configure critical documents');
  }

  async checkDatabaseGovernance() {
    console.log('🔍 Checking database governance...');

    const pg = new Client(CONFIG.pg);

    try {
      await pg.connect();
      await pg.query("SET statement_timeout = '30s'");

      // Verificar documentos críticos en BD
      const { rows: criticalRows } = await pg.query(`
        SELECT DISTINCT uri, 
               (metadata->>'owner') as owner,
               (metadata->>'review_date')::date as review_date,
               (metadata->>'critical')::boolean as critical
        FROM rag_chunks 
        WHERE (metadata->>'critical')::boolean IS TRUE
          AND deleted_at IS NULL
      `);

      console.log(`📊 Found ${criticalRows.length} critical documents in database`);

      // Validar owner y review_date
      for (const row of criticalRows) {
        if (!row.owner) {
          this.errors.push(`Critical document ${row.uri} missing owner`);
        }

        if (!row.review_date) {
          this.errors.push(`Critical document ${row.uri} missing review_date`);
        } else {
          const reviewDate = new Date(row.review_date);
          const today = new Date();

          if (reviewDate < today) {
            this.expired_docs.push({
              uri: row.uri,
              owner: row.owner,
              review_date: row.review_date,
              days_expired: Math.floor((today - reviewDate) / (1000 * 60 * 60 * 24)),
            });
          }
        }
      }

      // Verificar documentos expirados (cuarentena)
      const { rows: expiredRows } = await pg.query(`
        SELECT COUNT(*) as expired_count
        FROM rag_chunks 
        WHERE (metadata->>'critical')::boolean IS TRUE
          AND (metadata->>'review_date')::date < CURRENT_DATE
          AND deleted_at IS NULL
      `);

      const expiredCount = parseInt(expiredRows[0].expired_count);

      if (expiredCount > 0) {
        this.warnings.push(
          `${expiredCount} critical documents are expired and should be quarantined`
        );

        // Registrar métrica para Prometheus
        console.log(`# HELP rag_docs_expired_total Number of expired critical documents`);
        console.log(`# TYPE rag_docs_expired_total gauge`);
        console.log(`rag_docs_expired_total ${expiredCount}`);
      }
    } catch (error) {
      this.errors.push(`Database check failed: ${error.message}`);
    } finally {
      await pg.end();
    }
  }

  async checkPRPLock() {
    console.log('🔍 Checking PRP.lock...');

    if (!fs.existsSync(CONFIG.prp_lock)) {
      this.errors.push('PRP.lock.yml not found');
      return;
    }

    try {
      const prpLock = yaml.parse(fs.readFileSync(CONFIG.prp_lock, 'utf-8'));

      // Verificar que tiene governance configurado
      if (!prpLock.governance) {
        this.errors.push('PRP.lock missing governance section');
        return;
      }

      const governance = prpLock.governance;

      if (!governance.require_owner) {
        this.errors.push('PRP.lock governance.require_owner not enabled');
      }

      if (!governance.enforce_review_date) {
        this.errors.push('PRP.lock governance.enforce_review_date not enabled');
      }

      if (!governance.quarantine_on_expired) {
        this.errors.push('PRP.lock governance.quarantine_on_expired not enabled');
      }

      console.log('✅ PRP.lock governance configuration valid');
    } catch (error) {
      this.errors.push(`PRP.lock check failed: ${error.message}`);
    }
  }

  async run() {
    console.log('🚀 Starting Governance Check...');

    await this.checkSourcesConfig();
    await this.checkDatabaseGovernance();
    await this.checkPRPLock();

    // Reportar resultados
    console.log('\n📊 Governance Check Results:');

    if (this.errors.length === 0) {
      console.log('✅ All governance checks passed');
    } else {
      console.log('❌ Governance check failed:');
      this.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    if (this.expired_docs.length > 0) {
      console.log('🚨 Expired critical documents:');
      this.expired_docs.forEach(doc => {
        console.log(`  - ${doc.uri} (owner: ${doc.owner}, expired: ${doc.days_expired} days)`);
      });
    }

    // Exit code: 0 = success, 1 = failure
    if (this.errors.length > 0) {
      console.log('\n❌ Governance check FAILED - blocking deployment');
      process.exit(1);
    } else {
      console.log('\n✅ Governance check PASSED');
      process.exit(0);
    }
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new GovernanceChecker();
  checker.run().catch(error => {
    console.error('❌ Governance check crashed:', error);
    process.exit(1);
  });
}

export default GovernanceChecker;
