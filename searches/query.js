'use strict';

const { extractText } = require('../lib/unwrap');
const { isUnified, roots } = require('../lib/contract');
const { recall, inputFields } = require('../lib/query');

/**
 * Recall relevant context from HydraDB for a query.
 * @param z - The Zapier request client.
 * @param bundle - The Zap bundle with authData and inputData.
 * @returns An array of records, each with id, text, score, and title.
 */
const perform = async (z, bundle) => {
  const response = await recall(z, bundle);
  const data = response?.data || {};
  const chunks = data.chunks || [];
  if (isUnified(data)) {
    return chunks.map(c => ({ ...c, id: c.chunk_id, text: c.content, title: '', ...roots(data) }));
  }
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
    inputFields,
    perform,
    sample: { id: '1', text: 'recalled context', score: 0.9, title: 'note' },
    outputFields: [
      { key: 'id', label: 'ID' }, { key: 'text', label: 'Text' },
      { key: 'score', label: 'Score', type: 'number' }, { key: 'title', label: 'Title' },
      { key: 'chunk_id', label: 'Chunk ID' }, { key: 'context_id', label: 'Context ID' },
      { key: 'content', label: 'Content' }, { key: 'enrichment', label: 'Enrichment' },
      { key: 'received_at', label: 'Received At' }, { key: 'temporal', label: 'Temporal Facts' },
      { key: 'chunk_metadata', label: 'CSV Row Range' }, { key: 'graph', label: 'Graph Paths' },
      { key: 'forceful_relations', label: 'Forceful Relations' }, { key: 'llm_prompt', label: 'LLM Prompt' },
      { key: 'tabular_data', label: 'Table Data' },
    ],
  },
};
