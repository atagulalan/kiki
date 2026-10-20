import { parse } from "./parse.js";
import { generate } from "./generate.js";

/**
 * Compile Kiki source to a JavaScript body (statements only).
 * @param {string} source
 * @returns {string}
 */
export function compile(source) {
  const ast = parse(source);
  return generate(ast);
}

/**
 * Wrap compiled body in a runnable ESM module string.
 * @param {string} body
 * @param {{ runtimeSpecifier?: string }} [opts]
 * @returns {string}
 */
export function wrapProgram(body, opts = {}) {
  const runtimeSpecifier = opts.runtimeSpecifier ?? "kiki/runtime";
  return `import { createRuntime } from ${JSON.stringify(runtimeSpecifier)};

const kiki = createRuntime();
const alert = globalThis.alert ?? console.log;

${body}

export { kiki };
export default kiki;
`;
}

export { parse } from "./parse.js";
export { generate } from "./generate.js";
export { tokenize } from "./tokenize.js";
