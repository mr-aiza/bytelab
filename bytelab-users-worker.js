// ============================================================
//  بایت‌لب — Worker حساب‌کاربری سایت (ثبت‌نام / ورود / پروفایل / علاقه‌مندی‌ها)
//  نسخه: 1.0
//
//  این Worker کاملاً جدا از bytelab-admin و bytelab-telegram اجرا می‌شه و
//  از یک KV Namespace اختصاصی (USERS_KV) استفاده می‌کنه. کاربرهای سایت
//  (نه ادمین) با شماره تماس + رمز عبور ثبت‌نام/ورود می‌کنن، پروفایلشون رو
//  کامل می‌کنن و نمونه‌کارهای پورتفولیو (portfolio.html) رو با آیدی
//  (همون id ای که از bytelab-telegram می‌گیرن) به علاقه‌مندی اضافه می‌کنن.
//
//  متغیرهای محیطی لازم (Cloudflare → Settings → Variables & Secrets):
//   ADMIN_PANEL_PASSWORD   رمز عبور ورود به پنل مدیریت کاربران (users-admin.html)  (Secret)
//   USERS_SESSION_HOURS    مدت اعتبار نشست کاربر عادی، به ساعت (اختیاری، پیش‌فرض 720 = 30 روز)
//   ADMIN_ALLOWED_ORIGIN   دامنه‌ی مجاز CORS (اختیاری، پیش‌فرض *)
//
//  KV Binding لازم: USERS_KV → یک namespace جدید و جدا (فقط برای این Worker بسازش)
// ============================================================

const DEFAULT_SESSION_HOURS = 720; // 30 روز
const ADMIN_SESSION_HOURS = 12;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_MINUTES = 15;

// ------------------------------------------------------------
//  CORS / پاسخ‌های عمومی
// ------------------------------------------------------------
function corsHeaders(env) {
  const allowed = env.ADMIN_ALLOWED_ORIGIN || "*";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(obj, status, env) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(env) },
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
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return arrayBufferToBase64(bytes.buffer).replace(/[^a-zA-Z0-9]/g, "");
}

async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const data = enc.encode(salt + ":" + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return arrayBufferToBase64(hashBuffer);
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

// ------------------------------------------------------------
//  نشست کاربر عادی
// ------------------------------------------------------------
async function createSession(phone, env) {
  const hours = Number(env.USERS_SESSION_HOURS) || DEFAULT_SESSION_HOURS;
  const token = generateRandomToken();
  await env.USERS_KV.put("session:" + token, phone, { expirationTtl: hours * 3600 });
  return token;
}

async function getUserFromRequest(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) return null;
  const phone = await env.USERS_KV.get("session:" + token);
  if (!phone) return null;
  const raw = await env.USERS_KV.get("user:" + phone);
  if (!raw) return null;
  return JSON.parse(raw);
}

async function getUserRaw(phone, env) {
  const raw = await env.USERS_KV.get("user:" + phone);
  return raw ? JSON.parse(raw) : null;
}

async function saveUserRaw(user, env) {
  await env.USERS_KV.put("user:" + user.phone, JSON.stringify(user));
}

function publicUser(user) {
  return {
    phone: user.phone,
    name: user.name || null,
    email: user.email || null,
    active: user.active !== false,
    createdAt: user.createdAt || null,
  };
}

// فهرست کلی همه‌ی شماره‌های ثبت‌شده، برای اینکه پنل ادمین سریع لیستشون کنه بدون گشتن کل KV
async function getUserIndex(env) {
  const raw = await env.USERS_KV.get("user_index");
  return raw ? JSON.parse(raw) : [];
}
async function addToUserIndex(phone, env) {
  const list = await getUserIndex(env);
  if (!list.includes(phone)) {
    list.push(phone);
    await env.USERS_KV.put("user_index", JSON.stringify(list));
  }
}

// ------------------------------------------------------------
//  محدودسازی تلاش ورود ناموفق (بر اساس شماره)
// ------------------------------------------------------------
async function isLocked(phone, env) {
  const raw = await env.USERS_KV.get("loginlock:" + phone);
  if (!raw) return false;
  const data = JSON.parse(raw);
  return data.count >= LOGIN_MAX_ATTEMPTS && Date.now() < data.lockedUntil;
}
async function registerFailedAttempt(phone, env) {
  const raw = await env.USERS_KV.get("loginlock:" + phone);
  const data = raw ? JSON.parse(raw) : { count: 0, lockedUntil: 0 };
  data.count += 1;
  if (data.count >= LOGIN_MAX_ATTEMPTS) {
    data.lockedUntil = Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000;
  }
  await env.USERS_KV.put("loginlock:" + phone, JSON.stringify(data), { expirationTtl: LOGIN_LOCK_MINUTES * 60 });
}
async function clearFailedAttempts(phone, env) {
  await env.USERS_KV.delete("loginlock:" + phone);
}

// ============================================================
//  Auth: ثبت‌نام / ورود / پروفایل
// ============================================================
async function handleRegister(request, env) {
  const body = await readJson(request);
  const phone = String(body.phone || "").trim();
  const password = String(body.password || "");
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();

  if (!name) {
    return jsonResponse({ error: "نام رو وارد کن." }, 400, env);
  }
  if (!/^09\d{9}$/.test(phone)) {
    return jsonResponse({ error: "شماره تماس معتبر نیست (باید مثل 09xxxxxxxxx باشه)." }, 400, env);
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: "ایمیل معتبر نیست." }, 400, env);
  }
  if (password.length < 4) {
    return jsonResponse({ error: "رمز عبور باید حداقل ۴ کاراکتر باشه." }, 400, env);
  }

  const existing = await getUserRaw(phone, env);
  if (existing) {
    return jsonResponse({ error: "این شماره قبلاً ثبت‌نام شده. وارد شو." }, 409, env);
  }

  const salt = generateRandomToken();
  const passwordHash = await hashPassword(password, salt);
  const user = {
    phone, name, email,
    passwordHash, salt, active: true, createdAt: Date.now(),
  };
  await saveUserRaw(user, env);
  await addToUserIndex(phone, env);

  const token = await createSession(phone, env);
  return jsonResponse({ token, ...publicUser(user) }, 200, env);
}

async function handleLogin(request, env) {
  const body = await readJson(request);
  const phone = String(body.phone || "").trim();
  const password = String(body.password || "");

  if (await isLocked(phone, env)) {
    return jsonResponse({ error: `تلاش‌های ناموفق زیاد بود. ${LOGIN_LOCK_MINUTES} دقیقه دیگه دوباره امتحان کن.` }, 429, env);
  }

  const user = await getUserRaw(phone, env);
  if (!user) {
    await registerFailedAttempt(phone, env);
    return jsonResponse({ error: "شماره تماس یا رمز عبور اشتباهه." }, 401, env);
  }

  const hash = await hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    await registerFailedAttempt(phone, env);
    return jsonResponse({ error: "شماره تماس یا رمز عبور اشتباهه." }, 401, env);
  }

  if (user.active === false) {
    return jsonResponse({ error: "دسترسی حساب شما موقتاً غیرفعال شده. با ما تماس بگیر." }, 403, env);
  }

  await clearFailedAttempts(phone, env);
  const token = await createSession(phone, env);
  return jsonResponse({ token, ...publicUser(user) }, 200, env);
}

async function handleMe(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) return jsonResponse({ error: "وارد نشدی." }, 401, env);
  return jsonResponse(publicUser(user), 200, env);
}

async function handleLogout(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (token) await env.USERS_KV.delete("session:" + token);
  return jsonResponse({ ok: true }, 200, env);
}

async function handleUpdateProfile(request, env) {
  const account = await getUserFromRequest(request, env);
  if (!account) return jsonResponse({ error: "وارد نشدی." }, 401, env);

  const body = await readJson(request);
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: "ایمیل معتبر نیست." }, 400, env);
  }

  const user = await getUserRaw(account.phone, env);
  if (!user) return jsonResponse({ error: "کاربر پیدا نشد." }, 404, env);

  user.name = name || user.name || null;
  user.email = email || user.email || null;
  await saveUserRaw(user, env);

  return jsonResponse(publicUser(user), 200, env);
}

async function handleChangePassword(request, env) {
  const account = await getUserFromRequest(request, env);
  if (!account) return jsonResponse({ error: "وارد نشدی." }, 401, env);

  const body = await readJson(request);
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  if (newPassword.length < 4) {
    return jsonResponse({ error: "رمز عبور جدید باید حداقل ۴ کاراکتر باشه." }, 400, env);
  }

  const user = await getUserRaw(account.phone, env);
  if (!user) return jsonResponse({ error: "کاربر پیدا نشد." }, 404, env);

  const currentHash = await hashPassword(currentPassword, user.salt);
  if (currentHash !== user.passwordHash) {
    return jsonResponse({ error: "رمز عبور فعلی اشتباهه." }, 401, env);
  }

  const salt = generateRandomToken();
  user.passwordHash = await hashPassword(newPassword, salt);
  user.salt = salt;
  await saveUserRaw(user, env);

  return jsonResponse({ ok: true }, 200, env);
}

// ============================================================
//  علاقه‌مندی‌ها (نمونه‌کارهای پورتفولیو)
// ============================================================
async function getUserFavorites(phone, env) {
  const raw = await env.USERS_KV.get("favorites:" + phone);
  return raw ? JSON.parse(raw) : [];
}
async function saveUserFavorites(phone, list, env) {
  await env.USERS_KV.put("favorites:" + phone, JSON.stringify(list));
}

async function handleFavoriteToggle(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) return jsonResponse({ error: "برای علاقه‌مندی باید وارد حساب بشی." }, 401, env);

  const body = await readJson(request);
  const itemId = String(body.itemId || "").trim();
  if (!itemId) return jsonResponse({ error: "itemId الزامیه." }, 400, env);

  const list = await getUserFavorites(user.phone, env);
  const idx = list.indexOf(itemId);
  let favorited;
  if (idx >= 0) {
    list.splice(idx, 1);
    favorited = false;
  } else {
    list.push(itemId);
    favorited = true;
  }
  await saveUserFavorites(user.phone, list, env);

  return jsonResponse({ favorited, favorites: list }, 200, env);
}

// ============================================================
//  پروژه‌های بارگذاری‌شده (ابزار «بارگذاری پروژه» / project-upload.html)
//  هر کاربر یک فضای اختصاصی (پوشه‌ی مجازی) داره که با شماره‌تماسش
//  ایزوله می‌شه: project:{phone}:{projectName}
//  فهرست پروژه‌های هر کاربر هم زیر projects:{phone} نگه‌داری می‌شه.
// ============================================================
const MAX_PROJECT_BYTES = 4 * 1024 * 1024; // سقف ۴ مگابایت برای هر پروژه

function sanitizeProjectName(name) {
  return String(name || "").trim().slice(0, 50).replace(/[^a-zA-Z0-9آ-ی_-]/g, "");
}

async function getProjectIndex(phone, env) {
  const raw = await env.USERS_KV.get("projects:" + phone);
  return raw ? JSON.parse(raw) : [];
}
async function saveProjectIndex(phone, list, env) {
  await env.USERS_KV.put("projects:" + phone, JSON.stringify(list));
}

async function handleSaveProject(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) return jsonResponse({ error: "برای ذخیره پروژه باید وارد حساب بشی." }, 401, env);

  const body = await readJson(request);
  const name = sanitizeProjectName(body.name);
  if (!name) return jsonResponse({ error: "نام پروژه نامعتبره (فقط حروف، عدد و خط‌فاصله)." }, 400, env);

  const files = body.files || {};
  const html = String((files.html && files.html.content) || "");
  const css = String((files.css && files.css.content) || "");
  const js = String((files.js && files.js.content) || "");
  if (!html || !css || !js) return jsonResponse({ error: "هر سه فایل HTML، CSS و JS لازمه." }, 400, env);

  const htmlName = String((files.html && files.html.name) || "index.html");
  const cssName = String((files.css && files.css.name) || "style.css");
  const jsName = String((files.js && files.js.name) || "script.js");

  const totalBytes = new TextEncoder().encode(html + css + js).length;
  if (totalBytes > MAX_PROJECT_BYTES) {
    return jsonResponse({ error: "حجم پروژه بیشتر از حد مجازه (حداکثر ۴ مگابایت)." }, 400, env);
  }

  // اگه این پروژه از قبل وجود داره و لینک عمومی داره، موقع ذخیره‌ی دوباره (ویرایش) اون لینک رو حفظ کن
  const existingRaw = await env.USERS_KV.get("project:" + user.phone + ":" + name);
  const existing = existingRaw ? JSON.parse(existingRaw) : null;
  const publicSlug = existing ? existing.publicSlug || null : null;

  const record = {
    name,
    owner: user.phone,
    files: {
      html: { name: htmlName, content: html },
      css: { name: cssName, content: css },
      js: { name: jsName, content: js },
    },
    updatedAt: new Date().toISOString(),
    size: totalBytes,
    publicSlug,
  };

  // ذخیره‌ی خود پروژه، ایزوله زیر «پوشه»ی شماره‌تماس همون کاربر
  await env.USERS_KV.put("project:" + user.phone + ":" + name, JSON.stringify(record));

  // اگه پابلیش بود، نسخه‌ی عمومی‌ای که با اسلاگ سرو می‌شه رو هم به‌روز کن
  if (publicSlug) {
    await env.USERS_KV.put("publicSlug:" + publicSlug, JSON.stringify({ phone: user.phone, name }));
  }

  // به‌روزرسانی فهرست پروژه‌های همون کاربر
  const index = await getProjectIndex(user.phone, env);
  const meta = { name, updatedAt: record.updatedAt, size: record.size, publicSlug };
  const existingIdx = index.findIndex((p) => p.name === name);
  if (existingIdx >= 0) index[existingIdx] = meta; else index.push(meta);
  await saveProjectIndex(user.phone, index, env);

  return jsonResponse({ ok: true, project: meta, folder: "project:" + user.phone }, 200, env);
}

async function handleMyProjects(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) return jsonResponse({ error: "برای دیدن پروژه‌هات باید وارد حساب بشی." }, 401, env);
  const index = await getProjectIndex(user.phone, env);
  index.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  return jsonResponse({ projects: index, folder: "project:" + user.phone }, 200, env);
}

async function handleGetProject(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) return jsonResponse({ error: "برای دیدن پروژه باید وارد حساب بشی." }, 401, env);
  const url = new URL(request.url);
  const name = sanitizeProjectName(url.searchParams.get("name"));
  if (!name) return jsonResponse({ error: "نام پروژه نامعتبره." }, 400, env);
  const raw = await env.USERS_KV.get("project:" + user.phone + ":" + name);
  if (!raw) return jsonResponse({ error: "پروژه پیدا نشد." }, 404, env);
  return jsonResponse({ project: JSON.parse(raw) }, 200, env);
}

async function handleDeleteProject(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) return jsonResponse({ error: "برای حذف پروژه باید وارد حساب بشی." }, 401, env);
  const body = await readJson(request);
  const name = sanitizeProjectName(body.name);
  if (!name) return jsonResponse({ error: "نام پروژه نامعتبره." }, 400, env);

  // اگه لینک عمومی داشت، اون رو هم پاک کن که لینک یتیم نمونه
  const raw = await env.USERS_KV.get("project:" + user.phone + ":" + name);
  if (raw) {
    const existing = JSON.parse(raw);
    if (existing.publicSlug) await env.USERS_KV.delete("publicSlug:" + existing.publicSlug);
  }

  await env.USERS_KV.delete("project:" + user.phone + ":" + name);
  const index = await getProjectIndex(user.phone, env);
  await saveProjectIndex(user.phone, index.filter((p) => p.name !== name), env);
  return jsonResponse({ ok: true }, 200, env);
}

// ------------------------------------------------------------
//  لینک عمومی پیش‌نمایش: بدون نیاز به ورود، پروژه رو با یه اسلاگ تصادفی نشون می‌ده
// ------------------------------------------------------------
function generateSlug() {
  return generateRandomToken().toLowerCase().slice(0, 10);
}

async function handlePublishProject(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) return jsonResponse({ error: "برای اشتراک‌گذاری پروژه باید وارد حساب بشی." }, 401, env);
  const body = await readJson(request);
  const name = sanitizeProjectName(body.name);
  if (!name) return jsonResponse({ error: "نام پروژه نامعتبره." }, 400, env);

  const raw = await env.USERS_KV.get("project:" + user.phone + ":" + name);
  if (!raw) return jsonResponse({ error: "پروژه پیدا نشد." }, 404, env);
  const record = JSON.parse(raw);

  // اگه از قبل پابلیش بوده، همون لینک قبلی رو برگردون (لینک عوض نمی‌شه)
  if (record.publicSlug) {
    return jsonResponse({ ok: true, slug: record.publicSlug }, 200, env);
  }

  // اسلاگ تصادفی و یکتا بساز (چند بار تلاش اگه تصادفاً برخورد داشت)
  let slug = null;
  for (let i = 0; i < 5; i++) {
    const candidate = generateSlug();
    const exists = await env.USERS_KV.get("publicSlug:" + candidate);
    if (!exists) { slug = candidate; break; }
  }
  if (!slug) return jsonResponse({ error: "ساخت لینک با خطا مواجه شد، دوباره امتحان کن." }, 500, env);

  record.publicSlug = slug;
  await env.USERS_KV.put("project:" + user.phone + ":" + name, JSON.stringify(record));
  await env.USERS_KV.put("publicSlug:" + slug, JSON.stringify({ phone: user.phone, name }));

  const index = await getProjectIndex(user.phone, env);
  const idx = index.findIndex((p) => p.name === name);
  if (idx >= 0) { index[idx].publicSlug = slug; await saveProjectIndex(user.phone, index, env); }

  return jsonResponse({ ok: true, slug }, 200, env);
}

async function handleUnpublishProject(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) return jsonResponse({ error: "باید وارد حساب بشی." }, 401, env);
  const body = await readJson(request);
  const name = sanitizeProjectName(body.name);
  if (!name) return jsonResponse({ error: "نام پروژه نامعتبره." }, 400, env);

  const raw = await env.USERS_KV.get("project:" + user.phone + ":" + name);
  if (!raw) return jsonResponse({ error: "پروژه پیدا نشد." }, 404, env);
  const record = JSON.parse(raw);

  if (record.publicSlug) {
    await env.USERS_KV.delete("publicSlug:" + record.publicSlug);
    record.publicSlug = null;
    await env.USERS_KV.put("project:" + user.phone + ":" + name, JSON.stringify(record));

    const index = await getProjectIndex(user.phone, env);
    const idx = index.findIndex((p) => p.name === name);
    if (idx >= 0) { index[idx].publicSlug = null; await saveProjectIndex(user.phone, index, env); }
  }

  return jsonResponse({ ok: true }, 200, env);
}

// صفحه‌ی عمومی پیش‌نمایش: /p/{slug} — بدون نیاز به ورود، خود HTML رندرشده رو برمی‌گردونه
async function handlePublicPreview(slug, env) {
  const mapRaw = await env.USERS_KV.get("publicSlug:" + slug);
  if (!mapRaw) {
    return new Response("<!DOCTYPE html><html lang=\"fa\" dir=\"rtl\"><meta charset=\"UTF-8\"><body style=\"background:#070b12;color:#eaf0f4;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;\"><p>این لینک پیدا نشد یا دیگه در دسترس نیست.</p></body></html>", {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
    });
  }
  const { phone, name } = JSON.parse(mapRaw);
  const raw = await env.USERS_KV.get("project:" + phone + ":" + name);
  if (!raw) {
    return new Response("پروژه دیگه در دسترس نیست.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" },
    });
  }
  const p = JSON.parse(raw);
  const fullHTML = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${p.name}</title>
<style>${p.files.css.content}</style>
</head>
<body>
${p.files.html.content}
<script>${p.files.js.content}<\/script>
</body>
</html>`;
  return new Response(fullHTML, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex",
      "Cache-Control": "public, max-age=120",
    },
  });
}

async function handleMyFavorites(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) return jsonResponse({ error: "برای دیدن علاقه‌مندی‌هات باید وارد حساب بشی." }, 401, env);
  const list = await getUserFavorites(user.phone, env);
  return jsonResponse({ itemIds: list }, 200, env);
}

// ============================================================
//  پنل مدیریت کاربران (users-admin.html)
//  با همون منطق ساده‌ی رمز عبور + نشست، جدا از پنل اصلی ادمین
// ============================================================
async function handleAdminLogin(request, env) {
  const body = await readJson(request);
  const password = String(body.password || "");
  const ip = clientIp(request);

  if (await isLocked("admin:" + ip, env)) {
    return jsonResponse({ error: `تلاش‌های ناموفق زیاد بود. ${LOGIN_LOCK_MINUTES} دقیقه دیگه دوباره امتحان کن.` }, 429, env);
  }
  if (!env.ADMIN_PANEL_PASSWORD || password !== env.ADMIN_PANEL_PASSWORD) {
    await registerFailedAttempt("admin:" + ip, env);
    return jsonResponse({ error: "رمز عبور اشتباهه." }, 401, env);
  }
  await clearFailedAttempts("admin:" + ip, env);

  const token = generateRandomToken();
  await env.USERS_KV.put("adminsession:" + token, "1", { expirationTtl: ADMIN_SESSION_HOURS * 3600 });
  return jsonResponse({ token }, 200, env);
}

async function requireAdmin(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) return false;
  const ok = await env.USERS_KV.get("adminsession:" + token);
  return !!ok;
}

async function handleAdminListUsers(request, env) {
  if (!(await requireAdmin(request, env))) return jsonResponse({ error: "دسترسی نداری." }, 401, env);
  const index = await getUserIndex(env);
  const users = [];
  for (const phone of index) {
    const u = await getUserRaw(phone, env);
    if (u) {
      const favs = await getUserFavorites(phone, env);
      users.push({ ...publicUser(u), favoritesCount: favs.length });
    }
  }
  users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return jsonResponse({ users }, 200, env);
}

async function handleAdminToggleAccess(request, env) {
  if (!(await requireAdmin(request, env))) return jsonResponse({ error: "دسترسی نداری." }, 401, env);
  const body = await readJson(request);
  const phone = String(body.phone || "").trim();
  const user = await getUserRaw(phone, env);
  if (!user) return jsonResponse({ error: "کاربر پیدا نشد." }, 404, env);
  user.active = !(user.active !== false); // toggle
  await saveUserRaw(user, env);
  return jsonResponse({ ok: true, active: user.active }, 200, env);
}

// ---- نظارت ادمین روی همه‌ی پروژه‌های بارگذاری‌شده‌ی همه‌ی کاربرها ----
async function handleAdminListProjects(request, env) {
  if (!(await requireAdmin(request, env))) return jsonResponse({ error: "دسترسی نداری." }, 401, env);
  const index = await getUserIndex(env);
  const allProjects = [];
  for (const phone of index) {
    const projects = await getProjectIndex(phone, env);
    if (!projects.length) continue;
    const u = await getUserRaw(phone, env);
    for (const p of projects) {
      allProjects.push({
        name: p.name,
        size: p.size,
        updatedAt: p.updatedAt,
        ownerPhone: phone,
        ownerName: (u && u.name) || "",
      });
    }
  }
  allProjects.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  return jsonResponse({ projects: allProjects }, 200, env);
}

async function handleAdminGetProject(request, env) {
  if (!(await requireAdmin(request, env))) return jsonResponse({ error: "دسترسی نداری." }, 401, env);
  const url = new URL(request.url);
  const phone = String(url.searchParams.get("phone") || "").trim();
  const name = sanitizeProjectName(url.searchParams.get("name"));
  if (!phone || !name) return jsonResponse({ error: "شماره‌تماس یا نام پروژه نامعتبره." }, 400, env);
  const raw = await env.USERS_KV.get("project:" + phone + ":" + name);
  if (!raw) return jsonResponse({ error: "پروژه پیدا نشد." }, 404, env);
  return jsonResponse({ project: JSON.parse(raw) }, 200, env);
}

async function handleAdminDeleteProject(request, env) {
  if (!(await requireAdmin(request, env))) return jsonResponse({ error: "دسترسی نداری." }, 401, env);
  const body = await readJson(request);
  const phone = String(body.phone || "").trim();
  const name = sanitizeProjectName(body.name);
  if (!phone || !name) return jsonResponse({ error: "شماره‌تماس یا نام پروژه نامعتبره." }, 400, env);
  await env.USERS_KV.delete("project:" + phone + ":" + name);
  const index = await getProjectIndex(phone, env);
  await saveProjectIndex(phone, index.filter((p) => p.name !== name), env);
  return jsonResponse({ ok: true }, 200, env);
}

// ============================================================
//  آنالیزور سایت (audit.html) — بررسی SSL/سرعت/سئو/ریسپانسیو
// ============================================================
async function handleAudit(request, env) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url");
  const headers = corsHeaders(env);

  if (!target) {
    return jsonResponse({ error: "آدرس سایت ارسال نشده" }, 400, env);
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
    if (!["http:", "https:"].includes(targetUrl.protocol)) throw new Error("bad protocol");
  } catch (e) {
    return jsonResponse({ error: "آدرس نامعتبر است" }, 400, env);
  }

  const checks = [];
  let score = 0;

  let html = "";
  let responseTimeMs = null;
  let httpsUsed = targetUrl.protocol === "https:";

  const start = Date.now();
  try {
    const resp = await fetch(targetUrl.href, {
      redirect: "follow",
      cf: { cacheTtl: 0 },
      headers: { "User-Agent": "ByteLabAuditBot/1.0 (+https://bytelabpro.xyz)" },
    });
    responseTimeMs = Date.now() - start;
    httpsUsed = resp.url ? resp.url.startsWith("https://") : httpsUsed;
    html = await resp.text();
  } catch (e) {
    return jsonResponse({ error: "سایت در دسترس نیست یا فچ آن ناموفق بود" }, 502, env);
  }

  if (httpsUsed) {
    checks.push({ status: "ok", title: "گواهی SSL", desc: "سایت با اتصال امن HTTPS بارگذاری می‌شود." });
    score += 20;
  } else {
    checks.push({ status: "bad", title: "گواهی SSL", desc: "سایت روی HTTP ناامن اجرا می‌شود؛ گوگل و مرورگرها این را به کاربر هشدار می‌دهند." });
  }

  if (responseTimeMs !== null) {
    if (responseTimeMs < 800) {
      checks.push({ status: "ok", title: "سرعت بارگذاری", desc: `زمان پاسخ سرور: ${responseTimeMs} میلی‌ثانیه — سریع و مناسب.` });
      score += 25;
    } else if (responseTimeMs < 2000) {
      checks.push({ status: "warn", title: "سرعت بارگذاری", desc: `زمان پاسخ سرور: ${responseTimeMs} میلی‌ثانیه — قابل بهبود است.` });
      score += 12;
    } else {
      checks.push({ status: "bad", title: "سرعت بارگذاری", desc: `زمان پاسخ سرور: ${responseTimeMs} میلی‌ثانیه — کند است و باعث از دست رفتن بازدیدکننده می‌شود.` });
    }
  }

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const titleText = titleMatch ? titleMatch[1].trim() : "";
  if (titleText && titleText.length >= 10 && titleText.length <= 65) {
    checks.push({ status: "ok", title: "عنوان صفحه (Title)", desc: `عنوان مناسبی دارد: «${titleText.slice(0, 50)}${titleText.length > 50 ? "…" : ""}»` });
    score += 12;
  } else if (titleText) {
    checks.push({ status: "warn", title: "عنوان صفحه (Title)", desc: "عنوان صفحه وجود دارد اما طول آن برای سئو ایده‌آل نیست (بهتر است ۱۰ تا ۶۵ کاراکتر باشد)." });
    score += 6;
  } else {
    checks.push({ status: "bad", title: "عنوان صفحه (Title)", desc: "صفحه اصلی تگ Title ندارد؛ این یکی از مهم‌ترین فاکتورهای سئو است." });
  }

  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
  const descText = descMatch ? descMatch[1].trim() : "";
  if (descText && descText.length >= 50) {
    checks.push({ status: "ok", title: "توضیحات متا (Meta Description)", desc: "صفحه توضیحات متا مناسبی برای نتایج گوگل دارد." });
    score += 12;
  } else if (descText) {
    checks.push({ status: "warn", title: "توضیحات متا (Meta Description)", desc: "توضیحات متا کوتاه یا ناقص است." });
    score += 6;
  } else {
    checks.push({ status: "bad", title: "توضیحات متا (Meta Description)", desc: "صفحه توضیحات متا ندارد؛ این متن معمولاً زیر لینک سایت در نتایج گوگل نمایش داده می‌شود." });
  }

  const hasViewport = /<meta[^>]*name=["']viewport["']/i.test(html);
  if (hasViewport) {
    checks.push({ status: "ok", title: "سازگاری با موبایل", desc: "سایت تگ viewport دارد و برای نمایش در موبایل آماده‌سازی شده." });
    score += 20;
  } else {
    checks.push({ status: "bad", title: "سازگاری با موبایل", desc: "تگ viewport یافت نشد؛ احتمالاً سایت در گوشی موبایل به‌درستی نمایش داده نمی‌شود." });
  }

  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1Count === 1) {
    checks.push({ status: "ok", title: "ساختار عنوان‌بندی (H1)", desc: "صفحه دقیقاً یک تگ H1 دارد؛ ساختار مناسب برای سئو." });
    score += 6;
  } else if (h1Count > 1) {
    checks.push({ status: "warn", title: "ساختار عنوان‌بندی (H1)", desc: `صفحه ${h1Count} تگ H1 دارد؛ بهتر است فقط یکی باشد.` });
    score += 3;
  } else {
    checks.push({ status: "bad", title: "ساختار عنوان‌بندی (H1)", desc: "صفحه تگ H1 ندارد." });
  }

  const hasFavicon = /<link[^>]*rel=["'][^"']*icon[^"']*["']/i.test(html);
  if (hasFavicon) {
    checks.push({ status: "ok", title: "آیکون سایت (Favicon)", desc: "فاوآیکون تعریف شده است." });
    score += 5;
  } else {
    checks.push({ status: "warn", title: "آیکون سایت (Favicon)", desc: "فاوآیکون یافت نشد؛ جزئیات کوچک اما روی حرفه‌ای بودن سایت اثر دارد." });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return jsonResponse({ score, checks, checkedUrl: targetUrl.href }, 200, env);
}

// ============================================================
//  استعلام WHOIS دامنه (whois.html) — از طریق RDAP (جایگزین رایگان
//  و بدون کلید WHOIS)، چون سرورهای RDAP معمولاً CORS مستقیم به
//  مرورگر نمی‌دن و باید از سمت Worker پروکسی بشه.
//  TLDهایی مثل .ir معمولاً RDAP عمومی ندارن → پاسخ { unsupported:true }
//  تا کلاینت خودش کاربر رو به whois.nic.ir هدایت کنه.
// ============================================================
const WHOIS_UNSUPPORTED_TLDS = ["ir"];

async function handleWhois(request, env) {
  const { searchParams } = new URL(request.url);
  const domain = (searchParams.get("domain") || "").trim().toLowerCase();

  if (!domain || !/^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})+$/.test(domain)) {
    return jsonResponse({ error: "دامنه نامعتبر است" }, 400, env);
  }

  // ---- محدودیت نرخ ساده بر اساس IP (۲۰ استعلام در روز) ----
  try {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const today = new Date().toISOString().slice(0, 10);
    const rlKey = `whoisrl:${ip}:${today}`;
    const current = parseInt((await env.USERS_KV.get(rlKey)) || "0", 10);
    if (current >= 20) {
      return jsonResponse({ error: "تعداد استعلام‌های امروز شما زیاده. فردا دوباره امتحان کن." }, 429, env);
    }
    await env.USERS_KV.put(rlKey, String(current + 1), { expirationTtl: 86400 });
  } catch (e) {
    // اگه KV مشکل داشت، جلوی خود استعلام رو نمی‌گیریم
  }

  const tld = domain.split(".").pop();
  if (WHOIS_UNSUPPORTED_TLDS.includes(tld)) {
    return jsonResponse({ unsupported: true }, 200, env);
  }

  try {
    // rdap.org یه bootstrap عمومیه که خودش به سرور RDAP درست برای اون
    // TLD ریدایرکت می‌کنه — نیازی به نگه‌داشتن دیتابیس TLD→سرور نیست.
    const rdapRes = await fetch("https://rdap.org/domain/" + domain, {
      headers: { Accept: "application/rdap+json", "User-Agent": "ByteLabWhoisBot/1.0 (+https://bytelabpro.xyz)" },
      cf: { cacheTtl: 3600, cacheEverything: true },
    });

    if (rdapRes.status === 404) {
      return jsonResponse({ registered: false }, 200, env);
    }
    if (!rdapRes.ok) {
      return jsonResponse({ unsupported: true }, 200, env);
    }

    const data = await rdapRes.json();
    const events = data.events || [];
    const findEvent = (action) => {
      const e = events.find((ev) => ev.eventAction === action);
      return e ? e.eventDate : null;
    };

    const registrarEntity = (data.entities || []).find((e) => (e.roles || []).includes("registrar"));
    let registrarName = null;
    if (registrarEntity) {
      try {
        const props = (registrarEntity.vcardArray && registrarEntity.vcardArray[1]) || [];
        const fn = props.find((p) => p[0] === "fn");
        registrarName = fn ? fn[3] : registrarEntity.handle || null;
      } catch (e) {
        registrarName = registrarEntity.handle || null;
      }
    }

    return jsonResponse(
      {
        registered: true,
        registrar: registrarName,
        createdDate: findEvent("registration"),
        expiresDate: findEvent("expiration"),
        updatedDate: findEvent("last changed") || findEvent("last update of RDAP database"),
        nameServers: (data.nameservers || []).map((ns) => (ns.ldhName || "").toLowerCase()),
      },
      200,
      env
    );
  } catch (err) {
    return jsonResponse({ unsupported: true }, 200, env);
  }
}

// ============================================================
//  روتر اصلی
// ============================================================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
     url.pathname = url.pathname.replace(/\/+/g, "/");
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    try {
      if (url.pathname === "/api/auth/register" && request.method === "POST") return await handleRegister(request, env);
      if (url.pathname === "/api/auth/login" && request.method === "POST") return await handleLogin(request, env);
      if (url.pathname === "/api/auth/me" && request.method === "GET") return await handleMe(request, env);
      if (url.pathname === "/api/auth/logout" && request.method === "POST") return await handleLogout(request, env);
      if (url.pathname === "/api/auth/update-profile" && request.method === "POST") return await handleUpdateProfile(request, env);
      if (url.pathname === "/api/auth/change-password" && request.method === "POST") return await handleChangePassword(request, env);

      if (url.pathname === "/api/favorites/toggle" && request.method === "POST") return await handleFavoriteToggle(request, env);
      if (url.pathname === "/api/favorites/mine" && request.method === "GET") return await handleMyFavorites(request, env);

      if (url.pathname === "/api/projects/save" && request.method === "POST") return await handleSaveProject(request, env);
      if (url.pathname === "/api/projects/mine" && request.method === "GET") return await handleMyProjects(request, env);
      if (url.pathname === "/api/projects/get" && request.method === "GET") return await handleGetProject(request, env);
      if (url.pathname === "/api/projects/delete" && request.method === "POST") return await handleDeleteProject(request, env);
      if (url.pathname === "/api/projects/publish" && request.method === "POST") return await handlePublishProject(request, env);
      if (url.pathname === "/api/projects/unpublish" && request.method === "POST") return await handleUnpublishProject(request, env);

      // لینک عمومی پیش‌نمایش (بدون نیاز به ورود): /p/{slug}
      if (url.pathname.startsWith("/p/") && request.method === "GET") {
        const slug = url.pathname.slice(3).replace(/[^a-z0-9]/gi, "");
        return await handlePublicPreview(slug, env);
      }

      if (url.pathname === "/api/admin/login" && request.method === "POST") return await handleAdminLogin(request, env);
      if (url.pathname === "/api/admin/users" && request.method === "GET") return await handleAdminListUsers(request, env);
      if (url.pathname === "/api/admin/users/toggle-access" && request.method === "POST") return await handleAdminToggleAccess(request, env);
      if (url.pathname === "/api/admin/projects" && request.method === "GET") return await handleAdminListProjects(request, env);
      if (url.pathname === "/api/admin/projects/get" && request.method === "GET") return await handleAdminGetProject(request, env);
      if (url.pathname === "/api/admin/projects/delete" && request.method === "POST") return await handleAdminDeleteProject(request, env);

      if (url.pathname === "/api/audit" && request.method === "GET") return await handleAudit(request, env);
      if (url.pathname === "/api/whois" && request.method === "GET") return await handleWhois(request, env);

      return jsonResponse({ error: "not found" }, 404, env);
    } catch (err) {
      return jsonResponse({ error: "خطای داخلی سرور: " + (err && err.message ? err.message : String(err)) }, 500, env);
    }
  },
};
