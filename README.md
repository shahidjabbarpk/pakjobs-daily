# PakJobs Daily — Govt & Private Job Alerts (React Native / Expo 57)

Pakistan job alerts app. It detects new vacancies from official sites on its own, notifies users, and is set up for AdMob.

## How auto-detection works

```
 official sites ──► scraper/scrape.py ──► data/jobs.json ──► app (fetch every ~30 min in background)
 (NJP, PPSC, FPSC,     (GitHub Actions,       (hosted feed)        │
  KPPSC, Army API,      every hour, free)                          ├─ new ids? → local notification
  Navy)                                                            └─ feed down? → on-device detector
                                                                       (src/lib/detect.ts scrapes NJP
                                                                        + Army API directly)
```

| Source | Method | Notes |
|---|---|---|
| National Jobs Portal (njp.gov.pk) | HTML list + detail pages | Richest source: grade, deadline, domicile, age, qualification |
| Pak Army (joinpakarmy.gov.pk) | Official JSON API `/api/course_list/` | PMA, soldier, LCC, SSC… with registration dates |
| Pak Navy (joinpaknavy.gov.pk) | Advert cards | Advert image + criteria PDF |
| PPSC / FPSC / KPPSC | Advert tables | Picked up automatically whenever adverts are open |

- **Geo-blocking:** PPSC, Join Pak Army and Join Pak Navy refuse connections from GitHub's foreign runners (timeouts or 403). NJP, FPSC and KPPSC work from GitHub. The app therefore always checks the Army API from the phone, which works from Pakistan. To cover PPSC and Navy on the server as well, run the scraper from a Pakistani IP, for example a self-hosted GitHub Actions runner on a PC in Pakistan (`runs-on: self-hosted`), or Task Scheduler running `python scraper/scrape.py` followed by a `git push`.
- **Dedup:** every job gets a stable id (`sha1(source|key)`). Ids already seen are never notified twice, by the server (`firstSeen`) or by the phone (`seenIds`).
- **Notifications:** `expo-background-task` runs about every 30 min (the OS decides the exact time). It sends notifications only for the user's chosen categories and city. Taps deep-link to `pakjobs://job/<id>`.
- **Deadline reminder:** the bell on the job detail page schedules a local notification for 9 AM PKT on the day before the deadline.

## Features
Home (stats, 8 categories, city chips, "closing soon" carousel, latest jobs), search and filters (category / qualification / city / sort), job detail (live countdown, eligibility grid, official advert image or PDF, criteria, Apply Now, share, reminder), offline bookmarks, Urdu/English toggle (Nastaliq font), light/dark/system theme, and a government-affiliation disclaimer (needed for Play Store policy).

**Ads:** an adaptive banner at the bottom of Home, a native ad after every 4th job, and an interstitial when a job opens (at most once every 3 minutes). Test ads are used until you fill in `PROD_AD_UNITS` in `src/lib/config.ts`. Before release, also replace `androidAppId` in `app.json` with your real AdMob app id.

## Commands
```bash
npm run scrape        # run detector locally -> data/jobs.json
npm run seed          # bundle latest jobs into the app (src/data/seed.json)
npm run typecheck
npm run apk           # release APK (JDK 17, ANDROID_HOME set) -> android/app/build/outputs/apk/release
npm run aab           # Play Store bundle
```
Release signing: put `credentials/keystore.properties` (storeFile, storePassword, keyAlias, keyPassword) and the keystore in `credentials/`. Without them, the build is debug-signed.

## Going live (one-time)
1. Push this folder to a **public** GitHub repo (the feed is public job data). `.github/workflows/scrape.yml` then refreshes `data/jobs.json` every hour.
2. Set `FEED_URL` in `src/lib/config.ts` (or `EXPO_PUBLIC_FEED_URL`) to that repo's raw `data/jobs.json` URL. Any other static host works too (Vercel, your EC2).
3. Fill in the AdMob ids and build the AAB.

## Adding a source
Write `scrape_<name>(known) -> list[dict]` in `scraper/scrape.py` using `make_job(...)`, then add it to `SOURCES`. If one source fails, the others still run, and the failing source keeps its previous jobs.
