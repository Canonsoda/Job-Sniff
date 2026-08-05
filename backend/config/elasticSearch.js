import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
dotenv.config();

const elasticClient = new Client({
  node: process.env.ELASTICSEARCH_URL,
  auth: {
    apiKey: process.env.ELASTICSEARCH_API,
  },
  requestTimeout: 10000,
});

export const RESUME_INDEX = process.env.ELASTICSEARCH_INDEX || 'resumes';

// The standard analyzer keeps "React.js" as a single token, so a search for
// "React" would miss it. Splitting on punctuation (while keeping the original
// token) makes "React", "React.js" and "Node" all match as users expect.
const RESUME_SETTINGS = {
  analysis: {
    filter: {
      resume_word_delimiter: {
        type: 'word_delimiter_graph',
        preserve_original: true,
        split_on_numerics: false,
        catenate_words: false,
      },
    },
    analyzer: {
      resume_analyzer: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'resume_word_delimiter', 'flatten_graph', 'asciifolding'],
      },
    },
  },
};

const text = { type: 'text', analyzer: 'resume_analyzer' };

// Explicit mapping so filters behave predictably:
//  - userId is a keyword so term filters match exactly
//  - cgpa keeps the original string for display, cgpaValue is numeric for range filters
const RESUME_MAPPING = {
  properties: {
    userId: { type: 'keyword' },
    name: { ...text, fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
    email: { ...text, fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
    phone: { type: 'keyword' },
    cgpa: { type: 'keyword' },
    cgpaValue: { type: 'float' },
    shortlisted: { type: 'boolean' },
    skills: text,
    education: {
      properties: {
        level: text,
        institution: text,
        board: text,
        year: { type: 'keyword' },
        percentage: { type: 'keyword' },
      },
    },
    workExperience: {
      properties: {
        position: text,
        company: text,
        duration: { type: 'keyword' },
        description: text,
      },
    },
  },
};

let indexReady = null;

/**
 * Create the resumes index with its mapping if it does not exist yet.
 * Memoised so concurrent uploads only trigger one round-trip.
 */
export const ensureResumeIndex = async () => {
  if (!indexReady) {
    indexReady = (async () => {
      const exists = await elasticClient.indices.exists({ index: RESUME_INDEX });
      if (!exists) {
        try {
          await elasticClient.indices.create({
            index: RESUME_INDEX,
            settings: RESUME_SETTINGS,
            mappings: RESUME_MAPPING,
          });
        } catch (err) {
          // Another process may have created it in the meantime
          if (err?.body?.error?.type !== 'resource_already_exists_exception') throw err;
        }
      } else {
        // Index predates a mapping change: add any new fields. Adding fields is
        // allowed; changing an existing field's type is not, so ignore conflicts.
        try {
          await elasticClient.indices.putMapping({ index: RESUME_INDEX, ...RESUME_MAPPING });
        } catch (err) {
          console.warn('Could not update resumes mapping:', err.message);
        }
      }
    })().catch((err) => {
      indexReady = null; // allow a retry on the next request
      throw err;
    });
  }
  return indexReady;
};

/** Shape a Resume document the way the search index expects it. */
export const buildResumeDocument = (userId, extractedData) => {
  const cgpaValue = parseFloat(extractedData.cgpa);

  return {
    userId,
    name: extractedData.name,
    email: extractedData.email,
    phone: extractedData.phone,
    cgpa: extractedData.cgpa,
    cgpaValue: Number.isNaN(cgpaValue) ? null : cgpaValue,
    // The Search page renders its star from this, so it must be indexed
    shortlisted: extractedData.shortlisted === true,
    skills: extractedData.skills ? extractedData.skills.join(', ') : '',
    education: extractedData.education || [],
    workExperience: extractedData.workExperience || [],
  };
};

export default elasticClient;
