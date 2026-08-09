# بسته‌ی کامل نهایی — همه‌ی ابزارهای این نشست

این بسته جایگزین همه‌ی زیپ‌های قبلی می‌شه (`bytelab-dns-whois-tools`,
`bytelab-dev-tools`, `bytelab-ip-tools`, `bytelab-tools-final`). همه‌شون رو
دور بریز — فقط همین یکی رو لازم داری.

## ۶ صفحه‌ی ابزار جدید

| فایل | کارکرد | Worker لازم؟ |
|---|---|---|
| `dns-checker.html` | رکوردهای A/AAAA/CNAME/MX/TXT/NS/SOA یه دامنه | نه — DoH کلادفلر سمت مرورگر |
| `whois.html` | ثبت‌کننده، تاریخ ثبت/انقضا، Name Serverها | **بله** — `/api/whois` از `bytelab-users-worker.js` |
| `dev-tools.html` | هش‌ساز (MD5/SHA)، تبدیل مبنا، تبدیل واحد | نه |
| `ip-tools.html` | آی‌پی خودت/هر آی‌پی + موقعیت/ISP/ASN | نه — سرویس رایگان ipwho.is |
| `image-converter.html` | تبدیل دسته‌ای عکس بین PNG/JPG/WebP + دانلود ZIP | نه |
| `pdf-tools.html` | عکس→PDF، PDF→عکس، ادغام چند PDF | نه |

همه از الگوی طراحی موجود سایت پیروی می‌کنن. `dns-checker.html` و
`whois.html` فرم درخواست/لید دارن (مرتبط با فروش خدمات دامنه)؛ بقیه
مثل `qr.html`/`image-compressor.html` ابزار محضن، بدون فرم لید.

### نکته‌ی فنی `image-converter.html` و `pdf-tools.html`
این دو از کتابخانه‌های خارجی روی cdnjs استفاده می‌کنن (دقیقاً همون الگویی
که خودت برای CodeMirror تو `playground.html` استفاده کردی):
- `image-converter.html`: JSZip (برای دانلود دسته‌ای ZIP)
- `pdf-tools.html`: jsPDF، pdf.js، pdf-lib، JSZip

⚠️ این کتابخانه‌ها رو من از حافظه/الگوی رایج نسخه‌گذاری کردم (نسخه‌های
پین‌شده‌ی معمول روی cdnjs) ولی چون ابزار من به اینترنت زنده دسترسی نداشت،
نتونستم لینک‌ها رو مستقیم تست کنم. **اولین بار که این دو صفحه رو باز
می‌کنی، Console مرورگر رو چک کن** — اگه خطای «لود نشدن اسکریپت» دیدی، کافیه
تو cdnjs.com اسم کتابخونه رو سرچ کنی و آخرین نسخه‌ی موجود رو جایگزین
لینک‌های داخل `<head>` این دو فایل کنی.

## فایل‌هایی که باید دوباره دیپلوی بشن (Worker)

### `bytelab-users-worker.js` → `bytelab-users.bytelab.workers.dev`
- تابع `handleWhois()` + مسیر `GET /api/whois?domain=...`
- Rate limit: هر IP روزی ۲۰ استعلام، با `USERS_KV` موجود
- برای `.ir` (یا هر TLD بدون RDAP عمومی) پاسخ `{unsupported:true}`

### `telegram/worker.js` → `bytelab-telegram.bytelab.workers.dev`
- دو نوع لید جدید: `dns_check_request`, `whois_lookup_lead`
- `RATE_LIMITS`، متن پیام تلگرام، و هر ۷ جای لیست انواع لید آپدیت شد

## فایل‌های استاتیک (فقط پوش/دیپلوی عادی، بدون کار Worker)

- **`admin.html`** — لیبل فارسی دو نوع لید جدید + نمایش فیلد `domain`
- **`header.js`** — هر ۶ ابزار به دراپ‌داون «ابزارها» + `TRACKED_PAGES`
  اضافه شدن. عمداً به `DOCK_TABS` پایین صفحه اضافه نشدن.
- **`scripts/generate-sitemap.py`** — هر ۶ صفحه به `STATIC_PAGES` اضافه شد

## چک‌لیست نهایی

1. این ۱۱ فایل رو با همون مسیر نسبی جایگزین ریپو کن.
2. `bytelab-users-worker.js` و `telegram/worker.js` رو دیپلوی کن.
3. تست: `https://bytelab-users.bytelab.workers.dev/api/whois?domain=google.com`
4. صفحات `image-converter.html` و `pdf-tools.html` رو یه‌بار با فایل واقعی
   امتحان کن و Console رو چک کن (به‌خاطر نکته‌ی بالا درباره‌ی نسخه‌ی CDN).
5. لیدهای جدید DNS/WHOIS رو تو ادمین پنل چک کن.

## چیزی که لازم نیست انجام بدی
- `dns-checker.html`, `dev-tools.html`, `ip-tools.html`,
  `image-converter.html`, `pdf-tools.html` کاملاً سمت مرورگرن و همین الان
  (بدون منتظر دیپلوی Worker) قابل جا انداختنن — فقط `whois.html` به
  Worker جدید نیاز داره.
- Worker های دیگه‌ت دست‌نخورده موندن.
