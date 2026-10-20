'use strict';

const { version } = require('./package.json');
const { version: platformVersion } = require('zapier-platform-core');

const { authentication, beforeRequest } = require('./authentication');
const ingest = require('./creates/ingest');
const query = require('./searches/query');

/** The HydraDB Zapier app: API-key auth, one create (Ingest) and one search (Query). */
const App = {
  version,
  platformVersion,
  authentication,
  beforeRequest: [beforeRequest],
  creates: { [ingest.key]: ingest },
  searches: { [query.key]: query },
};

module.exports = App;
