const { test } = require('node:test');
const assert = require('node:assert/strict');
const query = require('../searches/query');

test('Zapier table mapping does not advertise removed response fields', () => {
  const { sample, outputFields } = query.operation;
  const tableFields = outputFields.find(field => field.key === 'tabular_data').children;
  for (const key of ['rows', 'limit', 'returned_rows', 'provenance']) {
    assert.equal(Object.hasOwn(sample.tabular_data, key), false, `sample advertises removed field ${key}`);
    assert.equal(tableFields.some(field => field.key === key), false, `outputFields advertises removed field ${key}`);
  }
});

test('table-only responses preserve records and object citations without a row count', async () => {
  const tabular_data = {
    status: 'ok',
    answer_type: 'exact',
    records: [{ total: 42 }],
    citations: { rows: [{ source_id: 'doc-1', collection: 'notes', row: 1, chunk_id: 'chunk-1' }] },
  };
  const records = await query.operation.perform(
    { request: async () => ({ data: { data: { chunks: [], llm_prompt: 'Use the table.', tabular_data } } }) },
    { authData: { database: 'db' }, inputData: { query: 'q' } },
  );
  assert.equal(records.length, 1);
  assert.deepEqual(records[0].tabular_data, tabular_data);
  assert.equal(Object.hasOwn(records[0].tabular_data, 'returned_rows'), false);
});
