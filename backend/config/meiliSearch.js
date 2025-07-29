import { MeiliSearch } from 'meilisearch';
import dotenv from 'dotenv';
dotenv.config();

const meiliClient = new MeiliSearch({
  host: process.env.MEILISEARCH_URL,
  apiKey: process.env.MEILISEARCH_API_KEY,
  requestConfig: {
    timeout: 10000, // 10 seconds timeout
  }
});

export default meiliClient;
