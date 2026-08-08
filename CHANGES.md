# بسته‌ی نهایی — همه‌ی ابزارهای این نشست، ادغام‌شده در یک زیپ

این بسته جایگزین سه زیپ قبلی (`bytelab-dns-whois-tools`, `bytelab-dev-tools`,
`bytelab-ip-tools`) می‌شه. اون سه‌تا رو دور بریز — همه‌شون این‌جا با هم
ادغام شدن و هر فایل فقط یه نسخه‌ی نهایی و کامل داره، بدون نیاز به merge دستی.

## فایل‌های جدید (۴ صفحه‌ی ابزار)
| فایل | کارکرد | نیاز به Worker؟ |
|---|---|---|
| `dns-checker.html` | رکوردهای A/AAAA/CNAME/MX/TXT/NS/SOA یه دامنه | نه — سمت مرورگر با DoH کلادفلر |
| `whois.html` | ثبت‌کننده، تاریخ ثبت/انقضا، Name Serverهای دامنه | **بله** — `/api/whois` رو از `bytelab-users-worker.js` می‌خواد |
| `dev-tools.html` | هش‌ساز (MD5/SHA)، تبدیل مبنا، تبدیل واحد | نه — کاملاً سمت مرورگر |
| `ip-tools.html` | آی‌پی خودت یا هر آی‌پی دیگه + موقعیت/ISP/ASN | نه — سرویس رایگان ipwho.is |

هر چهارتا از الگوی طراحی `site-health-checker.html`/`qr.html` پیروی می‌کنن
(همون توکن‌های رنگی، فونت، ساختار کارت). `dns-checker.html` و `whois.html`
فرم درخواست/لید هم دارن (چون طبیعتاً به فروش خدمات دامنه/هاست مرتبطن)؛
`dev-tools.html` و `ip-tools.html` فرم لید ندارن، چون مثل `qr.html` و
`image-compressor.html` ابزار محض‌ان.

## فایل‌هایی که باید دوباره دیپلوی بشن (Worker)

### ۱) `bytelab-users-worker.js` → `bytelab-users.bytelab.workers.dev`
- تابع `handleWhois()` + مسیر `GET /api/whois?domain=...` اضافه شد.
- Rate limit: هر IP روزی ۲۰ استعلام، با همون `USERS_KV` موجود.
- برای `.ir` (و هر TLD دیگه‌ای که RDAP عمومی نداشته باشه) پاسخ
  `{ unsupported: true }` می‌ده تا کلاینت به `whois.nic.ir` هدایت کنه.

### ۲) `telegram/worker.js` → `bytelab-telegram.bytelab.workers.dev`
- دو نوع لید جدید: `dns_check_request`, `whois_lookup_lead`
- به `RATE_LIMITS` اضافه شدن (۵ در ساعت، مثل بقیه‌ی ابزارها)
- متن پیام تلگرام هر دو نوع اضافه شد
- به هر ۷ جایی که لیست انواع لید تو فایل تکرار شده بود (آمار داشبورد،
  پیام روزانه، لیست لیدها، جستجو، خروجی فایل، بک‌آپ) اضافه شدن

## فایل‌هایی که فقط استاتیک‌ان (با پوش عادی گیت/Pages جا می‌افتن)

### `admin.html`
- لیبل فارسی دو نوع لید جدید (`dns_check_request`, `whois_lookup_lead`)
- فیلد `domain` تو پاپ‌آپ جزئیات لید نمایش داده می‌شه

### `header.js`
- هر ۴ ابزار جدید به دراپ‌داون «ابزارها» و به `TRACKED_PAGES` اضافه شدن.
  **عمداً** به نوار پایین (`DOCK_TABS`) اضافه نشدن چون اون فقط برای ۵ صفحه‌ی
  اصلی سایته (خانه/نمونه‌کار/برآورد/چت/دانلود).

### `scripts/generate-sitemap.py`
- هر ۴ صفحه به `STATIC_PAGES` اضافه شدن تا سایت‌مپ خودکار شاملشون بشه.

## چک‌لیست نهایی

1. این ۹ فایل رو با همون مسیر نسبی (`telegram/worker.js` و
   `scripts/generate-sitemap.py` تو ساب‌فولدرشون) جایگزین ریپو کن.
2. **`bytelab-users-worker.js`** رو دیپلوی کن → تست:
   `https://bytelab-users.bytelab.workers.dev/api/whois?domain=google.com`
   باید JSON با `registrar`/`createdDate`/`expiresDate`/`nameServers` بده.
   برای `?domain=example.ir` باید `{"unsupported":true}` بده.
3. **`telegram/worker.js`** رو دیپلوی کن.
4. بعد از دیپلوی، هر ۴ صفحه رو یه بار تست کن (خصوصاً whois.html که به
   Worker جدید وابسته‌ست) و مطمئن شو لیدهای جدید تو ادمین پنل با لیبل درست
   ظاهر می‌شن.

## چیزی که لازم نیست انجام بدی
- `dns-checker.html`, `dev-tools.html`, `ip-tools.html` کاملاً سمت مرورگرن
  و همین الان (بدون منتظر دیپلوی Worker) قابل جا انداختنن.
- Worker های دیگه‌ت (`bytelab-admin-worker.js`, AI، سلف‌بات و غیره) دست‌نخورده
  موندن.
