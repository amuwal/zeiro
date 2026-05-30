// Bundle ONCE, render many H.264 MP4s. WebGL via ANGLE (default GL backend
// fails to create a context in this headless env).
//   node scripts/shootvideo.mjs [scale=0.5] [conc=4] Id Id ...
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

let scale = 0.5;
let concurrency = 4;
const ids = [];
for (const a of process.argv.slice(2)) {
  if (a.startsWith("scale=")) scale = parseFloat(a.slice(6));
  else if (a.startsWith("conc=")) concurrency = parseInt(a.slice(5), 10);
  else ids.push(a);
}

console.log("Bundling once...");
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts") });
console.log("Bundled. Rendering", ids.length, "videos at scale", scale, "conc", concurrency);

const outDir = path.join(root, "videos");
for (const id of ids) {
  try {
    const composition = await selectComposition({ serveUrl, id, inputProps: {} });
    const output = path.join(outDir, `${id}.mp4`);
    let lastBucket = -1;
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: output,
      scale,
      chromiumOptions: { gl: "angle" },
      concurrency,
      onProgress: ({ progress }) => {
        const bucket = Math.floor(progress * 4);
        if (bucket !== lastBucket) {
          lastBucket = bucket;
          console.log(`  ${id} ${Math.round(progress * 100)}%`);
        }
      },
    });
    console.log("OK  ", `${id}.mp4`);
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    console.log("FAIL", id, "-", msg.split("\n")[0]);
  }
}
console.log("DONE");
process.exit(0);
