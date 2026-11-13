# PakJobs Daily – Marketing Plan (shuru: 13 Nov 2026)

Goal: "Govt jobs" category mein Play Store par top. Seedhi baat: #1 rank ki koi guarantee nahi de sakta – Play ranking installs, retention, ratings aur keywords se banti hai. Neeche wo sab kaam hain jo ranking upar le jaate hain, impact ke hisab se.

## ✅ Ho gaya (13 Nov)
1. **SEO website** https://pakjobs-daily.vercel.app – har open job ka apna page (224 pages), Google for Jobs ka `JobPosting` schema, shehar/department/qualification pages, Results, Past Papers, 6 guides, sitemap, robots. Har ghante feed update → site khud rebuild, expire jobs khud hat jaati hain.
2. Har page par "Download on Google Play" button + sticky button (utm tracking: Play Console → Acquisition reports mein "website" source dikhega).
3. IndexNow ping (Bing/Yandex) – `node scripts/indexnow.mjs`.
4. ASO listing v2 (English + Urdu): `store-listing/listing-v2-aso.md`.
5. Daily social post generator: `node scripts/daily-post.mjs` → `marketing/daily-post.txt`.

## ⏳ Aap ki ijazat / account chahiye
| Kaam | Kyun | Kaun |
|---|---|---|
| Google Search Console mein site add + sitemap submit | Google ko 260 pages jaldi index karwana, Google Jobs mein aana | Main Chrome se kar sakta hoon (shahidjabbarpk) |
| Play Console: title/short desc/full desc v2 + Urdu translation | Play search ranking ka sab se bara factor | Main Chrome se, aap ki "haan" ke baad |
| Telegram channel + bot token | Rozana jobs auto-post (GitHub Actions se, free) | Aap channel banayein, main bot laga doon |
| WhatsApp Channel "PakJobs Daily" | Pakistan mein sab se zyada reach | Sirf aap ke phone se ban sakta hai; rozana `daily-post.txt` paste |
| Facebook Page | Groups mein share ke liye | Aap ka FB account |

## 📅 Rozana (10 min)
- `node scripts/daily-post.mjs` → text copy → WhatsApp Channel + Status, Facebook page, 3–5 job groups (sirf wo groups jahan job posts allowed hain – spam nahi).
- Har review ka jawab 24 ghante mein.

## 📈 Next app update mein (ek hi build, sab saath)
- In-app review prompt (2 jobs save ya 1 mock test ke baad) → zyada ratings = ranking.
- Job share message mein website link (har share = naya visitor + install).
- "Share app" button settings mein + referral text.

## 💰 Agar budget ho (optional, aap ka faisla)
- Google Ads **App campaign** (installs), Pakistan, Rs 1,000–2,000/day se start – Pakistan mein install ~Rs 15–40. Pehle 1,000 installs ranking ko "kick" dete hain.
- Job-groups ke admins ko chhota sponsored post.

## Kya NAHI karna
- Fake reviews/installs khareedna – Play app ban kar deta hai.
- Groups mein spam/comment spam.
- "Free/Best/#1" title mein – Play reject karta hai.
