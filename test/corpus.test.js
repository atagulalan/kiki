import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "../src/index.js";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../examples/corpus");

describe("EXAMPLES corpus", () => {
  const files = readdirSync(dir).filter((f) => f.endsWith(".kiki"));
  it("has 100 programs", () => {
    assert.equal(files.length, 100);
  });
  for (const f of files) {
    it(`compiles ${f}`, () => {
      const js = compile(readFileSync(join(dir, f), "utf8"));
      assert.ok(js.includes("kiki.methods"));
    });
  }
});
