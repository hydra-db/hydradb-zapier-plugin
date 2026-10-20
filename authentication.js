'use strict';

const authentication = {
  type: 'custom',
  fields: [
    { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    {
      key: 'database',
      label: 'Database',
      type: 'string',
      required: true,
      helpText: 'HydraDB database (tenant) to read and write.',
    },
    {
      key: 'collection',
      label: 'Collection',
      type: 'string',
      required: false,
      helpText: 'Optional collection (sub-tenant) scope.',
    },
    {
      key: 'baseUrl',
      label: 'Base URL',
      type: 'string',
      required: false,
      default: 'https://api.hydradb.com',
    },
  ],
  test: {
    url: '{{bundle.authData.baseUrl}}/databases',
    method: 'GET',
  },
  connectionLabel: '{{bundle.authData.database}}',
};

/**
 * Attach the Bearer authorization header to every request.
 * @param request - The outgoing request.
 * @param z - The Zapier request client.
 * @param bundle - The Zap bundle with authData.
 * @returns The request with the Authorization header set.
 */
const beforeRequest = (request, z, bundle) => {
  if (bundle.authData.apiKey) {
    request.headers = request.headers || {};
    request.headers.Authorization = `Bearer ${bundle.authData.apiKey}`;
  }
  return request;
};

module.exports = { authentication, beforeRequest };
