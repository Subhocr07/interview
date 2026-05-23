import { esClient, INDEX } from '../config/elasticsearch.js';

// Maps a MongoDB document → ES document (use Mongo _id as ES _id)
export function toESDoc(mongoDoc) {
  const { _id, __v, ...rest } = mongoDoc;
  return { id: _id.toString(), doc: rest };
}

export const searchRepo = {
  // ── Full search with filters, aggregations, highlighting, sorting ────────
  async search({ q = '', genre, minYear, maxYear, minRating, sort = 'relevance', page = 1, size = 10 }) {
    const from = (page - 1) * size;

    const filters = [];
    if (genre)              filters.push({ term: { genre } });
    if (minYear || maxYear) filters.push({ range: { year: {
      ...(minYear && { gte: +minYear }),
      ...(maxYear && { lte: +maxYear }),
    }}});
    if (minRating)          filters.push({ range: { rating: { gte: +minRating } } });

    const query = q.trim()
      ? { bool: { must: [{ multi_match: { query: q, fields: ['title^3', 'author^2', 'description'], fuzziness: 'AUTO', type: 'best_fields' } }], filter: filters } }
      : filters.length ? { bool: { filter: filters } }
      : { match_all: {} };

    const sortClause =
      sort === 'rating_desc' ? [{ rating: 'desc' }] :
      sort === 'rating_asc'  ? [{ rating: 'asc' }] :
      sort === 'year_desc'   ? [{ year: 'desc' }] :
      sort === 'year_asc'    ? [{ year: 'asc' }] :
      sort === 'title_asc'   ? [{ 'title.keyword': 'asc' }] :
      ['_score'];

    const response = await esClient.search({
      index: INDEX,
      from, size,
      query,
      sort: sortClause,
      highlight: {
        fields: { title: { number_of_fragments: 0 }, description: { fragment_size: 200, number_of_fragments: 1 }, author: { number_of_fragments: 0 } },
        pre_tags: ['<mark>'], post_tags: ['</mark>'],
      },
      aggs: {
        genres:        { terms: { field: 'genre', size: 20, order: { _count: 'desc' } } },
        avg_rating:    { avg: { field: 'rating' } },
        rating_ranges: { range: { field: 'rating', ranges: [{ key: '3+', from: 3 }, { key: '3.5+', from: 3.5 }, { key: '4+', from: 4 }, { key: '4.5+', from: 4.5 }] } },
        year_histogram:{ histogram: { field: 'year', interval: 50, min_doc_count: 1 } },
        min_year:      { min: { field: 'year' } },
        max_year:      { max: { field: 'year' } },
      },
    });

    return {
      total: response.hits.total.value,
      page, size,
      hits: response.hits.hits.map(h => ({ id: h._id, score: h._score, ...h._source, highlight: h.highlight || {} })),
      aggregations: response.aggregations,
    };
  },

  // ── Autocomplete ─────────────────────────────────────────────────────────
  async suggest(q) {
    if (!q?.trim()) return [];
    const response = await esClient.search({
      index: INDEX, size: 5,
      query: { multi_match: { query: q, fields: ['title.autocomplete^2', 'author.autocomplete'], type: 'bool_prefix' } },
      _source: ['title', 'author', 'genre'],
    });
    return response.hits.hits.map(h => ({ id: h._id, ...h._source }));
  },

  // ── Single index / upsert ─────────────────────────────────────────────────
  async indexDoc(mongoDoc) {
    const { id, doc } = toESDoc(mongoDoc);
    return esClient.index({ index: INDEX, id, document: doc, refresh: false });
  },

  // ── Bulk index (for reindex script) ──────────────────────────────────────
  async bulkIndex(mongoDocs) {
    if (!mongoDocs.length) return;
    const operations = mongoDocs.flatMap(d => {
      const { id, doc } = toESDoc(d);
      return [{ index: { _index: INDEX, _id: id } }, doc];
    });
    const { errors, items } = await esClient.bulk({ refresh: false, operations });
    if (errors) {
      const failed = items.filter(i => i.index?.error);
      console.error('[ES] Bulk errors:', failed.length, failed[0]?.index?.error);
    }
    return items.length / 2;
  },

  async deleteDoc(id) {
    return esClient.delete({ index: INDEX, id }).catch(err => {
      if (err.meta?.statusCode !== 404) throw err;
    });
  },

  async stats() {
    const [statsRes, countRes] = await Promise.all([
      esClient.indices.stats({ index: INDEX }),
      esClient.count({ index: INDEX }),
    ]);
    return {
      docs:  countRes.count,
      bytes: statsRes.indices[INDEX]?.total.store.size_in_bytes ?? 0,
    };
  },
};
