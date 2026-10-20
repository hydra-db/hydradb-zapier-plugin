'use strict';

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
  const item = {
    id: `zapier-${Date.now()}`,
    title: bundle.inputData.title || 'note',
    content: { text: bundle.inputData.text },
    infer: true,
  };
  const { boundary, body } = encodeMultipart({
    tenant_id: bundle.authData.database,
    sub_tenant_id: bundle.authData.collection || '',
    kind: 'knowledge',
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
      { key: 'text', label: 'Text', type: 'text', required: true },
      { key: 'title', label: 'Title', type: 'string', required: false },
    ],
    perform,
    sample: { success: true, data: { success: true } },
  },
};
