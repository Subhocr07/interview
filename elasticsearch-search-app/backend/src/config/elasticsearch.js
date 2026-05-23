import { Client } from '@elastic/elasticsearch';
import 'dotenv/config';

export const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
});

export const INDEX = process.env.ES_INDEX || 'books';

// Index mapping — single source of truth for the books index schema
export const INDEX_MAPPING = {
  settings: {
    analysis: {
      analyzer: {
        autocomplete_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'autocomplete_filter'],
        },
        autocomplete_search_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase'],
        },
      },
      filter: {
        autocomplete_filter: { type: 'edge_ngram', min_gram: 2, max_gram: 20 },
      },
    },
  },
  mappings: {
    properties: {
      title:       { type: 'text', analyzer: 'english',
                     fields: { keyword: { type: 'keyword' },
                               autocomplete: { type: 'text',
                                               analyzer: 'autocomplete_analyzer',
                                               search_analyzer: 'autocomplete_search_analyzer' } } },
      author:      { type: 'text', analyzer: 'standard',
                     fields: { keyword: { type: 'keyword' } } },
      description: { type: 'text', analyzer: 'english' },
      genre:       { type: 'keyword' },
      year:        { type: 'integer' },
      rating:      { type: 'float' },
      pages:       { type: 'integer' },
      createdAt:   { type: 'date' },
      updatedAt:   { type: 'date' },
    },
  },
};

export async function ensureIndex() {
  const exists = await esClient.indices.exists({ index: INDEX });
  if (!exists) {
    await esClient.indices.create({ index: INDEX, body: INDEX_MAPPING });
    console.log(`📚 Created ES index: ${INDEX}`);
  }
}
