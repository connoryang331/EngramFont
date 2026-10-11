// rebrand-identifiers.mjs — 把 src-js 里的 Fontra 内部标识符迁移为 EngramFont
// 只动 token/字符串，不碰：@fontra/ 包别名、目录名、.fontra 扩展名、fontra-icon.svg 文件名
import fs from "node:fs";
import path from "node:path";

const files = [];
const walk = d => {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(js|css|html|ts)$/.test(f)) files.push(p);
  }
};
walk("src-js");

const pairs = [
  ["fontra-json", "engramfont-json"],
  ["JSON (Fontra)", "JSON (EngramFont)"],
  ["makeFontraMenuBar", "makeEngramFontMenuBar"],
  ["getFontraMenu", "getEngramFontMenu"],
  ["--fontra-", "--engramfont-"],
  ['"fontra-', '"engramfont-'],
  ["clipboardSelection.fontra-json", "clipboardSelection.engramfont-json"],
  ["fontra-project-name", "engramfont-project-name"],
  ["fontra-icon-header", "engramfont-icon-header"],
  ["fontra-ui-", "engramfont-ui-"],
  ["fontra.applicationsettings", "engramfont.applicationsettings"],
  ["// Fontra-Menu at the beginning.", "// EngramFont menu at the beginning."],
];

const changed = [];
for (const f of files) {
  let s = fs.readFileSync(f, "utf8");
  const before = s;
  for (const [a, b] of pairs) s = s.split(a).join(b);
  if (s !== before) {
    fs.writeFileSync(f, s);
    changed.push(path.relative(".", f).replaceAll("\\", "/"));
  }
}
console.log("changed files:", changed.length);
console.log(changed.join("\n"));

// 残留检查：src-js 里还有哪些大写 Fontra（应只剩合法内部项）
const left = [];
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  const m = s.match(/.{0,40}Fontra.{0,40}/g);
  if (m) left.push(...m.map(x => path.relative(".", f).replaceAll("\\", "/") + " :: " + x.replace(/\n/g, " ")));
}
console.log("\nremaining 'Fontra' mentions (" + left.length + "):");
console.log(left.slice(0, 25).join("\n"));
