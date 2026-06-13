// Bundles the modular app into a single self-contained HTML file that works
// offline by double-clicking (no server, no internet).  Run: `node build.js`.
//
// It inlines styles.css and concatenates the JS modules in dependency order,
// stripping `import`/`export` so the code runs as one plain <script>.

const fs = require("fs");
const path = require("path");

const root = __dirname;
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

function stripModuleSyntax(src) {
  return src
    .replace(/^\s*import[^;]*;?\s*$/gm, "") // drop `import ... from "..."`
    .replace(/^\s*export\s+/gm, "");        // `export class/function/const` -> bare
}

// Order matters: helpers -> config -> audio -> app.
const js = ["src/music.js", "src/config.js", "src/audio.js", "src/app.js"]
  .map((f) => `// ===== ${f} =====\n${stripModuleSyntax(read(f))}`)
  .join("\n\n");

const css = read("src/styles.css");

let html = read("index.html")
  .replace(/<link rel="stylesheet"[^>]*>/, `<style>\n${css}\n</style>`)
  .replace(/<script type="module"[^>]*><\/script>/, `<script>\n${js}\n</script>`);

const outDir = path.join(root, "dist");
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "interval-training.html");
fs.writeFileSync(out, html);
console.log(`Wrote ${out} (${(html.length / 1024).toFixed(1)} kB)`);
