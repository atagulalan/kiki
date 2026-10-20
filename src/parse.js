import { tokenize } from "./tokenize.js";
import { STATEMENT_STARTERS } from "./keywords.js";

/**
 * @param {string} source
 * @returns {import('./ast.js').Program}
 */
export function parse(source) {
  const lines = tokenize(source);
  const { nodes } = parseBlock(lines, 0, 0);
  return { type: "Program", body: nodes };
}

/**
 * @param {import('./tokenize.js').SourceLine[]} lines
 * @param {number} start
 * @param {number} baseIndent
 */
function parseBlock(lines, start, baseIndent) {
  /** @type {any[]} */
  const nodes = [];
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
    if (line.indent < baseIndent) break;
    if (line.indent > baseIndent) {
      throw new Error(`Unexpected indent on line ${line.line}`);
    }

    const kw = line.tokens[0];
    if (
      kw?.type === "keyword" &&
      (kw.value === "otherwise" || kw.value === "else")
    ) {
      break;
    }

    const { node, next } = parseStatement(lines, i, baseIndent);
    nodes.push(node);
    i = next;
  }

  return { nodes, next: i };
}

/**
 * @param {import('./tokenize.js').SourceLine[]} lines
 * @param {number} index
 * @param {number} baseIndent
 */
function parseStatement(lines, index, baseIndent) {
  const line = lines[index];
  const t = line.tokens;
  const head = t[0];

  if (!head) throw new Error(`Empty statement on line ${line.line}`);

  if (head.type === "keyword") {
    switch (head.value) {
      case "on":
        return parseOn(lines, index, baseIndent);
      case "invoke":
        return finish(index, {
          type: "Invoke",
          name: expectWord(t, 1, line),
          args: parseValues(t.slice(2)),
          line: line.line,
        });
      case "set":
      case "reset":
        return parseSet(t, line, index, head.value === "reset");
      case "set text of":
        return parseSetText(t, line, index);
      case "get":
        return parseGet(t, line, index);
      case "if":
        return parseIf(lines, index, baseIndent);
      case "unless":
        return parseUnless(lines, index, baseIndent);
      case "while":
        return parseWhile(lines, index, baseIndent);
      case "increase":
      case "decrease":
        return parseIncDec(t, line, index, head.value);
      case "for every":
      case "every":
        return parseEvery(lines, index, baseIndent);
      case "repeat":
        return parseRepeat(lines, index, baseIndent);
      case "find":
        return parseFind(t, line, index);
      case "filter":
        return parseFilter(t, line, index);
      case "ask for":
        return parseAsk(t, line, index);
      case "keep asking for":
        return parseKeepAsking(lines, index, baseIndent);
      case "send":
        return parseSend(t, line, index);
      case "wait":
        return parseWait(t, line, index);
      case "create":
        return parseCreate(t, line, index);
      case "when":
        return parseWhen(lines, index, baseIndent);
      case "show":
      case "hide":
        return finish(index, {
          type: head.value === "show" ? "Show" : "Hide",
          target: parsePath(t.slice(1)),
          line: line.line,
        });
      case "add":
        return parseAddRemove(t, line, index, "Add");
      case "remove":
        return parseAddRemove(t, line, index, "Remove");
      case "sort":
        return parseSort(t, line, index);
      case "reverse":
        return finish(index, {
          type: "Reverse",
          target: parsePath(t.slice(1)),
          line: line.line,
        });
      case "append":
        return parseAppend(t, line, index);
      case "join":
        return parseJoin(t, line, index);
      case "stop":
        return finish(index, { type: "Stop", line: line.line });
      case "return":
        return finish(index, {
          type: "Return",
          value: t.length > 1 ? parseValueTokens(t.slice(1)) : null,
          line: line.line,
        });
      case "alert":
        return finish(index, {
          type: "Alert",
          parts: parseAlertParts(t.slice(1), line),
          line: line.line,
        });
      default:
        throw new Error(`Unknown keyword '${head.value}' on line ${line.line}`);
    }
  }

  throw new Error(`Expected statement on line ${line.line}, got '${head.value}'`);
}

function finish(index, node) {
  return { node, next: index + 1 };
}

function parseOn(lines, index, baseIndent) {
  const line = lines[index];
  const t = line.tokens;
  const name = expectWord(t, 1, line);
  const params = [];
  for (let i = 2; i < t.length; i++) {
    if (t[i].type !== "word") {
      throw new Error(`Invalid on parameter on line ${line.line}`);
    }
    params.push(t[i].value);
  }
  const { nodes, next } = parseBlock(lines, index + 1, baseIndent + 1);
  return {
    node: { type: "On", name, params, body: nodes, line: line.line },
    next,
  };
}

function parseSet(t, line, index, isReset) {
  const toIdx = findKeyword(t, "to");
  if (toIdx === -1) {
    // reset path  OR  set path value (to optional)
    if (t.length === 1) throw new Error(`set/reset needs a path on line ${line.line}`);
    if (isReset && t.length === 2 && t[1].type === "word") {
      return finish(index, {
        type: "Set",
        path: parsePath(t.slice(1)),
        value: { type: "Literal", value: undefined },
        line: line.line,
      });
    }
    // set thing "World"  /  set path value…
    // path = words until a string/number/join expression starts
    let pathEnd = 1;
    while (
      pathEnd < t.length &&
      t[pathEnd].type === "word" &&
      !(pathEnd + 1 < t.length && (t[pathEnd + 1].type === "string" || t[pathEnd + 1].type === "number"))
    ) {
      // include consecutive words as path; stop before value
      if (
        pathEnd > 1 &&
        (t[pathEnd].type === "string" || t[pathEnd].type === "number")
      )
        break;
      pathEnd++;
    }
    // Better split: last run of non-value words is path; rest is value
    // Find first string/number/keyword-expr as value start
    let valueStart = -1;
    for (let i = 1; i < t.length; i++) {
      if (
        t[i].type === "string" ||
        t[i].type === "number" ||
        (t[i].type === "keyword" &&
          ["join", "count of", "length of", "first of", "last of"].includes(t[i].value))
      ) {
        valueStart = i;
        break;
      }
    }
    if (valueStart === -1) {
      if (isReset) {
        return finish(index, {
          type: "Set",
          path: parsePath(t.slice(1)),
          value: { type: "Literal", value: undefined },
          line: line.line,
        });
      }
      throw new Error(`set needs a value on line ${line.line}`);
    }
    return finish(index, {
      type: "Set",
      path: parsePath(t.slice(1, valueStart)),
      value: parseRichValue(t.slice(valueStart), line),
      line: line.line,
    });
  }
  return finish(index, {
    type: "Set",
    path: parsePath(t.slice(1, toIdx)),
    value: parseRichValue(t.slice(toIdx + 1), line),
    line: line.line,
  });
}

function parseSetText(t, line, index) {
  const toIdx = findKeyword(t, "to");
  if (toIdx === -1) throw new Error(`set text of needs 'to' on line ${line.line}`);
  return finish(index, {
    type: "SetText",
    target: parsePath(t.slice(1, toIdx)),
    value: parseValueTokens(t.slice(toIdx + 1)),
    line: line.line,
  });
}

function parseGet(t, line, index) {
  const ofIdx = findKeyword(t, "of");
  if (ofIdx === -1) throw new Error(`get needs 'of' on line ${line.line}`);
  const fields = [];
  for (let i = 1; i < ofIdx; i++) {
    if (t[i].type === "keyword" && t[i].value === "and") continue;
    if (t[i].type !== "word") throw new Error(`Invalid get field on line ${line.line}`);
    fields.push(t[i].value);
  }
  return finish(index, {
    type: "Get",
    fields,
    source: parsePath(t.slice(ofIdx + 1)),
    line: line.line,
  });
}

function parseIf(lines, index, baseIndent) {
  const line = lines[index];
  const t = line.tokens;
  const stmtStart = findStatementStart(t, 1);
  let condition;
  let inline = null;
  let next;

  if (stmtStart !== -1) {
    condition = parseCondition(t.slice(1, stmtStart));
    const inlineTokens = t.slice(stmtStart);
    const fake = [{ indent: baseIndent, tokens: inlineTokens, line: line.line, raw: line.raw }];
    const parsed = parseStatement(fake, 0, baseIndent);
    inline = parsed.node;
    next = index + 1;
  } else {
    condition = parseCondition(t.slice(1));
    const block = parseBlock(lines, index + 1, baseIndent + 1);
    inline = { type: "Block", body: block.nodes };
    next = block.next;
  }

  let alternate = null;
  if (next < lines.length) {
    const peek = lines[next];
    if (
      peek.indent === baseIndent &&
      peek.tokens[0]?.type === "keyword" &&
      (peek.tokens[0].value === "otherwise" || peek.tokens[0].value === "else")
    ) {
      if (peek.tokens.length > 1) {
        const fake = [
          {
            indent: baseIndent,
            tokens: peek.tokens.slice(1),
            line: peek.line,
            raw: peek.raw,
          },
        ];
        alternate = parseStatement(fake, 0, baseIndent).node;
        next = next + 1;
      } else {
        const block = parseBlock(lines, next + 1, baseIndent + 1);
        alternate = { type: "Block", body: block.nodes };
        next = block.next;
      }
    }
  }

  return {
    node: {
      type: "If",
      condition,
      consequent: inline,
      alternate,
      line: line.line,
    },
    next,
  };
}

function parseUnless(lines, index, baseIndent) {
  const line = lines[index];
  const t = line.tokens;
  const stmtStart = findStatementStart(t, 1);
  let condition;
  let body;
  let next;

  if (stmtStart !== -1) {
    condition = parseCondition(t.slice(1, stmtStart));
    const fake = [
      {
        indent: baseIndent,
        tokens: t.slice(stmtStart),
        line: line.line,
        raw: line.raw,
      },
    ];
    body = parseStatement(fake, 0, baseIndent).node;
    next = index + 1;
  } else {
    condition = parseCondition(t.slice(1));
    const block = parseBlock(lines, index + 1, baseIndent + 1);
    body = { type: "Block", body: block.nodes };
    next = block.next;
  }

  return {
    node: {
      type: "If",
      condition: { type: "Not", value: condition },
      consequent: body,
      alternate: null,
      line: line.line,
    },
    next,
  };
}

function parseWhile(lines, index, baseIndent) {
  const line = lines[index];
  const condition = parseCondition(line.tokens.slice(1));
  const block = parseBlock(lines, index + 1, baseIndent + 1);
  return {
    node: {
      type: "While",
      condition,
      body: block.nodes,
      line: line.line,
    },
    next: block.next,
  };
}

function parseEvery(lines, index, baseIndent) {
  const line = lines[index];
  const t = line.tokens;
  // every N seconds
  if (
    t[0].value === "every" &&
    t[1]?.type === "number" &&
    (t[2]?.value === "seconds" || t[2]?.value === "second")
  ) {
    const block = parseBlock(lines, index + 1, baseIndent + 1);
    return {
      node: {
        type: "Interval",
        seconds: t[1].value,
        body: block.nodes,
        line: line.line,
      },
      next: block.next,
    };
  }

  // for every i from 1 to n
  const fromIdx = findKeyword(t, "from");
  const toIdx = findKeyword(t, "to");
  if (fromIdx !== -1 && toIdx !== -1 && toIdx > fromIdx) {
    const item = expectWord(t, 1, line);
    const block = parseBlock(lines, index + 1, baseIndent + 1);
    return {
      node: {
        type: "ForRange",
        item,
        from: parseValueTokens(t.slice(fromIdx + 1, toIdx)),
        to: parseValueTokens(t.slice(toIdx + 1)),
        body: block.nodes,
        line: line.line,
      },
      next: block.next,
    };
  }

  // for every x in y  OR  every x in y
  const inIdx = findKeyword(t, "in");
  if (inIdx === -1) throw new Error(`every needs 'in' or 'from … to' on line ${line.line}`);
  const item = expectWord(t, 1, line);
  const collection = parsePath(t.slice(inIdx + 1));
  const block = parseBlock(lines, index + 1, baseIndent + 1);
  return {
    node: {
      type: "ForEvery",
      item,
      collection,
      body: block.nodes,
      line: line.line,
    },
    next: block.next,
  };
}

function parseRepeat(lines, index, baseIndent) {
  const line = lines[index];
  const t = line.tokens;
  // repeat 5 times
  const timesIdx = findKeyword(t, "times");
  if (t[1]?.type !== "number" && t[1]?.type !== "word") {
    throw new Error(`repeat N times on line ${line.line}`);
  }
  const count =
    timesIdx === -1
      ? parseValueTokens(t.slice(1))
      : parseValueTokens(t.slice(1, timesIdx));
  const block = parseBlock(lines, index + 1, baseIndent + 1);
  return {
    node: {
      type: "Repeat",
      count,
      body: block.nodes,
      line: line.line,
    },
    next: block.next,
  };
}

function parseIncDec(t, line, index, kind) {
  const byIdx = findKeyword(t, "by");
  const path = parsePath(t.slice(1, byIdx === -1 ? undefined : byIdx));
  const amount =
    byIdx === -1
      ? { type: "Literal", value: 1 }
      : parseValueTokens(t.slice(byIdx + 1));
  return finish(index, {
    type: kind === "increase" ? "Increase" : "Decrease",
    path,
    amount,
    line: line.line,
  });
}

function parseFind(t, line, index) {
  // find one person in people with name "Arda" and age 12
  if (t[1]?.value !== "one") {
    throw new Error(`find expects 'one … in … with …' on line ${line.line}`);
  }
  const inIdx = findKeyword(t, "in");
  const withIdx = findKeyword(t, "with");
  if (inIdx === -1 || withIdx === -1) {
    throw new Error(`find needs 'in' and 'with' on line ${line.line}`);
  }
  const item = expectWord(t, 2, line);
  const collection = parsePath(t.slice(inIdx + 1, withIdx));
  const clauses = parseWithClauses(t.slice(withIdx + 1), line);
  return finish(index, {
    type: "Find",
    item,
    collection,
    clauses,
    line: line.line,
  });
}

function parseFilter(t, line, index) {
  // filter people as filtered with name "Arda" and age 12
  const asIdx = findKeyword(t, "as");
  const withIdx = findKeyword(t, "with");
  if (asIdx === -1 || withIdx === -1) {
    throw new Error(`filter needs 'as' and 'with' on line ${line.line}`);
  }
  const collection = parsePath(t.slice(1, asIdx));
  const alias = expectWord(t, asIdx + 1, line);
  const clauses = parseWithClauses(t.slice(withIdx + 1), line);
  return finish(index, {
    type: "Filter",
    collection,
    alias,
    clauses,
    line: line.line,
  });
}

function parseWithClauses(tokens, line) {
  /** @type {{ field: string, op: string, value: any }[]} */
  const clauses = [];
  let i = 0;
  const cmpOps = [
    "is greater than",
    "is less than",
    "is at least",
    "is at most",
    "greater than",
    "less than",
    "at least",
    "at most",
    "is not",
    "equals to",
    "equals",
    "is",
    "contains",
  ];
  while (i < tokens.length) {
    if (tokens[i].type === "keyword" && tokens[i].value === "and") {
      i++;
      continue;
    }
    if (tokens[i].type !== "word") {
      throw new Error(`Invalid with-clause on line ${line.line}`);
    }
    const field = tokens[i++].value;
    let op = "===";
    for (const c of cmpOps) {
      if (tokens[i]?.type === "keyword" && tokens[i].value === c) {
        op = withOpToJs(c);
        i++;
        break;
      }
    }
    if (i >= tokens.length) {
      throw new Error(`Missing value in with-clause on line ${line.line}`);
    }
    clauses.push({ field, op, value: parseValueTokens([tokens[i++]]) });
  }
  return clauses;
}

function parseKeepAsking(lines, index, baseIndent) {
  // keep asking for number until number is 0
  //   increase sum by number
  const line = lines[index];
  const t = line.tokens;
  const name = expectWord(t, 1, line);
  const untilIdx = findKeyword(t, "until");
  if (untilIdx === -1) {
    throw new Error(`keep asking for needs 'until' on line ${line.line}`);
  }
  const condition = parseCondition(t.slice(untilIdx + 1));
  let body = [];
  let next = index + 1;
  if (next < lines.length && lines[next].indent > baseIndent) {
    const block = parseBlock(lines, next, baseIndent + 1);
    body = block.nodes;
    next = block.next;
  }
  return {
    node: {
      type: "KeepAsking",
      name,
      prompt: { type: "Literal", value: name },
      condition,
      body,
      line: line.line,
    },
    next,
  };
}

function parseAsk(t, line, index) {
  const name = expectWord(t, 1, line);
  const fromIdx = findKeyword(t, "from");
  // ask for name  → user prompt (no from)
  if (fromIdx === -1) {
    return finish(index, {
      type: "AskUser",
      name,
      prompt: { type: "Literal", value: name },
      line: line.line,
    });
  }
  const withIdx = findKeyword(t, "with");
  const urlTokens = t.slice(fromIdx + 1, withIdx === -1 ? undefined : withIdx);
  const url = parseValueTokens(urlTokens);
  /** @type {{ key: string, value: any }[]} */
  const params = [];
  if (withIdx !== -1) {
    let i = withIdx + 1;
    while (i < t.length) {
      if (t[i].type === "keyword" && t[i].value === "and") {
        i++;
        continue;
      }
      if (t[i].type !== "word") break;
      const key = t[i++].value;
      if (i >= t.length) break;
      params.push({ key, value: parseValueTokens([t[i++]]) });
    }
  }
  return finish(index, {
    type: "Ask",
    name,
    url,
    params,
    line: line.line,
  });
}

function parseSend(t, line, index) {
  const toIdx = findKeyword(t, "to");
  if (toIdx === -1) throw new Error(`send needs 'to' on line ${line.line}`);
  return finish(index, {
    type: "Send",
    data: parsePath(t.slice(1, toIdx)),
    url: parseValueTokens(t.slice(toIdx + 1)),
    line: line.line,
  });
}

function parseWait(t, line, index) {
  // wait for 1 second(s)
  const forIdx = findKeyword(t, "for");
  if (forIdx === -1 || t[forIdx + 1]?.type !== "number") {
    throw new Error(`wait for N second(s) on line ${line.line}`);
  }
  return finish(index, {
    type: "Wait",
    seconds: t[forIdx + 1].value,
    line: line.line,
  });
}

function parseCreate(t, line, index) {
  if (t[1]?.type !== "word" && t[1]?.type !== "keyword") {
    throw new Error(`create needs a type on line ${line.line}`);
  }
  const kind = String(t[1].value);
  let label = null;
  let saying = null;
  const labeledIdx = findKeyword(t, "labeled");
  const sayingIdx = findKeyword(t, "saying");
  if (labeledIdx !== -1) label = parseValueTokens(t.slice(labeledIdx + 1));
  if (sayingIdx !== -1) saying = parseValueTokens(t.slice(sayingIdx + 1));
  return finish(index, {
    type: "Create",
    kind,
    label,
    saying,
    line: line.line,
  });
}

function parseWhen(lines, index, baseIndent) {
  const line = lines[index];
  const t = line.tokens;
  // when button is clicked
  const isIdx = findKeyword(t, "is");
  if (isIdx === -1 || t[isIdx + 1]?.value !== "clicked") {
    throw new Error(`when … is clicked on line ${line.line}`);
  }
  const target = parsePath(t.slice(1, isIdx));
  const block = parseBlock(lines, index + 1, baseIndent + 1);
  return {
    node: {
      type: "WhenClicked",
      target,
      body: block.nodes,
      line: line.line,
    },
    next: block.next,
  };
}

function parseAddRemove(t, line, index, type) {
  const mid = type === "Add" ? findKeyword(t, "to") : findKeyword(t, "from");
  if (mid === -1) throw new Error(`${type} needs connector on line ${line.line}`);
  return finish(index, {
    type,
    item: parseRichValue(t.slice(1, mid), line),
    collection: parsePath(t.slice(mid + 1)),
    line: line.line,
  });
}

function parseSort(t, line, index) {
  const byIdx = findKeyword(t, "by");
  if (byIdx === -1) throw new Error(`sort needs 'by' on line ${line.line}`);
  const descending = t.some((x) => x.type === "keyword" && x.value === "descending");
  const end = descending ? findKeyword(t, "descending") : t.length;
  return finish(index, {
    type: "Sort",
    collection: parsePath(t.slice(1, byIdx)),
    field: expectWord(t, byIdx + 1, line),
    descending,
    line: line.line,
  });
}

function parseAppend(t, line, index) {
  const toIdx = findKeyword(t, "to");
  if (toIdx === -1) throw new Error(`append needs 'to' on line ${line.line}`);
  return finish(index, {
    type: "Append",
    value: parseValueTokens(t.slice(1, toIdx)),
    target: parsePath(t.slice(toIdx + 1)),
    line: line.line,
  });
}

function parseJoin(t, line, index) {
  // set line to join name and shape with " the "  — or standalone join
  const withIdx = findKeyword(t, "with");
  if (withIdx === -1) throw new Error(`join needs 'with' on line ${line.line}`);
  const parts = [];
  for (let i = 1; i < withIdx; i++) {
    if (t[i].type === "keyword" && t[i].value === "and") continue;
    parts.push(parseValueTokens([t[i]]));
  }
  return finish(index, {
    type: "Join",
    parts,
    separator: parseValueTokens(t.slice(withIdx + 1)),
    line: line.line,
  });
}

function parseCondition(tokens) {
  // split on or, then and
  const orParts = splitByKeyword(tokens, "or");
  if (orParts.length > 1) {
    return { type: "BinaryLogic", op: "||", parts: orParts.map(parseAndCondition) };
  }
  return parseAndCondition(tokens);
}

function parseAndCondition(tokens) {
  const andParts = splitByKeyword(tokens, "and");
  if (andParts.length > 1) {
    return { type: "BinaryLogic", op: "&&", parts: andParts.map(parseCompare) };
  }
  return parseCompare(tokens);
}

function parseCompare(tokens) {
  if (!tokens.length) throw new Error("Empty condition");

  const ops = [
    "is greater than",
    "is less than",
    "is at least",
    "is at most",
    "is not empty",
    "is a letter",
    "is uppercase",
    "is lowercase",
    "is empty",
    "is not",
    "equals to",
    "equals",
    "contains",
    "is",
  ];

  for (const op of ops) {
    const idx = findKeyword(tokens, op);
    if (idx === -1) continue;
    const left = parsePath(tokens.slice(0, idx));
    if (op === "is empty" || op === "is not empty") {
      return { type: "EmptyCheck", path: left, negated: op === "is not empty" };
    }
    if (op === "is uppercase" || op === "is lowercase" || op === "is a letter") {
      return { type: "CharClass", path: left, kind: op };
    }
    if (op === "is not") {
      const rightTokens = tokens.slice(idx + 1);
      if (isDefinedToken(rightTokens)) {
        return { type: "DefinedCheck", path: left, missing: true };
      }
      return {
        type: "Compare",
        op: "!==",
        left,
        right: parseValueTokens(rightTokens),
      };
    }
    if (op === "is" || op === "equals" || op === "equals to") {
      const rightTokens = tokens.slice(idx + 1);
      if (isDefinedToken(rightTokens)) {
        return { type: "DefinedCheck", path: left, missing: false };
      }
      return {
        type: "Compare",
        op: "===",
        left,
        right: parseValueTokens(rightTokens),
      };
    }
    if (op === "contains") {
      return {
        type: "Contains",
        left,
        right: parseValueTokens(tokens.slice(idx + 1)),
      };
    }
    const jsOp =
      op === "is greater than"
        ? ">"
        : op === "is less than"
          ? "<"
          : op === "is at least"
            ? ">="
            : "<=";
    return {
      type: "Compare",
      op: jsOp,
      left,
      right: parseValueTokens(tokens.slice(idx + 1)),
    };
  }

  return { type: "Truthy", path: parsePath(tokens) };
}

function isDefinedToken(tokens) {
  return (
    tokens.length === 1 &&
    tokens[0].type === "keyword" &&
    tokens[0].value === "defined"
  );
}

function withOpToJs(c) {
  if (c === "is greater than" || c === "greater than") return ">";
  if (c === "is less than" || c === "less than") return "<";
  if (c === "is at least" || c === "at least") return ">=";
  if (c === "is at most" || c === "at most") return "<=";
  if (c === "is not") return "!==";
  if (c === "contains") return "includes";
  return "===";
}

function parsePath(tokens) {
  const parts = [];
  for (const tok of tokens) {
    if (tok.type === "word") parts.push(tok.value);
    else if (tok.type === "keyword" && tok.value === "of") {
      // reverse style not used here
    } else if (tok.type === "number") {
      parts.push(String(tok.value));
    }
  }
  if (!parts.length) throw new Error("Expected path");
  return { type: "Path", parts };
}

function parseValueTokens(tokens) {
  if (!tokens.length) throw new Error("Expected value");
  if (tokens.length === 1) {
    const tok = tokens[0];
    if (tok.type === "string") return { type: "Literal", value: tok.value };
    if (tok.type === "number") return { type: "Literal", value: tok.value };
    if (tok.type === "keyword" && tok.value === "defined") {
      return { type: "Literal", value: undefined };
    }
    if (tok.type === "keyword" && tok.value === "empty") {
      return { type: "Literal", value: [] };
    }
    if (tok.type === "word" && tok.value === "empty") {
      return { type: "Literal", value: [] };
    }
    if (tok.type === "word") return { type: "Path", parts: [tok.value] };
  }
  // multi-word unquoted string OR path
  if (tokens.every((t) => t.type === "word")) {
    return { type: "Literal", value: tokens.map((t) => t.value).join(" ") };
  }
  if (tokens.length === 1) return parsePath(tokens);
  // path of multiple words (friend name)
  if (tokens.every((t) => t.type === "word" || t.type === "number")) {
    return parsePath(tokens);
  }
  throw new Error(`Cannot parse value: ${tokens.map((t) => t.value).join(" ")}`);
}

function parseValues(tokens) {
  /** @type {any[]} */
  const parts = [];
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (tok.type === "string" || tok.type === "number") {
      parts.push(parseValueTokens([tok]));
      i++;
    } else if (tok.type === "word") {
      const pathWords = [tok];
      i++;
      while (i < tokens.length && tokens[i].type === "word") {
        pathWords.push(tokens[i]);
        i++;
      }
      parts.push(parsePath(pathWords));
    } else {
      i++;
    }
  }
  return parts;
}

function parseAlertParts(tokens, line) {
  /** @type {any[]} */
  const parts = [];
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (tok.type === "string" || tok.type === "number") {
      parts.push(parseValueTokens([tok]));
      i++;
      continue;
    }
    if (
      tok.type === "keyword" &&
      ["count of", "length of", "first of", "last of"].includes(tok.value)
    ) {
      let j = i + 1;
      while (j < tokens.length && tokens[j].type === "word") j++;
      parts.push(parseRichValue(tokens.slice(i, j), line));
      i = j;
      continue;
    }
    if (tok.type === "word") {
      const pathWords = [tok];
      i++;
      while (i < tokens.length && tokens[i].type === "word") {
        pathWords.push(tokens[i]);
        i++;
      }
      parts.push(parsePath(pathWords));
      continue;
    }
    i++;
  }
  return parts;
}

function findKeyword(tokens, value) {
  return tokens.findIndex((t) => t.type === "keyword" && t.value === value);
}

function findStatementStart(tokens, from) {
  for (let i = from; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === "keyword" && STATEMENT_STARTERS.has(t.value)) return i;
  }
  return -1;
}

function parseRichValue(tokens, line) {
  if (!tokens.length) throw new Error(`Expected value on line ${line.line}`);
  const head = tokens[0];
  if (head.type === "keyword" && head.value === "join") {
    const withIdx = findKeyword(tokens, "with");
    if (withIdx === -1) throw new Error(`join needs 'with' on line ${line.line}`);
    const ofIdx = findKeyword(tokens, "of");
    const hasAnd = tokens.some(
      (t, i) => i > 0 && i < withIdx && t.type === "keyword" && t.value === "and"
    );
    const fieldEnd = ofIdx !== -1 && ofIdx < withIdx ? ofIdx : withIdx;
    const parts = [];
    for (let i = 1; i < fieldEnd; i++) {
      if (tokens[i].type === "keyword" && tokens[i].value === "and") continue;
      if (tokens[i].type !== "word") {
        throw new Error(`Invalid join field on line ${line.line}`);
      }
      parts.push(tokens[i].value);
    }
    if (ofIdx !== -1 && ofIdx < withIdx) {
      const source = parsePath(tokens.slice(ofIdx + 1, withIdx));
      return {
        type: "JoinExpr",
        fields: parts,
        source,
        separator: parseValueTokens(tokens.slice(withIdx + 1)),
      };
    }
    // join words with " "  → list.join(sep)
    if (!hasAnd && parts.length >= 1) {
      return {
        type: "JoinExpr",
        list: parsePath(tokens.slice(1, withIdx)),
        separator: parseValueTokens(tokens.slice(withIdx + 1)),
      };
    }
    return {
      type: "JoinExpr",
      parts: parts.map((p) => ({ type: "Path", parts: [p] })),
      separator: parseValueTokens(tokens.slice(withIdx + 1)),
    };
  }
  if (
    head.type === "keyword" &&
    (head.value === "character at" || head.value === "item at")
  ) {
    const ofIdx = findKeyword(tokens, "of");
    if (ofIdx === -1) {
      throw new Error(`${head.value} needs 'of' on line ${line.line}`);
    }
    return {
      type: head.value === "character at" ? "CharAt" : "ItemAt",
      index: parseMathValue(tokens.slice(1, ofIdx), line),
      source: parsePath(tokens.slice(ofIdx + 1)),
    };
  }
  for (const kind of [
    "count of",
    "length of",
    "first of",
    "last of",
    "text of",
    "number of",
    "floor of",
    "uppercase of",
    "lowercase of",
    "title case of",
  ]) {
    if (head.type === "keyword" && head.value === kind) {
      if (
        kind === "floor of" ||
        kind === "text of" ||
        kind === "number of" ||
        kind === "uppercase of" ||
        kind === "lowercase of" ||
        kind === "title case of"
      ) {
        return {
          type: "OfExpr",
          kind,
          path: parseMathValue(tokens.slice(1), line),
        };
      }
      return {
        type: "OfExpr",
        kind,
        path: parsePath(tokens.slice(1)),
      };
    }
  }
  return parseMathValue(tokens, line);
}

function parseMathValue(tokens, line) {
  const ops = ["divided by", "plus", "minus", "times", "modulo"];
  for (const op of ops) {
    const idx = findKeyword(tokens, op);
    if (idx === -1) continue;
    return {
      type: "BinaryExpr",
      op,
      left: parseMathValue(tokens.slice(0, idx), line),
      right: parseMathValue(tokens.slice(idx + 1), line),
    };
  }
  if (!tokens.length) throw new Error(`Expected value on line ${line.line}`);
  const head = tokens[0];
  if (
    head.type === "keyword" &&
    (head.value === "character at" || head.value === "item at")
  ) {
    return parseRichValue(tokens, line);
  }
  if (
    head.type === "keyword" &&
    [
      "count of",
      "length of",
      "first of",
      "last of",
      "text of",
      "number of",
      "floor of",
      "uppercase of",
      "lowercase of",
      "title case of",
    ].includes(head.value)
  ) {
    return parseRichValue(tokens, line);
  }
  return parseValueTokens(tokens);
}

function splitByKeyword(tokens, kw) {
  /** @type {typeof tokens[]} */
  const parts = [];
  let current = [];
  for (const t of tokens) {
    if (t.type === "keyword" && t.value === kw) {
      if (current.length) parts.push(current);
      current = [];
    } else {
      current.push(t);
    }
  }
  if (current.length) parts.push(current);
  return parts;
}

function expectWord(tokens, index, line) {
  const t = tokens[index];
  if (!t || t.type !== "word") {
    throw new Error(`Expected name on line ${line.line}`);
  }
  return t.value;
}
