import { cp, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const dest = `${root}public/scanner-assets`;
await mkdir(dest, { recursive: true });
await cp(
  `${root}node_modules/tesseract.js/dist/worker.min.js`,
  `${dest}/worker.min.js`,
);
for (const name of await readdir(`${root}node_modules/tesseract.js-core`)) {
  if (/^tesseract-core.*\.(wasm|js)$/.test(name))
    await cp(
      `${root}node_modules/tesseract.js-core/${name}`,
      `${dest}/${name}`,
    );
}
await cp(
  `${root}node_modules/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz`,
  `${dest}/eng.traineddata.gz`,
);
for (const name of ["cmaps", "standard_fonts", "wasm"])
  await cp(`${root}node_modules/pdfjs-dist/${name}`, `${dest}/${name}`, {
    recursive: true,
  });
for (const [packageName, license] of [
  ["tesseract.js", "LICENSE.md"],
  ["tesseract.js-core", "LICENSE"],
  ["pdfjs-dist", "LICENSE"],
]) {
  await cp(
    `${root}node_modules/${packageName}/${license}`,
    `${dest}/${packageName}-LICENSE.txt`,
  );
}
