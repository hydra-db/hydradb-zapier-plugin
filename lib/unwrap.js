'use strict';

/**
 * Extract the prose from a HydraDB content envelope.
 * @param obj - A parsed envelope object.
 * @returns The text/markdown prose, or null if none is present.
 */
function proseFromEnvelope(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const content = obj.content;
  if (content && typeof content === 'object') {
    for (const key of ['text', 'markdown']) {
      if (typeof content[key] === 'string' && content[key].trim()) return content[key];
    }
  }
  if (typeof content === 'string' && content.trim()) return content;
  if (typeof obj.text === 'string' && obj.text.trim()) return obj.text;
  return null;
}

/**
 * Unwrap a recall chunk to its prose, keeping any trailing graph enrichment.
 * @param value - The raw chunk content, possibly an envelope JSON with trailing text.
 * @returns The prose, or the input unchanged when it is not an envelope.
 */
function extractText(value) {
  if (value && typeof value === 'object') return proseFromEnvelope(value) || JSON.stringify(value);
  if (typeof value !== 'string') return String(value == null ? '' : value);
  const stripped = value.trim();
  if (stripped.startsWith('{')) {
    try {
      let depth = 0;
      let inStr = false;
      let escaped = false;
      let end = -1;
      for (let i = 0; i < stripped.length; i++) {
        const ch = stripped[i];
        if (inStr) {
          if (escaped) escaped = false;
          else if (ch === '\\') escaped = true;
          else if (ch === '"') inStr = false;
          continue;
        }
        if (ch === '"') inStr = true;
        else if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) {
            end = i + 1;
            break;
          }
        }
      }
      if (end === -1) return value;
      const obj = JSON.parse(stripped.slice(0, end));
      const prose = proseFromEnvelope(obj);
      if (prose !== null) {
        const trailing = stripped.slice(end).trim();
        return trailing ? `${prose}\n\n${trailing}` : prose;
      }
    } catch (e) {
      return value;
    }
  }
  return value;
}

module.exports = { extractText };
