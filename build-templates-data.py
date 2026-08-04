#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build-templates-data.py
-------------------------------------------------------------------------
هر وقت هر کدوم از فایل‌های داخل portfolio/ رو عوض کردی، یا یه قالب جدید
اضافه کردی، فقط این اسکریپت رو اجرا کن:

    python3 build-templates-data.py

و templates-data.js دوباره از روی فایل‌های واقعی ساخته می‌شه.
اگه قالب جدید اضافه کردی، کافیه یه خط به دیکشنری FILES زیر اضافه کنی؛
کلید (مثلاً "cafe") همون کلیدیه که باید تو TEMPLATES آبجکت editor.js و
تو دکمه‌ی data-key تو editor.html هم استفاده بشه.
"""

import json
import os

# کلید: مسیر فایل HTML (نسبت به ریشه‌ی سایت)
FILES = {
    "tashrifat": "portfolio/tasharifat-royaee-v2.html",
    "gold": "portfolio/zarrin-gallery-gold-shop.html",
    "car": "portfolio/galeriy-mashin.html",
    "cafe": "portfolio/cafe-restoran-amber.html",
    # برای اضافه‌کردن قالب جدید، فقط یه خط این‌جا اضافه کن:
    # "newkey": "portfolio/my-new-template.html",
}

OUTPUT_FILE = "templates-data.js"

def main():
    lines = [
        "/* =========================================================================",
        "   templates-data.js — بایت‌لب / محتوای کامل قالب‌های نمونه‌کار، به‌صورت رشته",
        "   این فایل به‌صورت خودکار با build-templates-data.py ساخته می‌شه.",
        "   دستی ویرایشش نکن — به‌جاش فایل‌های portfolio/*.html رو عوض کن و",
        "   دوباره اسکریپت رو اجرا کن.",
        "   ========================================================================= */",
        "window.BYTELAB_TEMPLATES_HTML = {",
    ]

    missing = []
    for key, path in FILES.items():
        if not os.path.exists(path):
            missing.append(path)
            continue
        with open(path, encoding="utf-8") as f:
            content = f.read()
        lines.append(f"  {key}: {json.dumps(content, ensure_ascii=False)},")

    lines.append("};")

    if missing:
        print("⚠ این فایل‌ها پیدا نشدن و رد شدن:")
        for m in missing:
            print("   -", m)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"✅ {OUTPUT_FILE} ساخته شد ({len(FILES) - len(missing)} قالب).")

if __name__ == "__main__":
    main()
