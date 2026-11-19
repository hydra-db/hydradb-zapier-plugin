'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const query = require('../searches/query');
const ingest = require('../creates/ingest');
const { beforeRequest } = require('../authentication');
const fixture = require('./unified-response.json');

async function run(operation, inputData = {}, payload = fixture, fail = false) {
  const requests = [];
  const bundle = { authData: { apiKey: 'offline', database: 'db', collection: 'col' }, inputData: { query: 'q', kind: 'memory', maxResults: 0, text: 'note', ...inputData } };
  const z = { request: async request => {
    requests.push(beforeRequest(request, {}, bundle));
    if (fail) throw new Error('rejected');
    return { data: structuredClone(payload) };
  } };
  try { return { result: await operation.operation.perform(z, bundle), requests }; }
  catch (error) { error.requests = requests; throw error; }
}

test('search reads unified shape without changing its array-of-records contract', async () => {
  const { result, requests } = await run(query);
  const row = result[0];
  assert.equal(row.id, 'c1');
  assert.equal(row.text, fixture.data.chunks[0].content);
  assert.equal(row.context_id, 'ctx1');
  assert.equal(row.score, 0);
  assert.equal(row.title, '');
  for (const key of ['enrichment', 'received_at', 'temporal', 'chunk_metadata']) assert.deepEqual(row[key], fixture.data.chunks[0][key]);
  for (const key of ['graph', 'forceful_relations', 'llm_prompt', 'tabular_data']) assert.deepEqual(row[key], fixture.data[key]);
  assert.equal(requests[0].body.type, 'memory');
  assert.equal(requests[0].body.max_results, 0);
  assert.deepEqual(requests[0].headers, { Authorization: 'Bearer offline', 'API-Version': '2' });
  assert.deepEqual((await run(query, {}, { data: { ...fixture.data, chunks: [] } })).result, []);
});

test('additive whole-context action retains chunkless roots and explicit unified selection', async () => {
  const action = require('../creates/recall-context');
  const payload = { ...fixture, data: { ...fixture.data, chunks: [] } };
  const { result, requests } = await run(action, { layout: 'unified' }, payload);
  assert.deepEqual(result, payload);
  assert.equal(Object.hasOwn(requests[0].body, 'type'), false);
  assert.equal(Object.hasOwn(requests[0].body, 'kind'), false);
  assert.equal(Object.hasOwn(require('../index').creates, action.key), true);
});

test('unified ingest uses canonical JSON; split multipart and split recall remain unchanged', async () => {
  const context = [{ conversation: [{ role: 'assistant', content: 'hello' }], context_id: 'ctx', enrich: false, upsert: false, attributes: { n: 0 }, custom_attributes: { ok: false }, acl: [] }];
  const { requests } = await run(ingest, { layout: 'unified', context: JSON.stringify(context) });
  assert.deepEqual(requests[0].body, { database: 'db', collection: 'col', context });
  assert.equal(requests[0].headers['content-type'], 'application/json');
  const split = await run(ingest);
  assert.match(split.requests[0].headers['content-type'], /^multipart\/form-data; boundary=/);
  assert.match(split.requests[0].body, /name="type"\r\n\r\nknowledge/);
  assert.doesNotMatch(split.requests[0].body, /name="context"/);
  const old = await run(query, {}, { data: { chunks: [{ chunk_uuid: 'old', chunk_content: '{"content":{"text":"split prose"}}', relevancy_score: 0, source_title: 'old title' }] } });
  assert.deepEqual(old.result, [{ id: 'old', text: 'split prose', score: 0, title: 'old title' }]);
});

test('strict context rejects legacy/unknown fields without requests and never retries writes', async () => {
  for (const context of ['[]', '[{"text":"x","context_category":"note"}]', '[{"text":"x","additional_metadata":{}}]', '[{"conversation":[{"role":"tool","content":"x"}]}]']) {
    await assert.rejects(run(ingest, { layout: 'unified', context }), e => e.requests.length === 0);
  }
  await assert.rejects(run(ingest, { layout: 'auto' }), e => e.requests.length === 0);
  await assert.rejects(run(ingest, { layout: 'unified' }, {}, true), e => e.requests.length === 1);
  await assert.rejects(run(ingest, {}, {}, true), e => e.requests.length === 1);
  await assert.rejects(run(ingest, { context: '[{"text":"x"}]' }), e => e.requests.length === 0);
  await assert.rejects(run(ingest, { text: '' }), e => e.requests.length === 0);
});

test('registered app passes the installed Zapier host schema', () => {
  const { validateApp } = require('zapier-platform-core/src/tools/schema');
  assert.deepEqual(validateApp(require('../index')), []);
});

test('the real Zapier request pipeline serializes JSON and middleware headers against a local mock', async () => {
  const http = require('node:http');
  const core = require('zapier-platform-core');
  const app = require('../index');
  const seen = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    seen.push({ method: req.method, path: req.url, headers: req.headers, body: Buffer.concat(chunks).toString() });
    res.writeHead(202, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: { success_count: 1, failed_count: 0 } }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const context = [{ text: 'literal', enrich: false, attributes: { count: 0 } }];
    const bundle = { authData: { apiKey: 'offline', database: 'db', collection: 'col', baseUrl: `http://127.0.0.1:${server.address().port}` }, inputData: { layout: 'unified', context: JSON.stringify(context) } };
    const result = await core.createAppTester(app)(app.creates.ingest.operation.perform, bundle);
    assert.equal(result.success, true);
    assert.equal(seen.length, 1);
    assert.equal(seen[0].path, '/context/ingest');
    assert.equal(seen[0].method, 'POST');
    assert.equal(seen[0].headers.authorization, 'Bearer offline');
    assert.equal(seen[0].headers['api-version'], '2');
    assert.match(seen[0].headers['content-type'], /^application\/json/);
    assert.deepEqual(JSON.parse(seen[0].body), { database: 'db', collection: 'col', context });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
