import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compile } from "../src/index.js";

function assertCompiles(src, patterns = []) {
  const js = compile(src);
  for (const p of patterns) assert.match(js, p);
  return js;
}

describe("README feature matrix", () => {
  it("math words", () => {
    assertCompiles(
      `on m\n  set x to a plus b\n  set y to n times n\n  set z to a divided by b\n  set r to a modulo 2`,
      [/\+/, /\*/, /\//, /%/]
    );
  });

  it("for every from to", () => {
    assertCompiles(
      `on m\n  for every i from 1 to n\n    increase sum by i`,
      [/for \(let i = 1; i <= .*n; i\+\+\)/]
    );
  });

  it("repeat n times", () => {
    assertCompiles(
      `on m\n  repeat 5 times\n    increase score`,
      [/for \(let _i/]
    );
  });

  it("ask for user prompt", () => {
    assertCompiles(
      `on m\n  ask for name\n  alert name`,
      [/askUser/, /const name =/]
    );
  });

  it("filter with comparison", () => {
    assertCompiles(
      `on m\n  filter people as adults with age at least 18`,
      [/item\.age >= 18/]
    );
  });

  it("otherwise and comparisons", () => {
    assertCompiles(
      `on m\n  if score is at least 10\n    alert "pass"\n  otherwise\n    alert "fail"`,
      [/score >= 10/, /else/]
    );
  });

  it("keep asking for until", () => {
    assertCompiles(
      `on m\n  keep asking for number until number is 0\n    increase sum by number`,
      [/askUser/, /while\s*\(!\(/]
    );
  });

  it("title case of", () => {
    assertCompiles(
      `on m\n  set out to title case of sentence`,
      [/toUpperCase/, /split/]
    );
  });

  it("char class checks", () => {
    assertCompiles(
      `on m\n  if ch is uppercase\n    alert "U"\n  if ch is a letter\n    alert "L"`,
      [/toUpperCase/, /\[A-Za-z\]/]
    );
  });
});
