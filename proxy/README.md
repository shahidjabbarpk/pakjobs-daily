# PakJobs Daily - Careerjet proxy

One Vercel function: `GET /api/jobs?keywords=&location=&page=` returns Careerjet's v4 JSON.

Deploy (once, from this folder):

    npx vercel login                       # shahidjabbarpk@gmail.com
    npx vercel link --yes --project pakjobs-daily-proxy
    npx vercel env add CAREERJET_API_KEY production   # paste the key from the Careerjet publisher account
    npx vercel deploy --prod

Without the key the function answers `{ "type": "OFF" }` and the app simply hides the web-jobs section.
