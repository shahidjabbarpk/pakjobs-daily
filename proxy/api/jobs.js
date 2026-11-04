// Careerjet job-search proxy for the PakJobs Daily app (Vercel serverless function).
// Keeps the Careerjet API key out of the APK and forwards the real user's IP and user agent,
// which Careerjet requires on every call (the user whose action triggered it). Nothing is stored.
const API = 'https://search.api.careerjet.net/v4/query';
const REFERER = 'https://shahidjabbarpk.github.io/pakjobs-daily/';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const key = process.env.CAREERJET_API_KEY;
  if (!key) return res.status(200).json({ type: 'OFF', jobs: [] });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || '';
  const q = new URLSearchParams({
    locale_code: 'en_PK',
    user_ip: ip,
    user_agent: String(req.headers['user-agent'] || 'PakJobsDaily'),
    sort: 'date',
    page_size: '20',
    fragment_size: '200',
  });
  for (const k of ['keywords', 'location']) if (req.query[k]) q.set(k, String(req.query[k]).slice(0, 80));
  const page = Number(req.query.page);
  if (page >= 1 && page <= 10) q.set('page', String(page));

  try {
    const r = await fetch(`${API}?${q}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`, Referer: REFERER },
    });
    const body = await r.json().catch(() => ({ type: 'ERROR' }));
    return res.status(r.ok ? 200 : 502).json(body);
  } catch {
    return res.status(502).json({ type: 'ERROR', jobs: [] });
  }
}
