import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "../src/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("integration fixture", () => {
  it("compiles the full keyword tour", () => {
    const src = readFileSync(join(root, "test/integration.kiki"), "utf8");
    const js = compile(src);
    assert.match(js, /kiki\.methods\.main/);
    assert.match(js, /for \(let i =/);
    assert.match(js, /askUser|kiki\.ask/);
    assert.match(js, /\.filter\(/);
    assert.match(js, /\.find\(/);
  });
});
