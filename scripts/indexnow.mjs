// Ping IndexNow (Bing, Yandex, Seznam...) with every URL in the live sitemap.
//   node scripts/indexnow.mjs
import fs from 'node:fs';
const HOST = 'pakjobs-daily.vercel.app';
const id = fs.readFileSync(new URL('../indexnow-id.txt', import.meta.url), 'utf8').trim();
const xml = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const body = { host: HOST, key: id, keyLocation: `https://${HOST}/${id}.txt`, urlList };
const r = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) });
console.log(`IndexNow: ${urlList.length} urls -> HTTP ${r.status}`);
