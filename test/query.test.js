const { test } = require('node:test');
const assert = require('node:assert/strict');
const query = require('../searches/query');
const data = { chunks: [{ chunk_uuid: 'c1', chunk_content: 'hello', chunk_metadata: { row: 2 } }], tabular_data: { status: 'ok', records: [{ n: 1 }] }, temporal_facts: [{ observed_at: 123 }], temporal_duration: { from: { observed_at: 123 } } };
const meta = { warnings: [{ code: 'skipped', collections: ['private'] }] };
test('query sends table options and exposes retrieval and warning metadata', async () => {
 let request; const records = await query.operation.perform({ request: async r => { request = r; return { data: { data, meta } }; } }, { authData: { database: 'db' }, inputData: { query: 'q', includeTableSql: true, tableLimit: 5 } });
 assert.equal(request.body.include_table_sql, true); assert.equal(request.body.table_limit, 5);
 assert.deepEqual(records[0].chunk_metadata, data.chunks[0].chunk_metadata); assert.deepEqual(records[0].tabular_data, data.tabular_data); assert.deepEqual(records[0].temporal_facts, data.temporal_facts); assert.deepEqual(records[0].temporal_duration, data.temporal_duration); assert.deepEqual(records[0].warnings, meta.warnings);
});
test('table-only result remains accessible', async () => { const records = await query.operation.perform({request: async () => ({data: {data: {...data, chunks: []}, meta}})}, {authData: {}, inputData: {query:'q'}}); assert.deepEqual(records[0].tabular_data, data.tabular_data); });
test('empty response preserves empty output and omits optional request fields', async () => { let req; const records = await query.operation.perform({request: async r => {req = r; return {data: {data: {chunks: []}}};}}, {authData: {}, inputData: {query:'q'}}); assert.deepEqual(records, []); assert.equal('include_table_sql' in req.body, false); assert.equal('table_limit' in req.body, false); });
