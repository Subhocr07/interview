import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { connectMongoDB } from './src/config/mongodb.js';
import { esClient, ensureIndex } from './src/config/elasticsearch.js';
import { startSync, stopSync } from './src/services/syncService.js';
import { searchRepo } from './src/repositories/searchRepo.js';
import { Book } from './src/models/Book.js';

import bookRoutes   from './src/routes/books.js';
import searchRoutes from './src/routes/search.js';

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/books',  bookRoutes);    // CRUD  → MongoDB (Change Stream → ES)
app.use('/api/search', searchRoutes);  // Read  → Elasticsearch

// ── Health & stats ────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    const [esHealth, mongoState] = await Promise.all([
      esClient.cluster.health(),
      Promise.resolve(Book.db?.readyState), // 1 = connected
    ]);
    res.json({
      status: 'ok',
      mongodb:       mongoState === 1 ? 'connected' : 'disconnected',
      elasticsearch: esHealth.status,
    });
  } catch (err) {
    res.status(503).json({ status: 'error', error: err.message });
  }
});

app.get('/api/stats', async (_req, res) => {
  try {
    const [es, mongoDocs] = await Promise.all([
      searchRepo.stats(),
      Book.countDocuments(),
    ]);
    res.json({
      mongodb:       { docs: mongoDocs },
      elasticsearch: { docs: es.docs, bytes: es.bytes },
      inSync:        mongoDocs === es.docs,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function start() {
  // 1. Connect to MongoDB (required for Change Stream)
  await connectMongoDB();

  // 2. Ensure ES index exists (idempotent)
  await ensureIndex();

  // 3. Start the Change Stream watcher (MongoDB → ES real-time sync)
  await startSync();

  // 4. Start HTTP server
  app.listen(PORT, () => {
    console.log(`\n🚀 API ready on http://localhost:${PORT}`);
    console.log(`   MongoDB  →  ${process.env.MONGODB_URI}`);
    console.log(`   ES       →  ${process.env.ELASTICSEARCH_URL}`);
    console.log(`\n   Write path:  POST /api/books  → MongoDB → Change Stream → ES`);
    console.log(`   Search path: GET  /api/search  → Elasticsearch\n`);
  });
}

// Graceful shutdown
process.on('SIGINT',  () => stopSync().then(() => process.exit(0)));
process.on('SIGTERM', () => stopSync().then(() => process.exit(0)));

start().catch(err => { console.error('Failed to start:', err); process.exit(1); });
