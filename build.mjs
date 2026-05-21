/**
 * Build script for Stream Deck plugin.
 *
 * Strategy:
 *  - Bundle our TypeScript (via compiled JS) into a single ESM file
 *  - Mark @napi-rs/canvas as external (can't bundle native binaries)
 *  - Copy @napi-rs/canvas + win32 native package into sdPlugin/node_modules
 *    so Stream Deck's own Node runtime can find them
 */

import esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const nmSrc = join(__dirname, "node_modules");
const pluginDir = join(__dirname, "com.kupciu.ai-usage.sdPlugin");
const nmDst = join(pluginDir, "node_modules");

// 1. Bundle with esbuild
await esbuild.build({
  entryPoints: ["src/plugin.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  outfile: join(pluginDir, "bin", "plugin.js"),
  // Can't bundle native addons — keep as external require
  external: ["@napi-rs/canvas"],
  logLevel: "warning",
});
console.log("✔ esbuild bundle complete");

// 2. Copy @napi-rs/canvas packages into sdPlugin/node_modules
const canvasPkgs = ["@napi-rs/canvas", "@napi-rs/canvas-win32-x64-msvc"];

mkdirSync(join(nmDst, "@napi-rs"), { recursive: true });

for (const pkg of canvasPkgs) {
  const src = join(nmSrc, pkg);
  const dst = join(nmDst, pkg);
  try {
    rmSync(dst, { recursive: true, force: true });
    cpSync(src, dst, { recursive: true });
    console.log(`✔ Copied ${pkg}`);
  } catch (e) {
    console.warn(`  ⚠ Could not copy ${pkg}: ${e.message}`);
  }
}

// 3. Pre-create logs/ folder — SDK has EEXIST race condition on startup
mkdirSync(join(pluginDir, "logs"), { recursive: true });
console.log("✔ Ensured logs/ exists");

console.log("Build done.");
