/**
 * @param {import('./ast.js').Program} ast
 * @returns {string}
 */
export function generate(ast) {
  const locals = new Set();
  const lines = [];
  for (const node of ast.body) {
    lines.push(...genStmt(node, locals, 0));
  }
  return lines.join("\n");
}

function genBlock(nodes, locals, indent) {
  const lines = [];
  const scope = locals;
  for (const node of nodes) {
    lines.push(...genStmt(node, scope, indent));
  }
  return lines;
}

function genStmt(node, locals, indent) {
  const pad = "  ".repeat(indent);
  switch (node.type) {
    case "On": {
      const params = node.params.join(", ");
      const bodyLocals = new Set([...locals, ...node.params]);
      const body = genBlock(node.body, bodyLocals, indent + 1);
      return [
        `${pad}kiki.methods.${node.name} = async (${params}) => {`,
        ...body,
        `${pad}};`,
      ];
    }
    case "Invoke": {
      const args = node.args.map((a) => genExpr(a, locals)).join(", ");
      return [`${pad}await kiki.methods.${node.name}(${args});`];
    }
    case "Set": {
      const target = genAssignTarget(node.path, locals);
      const value = genExpr(node.value, locals);
      return ensurePathAssign(pad, node.path, locals, `${target} = ${value};`);
    }
    case "Get": {
      const src = genExpr(node.source, locals);
      for (const f of node.fields) locals.add(f);
      if (node.fields.length === 1) {
        return [`${pad}const ${node.fields[0]} = ${src}.${node.fields[0]};`];
      }
      return [
        `${pad}const { ${node.fields.join(", ")} } = ${src};`,
      ];
    }
    case "If": {
      const cond = genCondition(node.condition, locals);
      const lines = [`${pad}if (${cond}) {`];
      lines.push(...genConsequent(node.consequent, locals, indent + 1));
      lines.push(`${pad}}`);
      if (node.alternate) {
        lines[lines.length - 1] = `${pad}} else {`;
        lines.push(...genConsequent(node.alternate, locals, indent + 1));
        lines.push(`${pad}}`);
      }
      return lines;
    }
    case "While": {
      const cond = genCondition(node.condition, locals);
      return [
        `${pad}while (${cond}) {`,
        ...genBlock(node.body, locals, indent + 1),
        `${pad}}`,
      ];
    }
    case "ForEvery": {
      const col = genExpr(node.collection, locals);
      const bodyLocals = new Set(locals);
      bodyLocals.add(node.item);
      return [
        `${pad}for (const ${node.item} of ${col}) {`,
        ...genBlock(node.body, bodyLocals, indent + 1),
        `${pad}}`,
      ];
    }
    case "ForRange": {
      const from = genExpr(node.from, locals);
      const to = genExpr(node.to, locals);
      const bodyLocals = new Set(locals);
      bodyLocals.add(node.item);
      return [
        `${pad}for (let ${node.item} = ${from}; ${node.item} <= ${to}; ${node.item}++) {`,
        ...genBlock(node.body, bodyLocals, indent + 1),
        `${pad}}`,
      ];
    }
    case "Repeat": {
      const count = genExpr(node.count, locals);
      const i = `_i${indent}`;
      return [
        `${pad}for (let ${i} = 0; ${i} < ${count}; ${i}++) {`,
        ...genBlock(node.body, locals, indent + 1),
        `${pad}}`,
      ];
    }
    case "Interval": {
      return [
        `${pad}setInterval(async () => {`,
        ...genBlock(node.body, locals, indent + 1),
        `${pad}}, ${node.seconds} * 1000);`,
      ];
    }
    case "Increase":
    case "Decrease": {
      const target = genAssignTarget(node.path, locals);
      const amount = genExpr(node.amount, locals);
      const op = node.type === "Increase" ? "+=" : "-=";
      return ensurePathAssign(pad, node.path, locals, `${target} ${op} ${amount};`);
    }
    case "Find": {
      locals.add(node.item);
      const col = genExpr(node.collection, locals);
      const checks = node.clauses.map((c) => genWithCheck(node.item, c, locals)).join(" && ");
      return [
        `${pad}const ${node.item} = ${col}.find((${node.item}) => ${checks});`,
        `${pad}kiki.variables.${node.item} = ${node.item};`,
      ];
    }
    case "Filter": {
      locals.add(node.alias);
      const col = genExpr(node.collection, locals);
      const checks = node.clauses.map((c) => genWithCheck("item", c, locals)).join(" && ");
      return [
        `${pad}const ${node.alias} = ${col}.filter((item) => ${checks});`,
        `${pad}kiki.variables.${node.alias} = ${node.alias};`,
      ];
    }
    case "Ask": {
      locals.add(node.name);
      const url = genExpr(node.url, locals);
      const params =
        node.params.length === 0
          ? ""
          : `, { ${node.params.map((p) => `${p.key}: ${genExpr(p.value, locals)}`).join(", ")} }`;
      return [`${pad}const ${node.name} = await kiki.ask(${url}${params});`];
    }
    case "AskUser": {
      locals.add(node.name);
      return [
        `${pad}const ${node.name} = await kiki.askUser(${genExpr(node.prompt, locals)});`,
        `${pad}kiki.variables.${node.name} = ${node.name};`,
      ];
    }
    case "KeepAsking": {
      // ask; while not until-cond: body; ask again
      locals.add(node.name);
      const cond = genCondition(node.condition, locals);
      const bodyLocals = new Set(locals);
      const lines = [
        `${pad}let ${node.name} = await kiki.askUser(${genExpr(node.prompt, locals)});`,
        `${pad}kiki.variables.${node.name} = ${node.name};`,
        `${pad}while (!(${cond})) {`,
        ...genBlock(node.body || [], bodyLocals, indent + 1),
        `${pad}  ${node.name} = await kiki.askUser(${genExpr(node.prompt, locals)});`,
        `${pad}  kiki.variables.${node.name} = ${node.name};`,
        `${pad}}`,
      ];
      return lines;
    }
    case "Send": {
      const data = genExpr(node.data, locals);
      const url = genExpr(node.url, locals);
      return [`${pad}await kiki.send(${url}, ${data});`];
    }
    case "Wait":
      return [`${pad}await kiki.wait(${node.seconds} * 1000);`];
    case "Create": {
      const opts = [];
      if (node.label) opts.push(`labeled: ${genExpr(node.label, locals)}`);
      if (node.saying) opts.push(`saying: ${genExpr(node.saying, locals)}`);
      locals.add(node.kind);
      return [
        `${pad}const ${node.kind} = kiki.create(${JSON.stringify(node.kind)}, { ${opts.join(", ")} });`,
        `${pad}kiki.variables.${node.kind} = ${node.kind};`,
      ];
    }
    case "WhenClicked": {
      const target = genExpr(node.target, locals);
      return [
        `${pad}${target}.addEventListener("click", async () => {`,
        ...genBlock(node.body, locals, indent + 1),
        `${pad}});`,
      ];
    }
    case "Show":
      return [`${pad}kiki.show(${genExpr(node.target, locals)});`];
    case "Hide":
      return [`${pad}kiki.hide(${genExpr(node.target, locals)});`];
    case "SetText":
      return [
        `${pad}kiki.setText(${genExpr(node.target, locals)}, ${genExpr(node.value, locals)});`,
      ];
    case "Add": {
      const col = genAssignTarget(node.collection, locals);
      const item = genExpr(node.item, locals);
      return [
        `${pad}if (!Array.isArray(${col})) ${col} = [];`,
        `${pad}${col}.push(typeof ${item} === "object" && ${item} !== null ? { ...${item} } : ${item});`,
      ];
    }
    case "Remove": {
      const col = genAssignTarget(node.collection, locals);
      const item = genExpr(node.item, locals);
      return [
        `${pad}${col} = ${genExpr(node.collection, locals)}.filter((item) => item !== ${item});`,
      ];
    }
    case "Sort": {
      const col = genExpr(node.collection, locals);
      const cmp = node.descending
        ? `(a, b) => (a.${node.field} < b.${node.field} ? 1 : -1)`
        : `(a, b) => (a.${node.field} > b.${node.field} ? 1 : -1)`;
      return [`${pad}${col}.sort(${cmp});`];
    }
    case "Reverse": {
      const target = genAssignTarget(node.target, locals);
      const src = genExpr(node.target, locals);
      return [
        `${pad}${target} = Array.isArray(${src}) ? ${src}.slice().reverse() : ${src}.split("").reverse().join("");`,
      ];
    }
    case "Append": {
      const target = genAssignTarget(node.target, locals);
      return [
        `${pad}${target} = ${genExpr(node.target, locals)} + ${genExpr(node.value, locals)};`,
      ];
    }
    case "Join": {
      const parts = node.parts.map((p) => genExpr(p, locals)).join(", ");
      return [
        `${pad}[${parts}].join(${genExpr(node.separator, locals)});`,
      ];
    }
    case "Stop":
    case "Return":
      if (node.type === "Return" && node.value) {
        return [`${pad}return ${genExpr(node.value, locals)};`];
      }
      return [`${pad}return;`];
    case "Alert": {
      if (node.parts.length === 1) {
        return [`${pad}alert(${genExpr(node.parts[0], locals)});`];
      }
      const inner = node.parts
        .map((p) => {
          if (p.type === "Literal") return escapeTemplate(String(p.value));
          return `\${${genExpr(p, locals)}}`;
        })
        .join("");
      return [`${pad}alert(\`${inner}\`);`];
    }
    case "Block":
      return genBlock(node.body, locals, indent);
    default:
      throw new Error(`Unknown node type: ${node.type}`);
  }
}

function genConsequent(node, locals, indent) {
  if (node.type === "Block") return genBlock(node.body, locals, indent);
  return genStmt(node, locals, indent);
}

function genCondition(node, locals) {
  switch (node.type) {
    case "Not":
      return `!(${genCondition(node.value, locals)})`;
    case "BinaryLogic":
      return node.parts.map((p) => `(${genCondition(p, locals)})`).join(` ${node.op} `);
    case "DefinedCheck": {
      const left = genExpr(node.path, locals);
      return node.missing ? `${left} === undefined` : `${left} !== undefined`;
    }
    case "CharClass": {
      const left = genExpr(node.path, locals);
      if (node.kind === "is a letter") {
        return `/^[A-Za-z]$/.test(${left})`;
      }
      if (node.kind === "is uppercase") {
        return `/^[A-Za-z]$/.test(${left}) && ${left} === ${left}.toUpperCase()`;
      }
      return `/^[A-Za-z]$/.test(${left}) && ${left} === ${left}.toLowerCase()`;
    }
    case "Compare": {
      const left = genExpr(node.left, locals);
      return `${left} ${node.op} ${genExpr(node.right, locals)}`;
    }
    case "EmptyCheck": {
      const p = genExpr(node.path, locals);
      return node.negated
        ? `(${p}?.length ?? 0) !== 0`
        : `(${p}?.length ?? 0) === 0`;
    }
    case "Contains": {
      const left = genExpr(node.left, locals);
      const right = genExpr(node.right, locals);
      return `(typeof ${left} === "string" ? ${left}.includes(${right}) : ${left}.includes(${right}))`;
    }
    case "Truthy":
      return `!!(${genExpr(node.path, locals)})`;
    default:
      throw new Error(`Unknown condition ${node.type}`);
  }
}

function genExpr(node, locals) {
  if (!node) return "undefined";
  switch (node.type) {
    case "Literal":
      if (node.value === undefined) return "undefined";
      if (Array.isArray(node.value) && node.value.length === 0) return "[]";
      return JSON.stringify(node.value);
    case "Path":
      return genPathRead(node.parts, locals);
    case "JoinExpr": {
      const sep = genExpr(node.separator, locals);
      if (node.list) {
        return `${genExpr(node.list, locals)}.join(${sep})`;
      }
      if (node.fields && node.source) {
        const src = genExpr(node.source, locals);
        const parts = node.fields.map((f) => `${src}.${f}`).join(", ");
        return `[${parts}].join(${sep})`;
      }
      const parts = node.parts.map((p) => genExpr(p, locals)).join(", ");
      return `[${parts}].join(${sep})`;
    }
    case "OfExpr": {
      const inner =
        node.path?.type && node.path.type !== "Path"
          ? genExpr(node.path, locals)
          : genExpr(node.path, locals);
      if (node.kind === "count of" || node.kind === "length of") return `${inner}.length`;
      if (node.kind === "first of") return `${inner}[0]`;
      if (node.kind === "last of") return `${inner}[${inner}.length - 1]`;
      if (node.kind === "text of") return `String(${inner})`;
      if (node.kind === "number of") return `Number(${inner})`;
      if (node.kind === "floor of") return `Math.floor(${inner})`;
      if (node.kind === "uppercase of") return `String(${inner}).toUpperCase()`;
      if (node.kind === "lowercase of") return `String(${inner}).toLowerCase()`;
      if (node.kind === "title case of") {
        return `String(${inner}).split(/\\s+/).map((w) => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : "").join(" ")`;
      }
      throw new Error(`Unknown OfExpr ${node.kind}`);
    }
    case "CharAt":
    case "ItemAt": {
      const src = genExpr(node.source, locals);
      const idx = genExpr(node.index, locals);
      return `${src}[${idx}]`;
    }
    case "BinaryExpr": {
      const left = genExpr(node.left, locals);
      const right = genExpr(node.right, locals);
      const op =
        node.op === "plus"
          ? "+"
          : node.op === "minus"
            ? "-"
            : node.op === "times"
              ? "*"
              : node.op === "divided by"
                ? "/"
                : "%";
      return `(${left} ${op} ${right})`;
    }
    default:
      throw new Error(`Unknown expr ${node.type}`);
  }
}

function genWithCheck(item, clause, locals) {
  const left = `${item}.${clause.field}`;
  const right = genExpr(clause.value, locals);
  const op = clause.op || "===";
  if (op === "includes") return `${left}.includes(${right})`;
  return `${left} ${op} ${right}`;
}

function genPathRead(parts, locals) {
  const root = parts[0];
  if (locals.has(root)) {
    return parts.length === 1 ? root : [root, ...parts.slice(1)].join(".");
  }
  return ["kiki.variables", ...parts].join(".");
}

function genAssignTarget(path, locals) {
  return genPathRead(path.parts, locals);
}

/** Ensure parent objects exist for nested assigns like friend.name */
function ensurePathAssign(pad, path, locals, assignLine) {
  const lines = [];
  const parts = path.parts;
  if (!locals.has(parts[0]) && parts.length > 1) {
    let acc = "kiki.variables";
    for (let i = 0; i < parts.length - 1; i++) {
      acc += `.${parts[i]}`;
      lines.push(`${pad}if (${acc} === undefined) ${acc} = {};`);
    }
  }
  lines.push(`${pad}${assignLine}`);
  return lines;
}

function escapeTemplate(s) {
  return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}
