'use strict';

const { recall, inputFields } = require('../lib/query');

module.exports = {
  key: 'recall_context',
  noun: 'Context Response',
  display: {
    label: 'Recall Whole Context (Rollout Preview)',
    description: 'Return the complete recall envelope, including graph-only and prompt-only responses.',
  },
  operation: {
    inputFields,
    perform: recall,
    sample: { success: true, data: { chunks: [], graph: [], forceful_relations: [], llm_prompt: '', tabular_data: null } },
    outputFields: [
      { key: 'success', label: 'Success', type: 'boolean' },
      { key: 'data', label: 'Context', children: [
        { key: 'chunks', label: 'Chunks' }, { key: 'graph', label: 'Graph Paths' },
        { key: 'forceful_relations', label: 'Forceful Relations' },
        { key: 'llm_prompt', label: 'LLM Prompt' }, { key: 'tabular_data', label: 'Table Data' },
      ] },
      { key: 'meta', label: 'Response Metadata' },
    ],
  },
};
