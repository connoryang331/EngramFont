// Emit machine-readable snapshots of the visual token system:
//   docs/schemas/engramfont-theme-pack.schema.json  (JSON Schema, draft 2020-12)
//   docs/schemas/visual-tokens.catalog.json         (token catalog)
// Both are GENERATED from VISUAL_TOKENS -- edit the table, re-run this script:
//   node scripts/dump-visual-tokens.mjs
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  buildThemePackSchema,
  buildTokenCatalog,
} from "../src-js/fontra-core/src/visual-tokens.js";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "docs", "schemas");
mkdirSync(outDir, { recursive: true });

const schema = buildThemePackSchema();
const catalog = buildTokenCatalog();

writeFileSync(join(outDir, "engramfont-theme-pack.schema.json"), JSON.stringify(schema, null, 2) + "\n");
writeFileSync(join(outDir, "visual-tokens.catalog.json"), JSON.stringify(catalog, null, 2) + "\n");

console.log(
  `wrote engramfont-theme-pack.schema.json (${Object.keys(schema.properties.values.properties).length} value keys) ` +
    `and visual-tokens.catalog.json (${catalog.tokens.length} tokens)`
);
