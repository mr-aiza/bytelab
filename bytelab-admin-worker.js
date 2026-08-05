// ============================================================
//  بایت‌لب — Worker اختصاصیِ پنل مدیریت وب (admin.html)
//  نسخه: 1.0
//
//  این وورکر جدا از bytelab-telegram اجراست ولی از همون KV Namespace
//  (LEADS_KV) استفاده می‌کنه، پس همه‌ی داده‌ها (لیدها، نمونه‌کارها،
//  پست‌های بلاگ، سوالات متداول، بنر، وضعیت آنلاین/آفلاین) بین این
//  پنل وب و ربات تلگرام کاملاً مشترک و هم‌زمانه.
//
//  قابلیت‌ها:
//   • ورود امن با رمز عبور + توکن نشست (بدون کوکی، فقط Bearer)
//   • محدودسازی تلاش ورود ناموفق (Rate limit / قفل موقت)
//   • داشبورد آماری کامل
//   • مدیریت کامل بلاگ (شامل نوشتن پیش‌نویس با AI)
//   • مدیریت کامل سوالات متداول (FAQ)
//   • مدیریت کامل نمونه‌کارهای گالری (تایید/رد/ویرایش/حذف)
//   • مدیریت بنر اعلانات سایت
//   • مدیریت وضعیت آنلاین/آفلاین پاسخگویی
//   • مدیریت لیدها (فرم تماس): جستجو، تغییر وضعیت، یادداشت، خروجی CSV
//   • لاگ فعالیت‌های ادمین (Audit Log)
//   • بک‌آپ کامل + بازگردانی از فایل بک‌آپ
//
//  متغیرهای محیطی لازم (Cloudflare → Settings → Variables & Secrets):
//   ADMIN_PANEL_PASSWORD   رمز عبور ورود به پنل وب          (Secret)
//   TELEGRAM_BOT_TOKEN     توکن ربات تلگرام (برای ارسال بک‌آپ)  (Secret، اختیاری)
//   TELEGRAM_CHAT_ID       چت‌آیدی مالک ربات                  (Secret، اختیاری)
//   ADMIN_SESSION_HOURS    مدت اعتبار نشست به ساعت (اختیاری، پیش‌فرض 12)
//   ADMIN_ALLOWED_ORIGIN   دامنه‌ی مجاز CORS (اختیاری، پیش‌فرض *)
//   AI_ENDPOINT            آدرس Worker هوش‌مصنوعی bytelab-ai (اختیاری،
//                          پیش‌فرض همون آدرسی که در editor.js/chat.html هست)
//
//  KV Binding لازم: LEADS_KV → دقیقاً همون namespace ای که وورکر
//  bytelab-telegram (telegram/worker.js) استفاده می‌کنه.
// ============================================================

const DEFAULT_SESSION_HOURS = 12;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_MINUTES = 15;
const ACTIVITY_LOG_CAP = 300;
const DEFAULT_AI_ENDPOINT = "https://bytelab-ai.bytelab.workers.dev/";

const BLOG_WRITER_SYSTEM_HINT =
  "تو یه نویسنده محتوای سئوی حرفه‌ای برای وبلاگ «بایت‌لب» هستی؛ یک کسب‌وکار خدمات فناوری در کرج با سه حوزه: طراحی وب‌سایت، طراحی اپلیکیشن اندروید/iOS، و خدمات کامپیوتر. " +
  "فقط و فقط یک JSON خام و معتبر با این ساختار دقیق برگردون، بدون هیچ توضیح اضافه، بدون بک‌تیک یا Markdown دورش: " +
  '{"title":"...","excerpt":"...","tag":"طراحی سایت","content":"پاراگراف اول...\\n\\nپاراگراف دوم..."}. ' +
  'فیلد tag باید دقیقاً یکی از این چهار مقدار باشه: "طراحی سایت", "طراحی اپلیکیشن", "خدمات کامپیوتر", "نکات فنی". ' +
  "محتوا فارسی، طبیعی، مفید (نه تبلیغاتی صرف)، حدود ۳۰۰ تا ۵۰۰ کلمه، بدون تگ HTML یا Markdown داخل content.";

// ------------------------------------------------------------
//  CORS
// ------------------------------------------------------------
function corsHeaders(request, env) {
  const allowed = env.ADMIN_ALLOWED_ORIGIN || "*";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(obj, status, request, env) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(request, env) },
  });
}

// ------------------------------------------------------------
//  ابزارهای عمومی
// ------------------------------------------------------------
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function generateRandomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return arrayBufferToBase64(bytes.buffer).replace(/[^a-zA-Z0-9]/g, "");
}

function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
}

async function readJson(request) {
  try {
    return await request.json();
  } catch (e) {
    return {};
  }
}

function slugify(title) {
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "post";
}

// ============================================================
//  احراز هویت ادمین (نشست ساده مبتنی بر توکن تصادفی در KV)
// ============================================================
function sessionSeconds(env) {
  const hours = Number(env.ADMIN_SESSION_HOURS) > 0 ? Number(env.ADMIN_SESSION_HOURS) : DEFAULT_SESSION_HOURS;
  return Math.round(hours * 3600);
}

async function createAdminSession(env) {
  const token = generateRandomToken();
  await env.LEADS_KV.put("admin_session:" + token, String(Date.now()), { expirationTtl: sessionSeconds(env) });
  return token;
}

async function revokeAdminSession(token, env) {
  if (token) await env.LEADS_KV.delete("admin_session:" + token);
}

async function isAuthorized(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) return false;
  const val = await env.LEADS_KV.get("admin_session:" + token);
  return !!val;
}

// ---- محدودسازی تلاش ورود ناموفق ----
async function getLoginGuard(env, ip) {
  const raw = await env.LEADS_KV.get("loginguard:" + ip);
  return raw ? JSON.parse(raw) : { count: 0, lockUntil: 0 };
}
async function saveLoginGuard(env, ip, rec) {
  await env.LEADS_KV.put("loginguard:" + ip, JSON.stringify(rec), { expirationTtl: LOGIN_LOCK_MINUTES * 60 * 2 });
}
async function clearLoginGuard(env, ip) {
  await env.LEADS_KV.delete("loginguard:" + ip);
}

// ============================================================
//  لاگ فعالیت ادمین (Audit Log)
// ============================================================
async function logActivity(env, action, detail) {
  try {
    const raw = await env.LEADS_KV.get("admin_activity");
    let logs = raw ? JSON.parse(raw) : [];
    logs.unshift({ action, detail: detail || null, time: Date.now() });
    if (logs.length > ACTIVITY_LOG_CAP) logs = logs.slice(0, ACTIVITY_LOG_CAP);
    await env.LEADS_KV.put("admin_activity", JSON.stringify(logs));
  } catch (err) {
    // ثبت لاگ نباید کل عملیات رو خراب کنه
  }
}

// ============================================================
//  بلاگ  (کلید: blog:{id})
// ============================================================
async function saveBlogPost(env, item) {
  await env.LEADS_KV.put(`blog:${item.id}`, JSON.stringify(item));
}
async function getBlogPost(env, id) {
  const raw = await env.LEADS_KV.get(`blog:${id}`);
  return raw ? JSON.parse(raw) : null;
}
async function deleteBlogPost(env, id) {
  await env.LEADS_KV.delete(`blog:${id}`);
}
async function listBlogPosts(env) {
  const list = await env.LEADS_KV.list({ prefix: "blog:" });
  const values = await Promise.all(list.keys.map((k) => env.LEADS_KV.get(k.name)));
  return values.filter(Boolean).map((v) => JSON.parse(v)).sort((a, b) => b.createdAt - a.createdAt);
}

// ============================================================
//  سوالات متداول (FAQ)  (کلید: faq:{id})
// ============================================================
async function saveFaq(env, item) {
  await env.LEADS_KV.put(`faq:${item.id}`, JSON.stringify(item));
}
async function deleteFaq(env, id) {
  await env.LEADS_KV.delete(`faq:${id}`);
}
async function listFaqs(env) {
  const list = await env.LEADS_KV.list({ prefix: "faq:" });
  const values = await Promise.all(list.keys.map((k) => env.LEADS_KV.get(k.name)));
  return values.filter(Boolean).map((v) => JSON.parse(v)).sort((a, b) => a.createdAt - b.createdAt);
}

// ============================================================
//  گالری / نمونه‌کارها  (کلید: portfolio:{id})
// ============================================================
async function savePortfolioItem(env, item) {
  await env.LEADS_KV.put(`portfolio:${item.id}`, JSON.stringify(item));
}
async function getPortfolioItem(env, id) {
  const raw = await env.LEADS_KV.get(`portfolio:${id}`);
  return raw ? JSON.parse(raw) : null;
}
async function deletePortfolioItem(env, id) {
  await env.LEADS_KV.delete(`portfolio:${id}`);
}
async function listPortfolioItems(env) {
  const list = await env.LEADS_KV.list({ prefix: "portfolio:" });
  const values = await Promise.all(list.keys.map((k) => env.LEADS_KV.get(k.name)));
  return values.filter(Boolean).map((v) => JSON.parse(v)).sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.createdAt - a.createdAt);
}

// ============================================================
//  بنر اعلانات سایت  (کلید: config:banner)
// ============================================================
async function getBanner(env) {
  const raw = await env.LEADS_KV.get("config:banner");
  return raw ? JSON.parse(raw) : { enabled: false, text: "", link: "", style: "info" };
}
async function saveBanner(env, banner) {
  await env.LEADS_KV.put("config:banner", JSON.stringify(banner));
}

// ============================================================
//  وضعیت آنلاین/آفلاین  (کلید: config:status)
// ============================================================
async function getStatus(env) {
  const raw = await env.LEADS_KV.get("config:status");
  return raw ? JSON.parse(raw) : { online: true, updatedAt: Date.now() };
}
async function saveStatus(env, status) {
  await env.LEADS_KV.put("config:status", JSON.stringify(status));
}

// ============================================================
//  لیدها (فرم تماس و غیره)  (کلید: lead:{id})
// ============================================================
async function saveLead(env, lead) {
  await env.LEADS_KV.put(`lead:${lead.id}`, JSON.stringify(lead));
}
async function getLead(env, id) {
  const raw = await env.LEADS_KV.get(`lead:${id}`);
  return raw ? JSON.parse(raw) : null;
}
async function deleteLead(env, id) {
  await env.LEADS_KV.delete(`lead:${id}`);
}
async function listLeads(env) {
  const list = await env.LEADS_KV.list({ prefix: "lead:" });
  const values = await Promise.all(list.keys.map((k) => env.LEADS_KV.get(k.name)));
  return values.filter(Boolean).map((v) => JSON.parse(v)).sort((a, b) => b.createdAt - a.createdAt);
}

// ============================================================
//  آمار داشبورد
// ============================================================
function isToday(ts) {
  const d1 = new Date(ts), d2 = new Date();
  return d1.toDateString() === d2.toDateString();
}

async function buildStats(env) {
  const [leads, blogPosts, faqs, portfolioItems, banner, status] = await Promise.all([
    listLeads(env),
    listBlogPosts(env),
    listFaqs(env),
    listPortfolioItems(env),
    getBanner(env),
    getStatus(env),
  ]);

  return {
    leads: {
      total: leads.length,
      today: leads.filter((l) => isToday(l.createdAt)).length,
      new: leads.filter((l) => l.status === "new").length,
      contacted: leads.filter((l) => l.status === "contacted").length,
    },
    blog: {
      total: blogPosts.length,
      published: blogPosts.filter((b) => b.status === "published").length,
      draft: blogPosts.filter((b) => b.status === "draft").length,
      today: blogPosts.filter((b) => isToday(b.createdAt)).length,
    },
    faq: { total: faqs.length },
    portfolio: {
      total: portfolioItems.length,
      approved: portfolioItems.filter((p) => p.status === "approved").length,
      pending: portfolioItems.filter((p) => p.status === "pending").length,
      rejected: portfolioItems.filter((p) => p.status === "rejected").length,
      featured: portfolioItems.filter((p) => p.featured).length,
    },
    banner,
    status,
  };
}

// ============================================================
//  بک‌آپ / بازگردانی
// ============================================================
async function buildBackupPayload(env) {
  const [leads, blogPosts, faqs, portfolioItems, banner, status] = await Promise.all([
    listLeads(env),
    listBlogPosts(env),
    listFaqs(env),
    listPortfolioItems(env),
    getBanner(env),
    getStatus(env),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    leads,
    blogPosts,
    faqs,
    portfolioItems,
    banner,
    status,
  };
}

async function deleteAllByPrefix(env, prefix) {
  let cursor;
  do {
    const res = await env.LEADS_KV.list({ prefix, cursor });
    for (const key of res.keys) await env.LEADS_KV.delete(key.name);
    cursor = res.list_complete ? undefined : res.cursor;
  } while (cursor);
}

async function sendDocumentToTelegram(env, jsonText, filename, caption) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  const form = new FormData();
  form.append("chat_id", env.TELEGRAM_CHAT_ID);
  form.append("caption", caption || "");
  form.append("document", new Blob([jsonText], { type: "application/json" }), filename);
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendDocument`, {
    method: "POST",
    body: form,
  });
}

// ============================================================
//  اتصال به AI (bytelab-ai) برای پیش‌نویس خودکار بلاگ
// ============================================================
async function callAIWorker(env, system, userText) {
  // مثل bytelab-telegram، از Service Binding استفاده می‌کنیم نه فچ مستقیم به آدرس
  // عمومی workers.dev (که می‌تونه ۴۰۴/۱۰۴۲ بده). توی Cloudflare Dashboard →
  // این Worker → Bindings → Add binding → Service binding، یه Binding با
  // نام AI_WORKER به Worker «bytelab-ai» وصل کن (دقیقاً مثل bytelab-telegram).
  if (!env.AI_WORKER) {
    throw new Error(
      "اتصال به Worker هوش‌مصنوعی تنظیم نشده. تو تنظیمات bytelab-admin → Bindings → Add → Service binding، یک Binding با نام AI_WORKER به Worker «bytelab-ai» وصل کن."
    );
  }
  const endpoint = env.AI_ENDPOINT || DEFAULT_AI_ENDPOINT;
  const response = await env.AI_WORKER.fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Bytelab-Internal": "bytelab-internal-2026",
    },
    body: JSON.stringify({ system, messages: [{ role: "user", content: userText }] }),
  });
  const rawBody = await response.text();
  let data;
  try {
    data = JSON.parse(rawBody);
  } catch (e) {
    throw new Error(`پاسخ AI Worker یک JSON معتبر نبود (status ${response.status}).`);
  }
  if (!response.ok || data.error) throw new Error(data.error || "درخواست به AI Worker ناموفق بود.");
  const text = data.content && data.content[0] && data.content[0].text ? data.content[0].text : "";
  return String(text || "").trim();
}

// ============================================================
//  Router اصلی
// ============================================================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request, env) });
    }

    try {
      if (path === "/") {
        return new Response("ByteLab — Admin API OK", { status: 200 });
      }

      if (!path.startsWith("/api/admin")) {
        return jsonResponse({ error: "مسیر نامعتبر است." }, 404, request, env);
      }

      const sub = path.slice("/api/admin".length) || "/";

      // ---------------- ورود (بدون نیاز به توکن) ----------------
      if (sub === "/login" && request.method === "POST") {
        return handleLogin(request, env);
      }

      // ---------------- از این به بعد نیاز به توکن معتبر ----------------
      if (!(await isAuthorized(request, env))) {
        return jsonResponse({ error: "وارد نشدی یا نشست منقضی شده." }, 401, request, env);
      }

      if (sub === "/logout" && request.method === "POST") {
        const authHeader = request.headers.get("Authorization") || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
        await revokeAdminSession(token, env);
        return jsonResponse({ ok: true }, 200, request, env);
      }

      if (sub === "/me" && request.method === "GET") {
        return jsonResponse({ ok: true }, 200, request, env);
      }

      // ---------------- داشبورد ----------------
      if (sub === "/stats" && request.method === "GET") {
        const stats = await buildStats(env);
        return jsonResponse(stats, 200, request, env);
      }

      if (sub === "/activity" && request.method === "GET") {
        const raw = await env.LEADS_KV.get("admin_activity");
        const logs = raw ? JSON.parse(raw) : [];
        return jsonResponse({ logs }, 200, request, env);
      }

      // ---------------- بلاگ ----------------
      if (sub === "/blog" && request.method === "GET") {
        const posts = await listBlogPosts(env);
        return jsonResponse({ posts }, 200, request, env);
      }
      if (sub === "/blog" && request.method === "POST") {
        return handleSaveBlogPost(request, env);
      }
      if (sub === "/blog/status" && request.method === "POST") {
        return handleBlogStatus(request, env);
      }
      if (sub === "/blog/delete" && request.method === "POST") {
        return handleBlogDelete(request, env);
      }
      if (sub === "/blog/ai" && request.method === "POST") {
        return handleBlogAI(request, env);
      }

      // ---------------- FAQ ----------------
      if (sub === "/faq" && request.method === "GET") {
        const faqs = await listFaqs(env);
        return jsonResponse({ faqs }, 200, request, env);
      }
      if (sub === "/faq" && request.method === "POST") {
        return handleSaveFaq(request, env);
      }
      if (sub === "/faq/delete" && request.method === "POST") {
        return handleFaqDelete(request, env);
      }

      // ---------------- گالری ----------------
      if (sub === "/gallery" && request.method === "GET") {
        let items = await listPortfolioItems(env);
        const status = url.searchParams.get("status");
        if (status && status !== "all") items = items.filter((i) => i.status === status);
        return jsonResponse({ items }, 200, request, env);
      }
      if (sub === "/gallery" && request.method === "POST") {
        return handleSaveGalleryItem(request, env);
      }
      if (sub === "/gallery/status" && request.method === "POST") {
        return handleGalleryStatus(request, env);
      }
      if (sub === "/gallery/delete" && request.method === "POST") {
        return handleGalleryDelete(request, env);
      }

      // ---------------- بنر ----------------
      if (sub === "/banner" && request.method === "GET") {
        const banner = await getBanner(env);
        return jsonResponse({ banner }, 200, request, env);
      }
      if (sub === "/banner" && request.method === "POST") {
        return handleSaveBanner(request, env);
      }

      // ---------------- وضعیت ----------------
      if (sub === "/status" && request.method === "GET") {
        const status = await getStatus(env);
        return jsonResponse({ status }, 200, request, env);
      }
      if (sub === "/status" && request.method === "POST") {
        return handleSaveStatus(request, env);
      }

      // ---------------- لیدها ----------------
      if (sub === "/leads" && request.method === "GET") {
        let leads = await listLeads(env);
        const q = (url.searchParams.get("q") || "").trim().toLowerCase();
        const status = url.searchParams.get("status");
        if (status && status !== "all") leads = leads.filter((l) => l.status === status);
        if (q) {
          leads = leads.filter((l) =>
            [l.name, l.phone, l.email, l.service, l.message].filter(Boolean).some((f) => String(f).toLowerCase().includes(q))
          );
        }
        return jsonResponse({ leads }, 200, request, env);
      }
      if (sub === "/leads/status" && request.method === "POST") {
        return handleLeadStatus(request, env);
      }
      if (sub === "/leads/note" && request.method === "POST") {
        return handleLeadNote(request, env);
      }
      if (sub === "/leads/delete" && request.method === "POST") {
        return handleLeadDelete(request, env);
      }

      // ---------------- بک‌آپ ----------------
      if (sub === "/backup" && request.method === "POST") {
        return handleBackup(request, env);
      }
      if (sub === "/backup/restore" && request.method === "POST") {
        return handleRestoreBackup(request, env);
      }

      return jsonResponse({ error: "مسیر یا متد پشتیبانی نمی‌شود." }, 404, request, env);
    } catch (err) {
      console.log("Unhandled admin API error:", err && err.stack ? err.stack : err);
      return jsonResponse({ error: "خطای داخلی سرور. لطفاً دوباره تلاش کن." }, 500, request, env);
    }
  },
};

// ============================================================
//  هندلرها
// ============================================================

async function handleLogin(request, env) {
  const ip = clientIp(request);
  const guard = await getLoginGuard(env, ip);
  if (guard.lockUntil && Date.now() < guard.lockUntil) {
    const waitMin = Math.ceil((guard.lockUntil - Date.now()) / 60000);
    return jsonResponse(
      { error: "به‌خاطر تلاش‌های ناموفق زیاد، حساب موقتاً قفل شده. حدود " + waitMin + " دقیقه دیگه دوباره امتحان کن." },
      429,
      request,
      env
    );
  }

  const body = await readJson(request);
  const password = String(body.password || "");

  if (!env.ADMIN_PANEL_PASSWORD) {
    return jsonResponse({ error: "رمز عبور پنل مدیریت روی سرور تنظیم نشده (ADMIN_PANEL_PASSWORD)." }, 500, request, env);
  }

  if (!password || password !== env.ADMIN_PANEL_PASSWORD) {
    guard.count = (guard.count || 0) + 1;
    if (guard.count >= LOGIN_MAX_ATTEMPTS) {
      guard.lockUntil = Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000;
      guard.count = 0;
    }
    await saveLoginGuard(env, ip, guard);
    return jsonResponse({ error: "رمز عبور اشتباهه." }, 401, request, env);
  }

  await clearLoginGuard(env, ip);
  const token = await createAdminSession(env);
  await logActivity(env, "ورود به پنل مدیریت", "IP: " + ip);
  return jsonResponse({ token }, 200, request, env);
}

// ---------------- بلاگ ----------------
async function handleSaveBlogPost(request, env) {
  const body = await readJson(request);
  const title = String(body.title || "").trim();
  const content = String(body.content || "").trim();
  const validTags = ["طراحی سایت", "طراحی اپلیکیشن", "خدمات کامپیوتر", "نکات فنی"];
  const tag = validTags.includes(body.tag) ? body.tag : "نکات فنی";

  if (!title || !content) return jsonResponse({ error: "عنوان و متن مقاله الزامیه." }, 400, request, env);

  let item;
  if (body.id) {
    item = await getBlogPost(env, body.id);
    if (!item) return jsonResponse({ error: "پستی با این شناسه پیدا نشد." }, 404, request, env);
  } else {
    item = { id: crypto.randomUUID(), createdAt: Date.now(), status: "draft", autoGenerated: false };
  }

  item.title = title.slice(0, 150);
  item.slug = slugify(title);
  item.excerpt = String(body.excerpt || "").trim().slice(0, 400);
  item.content = content.slice(0, 8000);
  item.tag = tag;
  item.image = String(body.image || item.image || "");
  item.seoTags = Array.isArray(body.seoTags) ? body.seoTags.slice(0, 8) : item.seoTags || [];
  if (body.status === "published" || body.status === "draft") item.status = body.status;

  await saveBlogPost(env, item);
  await logActivity(env, body.id ? "ویرایش پست بلاگ" : "پست بلاگ جدید", item.title);

  return jsonResponse({ ok: true, post: item }, 200, request, env);
}

async function handleBlogStatus(request, env) {
  const body = await readJson(request);
  const id = String(body.id || "");
  const status = body.status === "published" ? "published" : "draft";
  const item = await getBlogPost(env, id);
  if (!item) return jsonResponse({ error: "پست پیدا نشد." }, 404, request, env);
  item.status = status;
  await saveBlogPost(env, item);
  await logActivity(env, "تغییر وضعیت پست بلاگ", item.title + " → " + status);
  return jsonResponse({ ok: true }, 200, request, env);
}

async function handleBlogDelete(request, env) {
  const body = await readJson(request);
  const id = String(body.id || "");
  const item = await getBlogPost(env, id);
  if (!item) return jsonResponse({ error: "پست پیدا نشد." }, 404, request, env);
  await deleteBlogPost(env, id);
  await env.LEADS_KV.delete(`blogimage:${id}`);
  await logActivity(env, "حذف پست بلاگ", item.title);
  return jsonResponse({ ok: true }, 200, request, env);
}

async function handleBlogAI(request, env) {
  const body = await readJson(request);
  const topic = String(body.topic || "").trim();
  const tag = String(body.tag || "").trim();
  const userMsg = topic
    ? `موضوع مقاله: «${topic}»${tag ? ` (دسته پیشنهادی: ${tag})` : ""}. فقط JSON بده.`
    : `یه موضوع مرتبط با کار بایت‌لب${tag ? ` در حوزه‌ی «${tag}»` : ""} انتخاب کن و مقاله بنویس. فقط JSON بده.`;

  let draft;
  try {
    const aiText = await callAIWorker(env, BLOG_WRITER_SYSTEM_HINT, userMsg);
    const cleaned = aiText.replace(/^```json|```$/g, "").trim();
    draft = JSON.parse(cleaned);
  } catch (err) {
    return jsonResponse({ error: "AI نتونست پیش‌نویس معتبر بسازه: " + (err.message || err) }, 502, request, env);
  }

  await logActivity(env, "پیش‌نویس بلاگ با AI", draft.title || topic || "-");
  return jsonResponse({ ok: true, draft }, 200, request, env);
}

// ---------------- FAQ ----------------
async function handleSaveFaq(request, env) {
  const body = await readJson(request);
  const question = String(body.question || "").trim();
  const answer = String(body.answer || "").trim();
  if (!question || !answer) return jsonResponse({ error: "سوال و پاسخ الزامیه." }, 400, request, env);

  const item = body.id
    ? (await (async () => {
        const raw = await env.LEADS_KV.get(`faq:${body.id}`);
        return raw ? JSON.parse(raw) : null;
      })())
    : { id: crypto.randomUUID(), createdAt: Date.now() };

  if (!item) return jsonResponse({ error: "سوالی با این شناسه پیدا نشد." }, 404, request, env);

  item.question = question.slice(0, 300);
  item.answer = answer.slice(0, 2000);
  item.service = String(body.service || item.service || "عمومی").slice(0, 60);

  await saveFaq(env, item);
  await logActivity(env, body.id ? "ویرایش FAQ" : "سوال جدید FAQ", item.question.slice(0, 60));
  return jsonResponse({ ok: true, faq: item }, 200, request, env);
}

async function handleFaqDelete(request, env) {
  const body = await readJson(request);
  const id = String(body.id || "");
  await deleteFaq(env, id);
  await logActivity(env, "حذف FAQ", id);
  return jsonResponse({ ok: true }, 200, request, env);
}

// ---------------- گالری ----------------
async function handleSaveGalleryItem(request, env) {
  const body = await readJson(request);
  const title = String(body.title || "").trim();
  if (!title) return jsonResponse({ error: "عنوان نمونه‌کار الزامیه." }, 400, request, env);

  const item = body.id
    ? await getPortfolioItem(env, body.id)
    : { id: crypto.randomUUID(), createdAt: Date.now(), status: "approved", rating: 0, addedManually: true };

  if (!item) return jsonResponse({ error: "نمونه‌کاری با این شناسه پیدا نشد." }, 404, request, env);

  item.title = title.slice(0, 150);
  item.description = String(body.description || item.description || "").slice(0, 600);
  item.url = String(body.url || item.url || "");
  item.image = String(body.image || item.image || "");
  item.authorName = String(body.authorName || item.authorName || "-").slice(0, 80);
  item.authorContact = String(body.authorContact || item.authorContact || "-").slice(0, 80);
  item.category = String(body.category || item.category || "").slice(0, 120);
  item.featured = !!body.featured;
  if (typeof body.rating === "number") item.rating = Math.max(0, Math.min(5, body.rating));

  await savePortfolioItem(env, item);
  await logActivity(env, body.id ? "ویرایش نمونه‌کار" : "نمونه‌کار جدید", item.title);
  return jsonResponse({ ok: true, item }, 200, request, env);
}

async function handleGalleryStatus(request, env) {
  const body = await readJson(request);
  const id = String(body.id || "");
  const validStatuses = ["approved", "pending", "rejected"];
  if (!validStatuses.includes(body.status)) return jsonResponse({ error: "وضعیت نامعتبره." }, 400, request, env);

  const item = await getPortfolioItem(env, id);
  if (!item) return jsonResponse({ error: "نمونه‌کار پیدا نشد." }, 404, request, env);
  item.status = body.status;
  await savePortfolioItem(env, item);
  await logActivity(env, "تغییر وضعیت نمونه‌کار", item.title + " → " + body.status);
  return jsonResponse({ ok: true }, 200, request, env);
}

async function handleGalleryDelete(request, env) {
  const body = await readJson(request);
  const id = String(body.id || "");
  const item = await getPortfolioItem(env, id);
  if (!item) return jsonResponse({ error: "نمونه‌کار پیدا نشد." }, 404, request, env);
  await deletePortfolioItem(env, id);
  await logActivity(env, "حذف نمونه‌کار", item.title);
  return jsonResponse({ ok: true }, 200, request, env);
}

// ---------------- بنر ----------------
async function handleSaveBanner(request, env) {
  const body = await readJson(request);
  const banner = {
    enabled: !!body.enabled,
    text: String(body.text || "").trim().slice(0, 300),
    link: String(body.link || "").trim().slice(0, 300),
    style: ["info", "success", "warning", "danger"].includes(body.style) ? body.style : "info",
  };
  await saveBanner(env, banner);
  await logActivity(env, "ویرایش بنر سایت", banner.enabled ? "روشن" : "خاموش");
  return jsonResponse({ ok: true, banner }, 200, request, env);
}

// ---------------- وضعیت ----------------
async function handleSaveStatus(request, env) {
  const body = await readJson(request);
  const status = { online: !!body.online, updatedAt: Date.now() };
  await saveStatus(env, status);
  await logActivity(env, "تغییر وضعیت آنلاین/آفلاین", status.online ? "آنلاین" : "آفلاین");
  return jsonResponse({ ok: true, status }, 200, request, env);
}

// ---------------- لیدها ----------------
async function handleLeadStatus(request, env) {
  const body = await readJson(request);
  const id = String(body.id || "");
  const validStatuses = ["new", "contacted", "later", "rejected"];
  if (!validStatuses.includes(body.status)) return jsonResponse({ error: "وضعیت نامعتبره." }, 400, request, env);

  const lead = await getLead(env, id);
  if (!lead) return jsonResponse({ error: "لید پیدا نشد." }, 404, request, env);
  lead.status = body.status;
  await saveLead(env, lead);
  await logActivity(env, "تغییر وضعیت لید", (lead.name || id) + " → " + body.status);
  return jsonResponse({ ok: true }, 200, request, env);
}

async function handleLeadNote(request, env) {
  const body = await readJson(request);
  const id = String(body.id || "");
  const note = String(body.note || "").trim().slice(0, 1000);
  const lead = await getLead(env, id);
  if (!lead) return jsonResponse({ error: "لید پیدا نشد." }, 404, request, env);
  lead.note = note;
  await saveLead(env, lead);
  await logActivity(env, "یادداشت لید", lead.name || id);
  return jsonResponse({ ok: true }, 200, request, env);
}

async function handleLeadDelete(request, env) {
  const body = await readJson(request);
  const id = String(body.id || "");
  await deleteLead(env, id);
  await logActivity(env, "حذف لید", id);
  return jsonResponse({ ok: true }, 200, request, env);
}

// ---------------- بک‌آپ ----------------
async function handleBackup(request, env) {
  const payload = await buildBackupPayload(env);
  const json = JSON.stringify(payload, null, 2);
  const dateKey = payload.generatedAt.slice(0, 10);

  await env.LEADS_KV.put("backup:" + dateKey, json);
  await env.LEADS_KV.put("backup:latest", json);

  const filename = "bytelab-backup-" + dateKey + ".json";
  const caption =
    "💾 بک‌آپ کامل سایت (دستی — از پنل وب)\n" +
    payload.leads.length + " لید، " + payload.blogPosts.length + " پست بلاگ، " +
    payload.portfolioItems.length + " نمونه‌کار، " + payload.faqs.length + " سوال متداول";

  try {
    await sendDocumentToTelegram(env, json, filename, caption);
  } catch (err) {
    // حتی اگه ارسال به تلگرام خطا بده، نسخه‌ی KV ذخیره شده
  }

  await logActivity(env, "ساخت بک‌آپ فوری", filename);
  return jsonResponse({ ok: true, filename, generatedAt: payload.generatedAt, payload }, 200, request, env);
}

async function handleRestoreBackup(request, env) {
  const payload = await readJson(request);
  if (!payload || !Array.isArray(payload.leads) || !Array.isArray(payload.blogPosts)) {
    return jsonResponse({ error: "ساختار فایل بک‌آپ نامعتبره." }, 400, request, env);
  }

  await deleteAllByPrefix(env, "lead:");
  for (const l of payload.leads) if (l.id) await saveLead(env, l);

  await deleteAllByPrefix(env, "blog:");
  for (const b of payload.blogPosts) if (b.id) await saveBlogPost(env, b);

  if (Array.isArray(payload.faqs)) {
    await deleteAllByPrefix(env, "faq:");
    for (const f of payload.faqs) if (f.id) await saveFaq(env, f);
  }

  if (Array.isArray(payload.portfolioItems)) {
    await deleteAllByPrefix(env, "portfolio:");
    for (const p of payload.portfolioItems) if (p.id) await savePortfolioItem(env, p);
  }

  if (payload.banner) await saveBanner(env, payload.banner);
  if (payload.status) await saveStatus(env, payload.status);

  await logActivity(
    env,
    "بازگردانی بک‌آپ",
    payload.leads.length + " لید، " + payload.blogPosts.length + " پست بلاگ"
  );

  return jsonResponse({ ok: true }, 200, request, env);
}
