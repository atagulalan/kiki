import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { compile, parse } from "../src/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("compile hello", () => {
  it("parses and emits async methods", () => {
    const src = readFileSync(join(root, "examples/hello.kiki"), "utf8");
    const js = compile(src);
    assert.match(js, /kiki\.methods\.hello = async \(thing\)/);
    assert.match(js, /thing === undefined/);
    assert.match(js, /await kiki\.methods\.hello\("Bouba"\)/);
    assert.match(js, /alert\(`Hello \$\{thing\}!`\)/);
  });
});

describe("compile countdown", () => {
  it("emits while and await wait", () => {
    const src = readFileSync(join(root, "examples/countdown.kiki"), "utf8");
    const js = compile(src);
    assert.match(js, /while \(kiki\.variables\.countdown !== 0\)/);
    assert.match(js, /await kiki\.wait\(1 \* 1000\)/);
    assert.match(js, /kiki\.variables\.countdown -= 1/);
  });
});

describe("find and filter", () => {
  it("compiles find one and filter as", () => {
    const src = `
on search
  find one person in people with name "Arda" and age 12
  filter people as filtered with name "Arda" and age 12
  set match to person
  set matches to filtered
`;
    const js = compile(src);
    assert.match(js, /\.find\(\(person\) =>/);
    assert.match(js, /\.filter\(\(item\) =>/);
    assert.match(js, /person\.name === "Arda"/);
  });
});

describe("get", () => {
  it("destructures fields", () => {
    const js = compile(`
on greet
  get name and shape of friend
  alert name
`);
    assert.match(js, /const \{ name, shape \} = kiki\.variables\.friend/);
  });
});

describe("punctuation ignored", () => {
  it("parses commas as ignorable", () => {
    const ast = parse(`
on check
  if score is 0, set score to 1
`);
    assert.equal(ast.body[0].type, "On");
  });
});
