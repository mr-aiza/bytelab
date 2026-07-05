# پوشه Telegram

این پوشه همه‌چیز مربوط به فرم تماس و اتصال به ربات تلگرام رو یکجا نگه می‌داره.

## فایل‌ها
- `contact.html` — صفحه‌ی فرم تماس (مستقل، با CSS داخلی، بدون وابستگی به فایل‌های بیرون پوشه)
- `worker.js` — کد Cloudflare Worker که پیام فرم رو به ربات تلگرام می‌فرسته (این فایل روی گیت‌هاب‌پیجز اجرا نمی‌شه، جدا روی Cloudflare دیپلوی می‌شه)

## مراحل راه‌اندازی

1. یه بات تلگرام با [@BotFather](https://t.me/BotFather) بسازید و توکنش رو بگیرید
2. `chat_id` خودتون رو با `https://api.telegram.org/bot<TOKEN>/getUpdates` پیدا کنید
3. توی [dash.cloudflare.com](https://dash.cloudflare.com) یه Worker جدید بسازید و محتوای `worker.js` رو توش بذارید
4. توی تنظیمات Worker، دو تا Secret اضافه کنید: `TELEGRAM_BOT_TOKEN` و `TELEGRAM_CHAT_ID`
5. آدرس Worker (چیزی مثل `https://xxx.yyy.workers.dev`) رو کپی کنید
6. توی `contact.html`، مقدار `TELEGRAM_WORKER_URL` رو با همون آدرس جایگزین کنید
7. توی `worker.js`، مقدار `Access-Control-Allow-Origin` رو با آدرس واقعی سایتتون (`https://mr-aiza.github.io`) چک کنید که درست باشه

## لینک صفحه بعد از آپلود
`https://mr-aiza.github.io/bytelab/telegram/contact.html`
