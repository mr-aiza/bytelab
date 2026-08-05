// ==========================================================
// اندپوینت آنالیزور سایت — این تابع را داخل Worker اصلی بایت‌لب
// در مسیر GET /api/audit صدا بزن (همانند الگوی /api/portfolio)
// نمونه اتصال در پایین فایل آمده است.
// ==========================================================

async function handleAudit(request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (!target) {
    return new Response(JSON.stringify({ error: 'آدرس سایت ارسال نشده' }), { status: 400, headers: corsHeaders });
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
    if (!['http:', 'https:'].includes(targetUrl.protocol)) throw new Error('bad protocol');
  } catch (e) {
    return new Response(JSON.stringify({ error: 'آدرس نامعتبر است' }), { status: 400, headers: corsHeaders });
  }

  const checks = [];
  let score = 0;
  const maxScore = 100;

  // ---- ۱. زمان پاسخ‌دهی (سرعت) ----
  let html = '';
  let responseTimeMs = null;
  let httpsUsed = targetUrl.protocol === 'https:';
  let fetchOk = false;

  const start = Date.now();
  try {
    const resp = await fetch(targetUrl.href, {
      redirect: 'follow',
      cf: { cacheTtl: 0 },
      headers: { 'User-Agent': 'ByteLabAuditBot/1.0 (+https://bytelabpro.xyz)' }
    });
    responseTimeMs = Date.now() - start;
    fetchOk = resp.ok;
    // اگر ری‌دایرکت نهایی روی https رفته باشد هم قبول است
    httpsUsed = resp.url ? resp.url.startsWith('https://') : httpsUsed;
    html = await resp.text();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'سایت در دسترس نیست یا فچ آن ناموفق بود' }), { status: 502, headers: corsHeaders });
  }

  // ---- ۱. SSL ----
  if (httpsUsed) {
    checks.push({ status: 'ok', title: 'گواهی SSL', desc: 'سایت با اتصال امن HTTPS بارگذاری می‌شود.' });
    score += 20;
  } else {
    checks.push({ status: 'bad', title: 'گواهی SSL', desc: 'سایت روی HTTP ناامن اجرا می‌شود؛ گوگل و مرورگرها این را به کاربر هشدار می‌دهند.' });
  }

  // ---- ۲. سرعت ----
  if (responseTimeMs !== null) {
    if (responseTimeMs < 800) {
      checks.push({ status: 'ok', title: 'سرعت بارگذاری', desc: `زمان پاسخ سرور: ${responseTimeMs} میلی‌ثانیه — سریع و مناسب.` });
      score += 25;
    } else if (responseTimeMs < 2000) {
      checks.push({ status: 'warn', title: 'سرعت بارگذاری', desc: `زمان پاسخ سرور: ${responseTimeMs} میلی‌ثانیه — قابل بهبود است.` });
      score += 12;
    } else {
      checks.push({ status: 'bad', title: 'سرعت بارگذاری', desc: `زمان پاسخ سرور: ${responseTimeMs} میلی‌ثانیه — کند است و باعث از دست رفتن بازدیدکننده می‌شود.` });
    }
  }

  // ---- ۳. عنوان صفحه (Title) ----
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const titleText = titleMatch ? titleMatch[1].trim() : '';
  if (titleText && titleText.length >= 10 && titleText.length <= 65) {
    checks.push({ status: 'ok', title: 'عنوان صفحه (Title)', desc: `عنوان مناسبی دارد: «${titleText.slice(0, 50)}${titleText.length > 50 ? '…' : ''}»` });
    score += 12;
  } else if (titleText) {
    checks.push({ status: 'warn', title: 'عنوان صفحه (Title)', desc: 'عنوان صفحه وجود دارد اما طول آن برای سئو ایده‌آل نیست (بهتر است ۱۰ تا ۶۵ کاراکتر باشد).' });
    score += 6;
  } else {
    checks.push({ status: 'bad', title: 'عنوان صفحه (Title)', desc: 'صفحه اصلی تگ Title ندارد؛ این یکی از مهم‌ترین فاکتورهای سئو است.' });
  }

  // ---- ۴. توضیحات متا (Meta Description) ----
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
  const descText = descMatch ? descMatch[1].trim() : '';
  if (descText && descText.length >= 50) {
    checks.push({ status: 'ok', title: 'توضیحات متا (Meta Description)', desc: 'صفحه توضیحات متا مناسبی برای نتایج گوگل دارد.' });
    score += 12;
  } else if (descText) {
    checks.push({ status: 'warn', title: 'توضیحات متا (Meta Description)', desc: 'توضیحات متا کوتاه یا ناقص است.' });
    score += 6;
  } else {
    checks.push({ status: 'bad', title: 'توضیحات متا (Meta Description)', desc: 'صفحه توضیحات متا ندارد؛ این متن معمولاً زیر لینک سایت در نتایج گوگل نمایش داده می‌شود.' });
  }

  // ---- ۵. ریسپانسیو بودن (Viewport) ----
  const hasViewport = /<meta[^>]*name=["']viewport["']/i.test(html);
  if (hasViewport) {
    checks.push({ status: 'ok', title: 'سازگاری با موبایل', desc: 'سایت تگ viewport دارد و برای نمایش در موبایل آماده‌سازی شده.' });
    score += 20;
  } else {
    checks.push({ status: 'bad', title: 'سازگاری با موبایل', desc: 'تگ viewport یافت نشد؛ احتمالاً سایت در گوشی موبایل به‌درستی نمایش داده نمی‌شود.' });
  }

  // ---- ۶. تگ H1 ----
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1Count === 1) {
    checks.push({ status: 'ok', title: 'ساختار عنوان‌بندی (H1)', desc: 'صفحه دقیقاً یک تگ H1 دارد؛ ساختار مناسب برای سئو.' });
    score += 6;
  } else if (h1Count > 1) {
    checks.push({ status: 'warn', title: 'ساختار عنوان‌بندی (H1)', desc: `صفحه ${h1Count} تگ H1 دارد؛ بهتر است فقط یکی باشد.` });
    score += 3;
  } else {
    checks.push({ status: 'bad', title: 'ساختار عنوان‌بندی (H1)', desc: 'صفحه تگ H1 ندارد.' });
  }

  // ---- ۷. favicon ----
  const hasFavicon = /<link[^>]*rel=["'][^"']*icon[^"']*["']/i.test(html);
  if (hasFavicon) {
    checks.push({ status: 'ok', title: 'آیکون سایت (Favicon)', desc: 'فاوآیکون تعریف شده است.' });
    score += 5;
  } else {
    checks.push({ status: 'warn', title: 'آیکون سایت (Favicon)', desc: 'فاوآیکون یافت نشد؛ جزئیات کوچک اما روی حرفه‌ای بودن سایت اثر دارد.' });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return new Response(JSON.stringify({ score, checks, checkedUrl: targetUrl.href }), { headers: corsHeaders });
}

// ==========================================================
// نمونه اتصال — داخل fetch handler اصلی Worker این خط را اضافه کن:
//
// if (url.pathname === '/api/audit') {
//   return handleAudit(request);
// }
// ==========================================================
