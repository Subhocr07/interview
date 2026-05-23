# Elasticsearch Book Search — MongoDB + ES Full-Stack

Production-grade architecture: **MongoDB** is the source of truth, **Elasticsearch** is the search
index. They stay in sync via **MongoDB Change Streams** — writes go to Mongo only, and a background
watcher mirrors every change to ES in real time.

```
WRITE:  Client → POST /api/books → MongoDB ──[Change Stream]──► Elasticsearch
SEARCH: Client → GET  /api/search ─────────────────────────────► Elasticsearch
GET:    Client → GET  /api/books/:id ──────────────────────────► MongoDB
```

## Services (docker-compose)

| Container        | Port  | Purpose                          |
|------------------|-------|----------------------------------|
| mongodb          | 27017 | Primary DB (replica set rs0)     |
| mongo-express    | 8081  | Mongo UI                         |
| elasticsearch    | 9200  | Search index                     |
| kibana           | 5601  | ES dashboard                     |

## Project Structure

```
backend/
├── server.js                  # Entry point — connects, starts sync, registers routes
└── src/
    ├── config/
    │   ├── mongodb.js         # Mongoose connection with retry
    │   └── elasticsearch.js   # ES client + index mapping
    ├── models/
    │   └── Book.js            # Mongoose schema + indexes
    ├── repositories/
    │   ├── bookRepo.js        # MongoDB CRUD (pure data access)
    │   └── searchRepo.js      # ES queries (search, suggest, bulk, index, delete)
    ├── services/
    │   ├── bookService.js     # Business logic (validation, orchestration)
    │   └── syncService.js     # Change Stream watcher → ES sync + resume tokens
    ├── routes/
    │   ├── books.js           # CRUD routes  → bookService → MongoDB
    │   └── search.js          # Search routes → searchRepo → ES
    └── scripts/
        ├── seed.js            # Populate MongoDB + initial ES bulk index
        └── reindex.js         # Rebuild ES from MongoDB (disaster recovery)
```

## Quick Start

```bash
# 1. Start all services
docker compose up -d
# Wait ~30s for replica set init. Check with:
docker compose logs mongo-rs-init

# 2. Install dependencies
cd backend && npm install

# 3. Seed: inserts 50 books into MongoDB, bulk-indexes to ES
npm run seed

# 4. Start the backend (starts Change Stream watcher automatically)
npm run dev
```

```bash
# 5. Install and start frontend
cd ../frontend && npm install && npm run dev
# → http://localhost:5173
```

## API Reference

### Books (writes → MongoDB, Change Stream → ES)

| Method | Endpoint         | Body / Params          | Description                         |
|--------|------------------|------------------------|-------------------------------------|
| GET    | `/api/books`     | `?page=1&limit=20`     | List all books from MongoDB         |
| GET    | `/api/books/:id` | —                      | Get one book from MongoDB           |
| POST   | `/api/books`     | JSON body              | Create → MongoDB → ES auto-synced   |
| PATCH  | `/api/books/:id` | JSON body (partial)    | Update → MongoDB → ES auto-synced   |
| DELETE | `/api/books/:id` | —                      | Delete → MongoDB → ES auto-synced   |

### Search (reads → Elasticsearch only)

| Method | Endpoint              | Params                                          |
|--------|-----------------------|-------------------------------------------------|
| GET    | `/api/search`         | `q, genre, minYear, maxYear, minRating, sort, page, size` |
| GET    | `/api/search/suggest` | `q`                                             |

### Monitoring

| Method | Endpoint      | Response                                             |
|--------|---------------|------------------------------------------------------|
| GET    | `/api/health` | MongoDB + ES status                                  |
| GET    | `/api/stats`  | Doc counts from both stores + `inSync` boolean       |

## Live Sync Demo

With the server running, open a new terminal and POST a book:

```bash
curl -s -X POST http://localhost:3001/api/books \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Neuromancer",
    "author": "William Gibson",
    "genre": "Science Fiction",
    "year": 1984,
    "rating": 4.0,
    "pages": 271,
    "description": "The quintessential cyberpunk novel — a washed-up hacker hired for one last job."
  }' | jq .

# Within ~100ms it appears in search:
curl -s "http://localhost:3001/api/search?q=cyberpunk" | jq '.hits[].title'
```

## How Change Stream Sync Works

```
server.js starts
  └── startSync()
        └── Book.watch([], { fullDocument: 'updateLookup' })
              │
              ├── 'insert'  → esClient.index(doc)
              ├── 'update'  → esClient.index(fullDocument)   ← full doc via updateLookup
              ├── 'replace' → esClient.index(fullDocument)
              └── 'delete'  → esClient.delete(id)

Resume tokens (stored in MongoDB _sync_tokens collection):
  - On each successful event: save change._id as the resume token
  - On restart: Book.watch([], { resumeAfter: savedToken })
  - On ChangeStreamHistoryLost: clear token, alert to run npm run reindex
```

## Recovery: When ES Falls Behind

Run this any time ES and MongoDB diverge (oplog expiry, ES downtime, etc.):

```bash
npm run reindex
# Streams all MongoDB docs in batches of 100, bulk-indexes to ES
# Prints: docs/s throughput + total time
```

## Key Design Decisions

| Decision | Why |
|---|---|
| MongoDB replica set (rs0) | Change Streams require oplog — only available on replica sets |
| `fullDocument: 'updateLookup'` | ES needs the whole document; partial updates alone aren't enough |
| Resume tokens in MongoDB | Survives process restarts with no missed or duplicate events |
| ES `_id` = MongoDB `_id.toString()` | 1:1 mapping enables safe upserts and deletes |
| No writes directly to ES | ES is a read model only — prevents split-brain |
| Separate seed + reindex scripts | Seeding bypasses Change Stream (not running yet); reindex for recovery |
| `inSync` field on /api/stats | Quick drift detection in monitoring |
