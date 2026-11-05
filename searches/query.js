'use strict';

const { extractText } = require('../lib/unwrap');

/**
 * Recall relevant context from HydraDB for a query.
 * @param z - The Zapier request client.
 * @param bundle - The Zap bundle with authData and inputData.
 * @returns An array of records, each with id, text, score, and title.
 */
const perform = async (z, bundle) => {
  const base = bundle.authData.baseUrl || 'https://api.hydradb.com';
  const response = await z.request({
    url: `${base}/query`,
    method: 'POST',
    body: {
      database: bundle.authData.database,
      collection: bundle.authData.collection || '',
      query: bundle.inputData.query,
      type: bundle.inputData.kind || 'knowledge',
      mode: 'fast',
      max_results: bundle.inputData.maxResults || 6,
      graph_context: true,
    },
  });
  const chunks = (response.data && response.data.data && response.data.data.chunks) || [];
  return chunks.map((c, i) => ({
    id: c.chunk_uuid || c.id || String(i),
    text: extractText(c.chunk_content || c.text || ''),
    score: c.relevancy_score ?? c.score ?? null,
    title: c.source_title || c.title || '',
  }));
};

module.exports = {
  key: 'query',
  noun: 'Context',
  display: {
    label: 'Recall Context',
    description: 'Recall relevant context from HydraDB for a query.',
  },
  operation: {
    inputFields: [
      { key: 'query', label: 'Query', type: 'string', required: true },
      {
        key: 'kind',
        label: 'Kind',
        type: 'string',
        choices: { knowledge: 'Knowledge', memory: 'Memory' },
        default: 'knowledge',
      },
      { key: 'maxResults', label: 'Max Results', type: 'integer', default: '6' },
    ],
    perform,
    sample: { id: '1', text: 'recalled context', score: 0.9, title: 'note' },
  },
};
