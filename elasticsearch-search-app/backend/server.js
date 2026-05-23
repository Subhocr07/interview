import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { client, INDEX } from './src/client.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const health = await client.cluster.health();
    res.json({ status: 'ok', elasticsearch: health.status });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

// ─── Full-text search with filters, facets, highlight, sort, pagination ───────
app.get('/api/search', async (req, res) => {
  const {
    q = '',
    genre,
    minYear,
    maxYear,
    minRating,
    sort = 'relevance',
    page = '1',
    size = '10',
  } = req.query;

  const from = (parseInt(page) - 1) * parseInt(size);

  // Build filter clauses
  const filters = [];
  if (genre)     filters.push({ term: { genre } });
  if (minYear || maxYear) {
    filters.push({ range: { year: {
      ...(minYear && { gte: parseInt(minYear) }),
      ...(maxYear && { lte: parseInt(maxYear) }),
    }}});
  }
  if (minRating) {
    filters.push({ range: { rating: { gte: parseFloat(minRating) } } });
  }

  // Build query
  const query = q.trim()
    ? {
        bool: {
          must: [{
            multi_match: {
              query: q,
              fields: ['title^3', 'author^2', 'description'],
              fuzziness: 'AUTO',
              type: 'best_fields',
            },
          }],
          filter: filters,
        },
      }
    : filters.length
      ? { bool: { filter: filters } }
      : { match_all: {} };

  // Sort options
  const sortClause =
    sort === 'rating_desc'  ? [{ rating: 'desc' }] :
    sort === 'rating_asc'   ? [{ rating: 'asc' }] :
    sort === 'year_desc'    ? [{ year: 'desc' }] :
    sort === 'year_asc'     ? [{ year: 'asc' }] :
    sort === 'title_asc'    ? [{ 'title.keyword': 'asc' }] :
    ['_score']; // relevance (default)

  try {
    const response = await client.search({
      index: INDEX,
      from,
      size: parseInt(size),
      query,
      sort: sortClause,
      highlight: {
        fields: {
          title: { number_of_fragments: 0 },
          description: { fragment_size: 200, number_of_fragments: 1 },
          author: { number_of_fragments: 0 },
        },
        pre_tags: ['<mark>'],
        post_tags: ['</mark>'],
      },
      aggs: {
        genres: {
          terms: { field: 'genre', size: 20, order: { _count: 'desc' } },
        },
        avg_rating: {
          avg: { field: 'rating' },
        },
        rating_ranges: {
          range: {
            field: 'rating',
            ranges: [
              { key: '3+',   from: 3 },
              { key: '3.5+', from: 3.5 },
              { key: '4+',   from: 4 },
              { key: '4.5+', from: 4.5 },
            ],
          },
        },
        year_histogram: {
          histogram: { field: 'year', interval: 50, min_doc_count: 1 },
        },
        min_year: { min: { field: 'year' } },
        max_year: { max: { field: 'year' } },
      },
    });

    const hits = response.hits.hits.map(hit => ({
      id: hit._id,
      score: hit._score,
      ...hit._source,
      highlight: hit.highlight || {},
    }));

    res.json({
      total: response.hits.total.value,
      page: parseInt(page),
      size: parseInt(size),
      hits,
      aggregations: response.aggregations,
    });
  } catch (err) {
    console.error('Search error:', err.meta?.body?.error || err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Autocomplete / Suggest ───────────────────────────────────────────────────
app.get('/api/suggest', async (req, res) => {
  const { q = '' } = req.query;
  if (!q.trim()) return res.json({ suggestions: [] });

  try {
    const response = await client.search({
      index: INDEX,
      size: 5,
      query: {
        multi_match: {
          query: q,
          fields: ['title.autocomplete^2', 'author.autocomplete'],
          type: 'bool_prefix',
        },
      },
      _source: ['title', 'author', 'genre'],
    });

    const suggestions = response.hits.hits.map(hit => ({
      id: hit._id,
      title: hit._source.title,
      author: hit._source.author,
      genre: hit._source.genre,
    }));

    res.json({ suggestions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get single book ──────────────────────────────────────────────────────────
app.get('/api/books/:id', async (req, res) => {
  try {
    const doc = await client.get({ index: INDEX, id: req.params.id });
    res.json({ id: doc._id, ...doc._source });
  } catch (err) {
    if (err.meta?.statusCode === 404) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// ─── Add / update a book ──────────────────────────────────────────────────────
app.post('/api/books', async (req, res) => {
  const book = req.body;
  if (!book.title || !book.author) {
    return res.status(400).json({ error: 'title and author are required' });
  }
  try {
    const result = await client.index({
      index: INDEX,
      id: book.id || undefined,
      document: book,
      refresh: true,
    });
    res.status(201).json({ id: result._id, result: result.result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Delete a book ────────────────────────────────────────────────────────────
app.delete('/api/books/:id', async (req, res) => {
  try {
    await client.delete({ index: INDEX, id: req.params.id, refresh: true });
    res.json({ deleted: req.params.id });
  } catch (err) {
    if (err.meta?.statusCode === 404) return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// ─── Index stats ──────────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await client.indices.stats({ index: INDEX });
    const count = await client.count({ index: INDEX });
    res.json({
      docs: count.count,
      size: stats.indices[INDEX]?.total.store.size_in_bytes,
      indexName: INDEX,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📡 Elasticsearch: ${process.env.ELASTICSEARCH_URL || 'http://localhost:9200'}`);
});
