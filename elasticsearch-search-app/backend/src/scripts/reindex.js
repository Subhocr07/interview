/**
 * reindex.js — Rebuilds the Elasticsearch index from MongoDB (source of truth).
 *
 * When to run:
 *   • After an oplog history loss (ChangeStreamHistoryLost error)
 *   • After ES data loss / index corruption
 *   • First-time setup if the server wasn't running during seed
 *   • Any time ES and MongoDB fall out of sync
 *
 * Usage:  cd backend && npm run reindex
 */

import 'dotenv/config';
import { connectMongoDB } from '../config/mongodb.js';
import { esClient, INDEX, INDEX_MAPPING } from '../config/elasticsearch.js';
import { bookRepo } from '../repositories/bookRepo.js';
import { searchRepo } from '../repositories/searchRepo.js';

const BATCH_SIZE = 100;

async function reindex() {
  console.log('\n🔄 Reindexing: MongoDB → Elasticsearch\n');

  await connectMongoDB();

  // Wait for ES
  for (let i = 0; i < 10; i++) {
    try { await esClient.ping(); break; }
    catch { console.log(`⏳ Waiting for ES (${i + 1}/10)...`); await new Promise(r => setTimeout(r, 3000)); }
  }

  // Recreate the index (drop + create) to ensure mapping is fresh
  const exists = await esClient.indices.exists({ index: INDEX });
  if (exists) {
    await esClient.indices.delete({ index: INDEX });
    console.log(`🗑  Dropped old index: ${INDEX}`);
  }
  await esClient.indices.create({ index: INDEX, body: INDEX_MAPPING });
  console.log(`📚 Created new index: ${INDEX}`);

  // Stream documents from MongoDB in batches and bulk-index to ES
  let batch = [];
  let total = 0;
  let batches = 0;
  const start = Date.now();

  const cursor = bookRepo.cursor();

  for await (const doc of cursor) {
    batch.push(doc);

    if (batch.length >= BATCH_SIZE) {
      const indexed = await searchRepo.bulkIndex(batch);
      total += indexed;
      batches++;
      console.log(`  ↗  Batch ${batches}: indexed ${indexed} docs (total ${total})`);
      batch = [];
    }
  }

  // Flush remaining
  if (batch.length > 0) {
    const indexed = await searchRepo.bulkIndex(batch);
    total += indexed;
    console.log(`  ↗  Final batch: indexed ${indexed} docs (total ${total})`);
  }

  // Force a refresh so documents are immediately searchable
  await esClient.indices.refresh({ index: INDEX });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n✅ Reindex complete: ${total} documents in ${elapsed}s`);
  console.log(`📊 Rate: ${(total / +elapsed).toFixed(0)} docs/s\n`);

  process.exit(0);
}

reindex().catch(err => { console.error('Reindex failed:', err.message); process.exit(1); });
