import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compile } from "../src/index.js";
import { createRuntime } from "../src/runtime.js";

async function runKiki(source, { inputs = [] } = {}) {
  const body = compile(source);
  let inputIdx = 0;
  const kiki = createRuntime({
    async askUser() {
      return inputs[inputIdx++];
    },
  });
  const alerts = [];
  const alert = (...a) => alerts.push(a.map(String).join(""));
  const fn = new Function(
    "kiki",
    "alert",
    `"use strict"; return (async () => {\n${body}\nif (kiki.methods.main) await kiki.methods.main();\n})();`
  );
  await fn(kiki, alert);
  return { variables: kiki.variables, alerts };
}

describe("runtime execution", () => {
  it("sums 1..10", async () => {
    const { alerts, variables } = await runKiki(`
on main
  set n to 10
  set sum to 0
  for every i from 1 to n
    increase sum by i
  alert sum
`);
    assert.equal(variables.sum, 55);
    assert.deepEqual(alerts, ["55"]);
  });

  it("factorial 5", async () => {
    const { alerts } = await runKiki(`
on main
  set n to 5
  set result to 1
  for every i from 1 to n
    set result to result times i
  alert result
`);
    assert.deepEqual(alerts, ["120"]);
  });

  it("greets with ask for", async () => {
    const { alerts } = await runKiki(
      `
on main
  ask for name
  alert "Hello " name
`,
      { inputs: ["Bouba"] }
    );
    assert.deepEqual(alerts, ["Hello Bouba"]);
  });

  it("filters with at least", async () => {
    const { variables } = await runKiki(`
on main
  set people to empty
  set a age to 20
  set b age to 10
  add a to people
  add b to people
  filter people as adults with age at least 18
`);
    assert.equal(variables.adults.length, 1);
    assert.equal(variables.adults[0].age, 20);
  });
});
