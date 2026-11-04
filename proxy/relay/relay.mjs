// Careerjet relay for PakJobs Daily, run on a server with a fixed IP (Careerjet only accepts API calls
// from IPs declared in the publisher account; Vercel functions have no fixed IP).
// It forwards GET /v4/query unchanged, including the caller's Basic auth, so it is useless without
// our Careerjet key. No key, logs or data are kept here. Zero dependencies (Node >= 20).
import http from 'node:http';

const PORT = Number(process.env.PORT || 4100);
const UPSTREAM = 'https://search.api.careerjet.net/v4/query';
const LIMIT_PER_MIN = 600;

let windowStart = Date.now();
let count = 0;

http.createServer(async (req, res) => {
  const send = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
  const url = new URL(req.url, 'http://x');
  if (req.method !== 'GET' || url.pathname !== '/v4/query') return send(404, { error: 'not found' });
  if (!String(req.headers.authorization || '').startsWith('Basic ')) return send(401, { error: 'missing auth' });

  if (Date.now() - windowStart > 60_000) { windowStart = Date.now(); count = 0; }
  if (++count > LIMIT_PER_MIN) return send(429, { error: 'rate limited' });

  try {
    const r = await fetch(`${UPSTREAM}${url.search}`, {
      headers: { authorization: req.headers.authorization, referer: String(req.headers.referer || '') },
      signal: AbortSignal.timeout(15_000),
    });
    res.writeHead(r.status, { 'content-type': r.headers.get('content-type') || 'application/json' });
    res.end(await r.text());
  } catch {
    send(502, { type: 'ERROR', error: 'upstream unreachable' });
  }
}).listen(PORT, '127.0.0.1', () => console.log(`careerjet relay on 127.0.0.1:${PORT}`));
