/** Browser / Node runtime helpers used by compiled Kiki programs. */

export function createRuntime(overrides = {}) {
  const kiki = {
    variables: {},
    methods: {},
    async wait(ms) {
      return new Promise((r) => setTimeout(r, ms));
    },
    async ask(url, params) {
      const target =
        params && Object.keys(params).length
          ? `${url}?${new URLSearchParams(params)}`
          : url;
      const res = await fetch(target);
      const type = res.headers.get("content-type") || "";
      if (type.includes("application/json")) return res.json();
      return res.text();
    },
    async askUser(prompt) {
      if (typeof globalThis.prompt === "function") {
        return globalThis.prompt(String(prompt));
      }
      const { createInterface } = await import("node:readline");
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      const answer = await new Promise((resolve) => {
        rl.question(`${prompt}: `, resolve);
      });
      rl.close();
      const n = Number(answer);
      return Number.isFinite(n) && String(n) === String(answer).trim()
        ? n
        : answer;
    },
    async send(url, data) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const type = res.headers.get("content-type") || "";
      if (type.includes("application/json")) return res.json();
      return res.text();
    },
    create(kind, opts = {}) {
      if (typeof document === "undefined") {
        return { kind, ...opts, addEventListener() {} };
      }
      const tag =
        kind === "button" ? "button" : kind === "text" ? "span" : "div";
      const el = document.createElement(tag);
      if (opts.labeled != null) el.textContent = String(opts.labeled);
      if (opts.saying != null) el.textContent = String(opts.saying);
      document.body.appendChild(el);
      return el;
    },
    show(el) {
      if (el?.style) el.style.display = "";
    },
    hide(el) {
      if (el?.style) el.style.display = "none";
    },
    setText(el, value) {
      if (el) el.textContent = String(value);
    },
    async boot() {
      if (typeof kiki.methods.main === "function") {
        await kiki.methods.main();
      }
    },
    ...overrides,
  };
  return kiki;
}

export const kiki = createRuntime();
