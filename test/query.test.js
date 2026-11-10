const { test } = require('node:test');
const assert = require('node:assert/strict');
const query = require('../searches/query');
const data = { llm_prompt: 'Use this context', chunks: [{ chunk_uuid: 'c1', chunk_content: 'hello', metadata: { source: 'note' }, additional_metadata: { row: 2 } }], tabular_data: { status: 'ok', records: [{ n: 1 }] } };
const search = async data => query.operation.perform({request: async () => ({data: {data}})}, {authData: {}, inputData: {query:'q'}});
test('query sends table options and exposes live response fields', async () => {
 let request; const records = await query.operation.perform({ request: async r => { request = r; return { data: { data } }; } }, { authData: { database: 'db' }, inputData: { query: 'q', includeTableSql: true, tableLimit: 5 } });
 assert.equal(request.body.include_table_sql, true); assert.equal(request.body.table_limit, 5);
 assert.equal(records[0].llm_prompt, data.llm_prompt); assert.deepEqual(records[0].metadata, data.chunks[0].metadata);
 assert.deepEqual(records[0].additional_metadata, data.chunks[0].additional_metadata); assert.deepEqual(records[0].tabular_data, data.tabular_data);
});
test('table-only answer remains accessible, including prompt', async () => {
 const records = await search({...data, chunks: [], tabular_data: {status: 'ok', records: []}});
 assert.equal(records.length, 1); assert.deepEqual(records[0].tabular_data.records, []); assert.equal(records[0].llm_prompt, data.llm_prompt);
});
test('prompt and unsuccessful table diagnostics do not fabricate search matches', async () => {
 for (const tabular_data of [undefined, {status: 'not_applicable'}, {status: 'error'}]) assert.deepEqual(await search({chunks: [], llm_prompt: 'No context', tabular_data}), []);
});
test('empty response omits optional request fields', async () => {
 let req; const records = await query.operation.perform({request: async r => {req = r; return {data: {data: {chunks: []}}};}}, {authData: {}, inputData: {query:'q'}});
 assert.deepEqual(records, []); assert.equal('include_table_sql' in req.body, false); assert.equal('table_limit' in req.body, false);
});
test('sample and output fields describe the live contract', () => {
 const {sample, outputFields} = query.operation;
 for (const key of ['id', 'text', 'score', 'title', 'metadata', 'additional_metadata', 'llm_prompt', 'tabular_data']) {
  assert.ok(Object.hasOwn(sample, key), `sample missing ${key}`); assert.ok(outputFields.some(field => field.key === key), `outputFields missing ${key}`);
 }
 for (const key of ['chunk_metadata', 'temporal_facts', 'temporal_duration', 'temporal_filter', 'warnings']) {
  assert.equal(Object.hasOwn(sample, key), false); assert.equal(outputFields.some(field => field.key === key), false);
 }
});
test('Zapier app definition passes platform schema validation', () => {
 const { compileApp, validateApp } = require('zapier-platform-core/src/tools/schema');
 assert.deepEqual(validateApp(compileApp(require('../index'))), []);
});
