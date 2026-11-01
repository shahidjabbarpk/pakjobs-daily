// One-shot Firebase setup for the shahidjabbarpk@gmail.com project.
// Prereq (console, once): add Firebase to GCP project "pakjobs-daily-sj" (accepts the Firebase terms).
// Run:  node scripts/setup-firebase.mjs
// Does: add Firebase (if needed) -> web app -> write config into src/lib/config.ts -> Firestore DB
//       -> deploy rules + indexes -> check Anonymous sign-in.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'pakjobs-daily-sj';
const ACCOUNT = 'shahidjabbarpk@gmail.com';
const FB = `npx -y firebase-tools@14 --account ${ACCOUNT} --project ${PROJECT}`;

function run(cmd, { ok = false } = {}) {
  console.log(`\n$ ${cmd}`);
  try {
    const out = execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return out;
  } catch (e) {
    const msg = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    if (ok) {
      console.log('  (continuing)', msg.split('\n').filter((l) => /error|exist/i.test(l)).slice(0, 2).join(' | '));
      return msg;
    }
    console.error(msg);
    process.exit(1);
  }
}

// 1. Firebase on the GCP project
run(`npx -y firebase-tools@14 --account ${ACCOUNT} projects:addfirebase ${PROJECT}`, { ok: true });

// 2. Web app + config
let apps = run(`${FB} apps:list WEB --json`, { ok: true });
let appId = JSON.parse(apps.slice(apps.indexOf('{'))).result?.[0]?.appId;
if (!appId) {
  run(`${FB} apps:create WEB "PakJobs App"`);
  apps = run(`${FB} apps:list WEB --json`);
  appId = JSON.parse(apps.slice(apps.indexOf('{'))).result[0].appId;
}
const sdk = run(`${FB} apps:sdkconfig WEB ${appId} --json`);
const cfg = JSON.parse(sdk.slice(sdk.indexOf('{'))).result.sdkConfig;
const pick = ({ apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId: id }) =>
  ({ apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId: id });
const configTs = join(ROOT, 'src/lib/config.ts');
const src = readFileSync(configTs, 'utf8').replace(
  /(export const FIREBASE_CONFIG: \{[\s\S]*?\} \| null = )([\s\S]*?);(\r?\n)/,
  (_, head, _old, eol) => `${head}${JSON.stringify(pick(cfg), null, 2).replace(/"(\w+)":/g, '$1:').replace(/"/g, "'").replace(/\n/g, eol)};${eol}`,
);
if (!src.includes(cfg.apiKey)) { console.error('could not write FIREBASE_CONFIG into config.ts'); process.exit(1); }
writeFileSync(configTs, src);
console.log('  wrote FIREBASE_CONFIG for', cfg.projectId);

// 3. Firestore database (Mumbai, closest to Pakistan) + rules/indexes
writeFileSync(join(ROOT, '.firebaserc'), JSON.stringify({ projects: { default: PROJECT } }, null, 2) + '\n');
run(`${FB} firestore:databases:create "(default)" --location asia-south1`, { ok: true });
run(`${FB} deploy --only firestore`);

// 4. Anonymous sign-in check (enabling it is console-only)
const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${cfg.apiKey}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }),
});
const body = await res.json();
if (body.localId) console.log('\n✅ Anonymous sign-in works. Community features are live.');
else {
  console.log(`\n⚠️  Anonymous sign-in not enabled yet (${body.error?.message}).`);
  console.log(`   Open https://console.firebase.google.com/project/${PROJECT}/authentication/providers`);
  console.log('   -> Get started -> Anonymous -> Enable -> Save');
}
console.log('\nNext: rebuild the app (npm run apk / npm run aab) so it ships with the new config.');
