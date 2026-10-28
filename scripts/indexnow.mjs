// Tell IndexNow engines (Bing, Yandex, Seznam, Naver; Bing feeds ChatGPT search and Copilot) about every URL
// in the live sitemap. With --wait, poll until the live sitemap carries this build's generatedAt first, so the
// ping lands after the deploy rather than before it.
import { readdirSync, readFileSync } from "node:fs";

const ORIGIN = "https://vtaircrafts.in";
const key = readdirSync("public").find((f) => /^[0-9a-f]{32}\.txt$/.test(f))?.slice(0, -4);
if (!key) throw new Error("no IndexNow key file in public/");

async function liveSitemap() {
  const res = await fetch(`${ORIGIN}/sitemap.xml`, { headers: { "cache-control": "no-cache" } });
  if (!res.ok) throw new Error(`sitemap ${res.status}`);
  return res.text();
}

let xml = await liveSitemap();
if (process.argv.includes("--wait")) {
  const generatedAt = JSON.parse(readFileSync("data/latest/meta.json", "utf8")).generatedAt;
  const deadline = Date.now() + 20 * 60_000;
  while (!xml.includes(generatedAt)) {
    if (Date.now() > deadline) throw new Error(`live sitemap never showed ${generatedAt}`);
    await new Promise((r) => setTimeout(r, 30_000));
    xml = await liveSitemap();
  }
}

const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
for (let i = 0; i < urls.length; i += 10_000) {
  const urlList = urls.slice(i, i + 10_000);
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: "vtaircrafts.in", key, keyLocation: `${ORIGIN}/${key}.txt`, urlList }),
  });
  console.log(`IndexNow: ${urlList.length} URLs -> ${res.status} ${await res.text()}`);
  if (res.status >= 400) process.exit(1);
}
