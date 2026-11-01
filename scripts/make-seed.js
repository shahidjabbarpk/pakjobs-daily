// Copies the latest scraped feed into the app bundle so a fresh install shows
// real jobs instantly, even offline, before the first network refresh.
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'data', 'jobs.json');
const dst = path.join(__dirname, '..', 'src', 'data', 'seed.json');
if (!fs.existsSync(src)) { console.log('no data/jobs.json - run `npm run scrape` first'); process.exit(0); }
const feed = JSON.parse(fs.readFileSync(src, 'utf8'));
fs.writeFileSync(dst, JSON.stringify(feed));
console.log(`seed: ${feed.jobs.length} jobs -> src/data/seed.json`);
