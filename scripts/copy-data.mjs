// Copy the files the client fetches at runtime into public/. Full dataset downloads live on GitHub, not on the site.
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
const src = "data/latest";
const dst = "public/data/latest";
const CLIENT_FILES = ["index.json", "events.json"];
if (existsSync(src)) {
  rmSync(dst, { recursive: true, force: true });
  mkdirSync(dst, { recursive: true });
  for (const name of CLIENT_FILES) copyFileSync(`${src}/${name}`, `${dst}/${name}`);
  console.log(`copied ${CLIENT_FILES.join(", ")} -> ${dst}`);
}
