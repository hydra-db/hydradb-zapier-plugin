'use strict';

const { layout } = require('./contract');

const inputFields = [
  { key: 'query', label: 'Query', type: 'string', required: true },
  { key: 'layout', label: 'Database Layout', choices: ['split', 'unified'], default: 'split', helpText: 'Unified is a rollout preview, not enabled in production.' },
  { key: 'kind', label: 'Kind (Split Only)', choices: { knowledge: 'Knowledge', memory: 'Memory' }, default: 'knowledge' },
  { key: 'maxResults', label: 'Max Results', type: 'integer', default: '6' },
];

async function recall(z, bundle) {
  const selectedLayout = layout(bundle.inputData.layout);
  const response = await z.request({
    url: `${bundle.authData.baseUrl || 'https://api.hydradb.com'}/query`,
    method: 'POST',
    body: {
      database: bundle.authData.database,
      collection: bundle.authData.collection || '',
      query: bundle.inputData.query,
      ...(selectedLayout === 'split' && { type: bundle.inputData.kind || 'knowledge' }),
      mode: 'fast',
      max_results: bundle.inputData.maxResults ?? 6,
      graph_context: true,
    },
  });
  return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
}

module.exports = { recall, inputFields };
