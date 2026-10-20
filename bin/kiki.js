#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { compile, wrapProgram } from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const runtimePath = resolve(__dirname, "../src/runtime.js");

function usage() {
  console.error(`Usage:
  kiki compile <file.kiki> [-o out.js]
  kiki run <file.kiki>`);
  process.exit(1);
}

const [cmd, input, ...rest] = process.argv.slice(2);
if (!cmd || !input) usage();

const sourcePath = resolve(input);
const source = readFileSync(sourcePath, "utf8");
const body = compile(source);

if (cmd === "compile") {
  let out = null;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "-o" && rest[i + 1]) out = rest[++i];
  }
  if (!out) {
    out = sourcePath.replace(/\.kiki$/i, "") + ".js";
  }
  out = resolve(out);
  const program = wrapProgram(body, {
    runtimeSpecifier: pathToFileURL(runtimePath).href,
  });
  writeFileSync(out, program);
  console.log(`Wrote ${out}`);
} else if (cmd === "run") {
  const program = wrapProgram(body, {
    runtimeSpecifier: pathToFileURL(runtimePath).href,
  });
  const mod = `data:text/javascript,${encodeURIComponent(
    program + "\nif (kiki.methods.main) await kiki.methods.main();\nelse {\n  const first = Object.values(kiki.methods)[0];\n  if (first) await first();\n}\n"
  )}`;
  await import(mod);
} else {
  usage();
}
