# Elasticsearch Book Search — Full-Stack App

Full-stack search application built with **Elasticsearch 8**, **Node.js/Express**, and **React/Vite**.

## Features

- **Full-text search** with boosted fields (`title^3`, `author^2`, `description`)
- **Fuzziness** — typo-tolerant via `AUTO` fuzz
- **Hit highlighting** — matched terms wrapped in `<mark>` tags
- **Faceted filtering** — genre, year range, minimum rating
- **Aggregations** — genre counts, avg rating, year histogram
- **Autocomplete** — edge-ngram suggest as you type
- **Sorting** — relevance, rating, year, title
- **Pagination** — `from`/`size` with page window

## Tech Stack

| Layer         | Tech                                          |
|---------------|-----------------------------------------------|
| Search Engine | Elasticsearch 8 (Docker)                      |
| Visualization | Kibana (Docker)                               |
| Backend       | Node.js + Express + @elastic/elasticsearch v8 |
| Frontend      | React 18 + Vite                               |

## Quick Start

### 1. Start Elasticsearch + Kibana

```bash
docker compose up -d
# Wait ~30s for ES to be healthy
docker compose ps   # verify both services are Up
```

Kibana → http://localhost:5601

### 2. Install & seed backend

```bash
cd backend
cp .env.example .env
npm install
npm run seed     # creates index + bulk-indexes 50 books
```

### 3. Start backend

```bash
npm run dev      # http://localhost:3001
```

### 4. Install & start frontend

```bash
cd ../frontend
npm install
npm run dev      # http://localhost:5173
```

## API Reference

| Method | Endpoint              | Description                                    |
|--------|-----------------------|------------------------------------------------|
| GET    | `/api/health`         | Elasticsearch cluster health                   |
| GET    | `/api/stats`          | Index doc count + store size                   |
| GET    | `/api/search`         | Full-text search with filters, facets, sorting |
| GET    | `/api/suggest?q=`     | Autocomplete suggestions                       |
| GET    | `/api/books/:id`      | Get single book by ID                          |
| POST   | `/api/books`          | Index a new book                               |
| DELETE | `/api/books/:id`      | Delete a book                                  |

### Search Query Parameters

| Param       | Type   | Example          | Description                              |
|-------------|--------|------------------|------------------------------------------|
| `q`         | string | `?q=dystopia`    | Full-text query                          |
| `genre`     | string | `&genre=Fantasy` | Filter by genre (exact keyword)          |
| `minYear`   | int    | `&minYear=2000`  | Published after year                     |
| `maxYear`   | int    | `&maxYear=2020`  | Published before year                    |
| `minRating` | float  | `&minRating=4.0` | Minimum rating                           |
| `sort`      | string | `&sort=rating_desc` | relevance, rating_desc/asc, year_desc/asc, title_asc |
| `page`      | int    | `&page=2`        | Page number (default 1)                  |
| `size`      | int    | `&size=10`       | Results per page (default 10)            |

### Example cURL calls

```bash
# Full-text search
curl "http://localhost:3001/api/search?q=mars+survival"

# Filter: Fantasy books rated 4+
curl "http://localhost:3001/api/search?genre=Fantasy&minRating=4"

# Sort by year descending, page 2
curl "http://localhost:3001/api/search?sort=year_desc&page=2"

# Autocomplete
curl "http://localhost:3001/api/suggest?q=dune"

# Add a book
curl -X POST http://localhost:3001/api/books \
  -H "Content-Type: application/json" \
  -d '{"title":"Neuromancer","author":"William Gibson","genre":"Science Fiction","year":1984,"rating":4.0,"pages":271,"description":"The quintessential cyberpunk novel following a washed-up hacker hired for one last job."}'
```

## Index Mapping Highlights

```json
{
  "title": {
    "type": "text",
    "analyzer": "english",
    "fields": {
      "keyword":      { "type": "keyword" },
      "autocomplete": { "type": "text", "analyzer": "autocomplete_analyzer" }
    }
  },
  "genre":  { "type": "keyword" },
  "year":   { "type": "integer" },
  "rating": { "type": "float" }
}
```

The `autocomplete_analyzer` uses an **edge_ngram** filter (min_gram: 2, max_gram: 20)
to enable prefix matching as the user types.

## Key Elasticsearch Concepts Demonstrated

- **Multi-match query** with field boosting
- **Bool query** with `must` + `filter` clauses (filter = no scoring)
- **Fuzzy matching** (`fuzziness: AUTO`)
- **Term/range filters** (genre keyword, year range, rating range)
- **Aggregations** — terms, range, histogram, avg, min, max
- **Highlighting** with custom pre/post tags
- **Custom analyzers** — edge_ngram for autocomplete
- **Bulk indexing** for seeding data
- **Index mappings** with multi-fields
