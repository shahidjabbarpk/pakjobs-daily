# PakJobs Daily - Careerjet proxy

One Vercel function: `GET /api/jobs?keywords=&location=&page=` returns Careerjet's v4 JSON.

Deploy (once, from this folder):

    npx vercel login                       # shahidjabbarpk@gmail.com
    npx vercel link --yes --project pakjobs-daily-proxy
    npx vercel env add CAREERJET_API_KEY production   # paste the key from the Careerjet publisher account
    npx vercel deploy --prod

Without the key the function answers `{ "type": "OFF" }` and the app simply hides the web-jobs section.

## Fixed-IP relay

Careerjet only answers API calls from the server IPs declared on the website's "Server IP addresses" tab.
Vercel has no fixed IP, so `api/jobs.js` calls `relay/relay.mjs`, which runs on the marketing-bot EC2
(Elastic IP 18.139.102.249) as systemd `careerjet-relay` on 127.0.0.1:4100, published by Caddy at
https://cj.18.139.102.249.sslip.io. Declare `18.139.102.249` in Careerjet. Update the relay with
`scp relay/relay.mjs` to `/opt/careerjet-relay/` and `sudo systemctl restart careerjet-relay`.
