#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
اسکریپت ساخت خودکار sitemap.xml برای بایت‌لب (bytelabpro.xyz)
================================================================
چرا این اسکریپت لازمه؟
  سایت‌مپ‌های دستی معمولاً یک تاریخ ثابت و تکراری برای همه‌ی صفحات دارن
  (مثلاً همه <lastmod>2026-08-06</lastmod>). گوگل به همچین تاریخ‌های
  «تقلبی» اعتماد نمی‌کنه و همین باعث می‌شه صفحه‌ها دیرتر خزیده (crawl)
  و ایندکس بشن، یا حتی سایت‌مپ توی Search Console با خطای
  «واکشی نشد / Couldn't fetch» مواجه بشه.

این اسکریپت چیکار می‌کنه؟
  ۱) برای هر صفحه‌ی ثابت سایت، تاریخ آخرین تغییرش رو مستقیم از
     تاریخچه‌ی واقعی گیت (git log) می‌خونه — نه یک تاریخ ثابت.
  ۲) لیست مقاله‌های منتشرشده‌ی بلاگ رو مستقیم از API ورکر تلگرام
     می‌گیره و آدرس هرکدوم (blog-post.html?id=...) رو هم به سایت‌مپ
     اضافه می‌کنه. یعنی با هر اجرا (چه با پوش کد، چه زمان‌بندی‌شده)
     مقاله‌های تازه خودکار وارد سایت‌مپ می‌شن، بدون دست‌کاری دستی.
  ۳) اگه واکشی از API بلاگ به هر دلیلی (قطعی، تایم‌اوت و...) شکست
     بخوره، اسکریپت کرش نمی‌کنه؛ فقط اون بخش رو نادیده می‌گیره تا
     دیپلوی سایت هیچ‌وقت به‌خاطر این اسکریپت خراب نشه.

این اسکریپت باید از ریشه‌ی مخزن (کنار index.html) و ترجیحاً داخل
GitHub Actions با تاریخچه‌ی کامل گیت (fetch-depth: 0) اجرا بشه.
"""

import json
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone
from xml.sax.saxutils import escape

BASE_URL = "https://bytelabpro.xyz"
BLOG_API_URL = "https://bytelab-telegram.bytelab.workers.dev/api/blog"

# صفحات ثابت قابل ایندکس سایت: (مسیر فایل نسبت به ریشه‌ی مخزن، اولویت، تناوب تغییر)
# فقط صفحات عمومی و بدون نیاز به ورود اینجا لیست شدن؛ صفحات کاربری/مدیریتی
# (admin.html، account.html، profile.html، editor.html، playground.html، chat*.html، ...)
# عمداً اینجا نیستن چون توی robots.txt هم بلاک شدن.
STATIC_PAGES = [
    ("index.html", "1.0", "weekly"),
    ("tarahi-site.html", "0.9", "weekly"),
    ("tarahi-app.html", "0.9", "weekly"),
    ("khadamat-computer.html", "0.9", "weekly"),
    ("portfolio.html", "0.8", "weekly"),
    ("blog.html", "0.8", "daily"),
    ("chat.html", "0.6", "monthly"),
    ("chat-widget.html", "0.4", "monthly"),
    ("hazine-tarahi-site.html", "0.6", "monthly"),
    ("app-ekhtesasi.html", "0.6", "monthly"),
    ("audit.html", "0.6", "monthly"),
    ("project-estimator.html", "0.6", "monthly"),
    ("site-health-checker.html", "0.5", "monthly"),
    ("dns-checker.html", "0.5", "monthly"),
    ("whois.html", "0.5", "monthly"),
    ("dev-tools.html", "0.5", "monthly"),
    ("ip-tools.html", "0.5", "monthly"),
    ("qr.html", "0.5", "monthly"),
    ("invoice.html", "0.5", "monthly"),
    ("portfolio/zarrin-gallery-gold-shop.html", "0.5", "monthly"),
    ("portfolio/galeriy-mashin.html", "0.5", "monthly"),
    ("portfolio/tasharifat-royaee-v2.html", "0.5", "monthly"),
    ("portfolio/cafe-restoran-amber.html", "0.5", "monthly"),
    ("submit/index.html", "0.3", "yearly"),
]


def today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def git_lastmod(path: str) -> str:
    """آخرین تاریخ کامیت واقعی این فایل رو از گیت برمی‌گردونه.
    اگه فایل توی تاریخچه‌ی گیت نبود (مثلاً چون fetch-depth محدوده)
    یا دستور گیت شکست بخوره، امروز رو به‌عنوان مقدار جایگزین می‌ده."""
    try:
        out = subprocess.check_output(
            ["git", "log", "-1", "--format=%cs", "--", path],
            stderr=subprocess.DEVNULL,
        ).decode("utf-8").strip()
        if out:
            return out
    except Exception:
        pass
    return today()


def fetch_blog_posts() -> list:
    """لیست مقالات منتشرشده‌ی بلاگ رو از API ورکر تلگرام می‌گیره.
    در صورت هر خطایی، لیست خالی برمی‌گردونه (fail-safe)."""
    try:
        req = urllib.request.Request(
            BLOG_API_URL, headers={"User-Agent": "bytelab-sitemap-bot"}
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        if not data.get("ok"):
            return []
        return data.get("posts", []) or []
    except Exception as err:
        print(
            f"⚠️  واکشی مقالات بلاگ برای سایت‌مپ ناموفق بود، این بخش نادیده گرفته می‌شه: {err}",
            file=sys.stderr,
        )
        return []


def post_date_to_str(value) -> str:
    """createdAt پست (رشته‌ی ISO یا timestamp عددی) رو به فرمت YYYY-MM-DD تبدیل می‌کنه."""
    if not value:
        return today()
    try:
        text = str(value)
        if text.isdigit():
            ts = int(text)
            if ts > 10_000_000_000:  # میلی‌ثانیه بود، به ثانیه تبدیل می‌شه
                ts //= 1000
            return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")
        return text[:10]
    except Exception:
        return today()


def url_entry(loc: str, lastmod: str, changefreq: str, priority: str) -> str:
    return (
        "  <url>\n"
        f"    <loc>{escape(loc)}</loc>\n"
        f"    <lastmod>{lastmod}</lastmod>\n"
        f"    <changefreq>{changefreq}</changefreq>\n"
        f"    <priority>{priority}</priority>\n"
        "  </url>\n"
    )


def main() -> None:
    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>\n',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n',
        "  <!-- صفحات ثابت سایت — تاریخ هر صفحه مستقیم از تاریخچه‌ی واقعی گیت خونده می‌شه -->\n",
    ]

    for path, priority, changefreq in STATIC_PAGES:
        loc = f"{BASE_URL}/{path}"
        lastmod = git_lastmod(path)
        parts.append(url_entry(loc, lastmod, changefreq, priority))

    posts = fetch_blog_posts()
    if posts:
        parts.append(
            "\n  <!-- مقالات بلاگ — خودکار از API بلاگ خونده می‌شن، نیازی به آپدیت دستی نیست -->\n"
        )
        for post in posts:
            post_id = post.get("id")
            if not post_id:
                continue
            loc = f"{BASE_URL}/blog-post.html?id={post_id}"
            lastmod = post_date_to_str(post.get("createdAt"))
            parts.append(url_entry(loc, lastmod, "monthly", "0.6"))

    parts.append("\n</urlset>\n")

    with open("sitemap.xml", "w", encoding="utf-8") as f:
        f.write("".join(parts))

    print(
        f"✅ sitemap.xml ساخته شد: {len(STATIC_PAGES)} صفحه‌ی ثابت + {len(posts)} مقاله‌ی بلاگ"
    )


if __name__ == "__main__":
    main()
