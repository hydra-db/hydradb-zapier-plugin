<p align="center"><img src="assets/icon.png" width="96" alt="HydraDB" /></p>

# hydradb-zapier

A [Zapier](https://zapier.com) integration for [HydraDB](https://hydradb.com):
save knowledge and recall context inside your Zaps.

## What it does

| Kind | Name | What it does |
|------|------|--------------|
| Create | Ingest Knowledge | Store a note (`text` + optional `title`). |
| Search | Recall Context | Recall matching records for a query; returns the text, score, title, and id. |

Recall returns clean prose ready to use in later Zap steps.

## Authentication

API-key auth. The connection stores:

- **API Key** (required) - sent as a Bearer token.
- **Database** (required) - the database (tenant) to read and write.
- **Collection** (optional) - a sub-tenant scope.
- **Base URL** (optional) - defaults to `https://api.hydradb.com`.

It is validated against `GET /databases`.

## Develop

```bash
npm install
node --test          # offline unit tests
```

With the Zapier CLI logged in:

```bash
zapier validate
zapier push          # upload this version
```

## Usage

Add **Ingest Knowledge** as an action to store data, or **Recall Context** as a
search step to pull relevant context into the rest of your Zap.

### Query tables and response metadata

The query action accepts optional `includeTableSql` and `tableLimit` (1–100);
omit the limit to use the API default. Table SQL can include query literals, so
only enable it when downstream workflow steps may receive that information.
Query records expose chunk `metadata` and `additional_metadata`. The response
`llm_prompt` and optional `tabular_data` are repeated on each chunk. If there
are no chunks but the table answer has status `ok`, a single record carries
the answer and prompt. A prompt or an unsuccessful/inapplicable table result
alone does not constitute a search match, so no records are returned.
