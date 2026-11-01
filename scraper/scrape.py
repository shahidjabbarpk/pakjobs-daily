"""PakJobs Daily - official job detector.

Scrapes official Pakistani recruitment sources, normalises every vacancy into one
schema, de-duplicates against the previous run and writes:

    data/jobs.json   - all live jobs (newest first) that the app downloads
    data/new.json    - only the jobs first seen in this run (for push/notify)
    data/meta.json   - run timestamp + per-source counts/errors

Run:  python scraper/scrape.py            (from repo root)
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urljoin

import requests
import urllib3
from bs4 import BeautifulSoup

urllib3.disable_warnings()

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
JOBS_FILE = DATA / "jobs.json"
NEW_FILE = DATA / "new.json"
META_FILE = DATA / "meta.json"

KEEP_DAYS_AFTER_DEADLINE = 3      # keep expired jobs briefly so users see "closed"
KEEP_DAYS_WITHOUT_DEADLINE = 45
MAX_NJP_PAGES = 4

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 14) PakJobsDaily/1.0 (+job-alert-bot)",
    "Accept-Language": "en-US,en;q=0.9",
}
PKT = timezone(timedelta(hours=5))

session = requests.Session()
session.headers.update(HEADERS)


# --------------------------------------------------------------------------- helpers

def fetch(url: str, **kw) -> requests.Response:
    last = None
    for attempt in range(3):
        try:
            # several .gov.pk sites ship incomplete certificate chains
            r = session.get(url, timeout=30, verify=False, **kw)
            r.raise_for_status()
            return r
        except requests.RequestException as e:  # noqa: PERF203
            last = e
            time.sleep(2 * (attempt + 1))
    raise last  # type: ignore[misc]


def soup(url: str) -> BeautifulSoup:
    return BeautifulSoup(fetch(url).text, "html.parser")


def clean(text: str | None) -> str:
    return " ".join((text or "").split())


def job_id(source: str, key: str) -> str:
    return hashlib.sha1(f"{source}|{key}".encode()).hexdigest()[:16]


DATE_FORMATS = ("%d-%m-%Y", "%d/%m/%Y", "%d.%m.%Y", "%Y-%m-%d", "%d %b %Y", "%d %B %Y",
                "%b %d, %Y", "%B %d, %Y", "%d-%b-%Y", "%d %b, %Y")


def parse_date(text: str | None) -> str | None:
    if not text:
        return None
    t = clean(text).replace("Sept", "Sep")
    t = re.sub(r"(\d)(st|nd|rd|th)\b", r"\1", t)
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(t, fmt).date().isoformat()
        except ValueError:
            pass
    m = re.search(r"\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b", t)
    if m:
        d, mo, y = map(int, m.groups())
        try:
            return date(y, mo, d).isoformat()
        except ValueError:
            return None
    m = re.search(r"\b(\d{1,2}\s+[A-Za-z]{3,9},?\s+\d{4})\b", t)
    if m and m.group(1) != t:
        return parse_date(m.group(1))
    return None


# --------------------------------------------------------------------------- classification

CITIES = [
    "Islamabad", "Rawalpindi", "Lahore", "Karachi", "Peshawar", "Quetta", "Multan", "Faisalabad",
    "Hyderabad", "Gujranwala", "Sialkot", "Bahawalpur", "Sargodha", "Sukkur", "Abbottabad",
    "Mardan", "Gilgit", "Muzaffarabad", "Gwadar", "Larkana", "Sahiwal", "Dera Ghazi Khan",
    "Dera Ismail Khan", "Swat", "Turbat", "Mirpur", "Skardu", "Kohat", "Bannu", "Okara",
]
PROVINCES = {
    "Punjab": "Punjab", "Sindh": "Sindh", "Khyber Pakhtunkhwa": "KPK", "KPK": "KPK", "KP ": "KPK",
    "Balochistan": "Balochistan", "Gilgit-Baltistan": "GB", "Gilgit Baltistan": "GB",
    "Azad Jammu": "AJK", "AJK": "AJK", "Islamabad Capital": "ICT",
}
QUALS = [  # order matters: highest first
    ("PhD", r"\bph\.?\s?d\b|doctorate"),
    ("MPhil", r"\bm\.?\s?phil\b|ms\s*/\s*mphil|\bms\b(?![\s-]*office)"),
    ("Masters", r"\bmasters?\b|\bm\.?\s?a\b|\bm\.?\s?sc\b|\bmba\b|\bmcs\b|\bm\.?\s?com\b|16 years"),
    ("Bachelor", r"bachelor|graduat|\bb\.?\s?a\b|\bb\.?\s?sc\b|\bbs\b(?!-?\s?\d)|\bbba\b|\bmbbs\b|\bb\.?\s?e\b|\bllb\b|\bb\.?\s?com\b|14 years|\bdegree\b"),
    ("DAE", r"\bdae\b|diploma"),
    ("Intermediate", r"intermediate|\bf\.?\s?a\b|\bf\.?\s?sc\b|\bhssc\b|\bi\.?\s?com\b|12 years"),
    ("Matric", r"matric|\bssc\b|secondary school|10 years"),
    ("Middle", r"\bmiddle\b|primary|literate|under matric|8th"),
]


def detect_qualification(text: str) -> str | None:
    # adverts state the requirement first ("Intermediate with 40 wpm typing...") - take the earliest mention
    hits = [(m.start(), name) for name, rx in QUALS if (m := re.search(rx, text, re.I))]
    return min(hits)[1] if hits else None


def detect_cities(text: str) -> list[str]:
    out = [c for c in CITIES if re.search(rf"\b{re.escape(c)}\b", text, re.I)]
    for k, v in PROVINCES.items():
        if k.lower() in text.lower() and v not in out:
            out.append(v)
    return out[:6]


def detect_category(source: str, text: str) -> str:
    t = text.lower()
    if source in {"army", "navy", "paf"} or re.search(r"\b(army|navy|air force|paf|fc|rangers|cadet|sepoy|sailor|commission)\b", t):
        return "armed"
    if source in {"ppsc", "fpsc", "kppsc", "spsc", "bpsc"}:
        return "psc"
    if re.search(r"\bbank|state bank|sbp|nbp|hbl|ubl|mcb|meezan|finance officer|teller", t):
        return "banking"
    if re.search(r"\bpolice|asi\b|constable|sub inspector|motorway|ctd\b", t):
        return "police"
    if re.search(r"teacher|lecturer|educator|professor|school|college|university", t):
        return "education"
    if re.search(r"doctor|nurse|medical officer|hospital|health|pharmac|lady health", t):
        return "health"
    if re.search(r"\b(pvt|private limited|ltd|limited)\b|\(private\)", t):
        return "private"
    return "govt"


def make_job(*, source: str, key: str, title: str, org: str, url: str, **extra) -> dict:
    title, org = clean(title), clean(org)
    blob = " ".join([title, org, clean(extra.get("description")), clean(extra.get("location"))])
    job = {
        "id": job_id(source, key),
        "source": source,
        "title": title,
        "organization": org,
        # category from title/org only - descriptions mention "bank challan", "school certificate" etc.
        "category": extra.pop("category", None) or detect_category(source, f"{title} {org}"),
        "cities": extra.pop("cities", None) or detect_cities(blob),
        "qualification": extra.pop("qualification", None) or detect_qualification(blob),
        "url": url,
    }
    for k, v in extra.items():
        if v not in (None, "", []):
            job[k] = clean(v) if isinstance(v, str) and k != "description" else v
    return job


# --------------------------------------------------------------------------- sources

def lines_after(lines: list[str], label: str, n: int = 1) -> str | None:
    for i, ln in enumerate(lines):
        if ln.lower().rstrip(": ") == label.lower().rstrip(": "):
            nxt = lines[i + 1:i + 1 + n]
            return " ".join(nxt) if nxt else None
    return None


def njp_detail(url: str) -> dict | None:
    s = soup(url)
    h1 = s.find("h1")
    if not h1:
        return None
    title = clean(h1.get_text())
    org_block = h1.find_next_sibling("div")
    ps = [clean(p.get_text()) for p in org_block.find_all("p")] if org_block else []
    org = ps[0] if ps else "Government of Pakistan"
    lines = [clean(x) for x in s.get_text("\n").split("\n") if clean(x)]
    desc_start = lines.index("Job Description") + 1 if "Job Description" in lines else 0
    desc_end = next((i for i, l in enumerate(lines) if l in ("Read More", "Eligibility Criteria")), len(lines))
    desc_lines = lines[desc_start:desc_end] if desc_start else []
    description = "\n".join(desc_lines)[:2500]
    qual_line = next((l.partition(":")[2] for l in desc_lines if l.lower().startswith("qualification")), "")
    num = re.search(r"/jobs/(\d+)", url).group(1)
    logo = next((i["src"] for i in s.find_all("img", src=True) if "/images/profiles/" in i["src"]), None)
    vac = lines_after(lines, "Vacancies")
    return make_job(
        source="njp", key=num, title=title, org=org, url=url,
        description=description,
        grade=lines_after(lines, "Grade"),
        jobType=lines_after(lines, "Job Type"),
        vacancies=int(m.group(0)) if vac and (m := re.search(r"\d+", vac)) else None,
        domicile=lines_after(lines, "Domicile"),
        ageLimit=lines_after(lines, "Age Limit"),
        postedDate=parse_date(lines_after(lines, "Posted:")),
        lastDate=parse_date(lines_after(lines, "Deadline:")),
        qualification=detect_qualification(qual_line or description),
        cities=detect_cities(" ".join([title, org, description, lines_after(lines, "Domicile") or ""])),
        logo=logo,
        applyUrl=url,
    )


def scrape_njp(known: dict) -> list[dict]:
    ids: list[str] = []
    for page in ["https://www.njp.gov.pk/"] + [f"https://www.njp.gov.pk/jobs/live?page={p}" for p in range(1, MAX_NJP_PAGES + 1)]:
        try:
            html = fetch(page).text
        except requests.RequestException:
            continue
        for num in re.findall(r"njp\.gov\.pk/jobs/(\d+)[\"']", html):
            if num not in ids:
                ids.append(num)
    urls = [f"https://www.njp.gov.pk/jobs/{n}" for n in ids]
    # reuse previously parsed records - only hit detail pages for unseen vacancies
    reuse = {j["url"]: j for j in known.values() if j["source"] == "njp"}
    todo = [u for u in urls if u not in reuse]
    out = [reuse[u] for u in urls if u in reuse]
    with ThreadPoolExecutor(max_workers=6) as pool:
        for job in pool.map(lambda u: _safe(njp_detail, u), todo):
            if job:
                out.append(job)
    return out


def _safe(fn, *a):
    try:
        return fn(*a)
    except Exception as e:  # noqa: BLE001
        print(f"   ! {fn.__name__}{a}: {e!r}", file=sys.stderr)
        return None


def scrape_ppsc(_known: dict) -> list[dict]:
    base = "https://www.ppsc.gop.pk/"
    s = soup(base + "Jobs.aspx")
    out = []
    for tr in s.select("table tr"):
        tds = [clean(td.get_text(" ")) for td in tr.find_all("td")]
        # SR | AD NO | CASE NO | POST NAME | FEE | DEPARTMENT | AD DATE | CLOSING DATE
        if len(tds) < 8 or not re.match(r"^\d+$", tds[0]):
            continue
        sr, ad_no, case_no, post, fee, dept, ad_date, closing = tds[:8]
        link = tr.find("a", href=True)
        url = urljoin(base, link["href"]) if link else base + "Jobs.aspx"
        out.append(make_job(
            source="ppsc", key=f"{ad_no}|{case_no}", title=post, org=dept or "Punjab Public Service Commission",
            url=url, advertNo=ad_no, caseNo=case_no, fee=f"Rs {fee}" if fee else None,
            postedDate=parse_date(ad_date), lastDate=parse_date(closing),
            cities=["Punjab"], applyUrl="https://ppsc.gop.pk/",
            description=f"PPSC Advertisement {ad_no}, Case No. {case_no}. Department: {dept}.",
        ))
    return out


def scrape_fpsc(_known: dict) -> list[dict]:
    base = "https://www.fpsc.gov.pk/"
    s = soup(base + "Jobs")
    out = []
    for tr in s.select("table tr"):
        cells = tr.find_all("td")
        if len(cells) < 3:
            continue
        texts = [clean(c.get_text(" ")) for c in cells]
        title = max(texts, key=len)
        if len(title) < 6:
            continue
        link = tr.find("a", href=True)
        url = urljoin(base, link["href"]) if link else base + "Jobs"
        dates = [d for d in (parse_date(t) for t in texts) if d]
        out.append(make_job(
            source="fpsc", key=url + title, title=title, org="Federal Public Service Commission",
            url=url, lastDate=max(dates) if dates else None, postedDate=min(dates) if len(dates) > 1 else None,
            category="psc", cities=["Islamabad"], applyUrl="https://www.fpsc.gov.pk/",
            advertImage=url if re.search(r"\.(jpe?g|png|pdf)$", url, re.I) else None,
        ))
    return out


def scrape_kppsc(_known: dict) -> list[dict]:
    base = "https://www.kppsc.gov.pk/"
    s = soup(base + "advertisement")
    out = []
    for tr in s.select("table tr"):
        a = tr.find("a", href=True)
        title = clean(tr.get_text(" ")).lstrip("❯ ").strip()
        if not a or not re.search(r"advertisement|advt|recruitment|posts? of", title, re.I):
            continue
        if re.search(r"result|schedule|merit|interview|answer key|disqualif|notice|archive", title, re.I):
            continue
        url = urljoin(base, a["href"])
        out.append(make_job(
            source="kppsc", key=url, title=title, org="Khyber Pakhtunkhwa Public Service Commission",
            url=url, category="psc", cities=["KPK"], applyUrl="https://www.kppsc.gov.pk/",
            advertImage=url, postedDate=parse_date(re.search(r"\d{2}[-/.]\d{2}[-/.]\d{4}", title).group(0)) if re.search(r"\d{2}[-/.]\d{2}[-/.]\d{4}", title) else None,
        ))
    return out


NAVY_QUAL = {"pn cadet": "Intermediate", "ssc": "Bachelor", "sailors": "Matric", "marines": "Matric"}


def scrape_navy(_known: dict) -> list[dict]:
    base = "https://www.joinpaknavy.gov.pk/"
    s = soup(base)
    out = []
    for box in s.select(".advertisement_box"):
        ad = box.find("a", string=re.compile("View Ad", re.I))
        if not ad:
            continue  # cadre card without an open advert
        name = clean(box.find("h4").get_text()) if box.find("h4") else "Pakistan Navy"
        crit = box.find("a", string=re.compile("Criteria", re.I))
        ad_url = urljoin(base, ad["href"])
        posted = parse_date(re.search(r"(\d{2}-\d{2}-\d{4})", ad_url).group(1)) if re.search(r"(\d{2}-\d{2}-\d{4})", ad_url) else None
        hint = ad_url.rsplit("/", 1)[-1]
        hint = re.sub(r"^\d{2}-\d{2}-\d{4}-|\.(jpe?g|png|pdf)$", "", hint, flags=re.I)
        detail = f": {clean(hint[3:])}" if hint.upper().startswith("AD ") else ""
        out.append(make_job(
            source="navy", key=ad_url, title=f"Join Pak Navy as {name}{detail}",
            org="Pakistan Navy", url=base, category="armed", cities=["All Pakistan"],
            qualification=NAVY_QUAL.get(name.lower(), "Any"),
            advertImage=ad_url, criteriaUrl=urljoin(base, crit["href"]) if crit else None,
            postedDate=posted, applyUrl=urljoin(base, "registrationform"),
            description=f"Pakistan Navy has announced induction as {name}. See the official advertisement and selection criteria for age, height and qualification requirements.",
        ))
    return out


ARMY_INFO = {
    "reg_comission": ("Commission (PMA Long Course)", "Intermediate"),
    "sldr_recruitment": ("Soldier Recruitment", "Matric"),
    "lcc_comission": ("Lady Cadet Course", "Bachelor"),
    "ssc_comission": ("Short Service Commission", "Bachelor"),
    "tcc_comission": ("Technical Cadet Course", "Intermediate"),
    "amc_comission": ("Army Medical Corps", "Bachelor"),
    "afns_comission": ("AFNS Nursing", "Intermediate"),
    "icto_comission": ("ICTO Commission", "Bachelor"),
}


def scrape_army(_known: dict) -> list[dict]:
    data = fetch("https://joinpakarmy.gov.pk/api/course_list/").json()
    out = []
    for c in data:
        if not c.get("visibility_status") or not c.get("status"):
            continue
        kind, qual = ARMY_INFO.get(c.get("abbr"), ("Recruitment", None))
        name = clean(c.get("course_name"))
        desc = (f"Registration: {c.get('registration_start_date')} to {c.get('registration_end_date')}. "
                f"Tests: {c.get('tests_start_date')} to {c.get('tests_end_date')}. "
                f"Date of birth between {c.get('max_dob')} and {c.get('min_dob')} (age cut-off {c.get('age_cutoff')}).")
        out.append(make_job(
            source="army", key=str(c["id"]), title=f"Pak Army {kind} - {name}", org="Pakistan Army",
            url="https://joinpakarmy.gov.pk/", category="armed", cities=["All Pakistan"], qualification=qual,
            postedDate=c.get("registration_start_date"), lastDate=c.get("registration_end_date"),
            description=desc, applyUrl=f"https://joinpakarmy.gov.pk/course?com_type={c.get('abbr')}",
            ageLimit=f"Born {c.get('max_dob')} – {c.get('min_dob')}",
        ))
    return out


SOURCES = {
    "njp": scrape_njp,
    "ppsc": scrape_ppsc,
    "fpsc": scrape_fpsc,
    "kppsc": scrape_kppsc,
    "army": scrape_army,
    "navy": scrape_navy,
}


# --------------------------------------------------------------------------- main

def load_previous() -> dict[str, dict]:
    if JOBS_FILE.exists():
        try:
            return {j["id"]: j for j in json.loads(JOBS_FILE.read_text(encoding="utf-8"))["jobs"]}
        except (ValueError, KeyError):
            pass
    return {}


def still_relevant(job: dict, today: date) -> bool:
    if job.get("lastDate"):
        return date.fromisoformat(job["lastDate"]) >= today - timedelta(days=KEEP_DAYS_AFTER_DEADLINE)
    first = date.fromisoformat(job["firstSeen"][:10])
    return first >= today - timedelta(days=KEEP_DAYS_WITHOUT_DEADLINE)


def main() -> int:
    DATA.mkdir(exist_ok=True)
    now = datetime.now(PKT)
    today = now.date()
    previous = load_previous()
    merged: dict[str, dict] = {}
    meta = {"updatedAt": now.isoformat(timespec="seconds"), "sources": {}}

    for name, fn in SOURCES.items():
        t0 = time.time()
        try:
            jobs = fn(previous)
            meta["sources"][name] = {"count": len(jobs), "ok": True}
        except Exception as e:  # noqa: BLE001  one broken site must never stop the others
            jobs = [j for j in previous.values() if j["source"] == name]
            meta["sources"][name] = {"count": len(jobs), "ok": False, "error": str(e)[:200]}
        print(f"{name:6} {len(jobs):3} jobs  {time.time() - t0:5.1f}s  {'' if meta['sources'][name]['ok'] else 'ERROR ' + meta['sources'][name]['error']}")
        for j in jobs:
            j["firstSeen"] = previous.get(j["id"], {}).get("firstSeen") or now.isoformat(timespec="seconds")
            merged.setdefault(j["id"], j)  # dedupe across pages/sources

    # jobs that vanished from a source page but are still open stay listed
    for jid, old in previous.items():
        if jid not in merged and old.get("lastDate") and date.fromisoformat(old["lastDate"]) >= today:
            merged[jid] = old

    live = [j for j in merged.values() if still_relevant(j, today)]
    live.sort(key=lambda j: (j.get("postedDate") or j["firstSeen"][:10], j["firstSeen"]), reverse=True)
    new = [j for j in live if j["id"] not in previous]

    meta["total"], meta["new"] = len(live), len(new)
    JOBS_FILE.write_text(json.dumps({"updatedAt": meta["updatedAt"], "jobs": live}, ensure_ascii=False, indent=1), encoding="utf-8")
    NEW_FILE.write_text(json.dumps({"updatedAt": meta["updatedAt"], "jobs": new}, ensure_ascii=False, indent=1), encoding="utf-8")
    META_FILE.write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"total {len(live)} live jobs, {len(new)} new")
    return 0


if __name__ == "__main__":
    sys.exit(main())
