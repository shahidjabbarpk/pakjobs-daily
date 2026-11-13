# Daily jobs slides + short video for Instagram / TikTok / YouTube Shorts / LinkedIn.
#   python marketing/social/make-slides.py [hours=24]
# Output: marketing/social/out/<date>/  post-01..NN.png (1080x1350, IG/LinkedIn carousel),
#         story-01..NN.png (1080x1920), short.mp4 (1080x1920, ~3s per slide), caption-<channel>.txt
import json, os, sys, re, subprocess, textwrap, unicodedata, urllib.request, datetime as dt
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SITE = 'https://pakjobs-daily.vercel.app'
PLAY = 'https://play.google.com/store/apps/details?id=com.pakjobs.daily.mza'
HOURS = float(sys.argv[1]) if len(sys.argv) > 1 else 24
F = 'C:/Windows/Fonts/'
def font(names, size):
    for n in names:
        try: return ImageFont.truetype(F + n, size)
        except OSError: pass
    return ImageFont.load_default()
B = lambda s: font(['segoeuib.ttf', 'arialbd.ttf'], s)
R = lambda s: font(['segoeui.ttf', 'arial.ttf'], s)
EMO = lambda s: font(['seguiemj.ttf'], s)
GREEN, DARK, LIGHT, INK = '#0b5d2a', '#064019', '#e9f7ef', '#063d1a'

def slug(s):
    s = unicodedata.normalize('NFKD', str(s or '')).lower()
    return (re.sub(r'^-+|-+$', '', re.sub(r'[^a-z0-9]+', '-', s))[:70]) or 'job'

feed = json.load(urllib.request.urlopen('https://raw.githubusercontent.com/shahidjabbarpk/pakjobs-daily/main/data/jobs.json'))
now = dt.datetime.now(dt.timezone.utc)
today = (now + dt.timedelta(hours=5)).date().isoformat()
def ts(j):
    try: return dt.datetime.fromisoformat(str(j.get('firstSeen')).replace('Z', '+00:00'))
    except Exception: return dt.datetime(2000, 1, 1, tzinfo=dt.timezone.utc)
open_jobs = [j for j in feed['jobs'] if not j.get('lastDate') or j['lastDate'] >= today]
new = sorted([j for j in open_jobs if ts(j) >= now - dt.timedelta(hours=HOURS)], key=ts, reverse=True)
mode = 'new'
if len(new) < 3:
    mode = 'closing'
    new = sorted([j for j in open_jobs if j.get('lastDate')], key=lambda j: j['lastDate'])[:5]
seen, jobs = set(), []
for j in new:
    if j.get('organization') not in seen: seen.add(j.get('organization')); jobs.append(j)
jobs = (jobs + [j for j in new if j not in jobs])[:5]
total = len(new)
OUT = os.path.join(HERE, 'out', today); os.makedirs(OUT, exist_ok=True)
ICON = Image.open(os.path.join(ROOT, 'store-listing', 'icon-512.png')).convert('RGBA')
def fmt(d):
    try: return dt.date.fromisoformat(d).strftime('%d %b')
    except Exception: return d

def base(h):
    im = Image.new('RGB', (1080, h), GREEN); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 1080, 130], fill=DARK)
    ic = ICON.resize((90, 90)); m = Image.new('L', (90, 90), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, 89, 89], 20, fill=255)
    im.paste(ic, (40, 20), m)
    d.text((150, 38), 'PakJobs Daily', font=B(48), fill='white')
    d.text((1040, 50), dt.date.fromisoformat(today).strftime('%d %b %Y'), font=R(36), fill='#bff5d0', anchor='ra')
    d.rectangle([0, h - 110, 1080, h], fill=DARK)
    d.text((540, h - 55), 'Free app: PakJobs Daily • Google Play', font=B(38), fill='#bff5d0', anchor='mm')
    return im, d

def wrap(d, text, f, width):
    words, lines, cur = str(text).split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f) <= width: cur = t
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def cover(h):
    im, d = base(h); mid = h // 2
    head = (f'Aaj ki {total} Nayi' if mode == 'new' else 'Last Date Qareeb!')
    sub = ('Sarkari Naukriyan' if mode == 'new' else 'In jobs ke liye jaldi apply karein')
    y = mid - 260
    for ln in wrap(d, head, B(110), 960): d.text((540, y), ln, font=B(110), fill='white', anchor='ma'); y += 130
    for ln in wrap(d, sub, B(72), 960): d.text((540, y + 10), ln, font=B(72), fill='#ffd54f', anchor='ma'); y += 90
    d.text((540, y + 80), 'Swipe karein  →', font=B(52), fill='#bff5d0', anchor='ma')
    d.text((540, y + 170), 'Govt Jobs in Pakistan', font=R(44), fill='white', anchor='ma')
    return im

def job_slide(j, i, h):
    im, d = base(h)
    sm = h == 1350
    TF, LF, VF = B(56 if sm else 66), R(32 if sm else 38), B(40 if sm else 48)
    top = 175 if sm else 330
    d.rounded_rectangle([50, top, 1030, h - 140], 36, fill=LIGHT)
    y = top + 40
    d.text((100, y), f'JOB {i}/{len(jobs)}', font=B(36), fill='#17A45C'); y += 60
    for ln in wrap(d, j.get('title', ''), TF, 860)[:3]: d.text((100, y), ln, font=TF, fill=INK); y += (68 if sm else 82)
    y += 20
    rows = [('Department', j.get('organization')), ('Grade', j.get('grade')),
            ('Location', ', '.join((j.get('cities') or [])[:4])), ('Qualification', j.get('qualification')),
            ('Last date', fmt(j['lastDate']) if j.get('lastDate') else None)]
    for k, v in rows:
        if not v: continue
        d.text((100, y), k, font=LF, fill='#2e7d4f'); y += (40 if sm else 48)
        for ln in wrap(d, v, VF, 860)[:2]: d.text((100, y), ln, font=VF, fill=INK); y += (50 if sm else 60)
        y += (14 if sm else 24)
    d.text((540, h - 195), 'Apply link & detail: PakJobs Daily app', font=B(34 if sm else 40), fill='#17A45C', anchor='mm')
    return im

def cta(h):
    im, d = base(h)
    big = ICON.resize((320, 320)); m = Image.new('L', (320, 320), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, 319, 319], 70, fill=255)
    y = h // 2 - 420
    im.paste(big, (380, y), m); y += 370
    for ln in ['Har nayi Sarkari Job ka', 'alert seedha mobile par']: d.text((540, y), ln, font=B(64), fill='white', anchor='ma'); y += 82
    y += 30
    for ln in ['• Apne district ki jobs', '• Last date reminder', '• 100% Free']:
        d.text((540, y), ln, font=B(50), fill='#bff5d0', anchor='ma'); y += 70
    y += 40
    d.rounded_rectangle([170, y, 910, y + 120], 60, fill='#ffd54f')
    d.text((540, y + 60), 'Download: PakJobs Daily', font=B(52), fill=INK, anchor='mm')
    d.text((540, y + 175), 'Google Play par search karein "PakJobs"', font=R(40), fill='white', anchor='ma')
    return im

for h, pre in [(1350, 'post'), (1920, 'story')]:
    slides = [cover(h)] + [job_slide(j, i + 1, h) for i, j in enumerate(jobs)] + [cta(h)]
    for n, s in enumerate(slides, 1): s.save(os.path.join(OUT, f'{pre}-{n:02d}.png'))
N = len(jobs) + 2

subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '1/3', '-i', os.path.join(OUT, 'story-%02d.png'),
                '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest',
                '-c:v', 'libx264', '-r', '30', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-t', str(3 * N),
                os.path.join(OUT, 'short.mp4')], check=True)

def caption(src, links=True):
    lines = [f"🆕 Aaj ki {total} nayi Sarkari Naukriyan ({dt.date.fromisoformat(today).strftime('%d %b %Y')})" if mode == 'new'
             else '⏳ In sarkari jobs ki last date qareeb hai – jaldi apply karein!', '']
    for j in jobs:
        lines.append(f"🔹 {j.get('title')}" + (f" – {j.get('organization')}" if j.get('organization') else '')
                     + (f" | Last date: {fmt(j['lastDate'])}" if j.get('lastDate') else ''))
        if links: lines.append(f"   👉 {SITE}/jobs/{slug(j.get('title'))}-{j['id']}")
    if total > len(jobs): lines.append(f"\n➕ {total - len(jobs)} aur jobs app mein")
    lines += ['', '🔔 Har nayi job ka alert apne mobile par – FREE app "PakJobs Daily" download karein:',
              f"{PLAY}&referrer=utm_source%3D{src}%26utm_medium%3Ddaily_slides" if links else '👉 Link bio mein / Google Play par "PakJobs" search karein',
              '', '#GovtJobs #PakistanJobs #SarkariNaukri #JobsInPakistan #PPSC #FPSC #NTS #Jobs2026']
    return '\n'.join(lines)
open(os.path.join(OUT, 'caption-instagram.txt'), 'w', encoding='utf-8').write(caption('instagram', links=False))
open(os.path.join(OUT, 'caption-tiktok.txt'), 'w', encoding='utf-8').write(caption('tiktok', links=False))
open(os.path.join(OUT, 'caption-linkedin.txt'), 'w', encoding='utf-8').write(caption('linkedin'))
yt_title = (f"Aaj ki {total} Nayi Sarkari Naukriyan | Govt Jobs Pakistan {dt.date.fromisoformat(today).strftime('%d %b %Y')} #shorts"
            if mode == 'new' else f"Last Date Qareeb! Govt Jobs Pakistan {dt.date.fromisoformat(today).strftime('%d %b %Y')} #shorts")
open(os.path.join(OUT, 'youtube-title.txt'), 'w', encoding='utf-8').write(yt_title[:100])
open(os.path.join(OUT, 'caption-youtube.txt'), 'w', encoding='utf-8').write(caption('youtube'))
print(OUT, mode, total, N)
