// Copy the latest dataset into public/ so it is served as static files.
import { cpSync, mkdirSync, existsSync } from "node:fs";
const src = "data/latest";
const dst = "public/data/latest";
if (existsSync(src)) {
  mkdirSync(dst, { recursive: true });
  cpSync(src, dst, { recursive: true });
  console.log(`copied ${src} -> ${dst}`);
}
