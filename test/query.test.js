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
test('declares discoverable output fields and representative sample', () => {
 const { sample, outputFields } = query.operation;
 const keys = ['id', 'text', 'score', 'title', 'chunk_metadata', 'tabular_data', 'temporal_facts', 'temporal_duration', 'temporal_filter', 'warnings'];
 for (const key of keys) {
   assert.ok(Object.hasOwn(sample, key), `sample missing ${key}`);
   assert.ok(outputFields.some(field => field.key === key), `outputFields missing ${key}`);
 }
 assert.equal(sample.temporal_facts[0].observed_at, 1700000000);
 assert.deepEqual(sample.warnings[0].collections, ['restricted']);
 const warningFields = outputFields.find(field => field.key === 'warnings').children;
 assert.ok(warningFields.some(field => field.key === 'collections'));
});
test('Zapier app definition passes platform schema validation', () => {
 const { compileApp, validateApp } = require('zapier-platform-core/src/tools/schema');
 assert.deepEqual(validateApp(compileApp(require('../index'))), []);
});
test('warnings and inapplicable or failed table diagnostics do not fabricate search matches', async () => {
 const search = async data => query.operation.perform({request: async () => ({data: {data, meta}})}, {authData: {}, inputData: {query:'q'}});
 for (const data of [{chunks: []}, {chunks: [], tabular_data: {status: 'not_applicable', reason: 'no table'}}, {chunks: [], tabular_data: {status: 'error', error: {message: 'failed'}}}]) {
   assert.deepEqual(await search(data), []);
 }
});
test('successful table answer remains a match even without rows or chunks', async () => {
 const tabular_data = {status: 'ok', records: []};
 const records = await query.operation.perform({request: async () => ({data: {data: {chunks: [], tabular_data}, meta}})}, {authData: {}, inputData: {query:'q'}});
 assert.equal(records.length, 1);
 assert.deepEqual(records[0].tabular_data, tabular_data);
 assert.deepEqual(records[0].warnings, meta.warnings);
});
