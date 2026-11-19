'use strict';

const { layout, unifiedBody } = require('../lib/contract');

/**
 * Encode text fields as a multipart/form-data body with an explicit boundary.
 * @param fields - A map of field name to string value.
 * @returns An object with the boundary and the encoded body.
 */
const encodeMultipart = (fields) => {
  const boundary = `----hydradb${Date.now()}`;
  const body =
    Object.entries(fields)
      .map(
        ([k, v]) =>
          `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`,
      )
      .join('') + `--${boundary}--\r\n`;
  return { boundary, body };
};

/**
 * Store a note as knowledge in HydraDB.
 * @param z - The Zapier request client.
 * @param bundle - The Zap bundle with authData and inputData.
 * @returns The parsed ingest response.
 */
const perform = async (z, bundle) => {
  const base = bundle.authData.baseUrl || 'https://api.hydradb.com';
  if (layout(bundle.inputData.layout) === 'unified') {
    const response = await z.request({
      url: `${base}/context/ingest`, method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: unifiedBody(bundle.authData.database, bundle.authData.collection || '', bundle.inputData.context, bundle.inputData.text, bundle.inputData.title, `zapier-${Date.now()}`),
    });
    return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  }
  if (bundle.inputData.context !== undefined && bundle.inputData.context !== '') throw new Error('context requires unified layout');
  if (typeof bundle.inputData.text !== 'string' || !bundle.inputData.text.trim()) throw new Error('text is required for split ingestion');
  const item = {
    id: `zapier-${Date.now()}`,
    title: bundle.inputData.title || 'note',
    content: { text: bundle.inputData.text },
    infer: true,
  };
  const { boundary, body } = encodeMultipart({
    tenant_id: bundle.authData.database,
    sub_tenant_id: bundle.authData.collection || '',
    type: 'knowledge',
    app_knowledge: JSON.stringify([item]),
  });
  const response = await z.request({
    url: `${base}/context/ingest`,
    method: 'POST',
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    body,
  });
  return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
};

module.exports = {
  key: 'ingest',
  noun: 'Note',
  display: {
    label: 'Ingest Knowledge',
    description: 'Store a note as knowledge in HydraDB.',
  },
  operation: {
    inputFields: [
      { key: 'layout', label: 'Database Layout', choices: ['split', 'unified'], default: 'split', helpText: 'Explicit layout choice. Unified is not enabled in production.' },
      { key: 'text', label: 'Text', type: 'text', required: false },
      { key: 'title', label: 'Title', type: 'string', required: false },
      { key: 'context', label: 'Unified Context JSON', type: 'text', required: false, helpText: 'Unified only. Optional JSON context array; replaces Text and Title. Each item needs text XOR conversation.' },
    ],
    perform,
    sample: { success: true, data: { success: true } },
  },
};
