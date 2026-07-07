
// worker.js — بایت‌لب: ارسال لید به تلگرام + مدیریت وضعیت + دستورات بات + گزارش روزانه + مدیریت کامل نمونه‌کارهای کاربران
// نیازمند: Secret های TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
// نیازمند: Binding به KV با اسم LEADS_KV
//
// امکانات مدیریت نمونه‌کار از داخل تلگرام:
//   - تایید / رد نمونه‌کار ارسالی کاربران (مثل قبل)
//   - ✏️ ویرایش هر فیلد از یک نمونه‌کار (عنوان، توضیح، لینک سایت، لینک تصویر، نام سازنده، راه ارتباطی)
//   - 🗑 حذف نمونه‌کار (با تاییدیه)
//   - ➕ افزودن دستی یک نمونه‌کار جدید (بدون نیاز به ارسال از سایت)
//   - 🗂 مشاهده و مدیریت کامل لیست نمونه‌کارها (در انتظار / تایید شده)

const TG_API = (env) => `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;

async function tgSend(env, text, extra = {}) {
  const res = await fetch(`${TG_API(env)}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, ...extra }),
  });
  return res.json();
}

async function tgSendTo(env, chatId, text, extra = {}) {
  const res = await fetch(`${TG_API(env)}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, ...extra }),
  });
  return res.json();
}

async function tgEditText(env, chatId, messageId, text, extra = {}) {
  return fetch(`${TG_API(env)}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, ...extra }),
  }).then((r) => r.json());
}

async function tgEditMarkup(env, chatId, messageId, replyMarkup) {
  return fetch(`${TG_API(env)}/editMessageReplyMarkup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: replyMarkup }),
  });
}

async function tgAnswerCallback(env, callbackQueryId, text, showAlert = false) {
  return fetch(`${TG_API(env)}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: showAlert }),
  });
}

// لیست دستورهایی که تو منوی «/» تلگرام (کنار جعبه‌ی پیام) به‌صورت دکمه نمایش داده می‌شن
const BOT_COMMANDS = [
  { command: "start", description: "شروع و نمایش منوی اصلی" },
  { command: "stats", description: "📊 آمار کلی سایت" },
  { command: "leads", description: "📋 آخرین لیدها (فرم تماس/ثبت‌نام)" },
  { command: "portfolio", description: "🎨 نمونه‌کارهای در انتظار تایید" },
  { command: "managepf", description: "🗂 مدیریت کامل گالری (ویرایش/حذف/تایید)" },
  { command: "addpf", description: "➕ افزودن دستی یک نمونه‌کار" },
  { command: "manageblog", description: "📰 مدیریت کامل بلاگ (ویرایش/حذف/انتشار)" },
  { command: "addblog", description: "➕ نوشتن پست جدید بلاگ" },
  { command: "writeblog", description: "🤖 نوشتن فوری یک پست با هوش مصنوعی" },
  { command: "managefaq", description: "❓ مدیریت سوالات متداول" },
  { command: "addfaq", description: "➕ افزودن سوال متداول جدید" },
  { command: "banner", description: "📢 مدیریت بنر اعلانات سایت" },
  { command: "status", description: "🟢 تغییر وضعیت پاسخگویی آنلاین/آفلاین" },
  { command: "cancel", description: "❌ لغو مکالمه‌ی در حال انجام" },
];

async function tgSetCommands(env) {
  const res = await fetch(`${TG_API(env)}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commands: BOT_COMMANDS }),
  });
  return res.json();
}

function nowTehranDateStr() {
  return new Date().toLocaleDateString("fa-IR-u-ca-gregory", { timeZone: "Asia/Tehran" });
}

// ================== نویسنده خودکار بلاگ (سئو) ==================
// از همون Worker هوش‌مصنوعی که چت‌بات سایت استفاده می‌کنه، به‌صورت سرور-به-سرور استفاده می‌کنیم
const AI_WORKER_URL = "https://bytelab-ai.bytelab-workerbytelab.workers.dev";

const BLOG_WRITER_SYSTEM = `
تو یه نویسنده محتوای سئوی حرفه‌ای برای وبلاگ «بایت‌لب» هستی؛ یک کسب‌وکار خدمات فناوری در کرج با سه حوزه: طراحی وب‌سایت، طراحی اپلیکیشن اندروید/iOS، و خدمات کامپیوتر (نصب، رفع اشکال، پشتیبانی شبکه، خرید و فروش قطعه).

وظیفه‌ات: نوشتن یک پست بلاگ فارسی، مفید، واقعی و سئوپسند درباره یکی از حوزه‌های کاری بایت‌لب یا موضوعات نزدیک بهش (مثلاً: نکات فنی برای کسب‌وکارهای کوچک، راهنمای انتخاب بین وب‌سایت و اپلیکیشن، اشتباهات رایج در نگهداری سیستم، اصول سئو برای سایت‌های ایرانی، امنیت دیجیتال کسب‌وکار کوچک، و مواردی از این دست).

قوانین محتوا:
- محتوا باید واقعاً برای مخاطب مفید باشه، نه تبلیغاتی صرف؛ حداکثر یک جمله نرم در انتهای مقاله به خدمات بایت‌لب اشاره کنه.
- طول مقاله: معمولاً حدود ۳۰۰ تا ۴۵۰ کلمه، ولی اگه موضوع واقعاً نیاز به توضیح بیشتر داشت، مجازی تا ۲-۳ پاراگراف بلندتر بشی (در مجموع تا حدود ۷۰۰-۸۰۰ کلمه)؛ فارسی روان و طبیعی. مهم‌تر از رعایت دقیق این طول، تمام‌شدن کامل و معتبر JSON هست؛ اگر نزدیک به محدودیت پاسخ هستی، محتوا رو کوتاه‌تر کن ولی حتماً JSON رو کامل و بسته‌شده تحویل بده (هیچ‌وقت وسط یک رشته یا داخل content نیمه‌کاره قطع نشه).
- از تکرار بی‌مورد کلمه کلیدی خودداری کن (کیفیت مهم‌تر از تراکم کلمه کلیدیه).
- عنوان باید طبیعی، جذاب و شامل عبارت کلیدی مرتبط باشه (نه کلیک‌بیتی).
- خلاصه (excerpt) باید ۱ تا ۲ جمله‌ی گویا برای نمایش در لیست بلاگ باشه.
- محتوا رو با پاراگراف‌های کوتاه (۲ تا ۴ جمله) بنویس و بین هر پاراگراف دقیقاً یک خط خالی بذار؛ از هیچ تگ HTML یا Markdown (مثل **، ##، -) داخل content استفاده نکن، فقط متن ساده.
- حتماً به موضوعاتی که قبلاً نوشته شده دوباره نپرداز (لیست موضوعات قبلی رو در پیام کاربر می‌بینی).

خروجی: فقط و فقط یک JSON خام و معتبر با این ساختار دقیق برگردون، بدون هیچ توضیح اضافه، بدون بک‌تیک یا Markdown دورش:
{"title":"...","excerpt":"...","tag":"طراحی سایت | طراحی اپلیکیشن | خدمات کامپیوتر | نکات فنی","content":"پاراگراف اول...\\n\\nپاراگراف دوم...\\n\\n..."}
`;

// خروجی مدل هوش‌مصنوعی گاهی خط‌جدید واقعی به‌جای \n اسکیپ‌شده داخل رشته‌ها می‌ذاره، یا متن اضافه دور JSON.
// این تابع هم فقط بخش { ... } رو استخراج می‌کنه، هم کاراکترهای کنترلی خام رو اسکیپ می‌کنه تا JSON.parse خطا نده.
function parseBlogJSON(raw) {
  let text = String(raw).replace(/```json|```/g, "").trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (match) text = match[0];

  let sanitized = "";
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (inString) {
      if (escaped) {
        sanitized += ch;
        escaped = false;
      } else if (ch === "\\") {
        sanitized += ch;
        escaped = true;
      } else if (ch === '"') {
        sanitized += ch;
        inString = false;
      } else if (ch === "\n") {
        sanitized += "\\n";
      } else if (ch === "\r") {
        // نادیده گرفته می‌شه
      } else if (ch === "\t") {
        sanitized += "\\t";
      } else if (ch.charCodeAt(0) < 0x20) {
        // سایر کاراکترهای کنترلی حذف می‌شن
      } else {
        sanitized += ch;
      }
    } else {
      if (ch === '"') inString = true;
      sanitized += ch;
    }
  }

  return JSON.parse(sanitized);
}

async function callAIWorker(env, system, userText) {
  if (!env.AI_WORKER) {
    throw new Error(
      "اتصال به Worker هوش‌مصنوعی تنظیم نشده. تو تنظیمات bytelab-telegram → Bindings → Add → Service binding، یک Binding با نام AI_WORKER به Worker «bytelab-ai» وصل کن."
    );
  }
  const response = await env.AI_WORKER.fetch(AI_WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system,
      messages: [{ role: "user", content: userText }],
      max_tokens: 3200,
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(String(data.error));
  const textBlock = (data.content || []).find((b) => b.type === "text");
  if (!textBlock) throw new Error("پاسخی از هوش‌مصنوعی دریافت نشد.");
  return textBlock.text;
}

async function generateAndPublishBlogPost(env) {
  const existing = await getAllBlogPosts(env);
  const recentTitles = existing.slice(0, 30).map((p) => `- ${p.title}`).join("\n") || "(هنوز پستی نوشته نشده)";

  const userMsg =
    `موضوعات قبلاً نوشته‌شده (تکرار نکن):\n${recentTitles}\n\n` +
    `یک پست جدید و متفاوت با موضوعات بالا، طبق قوانین سیستم بنویس و فقط JSON خروجی بده.`;

  const MAX_ATTEMPTS = 2;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callAIWorker(env, BLOG_WRITER_SYSTEM, userMsg);
      const parsed = parseBlogJSON(raw);

      if (!parsed.title || !parsed.content || String(parsed.content).trim().length < 150) {
        throw new Error("خروجی هوش‌مصنوعی ناقص یا خیلی کوتاه بود.");
      }

      const item = {
        id: crypto.randomUUID(),
        slug: slugify(parsed.title),
        status: "published",
        createdAt: Date.now(),
        title: String(parsed.title).slice(0, 150),
        excerpt: String(parsed.excerpt || "").slice(0, 400),
        content: String(parsed.content).slice(0, 8000),
        image: "",
        tag: String(parsed.tag || "بایت‌لب").slice(0, 60),
        autoGenerated: true,
      };

      await saveBlogPost(env, item);
      await env.LEADS_KV.put("blogauto:failstreak", "0");
      await tgSend(
        env,
        `📰 پست جدید بلاگ به‌صورت خودکار منتشر شد:\n\n«${item.title}»\n\nhttps://mr-aiza.github.io/bytelab/blog-post.html?id=${item.id}\n\nبرای ویرایش یا حذف: /manageblog`
      );
      return; // موفق شد، دیگه نیازی به تلاش بیشتر نیست
    } catch (err) {
      lastError = err;
      // اگه تلاش تموم نشده، دوباره امتحان می‌کنیم؛ چیزی منتشر نمی‌شه تا وقتی کامل و سالم نباشه
    }
  }

  // بعد از همه‌ی تلاش‌ها هم نشد: هیچی منتشر نمی‌شه، فقط اطلاع می‌دیم
  const prevStreak = parseInt((await env.LEADS_KV.get("blogauto:failstreak")) || "0", 10);
  const streak = prevStreak + 1;
  await env.LEADS_KV.put("blogauto:failstreak", String(streak));

  const streakNote =
    streak >= 3
      ? `\n\n⚠️ این ${streak}مین باره پشت‌سرهم که کلاً ناموفقه — به‌نظر یه مشکل واقعی (مثلاً قطع بودن Service Binding به bytelab-ai) هست، نه فقط بدشانسی. لطفاً چک کن.`
      : "";

  await tgSend(
    env,
    `⚠️ نوشتن خودکار پست بلاگ بعد از ${MAX_ATTEMPTS} تلاش موفق نشد (چیزی منتشر نشد):\n${String(lastError)}${streakNote}\n\nمی‌تونی دوباره «🤖 نوشتن فوری با AI» رو بزنی.`
  );
}

async function saveLead(env, lead) {
  await env.LEADS_KV.put(`lead:${lead.id}`, JSON.stringify(lead));
}

async function getAllLeads(env) {
  const list = await env.LEADS_KV.list({ prefix: "lead:" });
  const values = await Promise.all(list.keys.map((k) => env.LEADS_KV.get(k.name)));
  return values.filter(Boolean).map((v) => JSON.parse(v)).sort((a, b) => b.createdAt - a.createdAt);
}

// ================== نمونه‌کارهای کاربران ==================
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

async function getAllPortfolioItems(env) {
  const list = await env.LEADS_KV.list({ prefix: "portfolio:" });
  const values = await Promise.all(list.keys.map((k) => env.LEADS_KV.get(k.name)));
  return values.filter(Boolean).map((v) => JSON.parse(v)).sort((a, b) => b.createdAt - a.createdAt);
}

// ================== بنر اعلانات سایت ==================
async function getBanner(env) {
  const raw = await env.LEADS_KV.get("config:banner");
  return raw ? JSON.parse(raw) : { enabled: false, text: "", link: "", style: "info" };
}
async function saveBanner(env, banner) {
  await env.LEADS_KV.put("config:banner", JSON.stringify(banner));
}

function formatBannerDetail(banner) {
  return (
    `📢 بنر اعلانات سایت\n\n` +
    `وضعیت: ${banner.enabled ? "✅ روشن (روی سایت نمایش داده می‌شه)" : "🚫 خاموش"}\n\n` +
    `📝 متن: ${banner.text || "-"}\n` +
    `🔗 لینک (اختیاری): ${banner.link || "-"}`
  );
}
function bannerKeyboard(banner) {
  const rows = [];
  if (banner.enabled) {
    rows.push([{ text: "🚫 خاموش کردن بنر", callback_data: "bnenable:0" }]);
  } else {
    rows.push([{ text: "✅ روشن کردن بنر", callback_data: "bnenable:1" }]);
  }
  rows.push([
    { text: "✏️ ویرایش متن", callback_data: "bnedit:text" },
    { text: "✏️ ویرایش لینک", callback_data: "bnedit:link" },
  ]);
  rows.push([{ text: "🔄 بروزرسانی این پیام", callback_data: "bnrefresh" }]);
  return { inline_keyboard: rows };
}

// ================== وضعیت پاسخگویی آنلاین/آفلاین ==================
async function getStatus(env) {
  const raw = await env.LEADS_KV.get("config:status");
  return raw ? JSON.parse(raw) : { online: true, updatedAt: Date.now() };
}
async function saveStatus(env, status) {
  await env.LEADS_KV.put("config:status", JSON.stringify(status));
}
function formatStatusDetail(status) {
  const date = new Date(status.updatedAt || Date.now()).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" });
  return (
    `🟢 وضعیت پاسخگویی سایت\n\n` +
    `وضعیت فعلی: ${status.online ? "🟢 آنلاین (پاسخگو هستیم)" : "🔴 آفلاین (خارج از دسترس)"}\n` +
    `آخرین تغییر: ${date}\n\n` +
    `این وضعیت به‌صورت خودکار روی سایت (کنار دکمه چت/تماس) نمایش داده می‌شه.`
  );
}
function statusKeyboard(status) {
  return {
    inline_keyboard: [[
      status.online
        ? { text: "🔴 تغییر به آفلاین", callback_data: "sttoggle:0" }
        : { text: "🟢 تغییر به آنلاین", callback_data: "sttoggle:1" },
    ]],
  };
}

// ================== سوالات متداول (FAQ) ==================
const FAQ_SERVICES = [
  { code: "site", label: "🌐 طراحی سایت" },
  { code: "app", label: "📱 طراحی اپلیکیشن" },
  { code: "computer", label: "🖥 خدمات کامپیوتر" },
];
function faqServiceLabel(code) {
  const s = FAQ_SERVICES.find((s) => s.code === code);
  return s ? s.label : code;
}
async function saveFaq(env, item) {
  await env.LEADS_KV.put(`faq:${item.id}`, JSON.stringify(item));
}
async function getFaqItem(env, id) {
  const raw = await env.LEADS_KV.get(`faq:${id}`);
  return raw ? JSON.parse(raw) : null;
}
async function deleteFaqItem(env, id) {
  await env.LEADS_KV.delete(`faq:${id}`);
}
async function getAllFaq(env) {
  const list = await env.LEADS_KV.list({ prefix: "faq:" });
  const values = await Promise.all(list.keys.map((k) => env.LEADS_KV.get(k.name)));
  return values.filter(Boolean).map((v) => JSON.parse(v)).sort((a, b) => a.createdAt - b.createdAt);
}

// ================== وبلاگ ==================
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
async function getAllBlogPosts(env) {
  const list = await env.LEADS_KV.list({ prefix: "blog:" });
  const values = await Promise.all(list.keys.map((k) => env.LEADS_KV.get(k.name)));
  return values.filter(Boolean).map((v) => JSON.parse(v)).sort((a, b) => b.createdAt - a.createdAt);
}
function slugify(title) {
  const base = String(title || "post")
    .trim()
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return (base || "post") + "-" + Date.now().toString(36);
}

// ================== وضعیت مکالمه ادمین (برای ویرایش / افزودن دستی) ==================
// ذخیره در KV با کلید admstate:<chatId> و انقضای ۱ ساعته تا مکالمه‌های رهاشده هرز نره
async function getAdminState(env, chatId) {
  const raw = await env.LEADS_KV.get(`admstate:${chatId}`);
  return raw ? JSON.parse(raw) : null;
}
async function setAdminState(env, chatId, state) {
  await env.LEADS_KV.put(`admstate:${chatId}`, JSON.stringify(state), { expirationTtl: 3600 });
}
async function clearAdminState(env, chatId) {
  await env.LEADS_KV.delete(`admstate:${chatId}`);
}

function statusLabel(status) {
  if (status === "contacted") return "✅ تماس گرفته شد";
  if (status === "rejected") return "❌ رد شد";
  if (status === "later") return "⏳ تماس بعداً";
  return "🆕 جدید";
}

function pfStatusLabel(status) {
  if (status === "approved") return "✅ تایید شده (روی سایت)";
  if (status === "rejected") return "❌ رد شده";
  return "⏳ در انتظار تایید";
}

function mainMenu() {
  return {
    keyboard: [
      [{ text: "📊 آمار" }, { text: "📋 لیدها" }],
      [{ text: "🎨 نمونه‌کارهای جدید" }, { text: "🗂 مدیریت گالری" }],
      [{ text: "➕ افزودن نمونه‌کار دستی" }],
      [{ text: "📰 مدیریت بلاگ" }, { text: "➕ پست جدید" }],
      [{ text: "🤖 نوشتن فوری با AI" }],
      [{ text: "❓ مدیریت سوالات متداول" }, { text: "➕ سوال جدید" }],
      [{ text: "📢 بنر سایت" }, { text: "🟢 وضعیت پاسخگویی" }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

// ---- فیلدهای قابل ویرایش یک سوال متداول ----
const FAQ_FIELDS = {
  q: { key: "question", label: "❓ سوال" },
  a: { key: "answer", label: "💬 پاسخ" },
};

function formatFaqDetail(item) {
  return (
    `❓ سوال متداول\n\n` +
    `📂 خدمت: ${faqServiceLabel(item.service)}\n\n` +
    `❓ سوال: ${item.question || "-"}\n` +
    `💬 پاسخ: ${item.answer || "-"}`
  );
}

function faqManageKeyboard(item) {
  return {
    inline_keyboard: [
      [
        { text: "✏️ ویرایش سوال", callback_data: `fqedit:${item.id}:q` },
        { text: "✏️ ویرایش پاسخ", callback_data: `fqedit:${item.id}:a` },
      ],
      [{ text: "🗑 حذف این سوال", callback_data: `fqdel:${item.id}` }],
    ],
  };
}

async function sendFaqManageCard(env, chatId, item) {
  return tgSendTo(env, chatId, formatFaqDetail(item), { reply_markup: faqManageKeyboard(item) });
}

// ---- فیلدهای قابل ویرایش یک پست بلاگ ----
const BLOG_FIELDS = {
  t: { key: "title", label: "📌 عنوان" },
  e: { key: "excerpt", label: "📝 خلاصه" },
  c: { key: "content", label: "📄 متن کامل" },
  i: { key: "image", label: "🖼 لینک تصویر" },
  g: { key: "tag", label: "🏷 دسته/برچسب" },
};

function blogStatusLabel(status) {
  return status === "published" ? "✅ منتشر شده (روی سایت)" : "📝 پیش‌نویس";
}

function formatBlogDetail(item) {
  const preview = (item.content || "-").slice(0, 200) + ((item.content || "").length > 200 ? "…" : "");
  return (
    `📰 پست بلاگ\n\n` +
    `وضعیت: ${blogStatusLabel(item.status)}\n\n` +
    `📌 عنوان: ${item.title || "-"}\n` +
    `🏷 برچسب: ${item.tag || "-"}\n` +
    `📝 خلاصه: ${item.excerpt || "-"}\n` +
    `🖼 لینک تصویر: ${item.image || "-"}\n\n` +
    `📄 متن: ${preview}`
  );
}

function blogManageKeyboard(item) {
  const rows = [];
  if (item.status !== "published") {
    rows.push([{ text: "✅ انتشار روی سایت", callback_data: `blpub:${item.id}:published` }]);
  } else {
    rows.push([{ text: "🚫 برداشتن از سایت (پیش‌نویس)", callback_data: `blpub:${item.id}:draft` }]);
  }
  rows.push([
    { text: "✏️ عنوان", callback_data: `bledit:${item.id}:t` },
    { text: "✏️ برچسب", callback_data: `bledit:${item.id}:g` },
  ]);
  rows.push([
    { text: "✏️ خلاصه", callback_data: `bledit:${item.id}:e` },
    { text: "✏️ لینک تصویر", callback_data: `bledit:${item.id}:i` },
  ]);
  rows.push([{ text: "✏️ متن کامل", callback_data: `bledit:${item.id}:c` }]);
  rows.push([{ text: "🗑 حذف کامل این پست", callback_data: `bldel:${item.id}` }]);
  rows.push([{ text: "🔄 بروزرسانی این پیام", callback_data: `blmanage:${item.id}` }]);
  return { inline_keyboard: rows };
}

async function sendBlogManageCard(env, chatId, item) {
  return tgSendTo(env, chatId, formatBlogDetail(item), { reply_markup: blogManageKeyboard(item) });
}

// ---- فیلدهای قابل ویرایش یک نمونه‌کار ----
const PF_FIELDS = {
  t: { key: "title", label: "📌 عنوان" },
  d: { key: "description", label: "📝 توضیح کوتاه" },
  u: { key: "url", label: "🔗 لینک سایت" },
  i: { key: "image", label: "🖼 لینک تصویر" },
  a: { key: "authorName", label: "👤 نام سازنده" },
  c: { key: "authorContact", label: "📞 راه ارتباطی" },
};

function formatItemDetail(item) {
  return (
    `🎨 نمونه‌کار\n\n` +
    `وضعیت: ${pfStatusLabel(item.status)}\n\n` +
    `📌 عنوان: ${item.title || "-"}\n` +
    `📝 توضیح: ${item.description || "-"}\n` +
    `🔗 لینک سایت: ${item.url || "-"}\n` +
    `🖼 لینک تصویر: ${item.image || "-"}\n` +
    `👤 سازنده: ${item.authorName || "-"}\n` +
    `📞 ارتباط: ${item.authorContact || "-"}`
  );
}

function manageKeyboard(item) {
  const rows = [];

  if (item.status !== "approved") {
    rows.push([{ text: "✅ تایید و نمایش", callback_data: `pf:${item.id}:approved` }]);
  }
  if (item.status !== "rejected") {
    rows.push([{ text: "🚫 رد کردن / برداشتن از سایت", callback_data: `pf:${item.id}:rejected` }]);
  }

  rows.push([
    { text: "✏️ عنوان", callback_data: `pfedit:${item.id}:t` },
    { text: "✏️ توضیح", callback_data: `pfedit:${item.id}:d` },
  ]);
  rows.push([
    { text: "✏️ لینک سایت", callback_data: `pfedit:${item.id}:u` },
    { text: "✏️ لینک تصویر", callback_data: `pfedit:${item.id}:i` },
  ]);
  rows.push([
    { text: "✏️ نام سازنده", callback_data: `pfedit:${item.id}:a` },
    { text: "✏️ راه ارتباطی", callback_data: `pfedit:${item.id}:c` },
  ]);
  rows.push([{ text: "🗑 حذف کامل این نمونه‌کار", callback_data: `pfdel:${item.id}` }]);
  rows.push([{ text: "🔄 بروزرسانی این پیام", callback_data: `pfmanage:${item.id}` }]);

  return { inline_keyboard: rows };
}

async function sendItemManageCard(env, chatId, item) {
  return tgSendTo(env, chatId, formatItemDetail(item), { reply_markup: manageKeyboard(item) });
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://mr-aiza.github.io",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // ================== ثبت دستورهای ربات (یک‌بار بعد از هر دیپلوی، این آدرس رو باز کن) ==================
    // این کار باعث می‌شه توی تلگرام کنار جعبه‌ی پیام یه دکمه «/» بیاد که با زدنش
    // لیست همه‌ی دستورهای بات (مثل /managepf و /addpf) به‌صورت دکمه‌های قابل لمس نمایش داده بشه.
    if (url.pathname === "/setup-commands" && request.method === "GET") {
      try {
        const result = await tgSetCommands(env);
        return new Response(JSON.stringify(result, null, 2), {
          status: result.ok ? 200 : 500,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: String(err) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // ================== لیست عمومی نمونه‌کارهای تایید شده (برای نمایش در سایت) ==================
    if (url.pathname === "/api/portfolio" && request.method === "GET") {
      try {
        const items = (await getAllPortfolioItems(env)).filter((p) => p.status === "approved");
        return new Response(JSON.stringify({ ok: true, items }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: String(err) }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // ================== وضعیت پاسخگویی آنلاین/آفلاین (برای نمایش در سایت) ==================
    if (url.pathname === "/status" && request.method === "GET") {
      const status = await getStatus(env);
      return new Response(JSON.stringify({ ok: true, online: status.online }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ================== بنر اعلانات (برای نمایش در سایت) ==================
    if (url.pathname === "/banner" && request.method === "GET") {
      const banner = await getBanner(env);
      return new Response(JSON.stringify({ ok: true, banner }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ================== سوالات متداول (برای نمایش در صفحات خدمات) ==================
    if (url.pathname === "/api/faq" && request.method === "GET") {
      try {
        const service = url.searchParams.get("service");
        let items = await getAllFaq(env);
        if (service) items = items.filter((i) => i.service === service);
        items = items.map((i) => ({ id: i.id, service: i.service, question: i.question, answer: i.answer }));
        return new Response(JSON.stringify({ ok: true, items }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: String(err) }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // ================== بلاگ (لیست منتشر شده + جزئیات یک پست) ==================
    if (url.pathname === "/api/blog" && request.method === "GET") {
      try {
        const id = url.searchParams.get("id");
        if (id) {
          const item = await getBlogPost(env, id);
          if (!item || item.status !== "published") {
            return new Response(JSON.stringify({ ok: false, error: "not_found" }), {
              status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }
          return new Response(JSON.stringify({ ok: true, item }), {
            status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        const posts = (await getAllBlogPosts(env))
          .filter((p) => p.status === "published")
          .map((p) => ({ id: p.id, title: p.title, excerpt: p.excerpt, image: p.image, tag: p.tag, createdAt: p.createdAt }));
        return new Response(JSON.stringify({ ok: true, posts }), {
          status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: String(err) }), {
          status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // ================== وبهوک تلگرام (دکمه‌ها + دستورات) ==================
    if (url.pathname === "/tg") {
      if (request.method !== "POST") return new Response("ok");

      const update = await request.json();

      // ---------- کلیک روی دکمه‌های شیشه‌ای ----------
      if (update.callback_query) {
        const cq = update.callback_query;
        const data = cq.data || "";
        const chatId = cq.message.chat.id;
        const messageId = cq.message.message_id;

        if (String(cq.from.id) !== String(env.TELEGRAM_CHAT_ID)) {
          await tgAnswerCallback(env, cq.id, "اجازه‌ی این کار رو ندارید.");
          return new Response("ok");
        }

        const parts = data.split(":");

        if (parts[0] === "st") {
          // وضعیت لید (تماس گرفتم / بعداً / رد شد)
          const leadId = parts[1];
          const newStatus = parts[2];
          const raw = await env.LEADS_KV.get(`lead:${leadId}`);
          if (raw) {
            const lead = JSON.parse(raw);
            lead.status = newStatus;
            if (newStatus === "later") {
              lead.reminded = false;
              lead.snoozeUntil = Date.now() + 24 * 60 * 60 * 1000;
            }
            await saveLead(env, lead);
            await tgEditMarkup(env, chatId, messageId, {
              inline_keyboard: [[{ text: statusLabel(newStatus) + " (ثبت شد)", callback_data: "noop" }]],
            });
            await tgAnswerCallback(env, cq.id, "وضعیت ثبت شد ✅");
          } else {
            await tgAnswerCallback(env, cq.id, "این لید پیدا نشد.");
          }
        } else if (parts[0] === "pf") {
          // تایید یا رد نمونه‌کار (از پیام اولیه‌ی ارسال کاربر یا از کارت مدیریت)
          const pfId = parts[1];
          const newStatus = parts[2]; // approved | rejected
          const item = await getPortfolioItem(env, pfId);
          if (item) {
            item.status = newStatus;
            await savePortfolioItem(env, item);
            await tgEditText(env, chatId, messageId, formatItemDetail(item), {
              reply_markup: manageKeyboard(item),
            });
            await tgAnswerCallback(
              env,
              cq.id,
              newStatus === "approved" ? "تایید شد و روی سایت نمایش داده می‌شه ✅" : "رد شد / از سایت برداشته شد ❌"
            );
          } else {
            await tgAnswerCallback(env, cq.id, "این نمونه‌کار پیدا نشد.");
          }
        } else if (parts[0] === "pfmanage") {
          // نمایش/بروزرسانی کارت مدیریت یک نمونه‌کار
          const pfId = parts[1];
          const item = await getPortfolioItem(env, pfId);
          if (item) {
            await tgEditText(env, chatId, messageId, formatItemDetail(item), {
              reply_markup: manageKeyboard(item),
            });
            await tgAnswerCallback(env, cq.id, "بروزرسانی شد");
          } else {
            await tgAnswerCallback(env, cq.id, "این نمونه‌کار دیگه وجود نداره (شاید حذف شده).");
          }
        } else if (parts[0] === "pfedit") {
          // شروع ویرایش یک فیلد خاص
          const pfId = parts[1];
          const fieldCode = parts[2];
          const field = PF_FIELDS[fieldCode];
          const item = await getPortfolioItem(env, pfId);
          if (!item || !field) {
            await tgAnswerCallback(env, cq.id, "امکان ویرایش نیست.");
            return new Response("ok");
          }
          await setAdminState(env, chatId, { mode: "editfield", id: pfId, field: fieldCode });
          await tgAnswerCallback(env, cq.id, "منتظر مقدار جدید هستم...");
          await tgSendTo(
            env,
            chatId,
            `✏️ در حال ویرایش «${field.label}»\n\nمقدار فعلی:\n${item[field.key] || "-"}\n\nمقدار جدید رو بفرست، یا برای لغو /cancel رو بزن.`,
            { reply_markup: { force_reply: true } }
          );
        } else if (parts[0] === "pfdel") {
          // درخواست تاییدیه‌ی حذف
          const pfId = parts[1];
          const item = await getPortfolioItem(env, pfId);
          if (!item) {
            await tgAnswerCallback(env, cq.id, "این نمونه‌کار پیدا نشد.");
            return new Response("ok");
          }
          await tgEditText(
            env,
            chatId,
            messageId,
            `⚠️ مطمئنی می‌خوای «${item.title}» رو کامل حذف کنی؟ این کار قابل بازگشت نیست.`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: "✅ بله، حذف کن", callback_data: `pfdelyes:${pfId}` },
                    { text: "❌ نه، بازگشت", callback_data: `pfmanage:${pfId}` },
                  ],
                ],
              },
            }
          );
          await tgAnswerCallback(env, cq.id, "");
        } else if (parts[0] === "pfdelyes") {
          const pfId = parts[1];
          const item = await getPortfolioItem(env, pfId);
          await deletePortfolioItem(env, pfId);
          await tgEditText(
            env,
            chatId,
            messageId,
            `🗑 «${item ? item.title : "نمونه‌کار"}» با موفقیت حذف شد.`,
            { reply_markup: { inline_keyboard: [] } }
          );
          await tgAnswerCallback(env, cq.id, "حذف شد ✅");
        } else if (parts[0] === "canceladd") {
          await clearAdminState(env, chatId);
          await tgEditText(env, chatId, messageId, "❌ افزودن نمونه‌کار لغو شد.", {
            reply_markup: { inline_keyboard: [] },
          });
          await tgAnswerCallback(env, cq.id, "لغو شد");

        // ---------- بنر اعلانات ----------
        } else if (parts[0] === "bnenable") {
          const banner = await getBanner(env);
          banner.enabled = parts[1] === "1";
          banner.updatedAt = Date.now();
          await saveBanner(env, banner);
          await tgEditText(env, chatId, messageId, formatBannerDetail(banner), { reply_markup: bannerKeyboard(banner) });
          await tgAnswerCallback(env, cq.id, banner.enabled ? "بنر روشن شد ✅" : "بنر خاموش شد 🚫");
        } else if (parts[0] === "bnedit") {
          const field = parts[1]; // text | link
          await setAdminState(env, chatId, { mode: "bannerfield", field });
          await tgAnswerCallback(env, cq.id, "منتظر مقدار جدید هستم...");
          const label = field === "text" ? "📝 متن بنر" : "🔗 لینک بنر";
          await tgSendTo(env, chatId, `✏️ در حال ویرایش «${label}»\n\nمقدار جدید رو بفرست (برای پاک‌کردن لینک بنویس -)، یا /cancel:`, {
            reply_markup: { force_reply: true },
          });
        } else if (parts[0] === "bnrefresh") {
          const banner = await getBanner(env);
          await tgEditText(env, chatId, messageId, formatBannerDetail(banner), { reply_markup: bannerKeyboard(banner) });
          await tgAnswerCallback(env, cq.id, "بروزرسانی شد");

        // ---------- وضعیت پاسخگویی آنلاین/آفلاین ----------
        } else if (parts[0] === "sttoggle") {
          const status = { online: parts[1] === "1", updatedAt: Date.now() };
          await saveStatus(env, status);
          await tgEditText(env, chatId, messageId, formatStatusDetail(status), { reply_markup: statusKeyboard(status) });
          await tgAnswerCallback(env, cq.id, status.online ? "وضعیت: آنلاین 🟢" : "وضعیت: آفلاین 🔴");

        // ---------- سوالات متداول ----------
        } else if (parts[0] === "fqaddservice") {
          const service = parts[1];
          await setAdminState(env, chatId, { mode: "faqadd", step: "question", data: { service } });
          await tgAnswerCallback(env, cq.id, "");
          await tgSendTo(env, chatId, `❓ سوال رو بفرست (برای «${faqServiceLabel(service)}»):`, { reply_markup: { force_reply: true } });
        } else if (parts[0] === "fqmanage") {
          const item = await getFaqItem(env, parts[1]);
          if (item) {
            await tgEditText(env, chatId, messageId, formatFaqDetail(item), { reply_markup: faqManageKeyboard(item) });
            await tgAnswerCallback(env, cq.id, "بروزرسانی شد");
          } else {
            await tgAnswerCallback(env, cq.id, "این سوال پیدا نشد.");
          }
        } else if (parts[0] === "fqedit") {
          const fqId = parts[1];
          const fieldCode = parts[2];
          const field = FAQ_FIELDS[fieldCode];
          const item = await getFaqItem(env, fqId);
          if (!item || !field) {
            await tgAnswerCallback(env, cq.id, "امکان ویرایش نیست.");
            return new Response("ok");
          }
          await setAdminState(env, chatId, { mode: "faqeditfield", id: fqId, field: fieldCode });
          await tgAnswerCallback(env, cq.id, "منتظر مقدار جدید هستم...");
          await tgSendTo(env, chatId, `✏️ در حال ویرایش «${field.label}»\n\nمقدار فعلی:\n${item[field.key] || "-"}\n\nمقدار جدید رو بفرست، یا /cancel:`, {
            reply_markup: { force_reply: true },
          });
        } else if (parts[0] === "fqdel") {
          const item = await getFaqItem(env, parts[1]);
          if (!item) {
            await tgAnswerCallback(env, cq.id, "این سوال پیدا نشد.");
            return new Response("ok");
          }
          await tgEditText(env, chatId, messageId, `⚠️ مطمئنی می‌خوای این سوال رو حذف کنی؟\n\n«${item.question}»`, {
            reply_markup: {
              inline_keyboard: [[
                { text: "✅ بله، حذف کن", callback_data: `fqdelyes:${item.id}` },
                { text: "❌ نه، بازگشت", callback_data: `fqmanage:${item.id}` },
              ]],
            },
          });
          await tgAnswerCallback(env, cq.id, "");
        } else if (parts[0] === "fqdelyes") {
          const item = await getFaqItem(env, parts[1]);
          await deleteFaqItem(env, parts[1]);
          await tgEditText(env, chatId, messageId, `🗑 سوال با موفقیت حذف شد.`, { reply_markup: { inline_keyboard: [] } });
          await tgAnswerCallback(env, cq.id, "حذف شد ✅");

        // ---------- بلاگ ----------
        } else if (parts[0] === "blpub") {
          const item = await getBlogPost(env, parts[1]);
          if (item) {
            item.status = parts[2];
            await saveBlogPost(env, item);
            await tgEditText(env, chatId, messageId, formatBlogDetail(item), { reply_markup: blogManageKeyboard(item) });
            await tgAnswerCallback(env, cq.id, item.status === "published" ? "منتشر شد ✅" : "به پیش‌نویس برگشت 📝");
          } else {
            await tgAnswerCallback(env, cq.id, "این پست پیدا نشد.");
          }
        } else if (parts[0] === "blmanage") {
          const item = await getBlogPost(env, parts[1]);
          if (item) {
            await tgEditText(env, chatId, messageId, formatBlogDetail(item), { reply_markup: blogManageKeyboard(item) });
            await tgAnswerCallback(env, cq.id, "بروزرسانی شد");
          } else {
            await tgAnswerCallback(env, cq.id, "این پست دیگه وجود نداره.");
          }
        } else if (parts[0] === "bledit") {
          const blId = parts[1];
          const fieldCode = parts[2];
          const field = BLOG_FIELDS[fieldCode];
          const item = await getBlogPost(env, blId);
          if (!item || !field) {
            await tgAnswerCallback(env, cq.id, "امکان ویرایش نیست.");
            return new Response("ok");
          }
          await setAdminState(env, chatId, { mode: "blogeditfield", id: blId, field: fieldCode });
          await tgAnswerCallback(env, cq.id, "منتظر مقدار جدید هستم...");
          await tgSendTo(env, chatId, `✏️ در حال ویرایش «${field.label}»\n\nمقدار فعلی:\n${(item[field.key] || "-").toString().slice(0, 300)}\n\nمقدار جدید رو بفرست، یا /cancel:`, {
            reply_markup: { force_reply: true },
          });
        } else if (parts[0] === "bldel") {
          const item = await getBlogPost(env, parts[1]);
          if (!item) {
            await tgAnswerCallback(env, cq.id, "این پست پیدا نشد.");
            return new Response("ok");
          }
          await tgEditText(env, chatId, messageId, `⚠️ مطمئنی می‌خوای پست «${item.title}» رو کامل حذف کنی؟ این کار قابل بازگشت نیست.`, {
            reply_markup: {
              inline_keyboard: [[
                { text: "✅ بله، حذف کن", callback_data: `bldelyes:${item.id}` },
                { text: "❌ نه، بازگشت", callback_data: `blmanage:${item.id}` },
              ]],
            },
          });
          await tgAnswerCallback(env, cq.id, "");
        } else if (parts[0] === "bldelyes") {
          const item = await getBlogPost(env, parts[1]);
          await deleteBlogPost(env, parts[1]);
          await tgEditText(env, chatId, messageId, `🗑 «${item ? item.title : "پست"}» با موفقیت حذف شد.`, { reply_markup: { inline_keyboard: [] } });
          await tgAnswerCallback(env, cq.id, "حذف شد ✅");
        } else {
          await tgAnswerCallback(env, cq.id, "");
        }
        return new Response("ok");
      }

      // ---------- پیام متنی ----------
      if (update.message && update.message.text) {
        const chatId = update.message.chat.id;
        const text = update.message.text.trim();

        if (String(chatId) !== String(env.TELEGRAM_CHAT_ID)) {
          return new Response("ok");
        }

        // لغو هر مکالمه‌ی در حال انجام (ویرایش یا افزودن دستی)
        if (text === "/cancel") {
          const had = await getAdminState(env, chatId);
          await clearAdminState(env, chatId);
          await tgSendTo(env, chatId, had ? "❌ عملیات لغو شد." : "چیزی برای لغو کردن نیست.", {
            reply_markup: mainMenu(),
          });
          return new Response("ok");
        }

        // اگه یک مکالمه‌ی باز (ویرایش فیلد یا افزودن دستی) در جریانه، پیام رو به‌عنوان پاسخ اون مکالمه بگیر
        const state = await getAdminState(env, chatId);
        const MENU_BUTTON_TEXTS = [
          "📊 آمار", "📋 لیدها", "🎨 نمونه‌کارهای جدید", "🗂 مدیریت گالری", "➕ افزودن نمونه‌کار دستی",
          "📰 مدیریت بلاگ", "➕ پست جدید", "❓ مدیریت سوالات متداول", "➕ سوال جدید", "📢 بنر سایت", "🟢 وضعیت پاسخگویی",
        ];
        if (state && !text.startsWith("/") && !MENU_BUTTON_TEXTS.includes(text)) {
          if (state.mode === "bannerfield") {
            const banner = await getBanner(env);
            const value = text === "-" ? "" : text;
            if (state.field === "text") banner.text = text.slice(0, 300);
            if (state.field === "link") banner.link = value.slice(0, 300);
            banner.updatedAt = Date.now();
            await saveBanner(env, banner);
            await clearAdminState(env, chatId);
            await tgSendTo(env, chatId, "✅ بنر بروزرسانی شد.", { reply_markup: mainMenu() });
            await tgSendTo(env, chatId, formatBannerDetail(banner), { reply_markup: bannerKeyboard(banner) });
            return new Response("ok");
          }

          if (state.mode === "faqeditfield") {
            const item = await getFaqItem(env, state.id);
            const field = FAQ_FIELDS[state.field];
            if (item && field) {
              item[field.key] = text.slice(0, 600);
              await saveFaq(env, item);
              await clearAdminState(env, chatId);
              await tgSendTo(env, chatId, `✅ «${field.label}» بروزرسانی شد.`);
              await sendFaqManageCard(env, chatId, item);
            } else {
              await clearAdminState(env, chatId);
              await tgSendTo(env, chatId, "این سوال دیگه پیدا نشد.", { reply_markup: mainMenu() });
            }
            return new Response("ok");
          }

          if (state.mode === "faqadd") {
            const data = state.data || {};
            if (state.step === "question") {
              data.question = text.slice(0, 300);
              await setAdminState(env, chatId, { mode: "faqadd", step: "answer", data });
              await tgSendTo(env, chatId, "💬 حالا پاسخ این سوال رو بفرست:");
            } else if (state.step === "answer") {
              data.answer = text.slice(0, 800);
              await clearAdminState(env, chatId);
              const item = { id: crypto.randomUUID(), createdAt: Date.now(), service: data.service, question: data.question, answer: data.answer };
              await saveFaq(env, item);
              await tgSendTo(env, chatId, "✅ سوال متداول جدید اضافه شد و همین الان روی صفحه مربوطه نمایش داده می‌شه:", { reply_markup: mainMenu() });
              await sendFaqManageCard(env, chatId, item);
            }
            return new Response("ok");
          }

          if (state.mode === "blogeditfield") {
            const item = await getBlogPost(env, state.id);
            const field = BLOG_FIELDS[state.field];
            if (item && field) {
              const maxLen = field.key === "content" ? 8000 : 300;
              item[field.key] = text.slice(0, maxLen);
              await saveBlogPost(env, item);
              await clearAdminState(env, chatId);
              await tgSendTo(env, chatId, `✅ «${field.label}» بروزرسانی شد.`);
              await sendBlogManageCard(env, chatId, item);
            } else {
              await clearAdminState(env, chatId);
              await tgSendTo(env, chatId, "این پست دیگه پیدا نشد.", { reply_markup: mainMenu() });
            }
            return new Response("ok");
          }

          if (state.mode === "blogadd") {
            const value = text === "-" ? "" : text;
            const data = state.data || {};
            if (state.step === "title") {
              data.title = text.slice(0, 150);
              await setAdminState(env, chatId, { mode: "blogadd", step: "excerpt", data });
              await tgSendTo(env, chatId, "📝 یک خلاصه کوتاه (۱-۲ خط) برای لیست بلاگ بفرست:");
            } else if (state.step === "excerpt") {
              data.excerpt = text.slice(0, 400);
              await setAdminState(env, chatId, { mode: "blogadd", step: "content", data });
              await tgSendTo(env, chatId, "📄 متن کامل پست رو بفرست (می‌تونی چند پاراگراف باشه):");
            } else if (state.step === "content") {
              data.content = text.slice(0, 8000);
              await setAdminState(env, chatId, { mode: "blogadd", step: "image", data });
              await tgSendTo(env, chatId, "🖼 لینک تصویر کاور رو بفرست (اختیاریه، برای رد شدن بنویس -):");
            } else if (state.step === "image") {
              data.image = value.slice(0, 300);
              await setAdminState(env, chatId, { mode: "blogadd", step: "tag", data });
              await tgSendTo(env, chatId, "🏷 دسته/برچسب رو بفرست (مثلاً «طراحی سایت»، اختیاریه، برای رد شدن بنویس -):");
            } else if (state.step === "tag") {
              data.tag = value.slice(0, 60);
              await clearAdminState(env, chatId);
              const item = {
                id: crypto.randomUUID(),
                slug: slugify(data.title || "post"),
                status: "draft",
                createdAt: Date.now(),
                title: data.title || "-",
                excerpt: data.excerpt || "-",
                content: data.content || "-",
                image: data.image || "",
                tag: data.tag || "",
              };
              await saveBlogPost(env, item);
              await tgSendTo(env, chatId, "✅ پست به‌صورت پیش‌نویس ذخیره شد. برای نمایش روی سایت، دکمه «انتشار» رو بزن:", { reply_markup: mainMenu() });
              await sendBlogManageCard(env, chatId, item);
            }
            return new Response("ok");
          }

          if (state.mode === "editfield") {
            const item = await getPortfolioItem(env, state.id);
            const field = PF_FIELDS[state.field];
            if (item && field) {
              item[field.key] = text.slice(0, 400);
              await savePortfolioItem(env, item);
              await clearAdminState(env, chatId);
              await tgSendTo(env, chatId, `✅ «${field.label}» بروزرسانی شد.`);
              await sendItemManageCard(env, chatId, item);
            } else {
              await clearAdminState(env, chatId);
              await tgSendTo(env, chatId, "این نمونه‌کار دیگه پیدا نشد، عملیات لغو شد.", { reply_markup: mainMenu() });
            }
            return new Response("ok");
          }

          if (state.mode === "add") {
            const value = text === "-" ? "" : text;
            const data = state.data || {};

            if (state.step === "title") {
              data.title = text.slice(0, 120);
              await setAdminState(env, chatId, { mode: "add", step: "description", data });
              await tgSendTo(env, chatId, "📝 حالا یک توضیح کوتاه درباره‌ی این پروژه بفرست:");
            } else if (state.step === "description") {
              data.description = text.slice(0, 400);
              await setAdminState(env, chatId, { mode: "add", step: "url", data });
              await tgSendTo(env, chatId, "🔗 لینک سایت رو بفرست (اگه سایت نداره، بنویس -):");
            } else if (state.step === "url") {
              data.url = value.slice(0, 300);
              await setAdminState(env, chatId, { mode: "add", step: "image", data });
              await tgSendTo(env, chatId, "🖼 لینک تصویر پیش‌نمایش رو بفرست (اختیاریه، برای رد شدن بنویس -):");
            } else if (state.step === "image") {
              data.image = value.slice(0, 300);
              await setAdminState(env, chatId, { mode: "add", step: "authorName", data });
              await tgSendTo(env, chatId, "👤 نام سازنده رو بفرست:");
            } else if (state.step === "authorName") {
              data.authorName = text.slice(0, 80);
              await setAdminState(env, chatId, { mode: "add", step: "authorContact", data });
              await tgSendTo(env, chatId, "📞 راه ارتباطی سازنده رو بفرست (اختیاریه، برای رد شدن بنویس -):");
            } else if (state.step === "authorContact") {
              data.authorContact = value.slice(0, 100);
              await clearAdminState(env, chatId);

              const item = {
                id: crypto.randomUUID(),
                status: "approved",
                createdAt: Date.now(),
                title: data.title || "-",
                description: data.description || "-",
                url: data.url || "",
                image: data.image || "",
                authorName: data.authorName || "-",
                authorContact: data.authorContact || "-",
                addedManually: true,
              };
              await savePortfolioItem(env, item);
              await tgSendTo(env, chatId, "✅ نمونه‌کار جدید با موفقیت اضافه شد و همین الان روی سایت نمایش داده می‌شه:", {
                reply_markup: mainMenu(),
              });
              await sendItemManageCard(env, chatId, item);
            }
            return new Response("ok");
          }
        }

        // ---------- دستورات / دکمه‌های منو ----------
        if (text === "/stats" || text === "📊 آمار") {
          const leads = await getAllLeads(env);
          const today = nowTehranDateStr();
          const todays = leads.filter((l) => new Date(l.createdAt).toLocaleDateString("fa-IR-u-ca-gregory", { timeZone: "Asia/Tehran" }) === today);
          const contacts = leads.filter((l) => l.type === "contact").length;
          const profiles = leads.filter((l) => l.type === "profile").length;
          const downloads = leads.filter((l) => l.type === "apk_download").length;
          const visits = leads.filter((l) => l.type === "page_visit").length;
          const abandoned = leads.filter((l) => l.type === "abandoned_form").length;
          const contacted = leads.filter((l) => l.status === "contacted").length;
          const rejected = leads.filter((l) => l.status === "rejected").length;
          const later = leads.filter((l) => l.status === "later").length;
          const pending = leads.filter((l) => !l.status || l.status === "new").length;

          const portfolioItems = await getAllPortfolioItems(env);
          const pfPending = portfolioItems.filter((p) => p.status === "pending").length;
          const pfApproved = portfolioItems.filter((p) => p.status === "approved").length;
          const pfRejected = portfolioItems.filter((p) => p.status === "rejected").length;

          await tgSend(env,
            `📊 آمار کلی بایت‌لب\n\n` +
            `📅 امروز: ${todays.length} رویداد جدید\n` +
            `📦 کل رویدادها: ${leads.length}\n` +
            `📩 فرم تماس: ${contacts}\n` +
            `👤 ثبت‌نام: ${profiles}\n` +
            `📥 دانلود اپ: ${downloads}\n` +
            `👀 بازدید صفحه: ${visits}\n` +
            `🕓 فرم رهاشده: ${abandoned}\n\n` +
            `✅ تماس گرفته شده: ${contacted}\n` +
            `⏳ تماس بعداً: ${later}\n` +
            `❌ رد شده: ${rejected}\n` +
            `🆕 در انتظار پیگیری: ${pending}\n\n` +
            `🎨 نمونه‌کار در انتظار تایید: ${pfPending}\n` +
            `🎨 نمونه‌کار تایید شده: ${pfApproved}\n` +
            `🎨 نمونه‌کار رد شده: ${pfRejected}`,
            { reply_markup: mainMenu() }
          );
        } else if (text === "/leads" || text === "📋 لیدها") {
          const leads = (await getAllLeads(env))
            .filter((l) => ["contact", "profile", "abandoned_form"].includes(l.type))
            .slice(0, 10);
          if (leads.length === 0) {
            await tgSend(env, "هنوز هیچ لیدی ثبت نشده.", { reply_markup: mainMenu() });
          } else {
            let msg = "📋 آخرین ۱۰ لید:\n\n";
            leads.forEach((l, i) => {
              const date = new Date(l.createdAt).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" });
              msg += `${i + 1}. ${statusLabel(l.status)}\n`;
              if (l.type === "contact") msg += `   👤 ${l.name} | 📞 ${l.phone} | 🛠 ${l.service || "-"}\n`;
              if (l.type === "profile") msg += `   📧 ${l.email}\n`;
              if (l.type === "abandoned_form") msg += `   🕓 ${l.name || "-"} | 📞 ${l.phone || "-"} (رهاشده)\n`;
              msg += `   🕐 ${date}\n\n`;
            });
            await tgSend(env, msg, { reply_markup: mainMenu() });
          }
        } else if (text === "/portfolio" || text === "🎨 نمونه‌کارهای جدید") {
          // فقط موارد در انتظار تایید، هرکدوم با دکمه‌ی تایید/رد سریع + مدیریت کامل
          const portfolioItems = await getAllPortfolioItems(env);
          const pending = portfolioItems.filter((p) => p.status === "pending").slice(0, 15);

          await tgSend(
            env,
            `🎨 نمونه‌کارهای در انتظار تایید:\n` +
              `https://mr-aiza.github.io/bytelab/portfolio.html\n\n` +
              (pending.length === 0 ? "هیچ موردی در انتظار تایید نیست." : `${pending.length} مورد پیدا شد:`),
            { reply_markup: mainMenu() }
          );
          for (const item of pending) {
            await sendItemManageCard(env, chatId, item);
          }
        } else if (text === "/managepf" || text === "🗂 مدیریت گالری") {
          // همه‌ی موارد (در انتظار + تایید شده)، هرکدوم با کارت مدیریت کامل
          const portfolioItems = await getAllPortfolioItems(env);
          const pending = portfolioItems.filter((p) => p.status === "pending");
          const approved = portfolioItems.filter((p) => p.status === "approved");

          await tgSend(
            env,
            `🗂 مدیریت کامل گالری نمونه‌کارها\n\n` +
              `⏳ در انتظار تایید: ${pending.length}\n` +
              `✅ تایید شده (روی سایت): ${approved.length}\n\n` +
              `برای هرکدوم می‌تونی از دکمه‌های زیر پیام‌ها استفاده کنی: ویرایش فیلدها، تایید/رد، یا حذف کامل.`,
            { reply_markup: mainMenu() }
          );

          const combined = [...pending, ...approved].slice(0, 25);
          for (const item of combined) {
            await sendItemManageCard(env, chatId, item);
          }
          if (portfolioItems.length > combined.length) {
            await tgSend(env, `... و ${portfolioItems.length - combined.length} مورد دیگر (برای دیدن همه بعداً پیام بده).`);
          }
        } else if (text === "/addpf" || text === "➕ افزودن نمونه‌کار دستی") {
          await setAdminState(env, chatId, { mode: "add", step: "title", data: {} });
          await tgSendTo(env, chatId, "➕ افزودن نمونه‌کار جدید\n\n📌 عنوان پروژه رو بفرست (یا /cancel برای لغو):", {
            reply_markup: { force_reply: true },
          });
        } else if (text === "/banner" || text === "📢 بنر سایت") {
          const banner = await getBanner(env);
          await tgSendTo(env, chatId, formatBannerDetail(banner), { reply_markup: bannerKeyboard(banner) });
        } else if (text === "/status" || text === "🟢 وضعیت پاسخگویی") {
          const status = await getStatus(env);
          await tgSendTo(env, chatId, formatStatusDetail(status), { reply_markup: statusKeyboard(status) });
        } else if (text === "/addfaq" || text === "➕ سوال جدید") {
          await tgSendTo(env, chatId, "❓ این سوال برای کدوم خدمت اضافه بشه؟", {
            reply_markup: {
              inline_keyboard: FAQ_SERVICES.map((s) => [{ text: s.label, callback_data: `fqaddservice:${s.code}` }]),
            },
          });
        } else if (text === "/managefaq" || text === "❓ مدیریت سوالات متداول") {
          const items = await getAllFaq(env);
          await tgSend(env, `❓ سوالات متداول (${items.length} مورد)\n\nهرکدوم رو می‌تونی ویرایش یا حذف کنی:`, { reply_markup: mainMenu() });
          if (items.length === 0) {
            await tgSend(env, "هنوز هیچ سوالی اضافه نشده. از دکمه «➕ سوال جدید» استفاده کن.");
          }
          for (const item of items.slice(0, 25)) {
            await sendFaqManageCard(env, chatId, item);
          }
        } else if (text === "/addblog" || text === "➕ پست جدید") {
          await setAdminState(env, chatId, { mode: "blogadd", step: "title", data: {} });
          await tgSendTo(env, chatId, "📰 نوشتن پست جدید بلاگ\n\n📌 عنوان پست رو بفرست (یا /cancel برای لغو):", {
            reply_markup: { force_reply: true },
          });
        } else if (text === "/writeblog" || text === "🤖 نوشتن فوری با AI") {
          await tgSendTo(env, chatId, "🤖 در حال نوشتن پست جدید با هوش‌مصنوعی... چند ثانیه صبر کن.");
          await generateAndPublishBlogPost(env);
        } else if (text === "/manageblog" || text === "📰 مدیریت بلاگ") {
          const posts = await getAllBlogPosts(env);
          const drafts = posts.filter((p) => p.status !== "published");
          const published = posts.filter((p) => p.status === "published");
          await tgSend(
            env,
            `📰 مدیریت کامل بلاگ\n\n` +
              `📝 پیش‌نویس: ${drafts.length}\n` +
              `✅ منتشر شده: ${published.length}\n\n` +
              `برای هرکدوم می‌تونی از دکمه‌های زیر پیام استفاده کنی: ویرایش، انتشار/برداشتن، یا حذف کامل.`,
            { reply_markup: mainMenu() }
          );
          const combined = [...drafts, ...published].slice(0, 25);
          for (const item of combined) {
            await sendBlogManageCard(env, chatId, item);
          }
          if (posts.length > combined.length) {
            await tgSend(env, `... و ${posts.length - combined.length} مورد دیگر.`);
          }
        } else if (text === "/start") {
          // هر بار /start زده بشه، لیست دستورها هم دوباره با تلگرام سینک می‌شه (ارزون و بی‌خطره)
          await tgSetCommands(env);
          await tgSend(
            env,
            "سلام 👋 بات اطلاع‌رسانی و مدیریت بایت‌لب فعاله.\n\n" +
              "از منوی پایین صفحه استفاده کن، یا این دستورات رو بفرست:\n" +
              "/stats — آمار کلی\n" +
              "/leads — آخرین لیدها\n" +
              "/portfolio — نمونه‌کارهای در انتظار تایید\n" +
              "/managepf — مدیریت کامل گالری (ویرایش/حذف/تایید)\n" +
              "/addpf — افزودن دستی یک نمونه‌کار\n" +
              "/addblog — نوشتن پست جدید بلاگ\n" +
              "/writeblog — نوشتن فوری پست با هوش‌مصنوعی\n" +
              "/manageblog — مدیریت کامل بلاگ\n" +
              "/addfaq — افزودن سوال متداول جدید\n" +
              "/managefaq — مدیریت سوالات متداول\n" +
              "/banner — مدیریت بنر اعلانات سایت\n" +
              "/status — تغییر وضعیت آنلاین/آفلاین\n" +
              "/cancel — لغو مکالمه‌ی در حال انجام",
            { reply_markup: mainMenu() }
          );
        }
      }
      return new Response("ok");
    }

    // ================== درخواست‌های سایت (فرم تماس / ثبت‌نام / نمونه‌کار) ==================
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    try {
      const data = await request.json();
      const id = crypto.randomUUID();
      const createdAt = Date.now();

      // --- ارسال نمونه‌کار توسط کاربر: جدا از سیستم لیدها ذخیره می‌شه ---
      if (data.type === "portfolio_submit") {
        const item = {
          id,
          status: "pending",
          createdAt,
          title: (data.title || "-").slice(0, 120),
          description: (data.description || "-").slice(0, 400),
          url: (data.url || "").slice(0, 300),
          image: (data.image || "").slice(0, 300),
          authorName: (data.authorName || "-").slice(0, 80),
          authorContact: (data.authorContact || "-").slice(0, 100),
        };
        await savePortfolioItem(env, item);

        const sendResult = await tgSend(env, formatItemDetail(item) + "\n\n🆕 این یک ارسال جدید از سایته که منتظر بررسیه.", {
          reply_markup: manageKeyboard(item),
        });

        if (!sendResult.ok) {
          return new Response(JSON.stringify({ ok: false, error: sendResult }), {
            status: 502, headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      let text = "";
      let isLead = false;
      let withButtons = false;

      if (data.type === "contact") {
        isLead = true; withButtons = true;
        text =
          `📩 پیام جدید از فرم تماس\n\n` +
          `👤 نام: ${data.name || "-"}\n` +
          `📞 شماره: ${data.phone || "-"}\n` +
          `🛠 خدمات: ${data.service || "-"}\n` +
          `💬 پیام: ${data.message || "-"}`;
      } else if (data.type === "profile") {
        isLead = true; withButtons = true;
        text =
          `👤 کاربر جدید ثبت‌نام کرد\n\n` +
          `📧 ایمیل: ${data.email || "-"}\n` +
          `🆔 UID: ${data.uid || "-"}\n` +
          `📱 منبع: ${data.source || "سایت/اپ"}`;
      } else if (data.type === "apk_download") {
        isLead = true; withButtons = false;
        text = `📥 دانلود اپلیکیشن\n\nیک کاربر فایل APK بایت‌لب رو دانلود کرد.`;
      } else if (data.type === "page_visit") {
        isLead = true; withButtons = false;
        text = `👀 بازدید صفحه\n\nیک کاربر صفحه‌ی «${data.page || "-"}» رو باز کرد.`;
      } else if (data.type === "abandoned_form") {
        isLead = true; withButtons = true;
        text =
          `🕓 فرم تماس نیمه‌کاره رها شد\n\n` +
          `👤 نام: ${data.name || "-"}\n` +
          `📞 شماره: ${data.phone || "-"}\n` +
          `🛠 خدمات: ${data.service || "-"}\n` +
          `⚠️ کاربر بدون ارسال، صفحه رو ترک کرد. شاید ارزش پیگیری داشته باشه.`;
      } else {
        text = `📦 داده دریافتی:\n${JSON.stringify(data, null, 2)}`;
      }

      let sendResult;
      if (isLead) {
        const lead = { id, type: data.type, status: "new", createdAt, ...data };
        await saveLead(env, lead);
        if (withButtons) {
          sendResult = await tgSend(env, text, {
            reply_markup: {
              inline_keyboard: [[
                { text: "✅ تماس گرفتم", callback_data: `st:${id}:contacted` },
                { text: "⏳ بعداً", callback_data: `st:${id}:later` },
                { text: "❌ رد شد", callback_data: `st:${id}:rejected` },
              ]],
            },
          });
        } else {
          sendResult = await tgSend(env, text);
        }
      } else {
        sendResult = await tgSend(env, text);
      }

      if (!sendResult.ok) {
        return new Response(JSON.stringify({ ok: false, error: sendResult }), {
          status: 502, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: String(err) }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  },

  async scheduled(event, env, ctx) {
    if (event.cron === "30 18 * * *") {
      ctx.waitUntil(sendDailyReport(env));
    } else if (event.cron === "0 * * * *") {
      ctx.waitUntil(checkFollowUps(env));
    } else if (event.cron === "30 4,9,16 * * *") {
      ctx.waitUntil(generateAndPublishBlogPost(env));
    }
  },
};

async function sendDailyReport(env) {
  const leads = await getAllLeads(env);
  const today = nowTehranDateStr();
  const todays = leads.filter((l) => new Date(l.createdAt).toLocaleDateString("fa-IR-u-ca-gregory", { timeZone: "Asia/Tehran" }) === today);
  const contacts = todays.filter((l) => l.type === "contact").length;
  const profiles = todays.filter((l) => l.type === "profile").length;

  await tgSend(env,
    `🌙 گزارش پایان روز بایت‌لب\n\n` +
    `📩 فرم تماس امروز: ${contacts}\n` +
    `👤 ثبت‌نام امروز: ${profiles}\n` +
    `📦 مجموع لید امروز: ${todays.length}\n\n` +
    `برای دیدن جزئیات: /leads`
  );
}

async function checkFollowUps(env) {
  const leads = await getAllLeads(env);
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (const lead of leads) {
    if (!["contact", "profile", "abandoned_form"].includes(lead.type)) continue;

    if (lead.status === "later") {
      if (!lead.reminded && lead.snoozeUntil && now > lead.snoozeUntil) {
        const label = lead.type === "contact" ? `${lead.name} (${lead.phone})` : `${lead.email}`;
        await tgSend(env, `⏰ یادآوری «تماس بعداً»\n\nموقع پیگیری این لیده:\n${label}`);
        lead.reminded = true;
        await saveLead(env, lead);
      }
      continue;
    }

    const isPending = !lead.status || lead.status === "new";
    if (isPending && !lead.reminded && now - lead.createdAt > dayMs) {
      const label = lead.type === "contact" ? `${lead.name} (${lead.phone})` : `${lead.email}`;
      await tgSend(env, `⏰ یادآوری پیگیری\n\nاین لید بیش از ۲۴ ساعته بدون پیگیریه:\n${label}`);
      lead.reminded = true;
      await saveLead(env, lead);
    }
  }
}
