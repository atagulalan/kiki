import { MULTI_WORD, SINGLE } from "./keywords.js";

const IGNORED = /[,.:;()\[\]{}]/;

/**
 * @typedef {{ type: 'word'|'string'|'number'|'keyword', value: string|number, raw?: string }} Token
 * @typedef {{ indent: number, tokens: Token[], line: number, raw: string }} SourceLine
 */

/**
 * @param {string} source
 * @returns {SourceLine[]}
 */
export function tokenize(source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  /** @type {SourceLine[]} */
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (/^\s*$/.test(raw) || /^\s*#/.test(raw)) continue;

    let indent = 0;
    let pos = 0;
    while (pos < raw.length) {
      if (raw[pos] === " ") {
        indent++;
        pos++;
      } else if (raw[pos] === "\t") {
        indent += 2;
        pos++;
      } else break;
    }

    const level = Math.floor(indent / 2);
    const tokens = tokenizeLine(raw.slice(pos), i + 1);
    if (tokens.length === 0) continue;
    result.push({ indent: level, tokens, line: i + 1, raw });
  }

  return result;
}

/**
 * @param {string} text
 * @param {number} lineNo
 * @returns {Token[]}
 */
function tokenizeLine(text, lineNo) {
  /** @type {Token[]} */
  const tokens = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (/\s/.test(ch) || IGNORED.test(ch)) {
      i++;
      continue;
    }

    if (ch === '"') {
      let j = i + 1;
      let value = "";
      while (j < text.length && text[j] !== '"') {
        if (text[j] === "\\" && j + 1 < text.length) {
          value += text[j + 1];
          j += 2;
        } else {
          value += text[j++];
        }
      }
      if (j >= text.length) throw new Error(`Unclosed string on line ${lineNo}`);
      tokens.push({ type: "string", value, raw: text.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < text.length && /[0-9.]/.test(text[j])) j++;
      tokens.push({ type: "number", value: Number(text.slice(i, j)) });
      i = j;
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      const rest = text.slice(i).toLowerCase();
      let matched = null;
      for (const mw of MULTI_WORD) {
        if (rest.startsWith(mw)) {
          const after = rest[mw.length];
          if (after === undefined || /[\s,.:;()\[\]{}]/.test(after) || after === "") {
            matched = mw;
            break;
          }
        }
      }
      if (matched) {
        tokens.push({ type: "keyword", value: matched });
        i += matched.length;
        continue;
      }

      let j = i;
      while (j < text.length && /[A-Za-z0-9_]/.test(text[j])) j++;
      const word = text.slice(i, j);
      const lower = word.toLowerCase();
      if (SINGLE.has(lower)) {
        tokens.push({ type: "keyword", value: lower });
      } else {
        tokens.push({ type: "word", value: word });
      }
      i = j;
      continue;
    }

    // Unknown symbol — ignore per language rules
    i++;
  }

  return tokens;
}
