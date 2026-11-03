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
      kind: bundle.inputData.kind || 'knowledge',
      mode: 'fast',
      max_results: bundle.inputData.maxResults || 6,
      graph_context: true,
      ...(bundle.inputData.includeTableSql != null && { include_table_sql: bundle.inputData.includeTableSql }),
      ...(bundle.inputData.tableLimit != null && bundle.inputData.tableLimit !== '' && { table_limit: bundle.inputData.tableLimit }),
    },
  });
  const data = response.data?.data || {};
  const chunks = data.chunks || [];
  const extras = {};
  for (const key of ['tabular_data', 'temporal_facts', 'temporal_duration', 'temporal_filter']) {
    if (data[key] != null) extras[key] = data[key];
  }
  if (response.data?.meta?.warnings?.length) extras.warnings = response.data.meta.warnings;
  const rows = chunks.length ? chunks : (Object.keys(extras).length ? [{}] : []);
  return rows.map((c, i) => ({
    id: c.chunk_uuid || c.id || String(i),
    text: extractText(c.chunk_content || c.text || ''),
    score: c.relevancy_score ?? c.score ?? null,
    title: c.source_title || c.title || '',
    ...(c.chunk_metadata != null && { chunk_metadata: c.chunk_metadata }),
    ...extras,
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
      { key: 'includeTableSql', label: 'Include Table SQL', type: 'boolean', required: false },
      { key: 'tableLimit', label: 'Table Row Limit (1–100)', type: 'integer', required: false },
    ],
    perform,
    sample: {
      id: '1', text: 'recalled context', score: 0.9, title: 'note',
      chunk_metadata: { table_id: 'table-1', row_start: 1, row_end: 2, generation: 'v1' },
      tabular_data: { status: 'ok', answer_type: 'computed', records: [{ total: 42 }], returned_rows: 1, sql: 'SELECT count(*) FROM table_1' },
      temporal_facts: [{ subject: 'Ada', relation: 'joined', object: 'Acme', observed_at: 1700000000, event_start: 1690000000 }],
      temporal_duration: { days: 10, approximate: false, from: { observed_at: 1700000000 }, to: { observed_at: 1700864000 } },
      temporal_filter: { applied: true, matched_facts: 1, degraded: false },
      warnings: [{ code: 'collection_skipped', message: 'A collection was skipped', collections: ['restricted'] }],
    },
    outputFields: [
      { key: 'id', label: 'ID' },
      { key: 'text', label: 'Text' },
      { key: 'score', label: 'Score', type: 'number' },
      { key: 'title', label: 'Title' },
      { key: 'chunk_metadata', label: 'Chunk Metadata', children: [
        { key: 'table_id', label: 'Table ID' },
        { key: 'row_start', label: 'First Row', type: 'integer' },
        { key: 'row_end', label: 'Last Row', type: 'integer' },
        { key: 'generation', label: 'Generation' },
      ] },
      { key: 'tabular_data', label: 'Table Data', children: [
        { key: 'status', label: 'Status' },
        { key: 'answer_type', label: 'Answer Type' },
        { key: 'records', label: 'Records' },
        { key: 'returned_rows', label: 'Returned Rows', type: 'integer' },
        { key: 'sql', label: 'SQL' },
      ] },
      { key: 'temporal_facts', label: 'Temporal Facts', children: [
        { key: 'subject', label: 'Subject' },
        { key: 'relation', label: 'Relation' },
        { key: 'object', label: 'Object' },
        { key: 'observed_at', label: 'Observed At (Unix seconds)', type: 'integer' },
        { key: 'event_start', label: 'Event Start (Unix seconds)', type: 'integer' },
        { key: 'event_end', label: 'Event End (Unix seconds)', type: 'integer' },
      ] },
      { key: 'temporal_duration', label: 'Temporal Duration', children: [
        { key: 'days', label: 'Days', type: 'integer' },
        { key: 'approximate', label: 'Approximate', type: 'boolean' },
        { key: 'from', label: 'From', children: [{ key: 'observed_at', label: 'Observed At (Unix seconds)', type: 'integer' }] },
        { key: 'to', label: 'To', children: [{ key: 'observed_at', label: 'Observed At (Unix seconds)', type: 'integer' }] },
      ] },
      { key: 'temporal_filter', label: 'Temporal Filter', children: [
        { key: 'applied', label: 'Applied', type: 'boolean' },
        { key: 'matched_facts', label: 'Matched Facts', type: 'integer' },
        { key: 'degraded', label: 'Degraded', type: 'boolean' },
      ] },
      { key: 'warnings', label: 'Warnings', children: [
        { key: 'code', label: 'Code' },
        { key: 'message', label: 'Message' },
        { key: 'collections', label: 'Collections', list: true },
      ] },
    ],
  },
};
