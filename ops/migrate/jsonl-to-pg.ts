#!/usr/bin/env npx ts-node

import { readFileSync, existsSync } from 'fs';
import { PostgresTaskDB } from '../../core/taskdb/pg';
import type { TaskEvent } from '../../core/taskdb/types';

async function migrateJSONLToPG(jsonlFiles: string[], pgConnectionString?: string) {
  console.log('🔄 Starting JSONL to Postgres migration...');

  const pg = new PostgresTaskDB(pgConnectionString);
  let totalEvents = 0;
  let migratedEvents = 0;

  try {
    for (const file of jsonlFiles) {
      if (!existsSync(file)) {
        console.warn(`⚠️ File not found: ${file}`);
        continue;
      }

      console.log(`📄 Processing: ${file}`);
      const content = readFileSync(file, 'utf8');
      const lines = content
        .trim()
        .split('\n')
        .filter(line => line.trim());

      const events: TaskEvent[] = [];

      for (const line of lines) {
        try {
          const event: TaskEvent = JSON.parse(line);
          events.push(event);
          totalEvents++;
        } catch (e) {
          console.warn(`⚠️ Skipping malformed line in ${file}: ${line.substring(0, 100)}...`);
        }
      }

      if (events.length > 0) {
        // Batch insert for efficiency
        const batchSize = 1000;
        for (let i = 0; i < events.length; i += batchSize) {
          const batch = events.slice(i, i + batchSize);
          await pg.bulkInsert(batch);
          migratedEvents += batch.length;
          console.log(
            `✅ Migrated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(events.length / batchSize)}`
          );
        }
      }
    }

    console.log(`\n🎉 Migration completed!`);
    console.log(`📊 Total events processed: ${totalEvents}`);
    console.log(`✅ Events migrated: ${migratedEvents}`);
    console.log(`❌ Events skipped: ${totalEvents - migratedEvents}`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pg.close();
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(
      'Usage: npx ts-node ops/migrate/jsonl-to-pg.ts <jsonl-file1> [jsonl-file2] ... [--pg-url=<connection-string>]'
    );
    process.exit(1);
  }

  const jsonlFiles = args.filter(arg => !arg.startsWith('--pg-url='));
  const pgUrlArg = args.find(arg => arg.startsWith('--pg-url='));
  const pgUrl = pgUrlArg ? pgUrlArg.split('=')[1] : undefined;

  migrateJSONLToPG(jsonlFiles, pgUrl).catch(console.error);
}
