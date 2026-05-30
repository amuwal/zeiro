// Fast still shooter: bundle ONCE, render many stills. Avoids remotion-still's
// per-call rebundle so the verify->fix loop is cheap.
//   node scripts/shoot.mjs [scale=0.5] Id:frame Id:frame ...
//   node scripts/shoot.mjs scale=0.4 IsoWorkflow:140 JapanGlobe:200
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

let scale = 0.5;
const jobs = [];
for (const a of process.argv.slice(2)) {
  if (a.startsWith("scale=")) {
    scale = parseFloat(a.slice(6));
    continue;
  }
  const [id, f] = a.split(":");
  jobs.push({ id, frame: f ? parseInt(f, 10) : 60 });
}

console.log("Bundling once...");
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts") });
console.log("Bundled. Rendering", jobs.length, "stills at scale", scale);

const outDir = path.join(root, "stills3d");
for (const job of jobs) {
  try {
    const composition = await selectComposition({ serveUrl, id: job.id, inputProps: {} });
    const output = path.join(outDir, `${job.id}_f${job.frame}.png`);
    await renderStill({
      composition,
      serveUrl,
      output,
      frame: job.frame,
      scale,
      chromiumOptions: { gl: "angle" },
      overwrite: true,
    });
    console.log("OK  ", `${job.id}_f${job.frame}.png`);
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    console.log("FAIL", job.id, "-", msg.split("\n")[0]);
  }
}
process.exit(0);
