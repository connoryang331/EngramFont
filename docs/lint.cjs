#!/usr/bin/env node
/* ============================================================
   docs/lint.js — 文档体系约定校验（零依赖，node docs/lint.js）
   移植自 visee 的 docs/lint.js；规则与 docs/README.md「约定」对应：
     L1 每篇恰好一个 H1
     L2 Id 前缀 ↔ 目录严格对应（BUG- / ADR-）
     L3 Id 全仓唯一
     L4 Status 取值按桶受限（英文）
     L5 tags ⊆ 受控词表（唯一来源：docs/README.md 标签词表节）
     L6 相对链接目标必须存在（防断链）
   范围：docs/ 下全部 .md（specs/ 只做 L1/L6——无 frontmatter 约定）。
   退出码：0 = 通过；1 = 有违规。可选接 .githooks/pre-commit。
   ============================================================ */
const fs = require("fs");
const path = require("path");

const DOCS = __dirname;

/* ---------- 受控词表：从 docs/README.md 解析（单一来源） ---------- */
function loadVocabulary() {
  const fallback = new Set([
    "frontend", "backend", "canvas", "webcomponents", "editor", "settings",
    "keyboard-dock", "export", "import", "theme", "selection", "nodes",
    "testing", "meta",
  ]);
  try {
    const readme = fs.readFileSync(path.join(DOCS, "README.md"), "utf8");
    const vocab = new Set();
    let inSection = false;
    for (const line of readme.split("\n")) {
      if (/受控标签/.test(line)) { inSection = true; continue; }
      if (inSection && /^## /.test(line)) break;
      if (inSection) for (const m of line.matchAll(/`([a-z][a-z-]*)`/g)) vocab.add(m[1]);
    }
    return vocab.size ? vocab : fallback;
  } catch {
    return fallback;
  }
}

/* ---------- 桶规则：目录前缀 → Id 正则 + Status 词表 ---------- */
const BUCKETS = [
  ["bugfixes", /^BUG-\d+$/, ["fixed", "open", "mitigated", "wontfix"]],
  ["adr", /^ADR-\d+$/, ["accepted", "superseded"]],
];

function bucketFor(relNoExt) {
  return BUCKETS.find(([pre]) => relNoExt === pre || relNoExt.startsWith(pre + "/"));
}

function listMarkdown(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".obsidian") continue;
      out.push(...listMarkdown(full));
    } else if (entry.name.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

function parseFrontmatter(text) {
  if (!text.startsWith("---")) return {};
  const end = text.indexOf("\n---", 3);
  if (end === -1) return {};
  const meta = {};
  for (const line of text.slice(3, end).split("\n")) {
    const m = line.match(/^([A-Za-z_-]+):\s*(.+)$/);
    if (m) meta[m[1]] = m[2].trim();
  }
  return meta;
}

function relativeLinks(text) {
  const links = [];
  for (const m of text.matchAll(/\]\(([^)#]+?)(?:#[^)]*)?\)/g)) {
    const target = m[1];
    if (!target.endsWith(".md") || /^[a-z]+:\/\//.test(target)) continue;
    links.push(target);
  }
  return links;
}

/* ---------- 主流程 ---------- */
// 门禁范围：新体系的桶（bugfixes / adr / specs）+ docs 根目录散件。
// 历史目录（design/ discussions/ features/ product/ requirements/ testing/
// wiki/ "Engram Font Designer"/ attachments/）不受新约定约束。
const vocab = loadVocabulary();
const files = [
  ...listMarkdown(path.join(DOCS, "bugfixes")),
  ...listMarkdown(path.join(DOCS, "adr")),
  ...listMarkdown(path.join(DOCS, "specs")),
  ...fs.readdirSync(DOCS).filter((f) => f.endsWith(".md")).map((f) => path.join(DOCS, f)),
];
const problems = [];
const seenIds = new Map();

for (const file of files) {
  const relNoExt = path.relative(DOCS, file).replace(/\\/g, "/").replace(/\.md$/, "");
  const rel = relNoExt + ".md";
  const text = fs.readFileSync(file, "utf8");
  const meta = parseFrontmatter(text);
  const hasFM = text.startsWith("---");
  const bucket = bucketFor(relNoExt);

  // L1 恰好一个 H1（跳过代码围栏内的示例行）
  const noFence = text.replace(/^```[^\n]*\n[\s\S]*?^```/gm, "");
  const h1s = noFence.split("\n").filter((l) => /^# [^#]/.test(l));
  if (h1s.length !== 1) {
    problems.push(`L1 ${rel}: 期望 1 个 H1，实际 ${h1s.length}`);
  }

  const isIndexDoc = /(^|\/)(README|INDEX)$/.test(relNoExt);

  if (bucket && !isIndexDoc) {
    // L2/L3 Id
    const id = meta.Id;
    if (!id) {
      problems.push(`L2 ${rel}: 缺 Id（期望 ${bucket[1]} 形式）`);
    } else {
      if (!bucket[1].test(id)) {
        problems.push(`L2 ${rel}: Id "${id}" 不匹配 ${bucket[1]}`);
      }
      if (seenIds.has(id)) {
        problems.push(`L3 ${rel}: Id "${id}" 与 ${seenIds.get(id)} 重复`);
      } else {
        seenIds.set(id, rel);
      }
    }

    // L4 Status
    const status = meta.Status;
    if (!status || !bucket[2].includes(status)) {
      problems.push(`L4 ${rel}: Status "${status ?? "(缺)"}" 不在词表 [${bucket[2].join(", ")}]`);
    }

    // L5 tags（有 frontmatter 才校验）
    if (hasFM && meta.tags !== undefined) {
      const tags = meta.tags.replace(/^\[|\]$/g, "").split(",").map((t) => t.trim()).filter(Boolean);
      for (const tag of tags) {
        if (!vocab.has(tag)) {
          problems.push(`L5 ${rel}: 标签 "${tag}" 不在受控词表（docs/README.md）`);
        }
      }
    }
  }

  // L6 相对链接
  for (const link of relativeLinks(text)) {
    const target = path.resolve(path.dirname(file), link);
    if (!fs.existsSync(target)) {
      problems.push(`L6 ${rel}: 断链 -> ${link}`);
    }
  }
}

if (problems.length) {
  for (const p of problems) console.error("✗ " + p);
  console.error(`docs lint: ${problems.length} 个违规`);
  process.exit(1);
}
console.log(`docs lint: 通过（${files.length} 篇文档）`);
