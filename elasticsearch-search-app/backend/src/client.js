import { Client } from '@elastic/elasticsearch';
import 'dotenv/config';

export const client = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
});

export const INDEX = process.env.INDEX_NAME || 'books';
