# PakJobs Daily – Google Ads App Campaign guide

Yeh guide Danish ke liye hai: Google Ads mein PakJobs Daily ki "App campaign" kaise chalani hai.
Sab kaam **shahidjabbarpk@gmail.com** account se karein. Payment method aur card aap khud daalenge, Claude kabhi nahi daalega.

App: `com.pakjobs.daily.mza` (v1.0.6 se Firebase Analytics events ke saath)
Firebase project: `pakjobs-daily-sj`

---

## Qadam 0 – Pehle yeh 2 kaam (sirf ek dafa)

1. **Firebase mein Google Analytics on karein**
   Firebase console → `pakjobs-daily-sj` → ⚙️ Project settings → **Integrations** → Google Analytics → **Enable**.
   Naya Analytics account banayein ("PakJobs Daily"), country Pakistan, aur shartein khud padh kar maanein.
   Iske baghair app ke events (job_view, job_save waghera) Google tak nahi pahunchenge.
2. **v1.0.6 (versionCode 7) Play par production mein upload ho**, kyun ke events isi version se aate hain.

Check: Firebase → Analytics → **DebugView / Realtime** mein 24 ghante ke andar events nazar aane lagenge.

---

## Qadam 1 – Google Ads account

1. https://ads.google.com par shahidjabbarpk@gmail.com se jayein.
2. "Switch to Expert Mode" chunein (Smart campaign nahi). Account ki currency **PKR**, time zone **Pakistan (Karachi)**. Currency baad mein badal nahi sakti.
3. Billing mein payment method **aap khud** daalein.

## Qadam 2 – Play Console aur Firebase ko link karein

1. **Play Console:** Google Ads → Tools (🔧) → **Data manager** → Google Play → Link. Phir Play Console (Setup → Linked services → Google Ads) mein request **Approve** karein.
2. **Firebase:** Firebase → Project settings → Integrations → **Google Ads** → Link → apna Ads account chunein.
   (Analytics ke andar bhi: Admin → Product links → Google Ads links. Firebase wala link yahi bana deta hai.)

## Qadam 3 – Conversions import karein

Google Ads → Goals → Conversions → **+ New conversion action** → App → **Google Analytics 4 properties (Firebase)** → yeh events chunein:

| Event | Matlab | Ads mein kaise rakhein |
|---|---|---|
| `first_open` | App pehli dafa khuli = install | **Primary** (shuru ke 2–3 hafte) |
| `alert_setup` | User ne apna shehar chun kar alerts on kiye | Primary (baad mein) |
| `job_apply_click` | Official link khol kar apply kiya | Primary (baad mein) |
| `job_save` | Job save ki | Secondary |
| `job_view` | Job kholi | Secondary |
| `job_share` | Job share ki | Secondary |
| `mock_test_complete` | Mock test poora kiya | Secondary |
| `cv_created` | CV PDF bana | Secondary |
| `notification_open` | Notification se app khuli (retention) | Secondary |
| `app_share` | "Share app" dabaya | Secondary |

Event list mein naam tab aate hain jab har event kam az kam ek dafa Firebase tak pahunch chuka ho. Is liye upload ke baad 1–2 din intezar karein, ya khud phone par yeh kaam kar ke dekh lein.

## Qadam 4 – App campaign banayein

Campaigns → **+ New campaign** → Objective: **App promotion** → Campaign subtype: **App installs** → Platform: Android → app search: `com.pakjobs.daily.mza`.

- **Campaign name:** `PakJobs – Installs – PK`
- **Locations:** Pakistan
- **Languages:** English, Urdu
- **Bidding:** pehle 2–3 hafte **Install volume** ("Maximize installs"). Target cost per install shuru mein na lagayein. Pehla hafta Google ko seekhne dein.
- **Budget:** pehle 7 din **Rs 1,000–1,500 rozana**. Yeh Rs 7,000–10,500 hafta banta hai.
  - 7 din baad dekhein: cost per install (CPI) kitna hai? Pakistan mein job apps ka CPI aksar Rs 15–60 hota hai, lekin yeh andaza hai, guarantee nahi.
  - Agar `alert_setup` wale users 30% se zyada hain to budget 20–30% barhayein.
- **Start:** jab v1.0.6 production mein live ho aur Analytics on ho.

### 2–3 hafte baad: In-app actions
Jab hafte mein ~50+ `alert_setup` ya `job_apply_click` aa rahe hon, tab nayi campaign banayein: subtype **App engagement / In-app actions** ("Install + in-app actions"), conversion = `alert_setup` + `job_apply_click`, bidding **Target CPA**. Target CPA ko pichhle hafte ke asli CPA ke barabar se shuru karein. Purani installs campaign 1 hafta saath chalayein, phir band kar dein.

---

## Qadam 5 – Ads ka material (assets)

Google khud ads banata hai. Aap usko text, images aur video dete hain.

### Headlines (max 30 characters, 4–5 lagayein)
```
Govt Jobs in Pakistan Daily
Job Alerts for Your District
PPSC FPSC NTS Jobs in 1 App
Results & Roll No Slips Free
Sarkari Naukri Alerts Daily
```

### Descriptions (max 90 characters, 4–5 lagayein)
```
NJP, PPSC, FPSC, KPPSC, NTS, Army & Navy jobs with last date alerts for your district.
Results, roll number slips and test schedules from all commissions in one free app.
Prepare with timed mock tests, MCQs and official past papers. English and Urdu.
Make a professional CV with photo and download it as PDF in minutes. 100% free.
Never miss a last date again. Get alerts for new govt and private jobs near you.
```

### Images
`store-listing/` folder mein pehle se hain:
- `feature-graphic-1024x500.png` (landscape 1.91:1 ke qareeb hai)
- `screenshots/01.png` … `06.png` (portrait)
- `icon-512.png`

Mazeed images (Canva par 5 minute ka kaam):
- **1200×628 (landscape):** hara background, "Sarkari Naukri ke Alerts – Apne District ke" + phone screenshot.
- **1200×1200 (square):** "PPSC • FPSC • NTS • Army – Ek App" + logo.
- **1200×1500 (portrait):** home screen screenshot + "Free Download".

### Video idea (sab se zyada installs video se aati hain)
15–20 second ka vertical (9:16) video, phone screen recording ke saath:
1. 0–3 sec: "Sarkari naukri ka last date miss ho gaya?" (bada text)
2. 3–8 sec: app khulti hai, district Lahore chunte hain, "Turn on job alerts"
3. 8–13 sec: notification aati hai "PPSC: 120 posts", job khulti hai
4. 13–18 sec: mock test aur CV maker jaldi se
5. Aakhir: logo + "PakJobs Daily – Google Play par free"

Video YouTube par **Unlisted** upload karein aur uska link campaign ke Videos mein daalein. Urdu voice-over ho to aur behtar.

---

## Har hafte kya dekhna hai (5 minute)

| Kahan | Kya dekhein | Agar kharab ho |
|---|---|---|
| Google Ads → Campaign | Installs, CPI | CPI 2 hafte tak bohat zyada ho to headlines/images badlein |
| Firebase → Analytics → Events | `alert_setup` ÷ `first_open` | 30% se kam ho to onboarding behtar karni hai (Claude ko batayein) |
| Firebase → Retention | Day-7 retention | 15% se kam ho to notifications/alerts check karein |
| Play Console → Android vitals | Crash rate | 1% se upar ho to Claude se fix karwayein |
| Play Console → Ratings | Nayi reviews | Har review ka jawab dein (daily marketing task drafts banata hai) |

## Yaad rakhein
- Campaign ki settings ek dafa mein bohat zyada na badlein. Har badlav ke baad Google ko 5–7 din "learning" chahiye.
- App ki listing (title/description) review mein ho to bhi campaign chal sakti hai.
- Budget, card aur payment hamesha aap khud set karein.
