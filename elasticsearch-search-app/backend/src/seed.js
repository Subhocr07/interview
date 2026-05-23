import 'dotenv/config';
import { client, INDEX } from './client.js';
import { books } from './data/books.js';

const mapping = {
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
        autocomplete_filter: {
          type: 'edge_ngram',
          min_gram: 2,
          max_gram: 20,
        },
      },
    },
  },
  mappings: {
    properties: {
      title: {
        type: 'text',
        analyzer: 'english',
        fields: {
          keyword: { type: 'keyword' },
          autocomplete: {
            type: 'text',
            analyzer: 'autocomplete_analyzer',
            search_analyzer: 'autocomplete_search_analyzer',
          },
        },
      },
      author: {
        type: 'text',
        analyzer: 'standard',
        fields: { keyword: { type: 'keyword' } },
      },
      description: { type: 'text', analyzer: 'english' },
      genre: { type: 'keyword' },
      year: { type: 'integer' },
      rating: { type: 'float' },
      pages: { type: 'integer' },
    },
  },
};

async function seed() {
  console.log('🔗 Connecting to Elasticsearch at', process.env.ELASTICSEARCH_URL || 'http://localhost:9200');

  // Wait for ES to be ready
  for (let i = 0; i < 10; i++) {
    try {
      await client.ping();
      console.log('✅ Elasticsearch is up');
      break;
    } catch {
      console.log(`⏳ Waiting for Elasticsearch... (${i + 1}/10)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // Delete and recreate index
  const exists = await client.indices.exists({ index: INDEX });
  if (exists) {
    await client.indices.delete({ index: INDEX });
    console.log(`🗑  Deleted existing index: ${INDEX}`);
  }

  await client.indices.create({ index: INDEX, body: mapping });
  console.log(`📚 Created index: ${INDEX}`);

  // Bulk index books
  const operations = books.flatMap(book => [
    { index: { _index: INDEX, _id: book.id } },
    book,
  ]);

  const { errors, items } = await client.bulk({ refresh: true, operations });

  if (errors) {
    const failed = items.filter(i => i.index?.error);
    console.error('❌ Bulk index errors:', failed.map(i => i.index.error));
  } else {
    console.log(`✅ Indexed ${books.length} books successfully`);
  }

  // Print cluster info
  const info = await client.info();
  console.log(`\n📊 Cluster: ${info.cluster_name} | ES version: ${info.version.number}`);
  console.log(`\n🚀 Ready! Start the backend with: npm run dev`);
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
