// worker.js — بایت‌لب: ارسال لید به تلگرام + مدیریت وضعیت + دستورات بات + گزارش روزانه + مدیریت کامل نمونه‌کارهای کاربران + داشبورد ادمین
// نیازمند: Secret های TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
// نیازمند: Binding به KV با اسم LEADS_KV
//
// رابط کاربری بات: کاملاً اینلاین (بدون کیبورد ثابت پایین صفحه) — درست مثل بات‌های ادمین حرفه‌ای.
// همه‌چیز از داخل یک پیام «داشبورد» با دکمه‌های شیشه‌ای (inline keyboard) مدیریت می‌شه:
//   🖥 داشبورد (خانه) → 📋 لیدها / 🎨 گالری / 📰 بلاگ / ❓ FAQ / 📢 بنر / 🟢 وضعیت / 📊 آمار کامل / 🔍 جستجو / 📤 خروجی
//   هر بخش زیرمنوی خودش رو داره و دکمه‌ی «⬅️ بازگشت» به داشبورد برمی‌گردونه.

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
  { command: "start", description: "شروع و نمایش داشبورد" },
  { command: "dashboard", description: "🖥 داشبورد مدیریت" },
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

فیلد tag: باید دقیقاً و فقط یکی از این چهار مقدار باشه (متن رو عیناً کپی کن، بدون کاراکتر اضافه، بدون |، بدون ترکیب چند مورد):
"طراحی سایت"
"طراحی اپلیکیشن"
"خدمات کامپیوتر"
"نکات فنی"
بر اساس موضوع واقعی مقاله، همون یکی که مرتبط‌تره رو انتخاب کن.

خروجی: فقط و فقط یک JSON خام و معتبر با این ساختار دقیق برگردون، بدون هیچ توضیح اضافه، بدون بک‌تیک یا Markdown دورش (نمونه‌ی زیر فقط برای شکل ساختاره، مقادیر واقعی رو خودت بر اساس مقاله بنویس):
{"title":"...","excerpt":"...","tag":"نکات فنی","content":"پاراگراف اول...\\n\\nپاراگراف دوم...\\n\\n..."}
`;

// ---- پرامپت قابل‌ویرایش از داخل بات: اگه ادمین یه نسخه‌ی سفارشی ذخیره کرده باشه، همون استفاده می‌شه؛
// وگرنه پرامپت پیش‌فرض بالا. این‌طوری بدون نیاز به دیپلوی دوباره‌ی کد، لحن/قوانین محتوا قابل تغییره.
async function getBlogSystemPrompt(env) {
  const custom = await env.LEADS_KV.get("config:blogPrompt");
  return custom || BLOG_WRITER_SYSTEM;
}
async function setBlogSystemPrompt(env, text) {
  await env.LEADS_KV.put("config:blogPrompt", text);
}
async function resetBlogSystemPrompt(env) {
  await env.LEADS_KV.delete("config:blogPrompt");
}
async function isBlogSystemPromptCustom(env) {
  return !!(await env.LEADS_KV.get("config:blogPrompt"));
}

function parseBlogJSON(raw) {
  if (raw && typeof raw === "object") {
    if (raw.title && raw.content) return raw;
    raw = JSON.stringify(raw);
  }

  let text = String(raw)
    .replace(/```json|```/g, "")
    .replace(/<\/?(code|pre|p|div|span|br)[^>]*>/gi, "") // بعضی وقتا مدل دور JSON یه تگ HTML مثل <code> می‌پیچه
    .trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (match) text = match[0];
  else {
    throw new Error("خروجی هوش‌مصنوعی هیچ JSON قابل‌تشخیصی نداشت (احتمالاً به‌جای JSON، متن/HTML عادی برگردونده).");
  }

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

// تشخیص خرابی خروجی مدل: وقتی وسط متن فارسی، حروف چینی/ژاپنی/کره‌ای یا نشونه‌های ویتنامی/زبان‌های دیگه ظاهر می‌شه،
// یعنی مدل از ریل خارج شده و این تولید قابل‌اعتماد نیست (نه فقط برای متن، بلکه معمولاً image_prompt همون تولید هم بی‌ربط می‌شه)
function hasForeignScriptContamination(text) {
  const s = String(text || "");
  if (/[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/.test(s)) return true; // چینی/ژاپنی/کره‌ای
  if (/[đơưệốồổỗộắằẳẵặấầẩẫậ]/i.test(s)) return true; // نشونه‌های اختصاصی ویتنامی
  return false;
}
function countWords(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}
// تصویر باید مرتبط با حوزه‌ی کاری بایت‌لب باشه؛ اگه توضیح مدل هیچ کلمه‌ی مرتبط با فناوری نداشت، به‌جای ساختن یه عکس بی‌ربط، اصلاً عکس نمی‌سازیم
function isImagePromptRelevant(prompt) {
  const s = String(prompt || "");
  return /سایت|اپلیکیشن|کامپیوتر|لپ‌?تاپ|دیجیتال|شبکه|سرور|کد|نرم‌?افزار|امنیت|هوش مصنوعی|طراحی|صفحه|مانیتور|فناوری|تکنولوژی|website|app|computer|laptop|digital|network|server|code|software|security|design|screen|tech/i.test(
    s
  );
}

// ---- 🖼 تولید تصویر شاخص بلاگ از روی image_prompt، با استفاده از Cloudflare Workers AI ----
// نیازمند یک AI binding به نام "AI" تو wrangler.toml (نوع Workers AI، نه Service Binding):
//   [ai]
//   binding = "AI"
// اگه این binding وصل نباشه، تصویر ساخته نمی‌شه ولی پست بلاگ بدون تصویر همچنان منتشر می‌شه (خطای غیربحرانی)
async function generateBlogImage(env, prompt) {
  if (!env.AI) return null;
  try {
    const result = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
      prompt: String(prompt || "تصویر مرتبط با خدمات فناوری").slice(0, 500),
    });
    // این مدل معمولاً { image: "<base64 png>" } برمی‌گردونه
    if (result && typeof result.image === "string" && result.image.length > 100) {
      return result.image;
    }
    return null;
  } catch (err) {
    console.log("خطا در تولید تصویر شاخص بلاگ (نادیده گرفته می‌شه، پست بدون عکس منتشر می‌شه):", err);
    return null;
  }
}

async function callAIWorker(env, system, userText) {
  if (!env.AI_WORKER) {
    throw new Error(
      "اتصال به Worker هوش‌مصنوعی تنظیم نشده. تو تنظیمات bytelab-telegram → Bindings → Add → Service binding، یک Binding با نام AI_WORKER به Worker «bytelab-ai» وصل کن."
    );
  }

  const response = await env.AI_WORKER.fetch(AI_WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // این هدر به bytelab-ai می‌گه این یه تماس داخلی (مثلاً نویسنده خودکار بلاگ) هست،
      // نه یه بازدیدکننده‌ی عمومی سایت، پس مشمول محدودیت نرخ روزانه نمی‌شه.
      // مقدارش باید دقیقاً با INTERNAL_CALL_SECRET توی index.js پروژه bytelab-ai یکی باشه.
      "X-Bytelab-Internal": "bytelab-internal-2026",
    },
    body: JSON.stringify({
      system,
      messages: [{ role: "user", content: userText }],
      max_tokens: 3200,
      prefer_heavy: true,
    }),
  });

  const rawBody = await response.text();
  let data;
  try {
    data = JSON.parse(rawBody);
  } catch (e) {
    throw new Error(
      `پاسخ AI Worker یک JSON معتبر نبود (status ${response.status}). ابتدای پاسخ: ${rawBody.slice(0, 200)}`
    );
  }

  if (!response.ok) {
    const errMsg = typeof data.error === "string" ? data.error : JSON.stringify(data.error || data).slice(0, 300);
    throw new Error(`AI Worker خطا داد (status ${response.status}): ${errMsg}`);
  }
  if (data.error) {
    const errMsg = typeof data.error === "string" ? data.error : JSON.stringify(data.error).slice(0, 300);
    throw new Error(errMsg);
  }

  const textBlock = (Array.isArray(data.content) ? data.content : []).find((b) => b && b.type === "text");
  if (!textBlock) {
    throw new Error(`پاسخی از هوش‌مصنوعی دریافت نشد. شکل پاسخ: ${JSON.stringify(data).slice(0, 300)}`);
  }

  return typeof textBlock.text === "string" ? textBlock.text : JSON.stringify(textBlock.text);
}

const BLOG_ALLOWED_TAGS = ["طراحی سایت", "طراحی اپلیکیشن", "خدمات کامپیوتر", "نکات فنی"];

// اگه هوش‌مصنوعی تگ معتبری برنگردونه، به‌جای افتادن روی «بایت‌لب»، از روی عنوان/متن حدس می‌زنیم
function guessBlogTag(text) {
  const s = String(text || "");
  if (/اپلیکیشن|اپ اندروید|اپ آی‌?او?اس|اندروید|iOS|موبایل\s*اپ/i.test(s)) return "طراحی اپلیکیشن";
  if (/سایت|وب‌?سایت|دامنه|هاست|فروشگاه اینترنتی|landing/i.test(s)) return "طراحی سایت";
  if (/کامپیوتر|رایانه|سخت‌?افزار|شبکه|رفع اشکال|قطعه|ویندوز|فرمت/.test(s)) return "خدمات کامپیوتر";
  return "نکات فنی";
}

// برای سئوی متوازن، به‌جای اینکه بذاریم هوش‌مصنوعی خودش تگ رو انتخاب کنه (که همیشه یه سمت کج می‌شه)،
// از قبل به‌ترتیب بین هر ۴ دسته می‌چرخیم تا هر ۴ تا به‌طور مساوی پست بگیرن.
async function getNextBlogTag(env) {
  const raw = await env.LEADS_KV.get("blogauto:tagindex");
  const idx = raw ? (parseInt(raw, 10) + 1) % BLOG_ALLOWED_TAGS.length : 0;
  return { tag: BLOG_ALLOWED_TAGS[idx], idx };
}
async function saveBlogTagIndex(env, idx) {
  await env.LEADS_KV.put("blogauto:tagindex", String(idx));
}

// ---- پرامپت ساده‌ی پشتیبان: وقتی پرامپت کامل (با تگ/عکس/طول دقیق) مدام شکست می‌خوره،
// به‌جای هیچی منتشر نکردن، با یه درخواست خیلی ساده‌تر (فقط عنوان+خلاصه+متن) یه تلاش آخر می‌زنیم
const FALLBACK_SIMPLE_BLOG_SYSTEM = `
تو یه نویسنده‌ی محتوای فارسی برای وبلاگ «بایت‌لب» هستی؛ یک مجموعه خدمات فناوری در کرج (طراحی سایت، طراحی اپلیکیشن، خدمات کامپیوتر).

فقط یک مقاله‌ی کوتاه، ساده و مفید فارسی درباره‌ی یکی از همین حوزه‌ها بنویس. حدود ۲۵۰ تا ۳۵۰ کلمه، پاراگراف‌های کوتاه (۲ تا ۴ جمله)، بین هر پاراگراف یک خط خالی. کاملاً و فقط فارسی بنویس؛ هیچ کلمه یا حرفی از زبان‌های دیگه (چینی، ژاپنی، کره‌ای، ویتنامی، عربی غیرمرتبط) استفاده نکن. بدون HTML، بدون Markdown، بدون ایموجی.

خروجی فقط و فقط یک JSON خام باشه، بدون هیچ متن، توضیح، یا تگ HTML (مثل <code> یا <pre>) قبل یا بعدش:
{"title":"...","excerpt":"...","content":"پاراگراف اول...\\n\\nپاراگراف دوم...\\n\\nپاراگراف سوم..."}
`;

async function attemptBlogGeneration(env, systemPrompt, userMsg, minWords) {
  const raw = await callAIWorker(env, systemPrompt, userMsg);
  const parsed = parseBlogJSON(raw);

  if (!parsed.title || !parsed.content || String(parsed.content).trim().length < 150) {
    throw new Error("خروجی هوش‌مصنوعی ناقص یا خیلی کوتاه بود.");
  }
  if (hasForeignScriptContamination(parsed.title) || hasForeignScriptContamination(parsed.content)) {
    throw new Error("خروجی هوش‌مصنوعی آلوده به کاراکترهای زبان دیگه بود (خرابی مدل)، دوباره تلاش می‌کنم.");
  }
  const wordCount = countWords(parsed.content);
  if (wordCount < minWords) {
    throw new Error(`محتوای تولیدشده فقط ${wordCount} کلمه بود، خیلی کوتاه‌تر از حد قابل‌قبوله.`);
  }
  return parsed;
}

async function generateAndPublishBlogPost(env, forcedTag = null) {
  const existing = await getAllBlogPosts(env);

  // فقط چند تای اخیر رو می‌فرستیم، هرکدوم رو هم کوتاه می‌کنیم، وگرنه با زیاد شدن تعداد پست‌ها
  // (که خودش نشونه‌ی موفقیته!) این پیام هی بزرگ‌تر می‌شه تا یه جایی از سقف طول پیام AI Worker رد بشه.
  const RECENT_TITLES_COUNT = 12;
  const TITLE_TRUNCATE = 45;
  const recentTitlesArr = existing
    .slice(0, RECENT_TITLES_COUNT)
    .map((p) => `- ${String(p.title).slice(0, TITLE_TRUNCATE)}`);
  let recentTitles = recentTitlesArr.join("\n") || "(هنوز پستی نوشته نشده)";

  const { tag: nextTag, idx: nextIdx } = await getNextBlogTag(env);
  const assignedTag = forcedTag && BLOG_ALLOWED_TAGS.includes(forcedTag) ? forcedTag : nextTag;

  const buildUserMsg = (titlesBlock) =>
    `موضوعات قبلاً نوشته‌شده (تکرار نکن):\n${titlesBlock}\n\n` +
    `این پست باید دقیقاً درباره‌ی دسته‌بندی «${assignedTag}» باشه (موضوع مقاله رو کاملاً منطبق با همین دسته انتخاب کن).\n` +
    `یک پست جدید و متفاوت با موضوعات بالا، طبق قوانین سیستم بنویس.\n` +
    `مهم: خروجی فقط و فقط یک JSON خام باشه؛ هیچ تگ HTML مثل <code> یا <pre>، هیچ Markdown، و هیچ متن قبل یا بعد از JSON ننویس.`;

  // سقف مطمئن روی کل پیام کاربر؛ اگه هنوز بزرگ بود، تعداد عنوان‌های اخیر رو بیشتر کم می‌کنیم
  const USER_MSG_HARD_CAP = 900;
  let userMsg = buildUserMsg(recentTitles);
  let keepCount = recentTitlesArr.length;
  while (userMsg.length > USER_MSG_HARD_CAP && keepCount > 0) {
    keepCount -= 3;
    recentTitles = recentTitlesArr.slice(0, Math.max(keepCount, 0)).join("\n") || "(هنوز پستی نوشته نشده)";
    userMsg = buildUserMsg(recentTitles);
  }

const MAX_ATTEMPTS = 3;
  let lastError = null;
  let parsed = null;
  let usedFallback = false;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      parsed = await attemptBlogGeneration(env, await getBlogSystemPrompt(env), userMsg, 180);
      break;
    } catch (err) {
      lastError = err;
    }
  }

  // پرامپت کامل (با تگ/عکس) مدام شکست خورد؛ به‌جای هیچی منتشر نکردن، یه تلاش آخر با یه درخواست خیلی ساده‌تر می‌زنیم
  if (!parsed) {
    try {
      const fallbackUserMsg =
        `موضوعات قبلاً نوشته‌شده (تکرار نکن):\n${recentTitles}\n\n` +
        `موضوع مقاله باید درباره‌ی «${assignedTag}» باشه. فقط JSON بده.`;
      parsed = await attemptBlogGeneration(env, FALLBACK_SIMPLE_BLOG_SYSTEM, fallbackUserMsg, 150);
      usedFallback = true;
    } catch (err) {
      lastError = err;
    }
  }

  if (parsed) {
    // تگ رو به‌جای اعتماد به خروجی مدل، همون دسته‌ای که از قبل تعیین کردیم می‌ذاریم (تضمین چرخش درست دسته‌بندی اصلی)
    const finalTag = assignedTag;

    // برچسب‌های سئوی اضافی (کلمات کلیدی) که مدل با | از هم جدا کرده، جدا از دسته‌بندی اصلی نگه می‌داریم
    const seoTags = usedFallback
      ? []
      : String(parsed.tag || "")
          .split("|")
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 8);

    const item = {
      id: crypto.randomUUID(),
      slug: slugify(parsed.title),
      status: "published",
      createdAt: Date.now(),
      title: String(parsed.title).slice(0, 150),
      excerpt: String(parsed.excerpt || "").slice(0, 400),
      content: String(parsed.content).slice(0, 8000),
      image: "",
      tag: finalTag.slice(0, 60),
      seoTags,
      autoGenerated: true,
    };

    // تولید تصویر شاخص از روی image_prompt (فقط تو مسیر کامل، نه مسیر پشتیبان، و فقط اگه واقعاً مرتبط با حوزه‌ی کاری بایت‌لب باشه)
    if (!usedFallback && parsed.image_prompt && isImagePromptRelevant(parsed.image_prompt)) {
      const enrichedPrompt = `${parsed.image_prompt}. Modern technology and digital workspace theme, clean and professional, no text overlay, high quality.`;
      const imageResult = await generateBlogImage(env, enrichedPrompt);
      if (imageResult) {
        await env.LEADS_KV.put(`blogimage:${item.id}`, imageResult, { metadata: { contentType: "image/png" } });
        item.image = `/blog-image/${item.id}`;
      }
    }

    await saveBlogPost(env, item);
    if (!forcedTag) await saveBlogTagIndex(env, nextIdx);
    await env.LEADS_KV.put("blogauto:failstreak", "0");
    await tgSend(
      env,
      `📰 پست جدید بلاگ به‌صورت خودکار منتشر شد${usedFallback ? " (با حالت ساده‌ی پشتیبان، چون پرامپت اصلی چندبار شکست خورد)" : ""}:\n\n«${item.title}»\n🏷 دسته: ${item.tag}${item.image ? "\n🖼 تصویر شاخص: ساخته شد ✅" : ""}\n\nhttps://bytelabpro.xyz/blog-post.html?id=${item.id}`
    );
    return;
  }

  const prevStreak = parseInt((await env.LEADS_KV.get("blogauto:failstreak")) || "0", 10);
  const streak = prevStreak + 1;
  await env.LEADS_KV.put("blogauto:failstreak", String(streak));

  const streakNote =
    streak >= 3
      ? `\n\n⚠️ این ${streak}مین باره پشت‌سرهم که کلاً ناموفقه (حتی با پرامپت ساده‌ی پشتیبان). این دیگه بدشانسی نیست — یا خود مدل زیرین bytelab-ai به‌شدت ضعیف/ناپایدار شده، یا Service Binding واقعاً قطعه. لطفاً چک کن.`
      : "";

  await tgSend(
    env,
    `⚠️ نوشتن خودکار پست بلاگ بعد از ${MAX_ATTEMPTS} تلاش کامل + ۱ تلاش با پرامپت ساده‌ی پشتیبان، موفق نشد:\n${String(lastError)}${streakNote}`
  );
}

async function saveLead(env, lead) {
  await env.LEADS_KV.put(`lead:${lead.id}`, JSON.stringify(lead));
}

// ================== محدودیت نرخ (ضد اسپم) بر اساس IP ==================
// هر IP فقط تا سقف مشخصی درخواست موفق در بازه‌ی زمانی مشخص می‌تونه بفرسته
async function checkRateLimit(env, ip, bucket, maxCount, windowSeconds) {
  const key = `ratelimit:${bucket}:${ip}`;
  const now = Date.now();
  let data = null;
  try {
    const raw = await env.LEADS_KV.get(key);
    data = raw ? JSON.parse(raw) : null;
  } catch (e) {
    data = null;
  }
  if (!data || now > data.reset) {
    data = { count: 0, reset: now + windowSeconds * 1000 };
  }
  data.count++;
  await env.LEADS_KV.put(key, JSON.stringify(data), { expirationTtl: windowSeconds });
  return data.count <= maxCount;
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

// یک نمونه‌کار می‌تونه تا ۵ دسته‌بندی داشته باشه؛ با کاما (، یا ,) از هم جدا می‌شن.
// این تابع ورودی خام رو تمیز می‌کنه، تکراری‌ها رو حذف می‌کنه و حداکثر ۵ تا نگه می‌داره.
const PF_MAX_CATEGORIES = 5;
function sanitizeCategories(raw) {
  const parts = String(raw || "")
    .split(/[،,]/)
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, PF_MAX_CATEGORIES);
  return [...new Set(parts)].join(",");
}
function categoryListOf(item) {
  return String(item.category || "").split(",").map((c) => c.trim()).filter(Boolean);
}
function categoryDisplayOf(item) {
  const list = categoryListOf(item);
  return list.length ? list.join("، ") : "-";
}

// ================== انتخابگر دسته‌بندی (برای جلوگیری از املای مشابه/تکراری هنگام افزودن دستی) ==================
// به‌جای اینکه ادمین دسته‌بندی رو آزاد تایپ کنه (و مثلاً یه‌بار «فروشگاهی» یه‌بار «فروشگاه» بنویسه)،
// دسته‌های موجود رو به‌صورت دکمه نشون می‌دیم تا انتخاب کنه؛ امکان افزودن دسته‌ی کاملاً جدید هم هست.
async function getAllCategories(env) {
  const items = await getAllPortfolioItems(env);
  const counts = {};
  for (const item of items) {
    for (const c of categoryListOf(item)) {
      const key = c.trim();
      if (!key) continue;
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
}

function catPickerText(catList, selectedIdx) {
  const selectedNames = selectedIdx.map((i) => catList[i]).filter(Boolean);
  return (
    `🏷 دسته‌بندی رو انتخاب کن (تا ${PF_MAX_CATEGORIES} تا)\n\n` +
    `انتخاب فعلی: ${selectedNames.length ? selectedNames.join("، ") : "(هیچی)"}\n\n` +
    (catList.length
      ? "روی هرکدوم از دسته‌های موجود بزن (چندتا هم می‌شه)، یا اگه دسته‌ی جدیدی می‌خوای «➕ دسته‌بندی جدید» رو بزن."
      : "هنوز دسته‌بندی‌ای ثبت نشده. «➕ دسته‌بندی جدید» رو بزن و اولین دسته رو بساز.")
  );
}

function catPickerKeyboard(catList, selectedIdx) {
  const rows = [];
  for (let i = 0; i < catList.length; i += 2) {
    const row = [];
    for (let j = i; j < Math.min(i + 2, catList.length); j++) {
      const mark = selectedIdx.includes(j) ? "✅ " : "";
      row.push({ text: `${mark}${catList[j]}`, callback_data: `catpick:${j}` });
    }
    rows.push(row);
  }
  rows.push([{ text: "➕ دسته‌بندی جدید", callback_data: "catpicknew" }]);
  rows.push([{ text: "✅ ثبت و ادامه", callback_data: "catpickdone" }]);
  rows.push([{ text: "❌ لغو", callback_data: "catpickcancel" }]);
  return { inline_keyboard: rows };
}

// شروع انتخابگر؛ next مشخص می‌کنه بعد از تموم‌شدن انتخاب، نتیجه کجا برگرده:
//   { kind: "add", data }        → ادامه‌ی فرآیند افزودن دستی نمونه‌کار جدید
//   { kind: "editfield", id }    → ویرایش دسته‌بندی یه نمونه‌کار موجود
async function startCategoryPicker(env, chatId, next, preSelectedCategories = []) {
  const catList = await getAllCategories(env);
  for (const c of preSelectedCategories) {
    if (c && !catList.includes(c)) catList.push(c);
  }
  const selected = preSelectedCategories.map((c) => catList.indexOf(c)).filter((i) => i >= 0);
  await setAdminState(env, chatId, { mode: "catpick", next, catList, selected });
  await tgSendTo(env, chatId, catPickerText(catList, selected), { reply_markup: catPickerKeyboard(catList, selected) });
}

// وقتی انتخاب دسته‌بندی تموم شد (دکمه‌ی «ثبت و ادامه» زده شد)، بسته به این‌که برای افزودن بود یا ویرایش، نتیجه رو اعمال کن
async function finishCategoryPicker(env, chatId, state, categoryStr) {
  const next = state.next;
  await clearAdminState(env, chatId);

  if (next.kind === "editfield") {
    const item = await getPortfolioItem(env, next.id);
    if (!item) {
      await tgSendTo(env, chatId, "این نمونه‌کار دیگه پیدا نشد.");
      return;
    }
    item.category = categoryStr;
    await savePortfolioItem(env, item);
    await tgSendTo(env, chatId, "✅ دسته‌بندی بروزرسانی شد.");
    await sendItemManageCard(env, chatId, item);
    return;
  }

  // next.kind === "add"
  const data = next.data || {};
  data.category = categoryStr;
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
    category: data.category || "",
    rating: 0,
    featured: false,
    addedManually: true,
  };
  await savePortfolioItem(env, item);
  await tgSendTo(env, chatId, "✅ نمونه‌کار جدید با موفقیت اضافه شد و همین الان روی سایت نمایش داده می‌شه:");
  await sendItemManageCard(env, chatId, item);
}

// ================== نمونه‌کارهای ثابتِ لوکال سایت (فایل‌هایی که داخل پوشه‌ی خود سایت گذاشته شدن) ==================
// این‌ها قبلاً مستقیم داخل portfolio.html هاردکد شده بودن؛ حالا اینجا تعریف می‌شن تا از همین
// داشبورد تلگرام (مثل بقیه‌ی نمونه‌کارها) قابل ویرایش، امتیازدهی، سنجاق کردن و حذف باشن.
// آیدی‌های ثابت (local-1 ... local-7) باعث می‌شه وارد کردن دوباره، آیتم تکراری نسازه.
const LOCAL_SITE_ITEMS = [
  {
    id: "local-1", title: "سایت شرکتی بایت‌لب", description: "سایت معرفی خدمات با دستیار هوش مصنوعی اختصاصی برای پاسخ‌گویی به مشتری.",
    url: "https://bytelabpro.xyz/index.html", image: "", category: "طراحی سایت,هوش مصنوعی", rating: 4.9, featured: true,
  },
  {
    id: "local-2", title: "سایت شرکتی بایت‌لب (ورژن ۲)", description: "بازطراحی صفحه‌ی معرفی خدمات با چیدمان و ظاهر متفاوت.",
    url: "https://mr-aiza.github.io/Bytelab2/tarahi-app.html", image: "", category: "طراحی سایت,شرکتی", rating: 4.5, featured: false,
  },
  {
    id: "local-3", title: "کافه و رستوران اِمبر", description: "منوی دیجیتال ریسپانسیو کافه و رستوران با دسته‌بندی متحرک و انیمیشن‌های ظریف اسکرول.",
    url: "portfolio/cafe-restoran-amber.html", image: "", category: "طراحی سایت,کافه و رستوران", rating: 4.7, featured: true,
  },
  {
    id: "local-4", title: "تشریفات رویایی", description: "سایت معرفی خدمات برگزاری مراسم عروسی و رویدادهای لاکچری.",
    url: "https://mr-aiza.github.io/224/", image: "", category: "طراحی سایت,خدماتی", rating: 4.2, featured: false,
  },
  {
    id: "local-5", title: "تشریفات رویایی ورژن ۲", description: "بازطراحی صفحه‌ی معرفی خدمات برگزاری مراسم عروسی با چیدمان و ظاهر جدید.",
    url: "portfolio/tasharifat-royaee-v2.html", image: "", category: "طراحی سایت,خدماتی", rating: 4.3, featured: false,
  },
  {
    id: "local-6", title: "گالری اتومبیل پرستیژ", description: "نمایشگاه آنلاین خودروهای لوکس و کلاسیک با معرفی هر خودرو.",
    url: "portfolio/galeriy-mashin.html", image: "", category: "طراحی سایت,گالری خودرو", rating: 4.6, featured: false,
  },
  {
    id: "local-7", title: "زرّین گالری", description: "سایت فروشگاه طلا و جواهرات با نمایش قیمت لحظه‌ای.",
    url: "portfolio/zarrin-gallery-gold-shop.html", image: "", category: "طراحی سایت,فروشگاهی", rating: 4.8, featured: true,
  },
];

async function seedLocalPortfolioItems(env) {
  let added = 0, updated = 0;
  for (let i = 0; i < LOCAL_SITE_ITEMS.length; i++) {
    const base = LOCAL_SITE_ITEMS[i];
    const existing = await getPortfolioItem(env, base.id);
    const item = {
      id: base.id,
      status: "approved",
      createdAt: existing?.createdAt || (i + 1), // زمان ساخت قدیمی نگه داشته می‌شه تا ترتیبشون عوض نشه
      title: base.title,
      description: base.description,
      url: base.url,
      image: base.image,
      authorName: existing?.authorName || "بایت‌لب",
      authorContact: existing?.authorContact || "-",
      category: existing?.category ?? base.category,
      rating: existing?.rating ?? base.rating,
      featured: existing?.featured ?? base.featured,
      isLocalSite: true,
    };
    await savePortfolioItem(env, item);
    existing ? updated++ : added++;
  }
  return { added, updated, total: LOCAL_SITE_ITEMS.length };
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
  rows.push([{ text: "⬅️ بازگشت به داشبورد", callback_data: "dash:home" }]);
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
    inline_keyboard: [
      [
        status.online
          ? { text: "🔴 تغییر به آفلاین", callback_data: "sttoggle:0" }
          : { text: "🟢 تغییر به آنلاین", callback_data: "sttoggle:1" },
      ],
      [{ text: "⬅️ بازگشت به داشبورد", callback_data: "dash:home" }],
    ],
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

// امتیاز نمونه‌کار: عدد صحیح یا اعشاری بین ۰ تا ۵، هم با دکمه‌های سریع ۱ تا ۵، هم با ورود دستی هر عددی
function ratingStars(rating) {
  const r = Number(rating) || 0;
  const rounded = Math.max(0, Math.min(5, Math.round(r)));
  const stars = "⭐️".repeat(rounded) + "☆".repeat(5 - rounded);
  // اگه امتیاز دستی بزرگ‌تر از ۵ ثبت شده باشه (مقیاس دلخواه کاربر)، عدد واقعی رو هم کنارش نشون بده
  return r > 5 ? `${stars} (${r})` : `${stars} ${r ? `(${r}/۵)` : ""}`;
}

// ================== 🖥 داشبورد ادمین (خانه‌ی اصلی، کاملاً اینلاین) ==================
async function getDashboardData(env) {
  const [leads, portfolioItems, blogPosts, banner, status] = await Promise.all([
    getAllLeads(env),
    getAllPortfolioItems(env),
    getAllBlogPosts(env),
    getBanner(env),
    getStatus(env),
  ]);

  const today = nowTehranDateStr();
  const isToday = (ts) =>
    new Date(ts).toLocaleDateString("fa-IR-u-ca-gregory", { timeZone: "Asia/Tehran" }) === today;

  const newLeadsToday = leads.filter((l) => ["contact", "profile"].includes(l.type) && isToday(l.createdAt)).length;
  const portfolioToday = portfolioItems.filter((p) => isToday(p.createdAt)).length;
  const blogToday = blogPosts.filter((b) => isToday(b.createdAt)).length;

  const pendingLeads = leads.filter(
    (l) => ["contact", "profile", "abandoned_form"].includes(l.type) && (!l.status || l.status === "new" || l.status === "later")
  ).length;
  const pendingPortfolio = portfolioItems.filter((p) => p.status === "pending").length;

  return { newLeadsToday, portfolioToday, blogToday, pendingLeads, pendingPortfolio, banner, status };
}

function formatDashboardText(d) {
  const now = new Date().toLocaleString("fa-IR", { timeZone: "Asia/Tehran" });
  const lines = [];
  lines.push("🖥 *داشبورد بایت‌لب*");
  lines.push(`بروزرسانی: ${now}`);
  lines.push("");
  lines.push("```");
  lines.push("📊 امروز");
  lines.push(`  ${d.newLeadsToday} لید جدید · ${d.portfolioToday} نمونه‌کار · ${d.blogToday} پست بلاگ`);
  lines.push("");
  lines.push("⏳ نیاز به توجه");
  lines.push(`  ${d.pendingLeads} لید در انتظار پیگیری`);
  lines.push(`  ${d.pendingPortfolio} نمونه‌کار در انتظار تایید`);
  lines.push("```");
  lines.push(`${d.status.online ? "🟢 وضعیت: آنلاین" : "🔴 وضعیت: آفلاین"}   ${d.banner.enabled ? "📢 بنر: روشن" : "📢 بنر: خاموش"}`);
  return lines.join("\n");
}

function dashboardKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "📋 لیدها", callback_data: "dash:leads" },
        { text: "🎨 گالری", callback_data: "dash:gallery" },
      ],
      [
        { text: "📰 بلاگ", callback_data: "dash:blog" },
        { text: "❓ FAQ", callback_data: "dash:faq" },
      ],
      [
        { text: "📢 بنر", callback_data: "dash:banner" },
        { text: "🟢 وضعیت", callback_data: "dash:status" },
      ],
      [
        { text: "🎨 نمونه‌کارهای جدید", callback_data: "dash:gallery:pending" },
        { text: "➕ افزودن نمونه‌کار دستی", callback_data: "dash:gallery:add" },
      ],
      [
        { text: "👥 لیست سازنده‌ها", callback_data: "dash:gallery:authors" },
      ],
      [
        { text: "📰 مدیریت بلاگ", callback_data: "dash:blog" },
        { text: "➕ پست جدید", callback_data: "dash:blog:add" },
      ],
      [
        { text: "🤖 نوشتن فوری با AI", callback_data: "dash:blog:ai" },
        { text: "⚙️ تنظیمات AI", callback_data: "dash:ai" },
      ],
      [
        { text: "❓ مدیریت سوالات متداول", callback_data: "dash:faq" },
        { text: "➕ سوال جدید", callback_data: "dash:faq:add" },
      ],
      [
        { text: "📊 آمار کامل", callback_data: "dash:stats" },
        { text: "🔍 جستجوی لید", callback_data: "dash:leadsearch" },
      ],
      [
        { text: "📤 خروجی لیدها", callback_data: "dash:export" },
        { text: "💾 بکاپ کامل", callback_data: "dash:backup" },
      ],
      [{ text: "🔄 بروزرسانی", callback_data: "dash:home" }],
    ],
  };
}

async function sendDashboard(env, chatId) {
  const data = await getDashboardData(env);
  return tgSendTo(env, chatId, formatDashboardText(data), {
    parse_mode: "Markdown",
    reply_markup: dashboardKeyboard(),
  });
}

async function showDashboardEdit(env, chatId, messageId) {
  const data = await getDashboardData(env);
  return tgEditText(env, chatId, messageId, formatDashboardText(data), {
    parse_mode: "Markdown",
    reply_markup: dashboardKeyboard(),
  });
}

// ---- 📊 آمار کامل (هفتگی/ماهانه/مجموع) ----
async function sendFullStats(env, chatId) {
  const leads = await getAllLeads(env);
  const portfolioItems = await getAllPortfolioItems(env);
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const inRange = (arr, ms) => arr.filter((x) => now - x.createdAt <= ms).length;

  const leadTypes = ["contact", "profile", "abandoned_form"];
  const relevantLeads = leads.filter((l) => leadTypes.includes(l.type));

  const contacted = leads.filter((l) => l.status === "contacted").length;
  const rejected = leads.filter((l) => l.status === "rejected").length;
  const pending = leads.filter(
    (l) => leadTypes.includes(l.type) && (!l.status || l.status === "new" || l.status === "later")
  ).length;

  // میانگین امتیاز نمونه‌کارهای دارای امتیاز
  const ratedItems = portfolioItems.filter((p) => Number(p.rating) > 0);
  const avgRating = ratedItems.length
    ? (ratedItems.reduce((sum, p) => sum + Number(p.rating), 0) / ratedItems.length).toFixed(1)
    : "-";

  const msg =
    `📊 آمار کامل بایت‌لب\n\n` +
    `📩 لیدها:\n` +
    `  ۷ روز اخیر: ${inRange(relevantLeads, 7 * day)}\n` +
    `  ۳۰ روز اخیر: ${inRange(relevantLeads, 30 * day)}\n` +
    `  مجموع: ${relevantLeads.length}\n\n` +
    `  ✅ تماس گرفته شده: ${contacted}\n` +
    `  ⏳ در انتظار پیگیری: ${pending}\n` +
    `  ❌ رد شده: ${rejected}\n\n` +
    `🎨 نمونه‌کارها:\n` +
    `  ۷ روز اخیر: ${inRange(portfolioItems, 7 * day)}\n` +
    `  مجموع تایید شده: ${portfolioItems.filter((p) => p.status === "approved").length}\n` +
    `  در انتظار تایید: ${portfolioItems.filter((p) => p.status === "pending").length}\n` +
    `  میانگین امتیاز: ⭐ ${avgRating}\n\n` +
    `📰 بلاگ:\n` +
    `  مجموع پست‌ها: ${await countBlogPosts(env)}`;

  await tgSendTo(env, chatId, msg, {
    reply_markup: { inline_keyboard: [[{ text: "⬅️ بازگشت به داشبورد", callback_data: "dash:home" }]] },
  });
}

async function countBlogPosts(env) {
  const posts = await getAllBlogPosts(env);
  return posts.length;
}

// ---- 📤 خروجی لیدها به‌صورت فایل متنی ----
async function exportLeadsFile(env, chatId) {
  const leads = await getAllLeads(env);
  const relevant = leads.filter((l) => ["contact", "profile", "abandoned_form"].includes(l.type));

  if (relevant.length === 0) {
    await tgSendTo(env, chatId, "هیچ لیدی برای خروجی گرفتن وجود نداره.");
    return;
  }

  let content = "لیست لیدهای بایت‌لب\n" + "=".repeat(30) + "\n\n";
  relevant.forEach((l, i) => {
    const date = new Date(l.createdAt).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" });
    content += `${i + 1}. نوع: ${l.type} | وضعیت: ${statusLabel(l.status)}\n`;
    if (l.name) content += `   نام: ${l.name}\n`;
    if (l.phone) content += `   تلفن: ${l.phone}\n`;
    if (l.email) content += `   ایمیل: ${l.email}\n`;
    if (l.service) content += `   خدمت: ${l.service}\n`;
    content += `   تاریخ: ${date}\n\n`;
  });

  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("document", new Blob([content], { type: "text/plain" }), `leads-${nowTehranDateStr()}.txt`);

  await fetch(`${TG_API(env)}/sendDocument`, { method: "POST", body: formData });
}

// ---- 💾 بکاپ کامل از همه‌چیز (لیدها، نمونه‌کارها، بلاگ، FAQ، بنر، وضعیت) به‌صورت یک فایل JSON ----
async function exportFullBackup(env, chatId) {
  const [leads, portfolioItems, blogPosts, faqItems, banner, status] = await Promise.all([
    getAllLeads(env),
    getAllPortfolioItems(env),
    getAllBlogPosts(env),
    getAllFaq(env),
    getBanner(env),
    getStatus(env),
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    exportedAtTehran: nowTehranDateStr(),
    leads,
    portfolioItems,
    blogPosts,
    faqItems,
    banner,
    status,
  };

  const content = JSON.stringify(backup, null, 2);
  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("document", new Blob([content], { type: "application/json" }), `bytelab-backup-${nowTehranDateStr()}.json`);
  formData.append(
    "caption",
    `💾 بکاپ کامل بایت‌لب\n\n📩 ${leads.length} لید | 🎨 ${portfolioItems.length} نمونه‌کار | 📰 ${blogPosts.length} پست بلاگ | ❓ ${faqItems.length} سوال متداول`
  );

  await fetch(`${TG_API(env)}/sendDocument`, { method: "POST", body: formData });
}

// ---- زیرمنوی گالری ----
function galleryMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "⏳ در انتظار تایید", callback_data: "dash:gallery:pending" }],
      [{ text: "🗂 مدیریت کامل گالری", callback_data: "dash:gallery:all" }],
      [{ text: "❌ رد شده‌ها", callback_data: "dash:gallery:rejected" }],
      [{ text: "🔍 جستجوی نمونه‌کار", callback_data: "dash:gallery:search" }],
      [{ text: "👥 لیست بر اساس سازنده", callback_data: "dash:gallery:authors" }],
      [{ text: "➕ افزودن دستی", callback_data: "dash:gallery:add" }],
      [{ text: "📥 وارد کردن / بروزرسانی فایل‌های لوکال سایت", callback_data: "dash:gallery:seedlocal" }],
      [{ text: "⬅️ بازگشت", callback_data: "dash:home" }],
    ],
  };
}
async function sendPortfolioPending(env, chatId) {
  const items = await getAllPortfolioItems(env);
  const pending = items.filter((p) => p.status === "pending").slice(0, 15);
  await tgSendTo(
    env,
    chatId,
    pending.length === 0 ? "هیچ نمونه‌کاری در انتظار تایید نیست." : `🎨 ${pending.length} نمونه‌کار در انتظار تایید:`
  );
  for (const item of pending) {
    await sendItemManageCard(env, chatId, item);
  }
}
async function sendPortfolioAll(env, chatId) {
  const items = await getAllPortfolioItems(env);
  const pending = items.filter((p) => p.status === "pending");
  const approved = items.filter((p) => p.status === "approved");
  await tgSendTo(
    env,
    chatId,
    `🗂 مدیریت کامل گالری نمونه‌کارها\n\n⏳ در انتظار تایید: ${pending.length}\n✅ تایید شده (روی سایت): ${approved.length}`
  );
  const combined = [...pending, ...approved].slice(0, 25);
  for (const item of combined) {
    await sendItemManageCard(env, chatId, item);
  }
  if (items.length > combined.length) {
    await tgSendTo(env, chatId, `... و ${items.length - combined.length} مورد دیگر.`);
  }
}

async function sendPortfolioRejected(env, chatId) {
  const items = await getAllPortfolioItems(env);
  const rejected = items.filter((p) => p.status === "rejected").slice(0, 25);
  await tgSendTo(
    env,
    chatId,
    rejected.length === 0 ? "هیچ نمونه‌کار رد‌شده‌ای نیست." : `❌ ${rejected.length} نمونه‌کار رد شده:`
  );
  for (const item of rejected) {
    await sendItemManageCard(env, chatId, item);
  }
}

// ---- 🔍 جستجوی نمونه‌کار بر اساس عنوان/سازنده/دسته‌بندی ----
async function searchPortfolio(env, chatId, query) {
  const items = await getAllPortfolioItems(env);
  const q = query.toLowerCase().trim();
  const results = items
    .filter(
      (p) =>
        (p.title || "").toLowerCase().includes(q) ||
        (p.authorName || "").toLowerCase().includes(q) ||
        (p.authorContact || "").toLowerCase().includes(q) ||
        categoryDisplayOf(p).toLowerCase().includes(q)
    )
    .slice(0, 15);

  if (results.length === 0) {
    await tgSendTo(env, chatId, "چیزی پیدا نشد.");
    return;
  }
  await tgSendTo(env, chatId, `🔍 ${results.length} نتیجه پیدا شد:`);
  for (const item of results) {
    await sendItemManageCard(env, chatId, item);
  }
}

// ---- 👥 لیست نمونه‌کارها گروه‌بندی‌شده بر اساس سازنده (برای دسته‌بندی روی سایت) ----
function authorKey(item) {
  return (item.authorContact && item.authorContact !== "-" ? item.authorContact : item.authorName) || "نامشخص";
}

function groupPortfolioByAuthor(items) {
  const groups = {};
  for (const item of items) {
    const key = authorKey(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

// خلاصه‌ی سریع: فقط اسم هر سازنده و تعداد نمونه‌کارش، به‌ترتیب بیشترین به کمترین
async function sendAuthorsSummary(env, chatId) {
  const items = await getAllPortfolioItems(env);
  if (items.length === 0) {
    await tgSendTo(env, chatId, "هنوز هیچ نمونه‌کاری ثبت نشده.");
    return;
  }

  const groups = groupPortfolioByAuthor(items);
  const keys = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);

  let text = `👥 لیست سازنده‌ها (${keys.length} نفر)\n\n`;
  keys.forEach((key, i) => {
    const authorItems = groups[key];
    const name = authorItems[0].authorName || key;
    const approvedCount = authorItems.filter((it) => it.status === "approved").length;
    text += `${i + 1}. ${name} — ${authorItems.length} تا${approvedCount !== authorItems.length ? ` (${approvedCount} تایید‌شده)` : ""}\n`;
  });
  text += `\nبرای دیدن نمونه‌کارهای هر سازنده، روی دکمه‌ی اسمش بزن:`;

  const rows = keys.slice(0, 40).map((key) => {
    const authorItems = groups[key];
    const name = authorItems[0].authorName || key;
    return [{ text: `👤 ${name} (${authorItems.length})`, callback_data: `pfauth:${authorItems[0].id}` }];
  });
  rows.push([{ text: "⬅️ بازگشت", callback_data: "dash:gallery" }]);

  await tgSendTo(env, chatId, text, { reply_markup: { inline_keyboard: rows } });
}

// جزئیات کامل یک سازنده‌ی خاص: پروفایل + تک‌تک کارت‌های نمونه‌کارش
async function sendAuthorDetail(env, chatId, repItemId) {
  const rep = await getPortfolioItem(env, repItemId);
  if (!rep) {
    await tgSendTo(env, chatId, "این سازنده دیگه پیدا نشد.");
    return;
  }
  const key = authorKey(rep);
  const items = await getAllPortfolioItems(env);
  const authorItems = items.filter((it) => authorKey(it) === key);
  const categories = [...new Set(authorItems.flatMap((i) => categoryListOf(i)))];
  const approvedCount = authorItems.filter((i) => i.status === "approved").length;

  const header =
    `👤 ${rep.authorName || "-"}\n` +
    `📞 ${rep.authorContact || "-"}\n` +
    `📦 ${authorItems.length} نمونه‌کار (${approvedCount} تایید شده)\n` +
    (categories.length ? `🏷 دسته‌ها: ${categories.join("، ")}\n` : "");

  await tgSendTo(env, chatId, header, {
    reply_markup: { inline_keyboard: [[{ text: "⬅️ بازگشت به لیست سازنده‌ها", callback_data: "dash:gallery:authors" }]] },
  });

  for (const item of authorItems.slice(0, 20)) {
    await sendItemManageCard(env, chatId, item);
  }
}

async function startAddPortfolio(env, chatId) {
  await setAdminState(env, chatId, { mode: "add", step: "title", data: {} });
  await tgSendTo(env, chatId, "➕ افزودن نمونه‌کار جدید\n\n📌 عنوان پروژه رو بفرست (یا /cancel برای لغو):", {
    reply_markup: { force_reply: true },
  });
}

// ---- زیرمنوی ⚙️ تنظیمات هوش‌مصنوعی (پرامپت نویسنده‌ی بلاگ) ----
async function formatAiSettingsText(env) {
  const isCustom = await isBlogSystemPromptCustom(env);
  const { tag: nextTag } = await getNextBlogTag(env);
  return (
    `⚙️ تنظیمات هوش‌مصنوعی (نویسنده‌ی خودکار بلاگ)\n\n` +
    `📄 وضعیت پرامپت: ${isCustom ? "✏️ سفارشی (ویرایش‌شده توسط تو)" : "🏭 پیش‌فرض"}\n` +
    `🏷 دسته‌ی پست بعدی (چرخشی): ${nextTag}\n` +
    `🖼 تولید تصویر شاخص: ${env.AI ? "✅ متصل" : "❌ وصل نیست (باید [ai] binding=\"AI\" رو تو wrangler.toml اضافه کنی)"}\n` +
    `⏰ زمان‌بندی خودکار: روزی ۳ بار (۴:۳۰ / ۹:۰۰ / ۱۶:۳۰ به وقت ایران)\n\n` +
    `از دکمه‌های زیر می‌تونی متن کامل پرامپت رو ببینی، ویرایش کنی، یا به حالت پیش‌فرض برگردونی.`
  );
}
function aiSettingsKeyboard(isCustom) {
  const rows = [];
  rows.push([{ text: "📄 مشاهده‌ی پرامپت فعلی", callback_data: "dash:ai:view" }]);
  rows.push([{ text: "✏️ ویرایش پرامپت", callback_data: "dash:ai:edit" }]);
  if (isCustom) {
    rows.push([{ text: "♻️ بازگردانی به پیش‌فرض", callback_data: "dash:ai:reset" }]);
  }
  rows.push([{ text: "🤖 نوشتن فوری با AI (تست)", callback_data: "dash:blog:ai" }]);
  rows.push([{ text: "⬅️ بازگشت", callback_data: "dash:home" }]);
  return { inline_keyboard: rows };
}

// ---- زیرمنوی بلاگ ----
function blogMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🗂 مدیریت کامل بلاگ", callback_data: "dash:blog:all" }],
      [{ text: "➕ پست جدید (دستی)", callback_data: "dash:blog:add" }],
      [{ text: "🤖 نوشتن فوری با AI", callback_data: "dash:blog:ai" }],
      [{ text: "⬅️ بازگشت", callback_data: "dash:home" }],
    ],
  };
}
async function sendBlogAll(env, chatId) {
  const posts = await getAllBlogPosts(env);
  const drafts = posts.filter((p) => p.status !== "published");
  const published = posts.filter((p) => p.status === "published");
  await tgSendTo(
    env,
    chatId,
    `📰 مدیریت کامل بلاگ\n\n📝 پیش‌نویس: ${drafts.length}\n✅ منتشر شده: ${published.length}`
  );
  const combined = [...drafts, ...published].slice(0, 25);
  for (const item of combined) {
    await sendBlogManageCard(env, chatId, item);
  }
  if (posts.length > combined.length) {
    await tgSendTo(env, chatId, `... و ${posts.length - combined.length} مورد دیگر.`);
  }
}
async function startAddBlog(env, chatId) {
  await setAdminState(env, chatId, { mode: "blogadd", step: "title", data: {} });
  await tgSendTo(env, chatId, "📰 نوشتن پست جدید بلاگ\n\n📌 عنوان پست رو بفرست (یا /cancel برای لغو):", {
    reply_markup: { force_reply: true },
  });
}
async function runWriteBlogAI(env, chatId) {
  await tgSendTo(env, chatId, "🤖 در حال نوشتن پست جدید با هوش‌مصنوعی... چند ثانیه صبر کن.");
  await generateAndPublishBlogPost(env);
}

// ---- زیرمنوی FAQ ----
function faqMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🗂 مدیریت سوالات", callback_data: "dash:faq:all" }],
      [{ text: "➕ سوال جدید", callback_data: "dash:faq:add" }],
      [{ text: "⬅️ بازگشت", callback_data: "dash:home" }],
    ],
  };
}
async function sendFaqAll(env, chatId) {
  const items = await getAllFaq(env);
  await tgSendTo(env, chatId, `❓ سوالات متداول (${items.length} مورد):`);
  for (const item of items.slice(0, 25)) {
    await sendFaqManageCard(env, chatId, item);
  }
}
async function askFaqService(env, chatId) {
  await tgSendTo(env, chatId, "❓ این سوال برای کدوم خدمت اضافه بشه؟", {
    reply_markup: {
      inline_keyboard: FAQ_SERVICES.map((s) => [{ text: s.label, callback_data: `fqaddservice:${s.code}` }]),
    },
  });
}

async function sendLeadsList(env, chatId) {
  const leads = (await getAllLeads(env))
    .filter((l) => ["contact", "profile", "abandoned_form"].includes(l.type))
    .slice(0, 10);
  if (leads.length === 0) {
    await tgSendTo(env, chatId, "هنوز هیچ لیدی ثبت نشده.");
    return;
  }
  let msg = "📋 آخرین ۱۰ لید:\n\n";
  leads.forEach((l, i) => {
    const date = new Date(l.createdAt).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" });
    msg += `${i + 1}. ${statusLabel(l.status)}\n`;
    if (l.type === "contact") msg += `   👤 ${l.name} | 📞 ${l.phone} | 🛠 ${l.service || "-"}\n`;
    if (l.type === "profile") msg += `   📧 ${l.email}\n`;
    if (l.type === "abandoned_form") msg += `   🕓 ${l.name || "-"} | 📞 ${l.phone || "-"} (رهاشده)\n`;
    if (l.note) msg += `   📝 ${l.note}\n`;
    msg += `   🕐 ${date}\n\n`;
  });
  await tgSendTo(env, chatId, msg);
}

// ---- 🔍 جستجوی لید بر اساس اسم/تلفن/ایمیل ----
async function searchLeads(env, chatId, query) {
  const leads = (await getAllLeads(env)).filter((l) => ["contact", "profile", "abandoned_form"].includes(l.type));
  const q = query.toLowerCase().trim();
  const results = leads
    .filter(
      (l) =>
        (l.name || "").toLowerCase().includes(q) ||
        (l.phone || "").includes(q) ||
        (l.email || "").toLowerCase().includes(q) ||
        (l.note || "").toLowerCase().includes(q)
    )
    .slice(0, 10);

  if (results.length === 0) {
    await tgSendTo(env, chatId, "چیزی پیدا نشد.");
    return;
  }

  let msg = `🔍 ${results.length} نتیجه پیدا شد:\n\n`;
  results.forEach((l, i) => {
    const date = new Date(l.createdAt).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" });
    msg += `${i + 1}. ${statusLabel(l.status)}\n`;
    if (l.name) msg += `   👤 ${l.name}\n`;
    if (l.phone) msg += `   📞 ${l.phone}\n`;
    if (l.email) msg += `   📧 ${l.email}\n`;
    if (l.service) msg += `   🛠 ${l.service}\n`;
    if (l.note) msg += `   📝 ${l.note}\n`;
    msg += `   🕐 ${date}\n\n`;
  });
  await tgSendTo(env, chatId, msg);
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
      [{ text: "⬅️ بازگشت به داشبورد", callback_data: "dash:home" }],
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
  rows.push([{ text: "⬅️ بازگشت به داشبورد", callback_data: "dash:home" }]);
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
  g: { key: "category", label: "🏷 دسته‌بندی" },
};

function formatItemDetail(item) {
  return (
    `🎨 نمونه‌کار\n\n` +
    `وضعیت: ${pfStatusLabel(item.status)}\n` +
    `${item.featured ? "📌 سنجاق‌شده (بالای گالری)" : ""}\n\n` +
    `📌 عنوان: ${item.title || "-"}\n` +
    `🏷 دسته‌بندی: ${categoryDisplayOf(item)}\n` +
    `⭐ امتیاز: ${ratingStars(item.rating)}\n\n` +
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
  if (item.status === "approved" || item.status === "rejected") {
    rows.push([{ text: "↩️ بازگشت به «در انتظار تایید»", callback_data: `pf:${item.id}:pending` }]);
  }

  rows.push([
    item.featured
      ? { text: "📌 برداشتن سنجاق", callback_data: `pfpin:${item.id}:0` }
      : { text: "📌 سنجاق کردن بالای گالری", callback_data: `pfpin:${item.id}:1` },
  ]);

  rows.push([
    { text: "⭐️1", callback_data: `pfrate:${item.id}:1` },
    { text: "⭐️2", callback_data: `pfrate:${item.id}:2` },
    { text: "⭐️3", callback_data: `pfrate:${item.id}:3` },
    { text: "⭐️4", callback_data: `pfrate:${item.id}:4` },
    { text: "⭐️5", callback_data: `pfrate:${item.id}:5` },
  ]);
  rows.push([{ text: "✏️ تنظیم دستی امتیاز (هر عددی)", callback_data: `pfratecustom:${item.id}` }]);

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
  rows.push([{ text: "✏️ دسته‌بندی", callback_data: `pfedit:${item.id}:g` }]);
  rows.push([{ text: "🗑 حذف کامل این نمونه‌کار", callback_data: `pfdel:${item.id}` }]);
  rows.push([{ text: "⬅️ بازگشت به داشبورد", callback_data: "dash:home" }]);


  return { inline_keyboard: rows };
}

async function sendItemManageCard(env, chatId, item) {
  return tgSendTo(env, chatId, formatItemDetail(item), { reply_markup: manageKeyboard(item) });
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://bytelabpro.xyz",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

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

    if (url.pathname.startsWith("/blog-image/") && request.method === "GET") {
      const imgId = url.pathname.replace("/blog-image/", "").trim();
      const base64 = imgId ? await env.LEADS_KV.get(`blogimage:${imgId}`) : null;
      if (!base64) {
        return new Response("Not found", { status: 404, headers: corsHeaders });
      }
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      return new Response(bytes, {
        status: 200,
        headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=604800", ...corsHeaders },
      });
    }

    if (url.pathname === "/api/portfolio" && request.method === "GET") {
      try {
        const items = (await getAllPortfolioItems(env))
          .filter((p) => p.status === "approved")
          .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.createdAt - a.createdAt);
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

    if (url.pathname === "/status" && request.method === "GET") {
      const status = await getStatus(env);
      return new Response(JSON.stringify({ ok: true, online: status.online }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (url.pathname === "/banner" && request.method === "GET") {
      const banner = await getBanner(env);
      return new Response(JSON.stringify({ ok: true, banner }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

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

    if (url.pathname === "/api/blog" && request.method === "GET") {
      try {
        const toAbsoluteImage = (img) => (img && img.startsWith("/") ? url.origin + img : img || "");
        const id = url.searchParams.get("id");
        if (id) {
          const item = await getBlogPost(env, id);
          if (!item || item.status !== "published") {
            return new Response(JSON.stringify({ ok: false, error: "not_found" }), {
              status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }
          return new Response(JSON.stringify({ ok: true, item: { ...item, image: toAbsoluteImage(item.image) } }), {
            status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        const posts = (await getAllBlogPosts(env))
          .filter((p) => p.status === "published")
          .map((p) => ({
            id: p.id,
            title: p.title,
            excerpt: p.excerpt,
            image: toAbsoluteImage(p.image),
            tag: p.tag,
            seoTags: p.seoTags || [],
            createdAt: p.createdAt,
          }));
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
              inline_keyboard: [
                [{ text: statusLabel(newStatus) + " (ثبت شد)", callback_data: "noop" }],
                [{ text: lead.note ? "📝 ویرایش یادداشت" : "📝 افزودن یادداشت", callback_data: `stnote:${leadId}` }],
              ],
            });
            await tgAnswerCallback(env, cq.id, "وضعیت ثبت شد ✅");
          } else {
            await tgAnswerCallback(env, cq.id, "این لید پیدا نشد.");
          }
        } else if (parts[0] === "stnote") {
          const leadId = parts[1];
          const raw = await env.LEADS_KV.get(`lead:${leadId}`);
          if (!raw) {
            await tgAnswerCallback(env, cq.id, "این لید پیدا نشد.");
            return new Response("ok");
          }
          const lead = JSON.parse(raw);
          await setAdminState(env, chatId, { mode: "leadnote", id: leadId });
          await tgAnswerCallback(env, cq.id, "منتظر متن یادداشت هستم...");
          await tgSendTo(
            env,
            chatId,
            `📝 یادداشت این لید رو بفرست${lead.note ? `\n\nیادداشت فعلی:\n${lead.note}` : ""}\n\n(برای پاک‌کردن یادداشت بنویس -)، یا /cancel:`,
            { reply_markup: { force_reply: true } }
          );
        } else if (parts[0] === "catpick") {
          const idx = parseInt(parts[1], 10);
          const state = await getAdminState(env, chatId);
          if (!state || state.mode !== "catpick") {
            await tgAnswerCallback(env, cq.id, "این انتخابگر منقضی شده، دوباره امتحان کن.");
            return new Response("ok");
          }
          const selected = state.selected || [];
          const already = selected.includes(idx);
          if (!already && selected.length >= PF_MAX_CATEGORIES) {
            await tgAnswerCallback(env, cq.id, `حداکثر ${PF_MAX_CATEGORIES} دسته‌بندی می‌شه انتخاب کرد.`);
            return new Response("ok");
          }
          const newSelected = already ? selected.filter((i) => i !== idx) : [...selected, idx];
          await setAdminState(env, chatId, { ...state, selected: newSelected });
          await tgEditText(env, chatId, messageId, catPickerText(state.catList, newSelected), {
            reply_markup: catPickerKeyboard(state.catList, newSelected),
          });
          await tgAnswerCallback(env, cq.id, "");
        } else if (parts[0] === "catpicknew") {
          const state = await getAdminState(env, chatId);
          if (!state || state.mode !== "catpick") {
            await tgAnswerCallback(env, cq.id, "این انتخابگر منقضی شده، دوباره امتحان کن.");
            return new Response("ok");
          }
          await setAdminState(env, chatId, { ...state, mode: "catpicknewtext" });
          await tgAnswerCallback(env, cq.id, "");
          await tgSendTo(env, chatId, "✏️ اسم دسته‌بندی جدید رو بفرست (فقط یکی، بدون ویرگول):", {
            reply_markup: { force_reply: true },
          });
        } else if (parts[0] === "catpickdone") {
          const state = await getAdminState(env, chatId);
          if (!state || state.mode !== "catpick") {
            await tgAnswerCallback(env, cq.id, "این انتخابگر منقضی شده، دوباره امتحان کن.");
            return new Response("ok");
          }
          const categoryStr = (state.selected || []).map((i) => state.catList[i]).filter(Boolean).join(",");
          await tgAnswerCallback(env, cq.id, "ثبت شد ✅");
          await finishCategoryPicker(env, chatId, state, categoryStr);
        } else if (parts[0] === "catpickcancel") {
          await clearAdminState(env, chatId);
          await tgEditText(env, chatId, messageId, "❌ انتخاب دسته‌بندی لغو شد.", {
            reply_markup: { inline_keyboard: [[{ text: "⬅️ بازگشت به داشبورد", callback_data: "dash:home" }]] },
          });
          await tgAnswerCallback(env, cq.id, "لغو شد");
        } else if (parts[0] === "pfauth") {
          const repItemId = parts[1];
          await tgAnswerCallback(env, cq.id, "");
          await sendAuthorDetail(env, chatId, repItemId);
        } else if (parts[0] === "pf") {
          const pfId = parts[1];
          const newStatus = parts[2];
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
              newStatus === "approved"
                ? "تایید شد و روی سایت نمایش داده می‌شه ✅"
                : newStatus === "pending"
                ? "به «در انتظار تایید» برگشت ↩️"
                : "رد شد / از سایت برداشته شد ❌"
            );
          } else {
            await tgAnswerCallback(env, cq.id, "این نمونه‌کار پیدا نشد.");
          }
        } else if (parts[0] === "pfpin") {
          const pfId = parts[1];
          const featured = parts[2] === "1";
          const item = await getPortfolioItem(env, pfId);
          if (item) {
            item.featured = featured;
            await savePortfolioItem(env, item);
            await tgEditText(env, chatId, messageId, formatItemDetail(item), { reply_markup: manageKeyboard(item) });
            await tgAnswerCallback(env, cq.id, featured ? "سنجاق شد و بالای گالری میاد 📌" : "سنجاق برداشته شد");
          } else {
            await tgAnswerCallback(env, cq.id, "این نمونه‌کار پیدا نشد.");
          }
        } else if (parts[0] === "pfrate") {
          const pfId = parts[1];
          const rating = parseInt(parts[2], 10);
          const item = await getPortfolioItem(env, pfId);
          if (item) {
            item.rating = rating;
            await savePortfolioItem(env, item);
            await tgEditText(env, chatId, messageId, formatItemDetail(item), { reply_markup: manageKeyboard(item) });
            await tgAnswerCallback(env, cq.id, `امتیاز ${rating} ثبت شد ⭐️`);
          } else {
            await tgAnswerCallback(env, cq.id, "این نمونه‌کار پیدا نشد.");
          }
        } else if (parts[0] === "pfratecustom") {
          const pfId = parts[1];
          const item = await getPortfolioItem(env, pfId);
          if (!item) {
            await tgAnswerCallback(env, cq.id, "این نمونه‌کار پیدا نشد.");
            return new Response("ok");
          }
          await setAdminState(env, chatId, { mode: "pfratefield", id: pfId });
          await tgAnswerCallback(env, cq.id, "منتظر عدد امتیاز هستم...");
          await tgSendTo(
            env,
            chatId,
            `✏️ امتیاز دلخواه رو بفرست (هر عددی، مثلاً 3، 4.5، یا حتی بیشتر از ۵ برای مقیاس دلخواه خودت)، یا /cancel:`,
            { reply_markup: { force_reply: true } }
          );
        } else if (parts[0] === "pfmanage") {
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
          const pfId = parts[1];
          const fieldCode = parts[2];
          const field = PF_FIELDS[fieldCode];
          const item = await getPortfolioItem(env, pfId);
          if (!item || !field) {
            await tgAnswerCallback(env, cq.id, "امکان ویرایش نیست.");
            return new Response("ok");
          }
          if (fieldCode === "g") {
            await tgAnswerCallback(env, cq.id, "");
            await startCategoryPicker(env, chatId, { kind: "editfield", id: pfId }, categoryListOf(item));
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
            { reply_markup: { inline_keyboard: [[{ text: "⬅️ بازگشت به داشبورد", callback_data: "dash:home" }]] } }
          );
          await tgAnswerCallback(env, cq.id, "حذف شد ✅");
        } else if (parts[0] === "canceladd") {
          await clearAdminState(env, chatId);
          await tgEditText(env, chatId, messageId, "❌ افزودن نمونه‌کار لغو شد.", {
            reply_markup: { inline_keyboard: [[{ text: "⬅️ بازگشت به داشبورد", callback_data: "dash:home" }]] },
          });
          await tgAnswerCallback(env, cq.id, "لغو شد");

        // ---------- 🖥 داشبورد و زیرمنوها ----------
        } else if (parts[0] === "dash") {
          const action = parts[1];
          const sub = parts[2];

          if (action === "home") {
            await showDashboardEdit(env, chatId, messageId);
            await tgAnswerCallback(env, cq.id, "بروزرسانی شد ✅");
          } else if (action === "leads") {
            await tgAnswerCallback(env, cq.id, "");
            await sendLeadsList(env, chatId);
          } else if (action === "gallery") {
            if (!sub) {
              await tgEditText(env, chatId, messageId, "🎨 مدیریت گالری نمونه‌کارها\n\nیکی از گزینه‌ها رو انتخاب کن:", {
                reply_markup: galleryMenuKeyboard(),
              });
              await tgAnswerCallback(env, cq.id, "");
            } else if (sub === "pending") {
              await tgAnswerCallback(env, cq.id, "");
              await sendPortfolioPending(env, chatId);
            } else if (sub === "all") {
              await tgAnswerCallback(env, cq.id, "");
              await sendPortfolioAll(env, chatId);
            } else if (sub === "rejected") {
              await tgAnswerCallback(env, cq.id, "");
              await sendPortfolioRejected(env, chatId);
            } else if (sub === "search") {
              await setAdminState(env, chatId, { mode: "pfsearch" });
              await tgAnswerCallback(env, cq.id, "");
              await tgSendTo(env, chatId, "🔍 عنوان، نام سازنده یا دسته‌بندی مورد نظر رو بفرست:", {
                reply_markup: { force_reply: true },
              });
            } else if (sub === "authors") {
              await tgAnswerCallback(env, cq.id, "");
              await sendAuthorsSummary(env, chatId);
            } else if (sub === "add") {
              await tgAnswerCallback(env, cq.id, "");
              await startAddPortfolio(env, chatId);
            } else if (sub === "seedlocal") {
              await tgAnswerCallback(env, cq.id, "در حال وارد کردن...");
              const result = await seedLocalPortfolioItems(env);
              await tgSendTo(
                env, chatId,
                `📥 فایل‌های لوکال سایت همگام‌سازی شدن.\n\n` +
                `🆕 جدید اضافه‌شده: ${result.added}\n` +
                `♻️ بروزرسانی‌شده (چون از قبل بودن): ${result.updated}\n` +
                `📦 مجموع: ${result.total}\n\n` +
                `از این به بعد این‌ها هم مثل بقیه‌ی نمونه‌کارها از همینجا قابل ویرایش، امتیازدهی، تغییر دسته‌بندی و حذف هستن.`
              );
            }
          } else if (action === "blog") {
            if (!sub) {
              await tgEditText(env, chatId, messageId, "📰 مدیریت بلاگ\n\nیکی از گزینه‌ها رو انتخاب کن:", {
                reply_markup: blogMenuKeyboard(),
              });
              await tgAnswerCallback(env, cq.id, "");
            } else if (sub === "all") {
              await tgAnswerCallback(env, cq.id, "");
              await sendBlogAll(env, chatId);
            } else if (sub === "add") {
              await tgAnswerCallback(env, cq.id, "");
              await startAddBlog(env, chatId);
            } else if (sub === "ai") {
              await tgAnswerCallback(env, cq.id, "شروع شد...");
              await runWriteBlogAI(env, chatId);
            }
          } else if (action === "faq") {
            if (!sub) {
              await tgEditText(env, chatId, messageId, "❓ مدیریت سوالات متداول\n\nیکی از گزینه‌ها رو انتخاب کن:", {
                reply_markup: faqMenuKeyboard(),
              });
              await tgAnswerCallback(env, cq.id, "");
            } else if (sub === "all") {
              await tgAnswerCallback(env, cq.id, "");
              await sendFaqAll(env, chatId);
            } else if (sub === "add") {
              await tgAnswerCallback(env, cq.id, "");
              await askFaqService(env, chatId);
            }
          } else if (action === "banner") {
            const banner = await getBanner(env);
            await tgEditText(env, chatId, messageId, formatBannerDetail(banner), { reply_markup: bannerKeyboard(banner) });
            await tgAnswerCallback(env, cq.id, "");
          } else if (action === "status") {
            const status = await getStatus(env);
            await tgEditText(env, chatId, messageId, formatStatusDetail(status), { reply_markup: statusKeyboard(status) });
            await tgAnswerCallback(env, cq.id, "");
          } else if (action === "stats") {
            await tgAnswerCallback(env, cq.id, "");
            await sendFullStats(env, chatId);
          } else if (action === "export") {
            await tgAnswerCallback(env, cq.id, "در حال آماده‌سازی فایل...");
            await exportLeadsFile(env, chatId);
          } else if (action === "backup") {
            await tgAnswerCallback(env, cq.id, "در حال آماده‌سازی بکاپ...");
            await exportFullBackup(env, chatId);
          } else if (action === "leadsearch") {
            await setAdminState(env, chatId, { mode: "leadsearch" });
            await tgAnswerCallback(env, cq.id, "");
            await tgSendTo(env, chatId, "🔍 شماره تلفن یا اسم مورد نظر رو بفرست:", { reply_markup: { force_reply: true } });
          } else if (action === "ai") {
            if (!sub) {
              const isCustom = await isBlogSystemPromptCustom(env);
              await tgEditText(env, chatId, messageId, await formatAiSettingsText(env), {
                reply_markup: aiSettingsKeyboard(isCustom),
              });
              await tgAnswerCallback(env, cq.id, "");
            } else if (sub === "view") {
              await tgAnswerCallback(env, cq.id, "");
              const current = await getBlogSystemPrompt(env);
              // تلگرام هر پیام حداکثر ۴۰۹۶ کاراکتره؛ پرامپت رو در صورت نیاز تکه‌تکه می‌فرستیم
              for (let i = 0; i < current.length; i += 3500) {
                await tgSendTo(env, chatId, current.slice(i, i + 3500));
              }
              await tgSendTo(env, chatId, "⬆️ این متن دقیق پرامپتیه که الان استفاده می‌شه.", {
                reply_markup: { inline_keyboard: [[{ text: "⬅️ بازگشت", callback_data: "dash:ai" }]] },
              });
            } else if (sub === "edit") {
              await setAdminState(env, chatId, { mode: "aipromptedit" });
              await tgAnswerCallback(env, cq.id, "منتظر متن جدید پرامپت هستم...");
              await tgSendTo(
                env,
                chatId,
                "✏️ متن کامل پرامپت جدید رو بفرست (کل پیام رو یک‌جا بفرست؛ این دقیقاً جایگزین دستورالعمل فعلی هوش‌مصنوعی می‌شه). می‌تونی از «مشاهده پرامپت فعلی» متن فعلی رو کپی و ویرایش کنی. برای لغو /cancel:",
                { reply_markup: { force_reply: true } }
              );
            } else if (sub === "reset") {
              await resetBlogSystemPrompt(env);
              const isCustom = await isBlogSystemPromptCustom(env);
              await tgEditText(env, chatId, messageId, await formatAiSettingsText(env), {
                reply_markup: aiSettingsKeyboard(isCustom),
              });
              await tgAnswerCallback(env, cq.id, "پرامپت به حالت پیش‌فرض برگشت ✅");
            }
          } else {
            await tgAnswerCallback(env, cq.id, "");
          }

        // ---------- بنر اعلانات ----------
        } else if (parts[0] === "bnenable") {
          const banner = await getBanner(env);
          banner.enabled = parts[1] === "1";
          banner.updatedAt = Date.now();
          await saveBanner(env, banner);
          await tgEditText(env, chatId, messageId, formatBannerDetail(banner), { reply_markup: bannerKeyboard(banner) });
          await tgAnswerCallback(env, cq.id, banner.enabled ? "بنر روشن شد ✅" : "بنر خاموش شد 🚫");
        } else if (parts[0] === "bnedit") {
          const field = parts[1];
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
          await tgEditText(env, chatId, messageId, `🗑 سوال با موفقیت حذف شد.`, {
            reply_markup: { inline_keyboard: [[{ text: "⬅️ بازگشت به داشبورد", callback_data: "dash:home" }]] },
          });
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
          await tgEditText(env, chatId, messageId, `🗑 «${item ? item.title : "پست"}» با موفقیت حذف شد.`, {
            reply_markup: { inline_keyboard: [[{ text: "⬅️ بازگشت به داشبورد", callback_data: "dash:home" }]] },
          });
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

        if (text === "/cancel") {
          const had = await getAdminState(env, chatId);
          await clearAdminState(env, chatId);
          await tgSendTo(env, chatId, had ? "❌ عملیات لغو شد." : "چیزی برای لغو کردن نیست.");
          await sendDashboard(env, chatId);
          return new Response("ok");
        }

        // اگه یک مکالمه‌ی باز (ویرایش فیلد یا افزودن دستی) در جریانه، پیام رو به‌عنوان پاسخ اون مکالمه بگیر
        const state = await getAdminState(env, chatId);
        if (state && !text.startsWith("/")) {
          if (state.mode === "aipromptedit") {
            const newPrompt = update.message.text; // بدون trim/slice، چون پرامپت می‌تونه چندخطی و دقیق باشه
            const AI_PROMPT_MAX_LEN = 2500;
            if (!newPrompt || newPrompt.trim().length < 30) {
              await tgSendTo(env, chatId, "این متن خیلی کوتاهه به‌نظر پرامپت کامل نیست. یه متن کامل‌تر بفرست، یا /cancel:");
              return new Response("ok");
            }
            if (newPrompt.length > AI_PROMPT_MAX_LEN) {
              await tgSendTo(
                env,
                chatId,
                `این پرامپت ${newPrompt.length} کاراکتره، خیلی بلنده و ممکنه AI Worker بعداً همینو رد کنه (پیام خیلی طولانی).\nلطفاً به کمتر از ${AI_PROMPT_MAX_LEN} کاراکتر کوتاهش کن و دوباره بفرست، یا /cancel:`
              );
              return new Response("ok");
            }
            await setBlogSystemPrompt(env, newPrompt);
            await clearAdminState(env, chatId);
            await tgSendTo(env, chatId, "✅ پرامپت جدید ذخیره شد. پست‌های بعدی بلاگ با همین دستورالعمل نوشته می‌شن.");
            const isCustom = await isBlogSystemPromptCustom(env);
            await tgSendTo(env, chatId, await formatAiSettingsText(env), { reply_markup: aiSettingsKeyboard(isCustom) });
            return new Response("ok");
          }

          if (state.mode === "catpicknewtext") {
            const newCat = text.replace(/[،,]/g, " ").trim().slice(0, 40);
            if (!newCat) {
              await tgSendTo(env, chatId, "یه اسم معتبر بفرست، یا /cancel:");
              return new Response("ok");
            }
            const catList = [...state.catList];
            let idx = catList.findIndex((c) => c.toLowerCase() === newCat.toLowerCase());
            if (idx === -1) {
              catList.push(newCat);
              idx = catList.length - 1;
            }
            const selected = state.selected.includes(idx) ? state.selected : [...state.selected, idx];
            if (selected.length > PF_MAX_CATEGORIES) selected.splice(0, selected.length - PF_MAX_CATEGORIES);
            await setAdminState(env, chatId, { ...state, mode: "catpick", catList, selected });
            await tgSendTo(env, chatId, catPickerText(catList, selected), { reply_markup: catPickerKeyboard(catList, selected) });
            return new Response("ok");
          }

          if (state.mode === "leadnote") {
            const raw = await env.LEADS_KV.get(`lead:${state.id}`);
            if (!raw) {
              await clearAdminState(env, chatId);
              await tgSendTo(env, chatId, "این لید دیگه پیدا نشد.");
              return new Response("ok");
            }
            const lead = JSON.parse(raw);
            lead.note = text === "-" ? "" : text.slice(0, 500);
            await saveLead(env, lead);
            await clearAdminState(env, chatId);
            await tgSendTo(env, chatId, lead.note ? "✅ یادداشت ذخیره شد." : "✅ یادداشت پاک شد.");
            return new Response("ok");
          }

          if (state.mode === "pfsearch") {
            await clearAdminState(env, chatId);
            await searchPortfolio(env, chatId, text);
            return new Response("ok");
          }

          if (state.mode === "leadsearch") {
            await clearAdminState(env, chatId);
            await searchLeads(env, chatId, text);
            return new Response("ok");
          }

          if (state.mode === "pfratefield") {
            const item = await getPortfolioItem(env, state.id);
            if (!item) {
              await clearAdminState(env, chatId);
              await tgSendTo(env, chatId, "این نمونه‌کار دیگه پیدا نشد.");
              await sendDashboard(env, chatId);
              return new Response("ok");
            }
            const num = parseFloat(text.replace(",", "."));
            if (isNaN(num) || num < 0) {
              await tgSendTo(env, chatId, "لطفاً یه عدد معتبر (مثبت) بفرست، یا /cancel:");
              return new Response("ok");
            }
            item.rating = num;
            await savePortfolioItem(env, item);
            await clearAdminState(env, chatId);
            await tgSendTo(env, chatId, `✅ امتیاز روی ${num} ثبت شد.`);
            await sendItemManageCard(env, chatId, item);
            return new Response("ok");
          }

          if (state.mode === "bannerfield") {
            const banner = await getBanner(env);
            const value = text === "-" ? "" : text;
            if (state.field === "text") banner.text = text.slice(0, 300);
            if (state.field === "link") banner.link = value.slice(0, 300);
            banner.updatedAt = Date.now();
            await saveBanner(env, banner);
            await clearAdminState(env, chatId);
            await tgSendTo(env, chatId, "✅ بنر بروزرسانی شد.");
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
              await tgSendTo(env, chatId, "این سوال دیگه پیدا نشد.");
              await sendDashboard(env, chatId);
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
              await tgSendTo(env, chatId, "✅ سوال متداول جدید اضافه شد و همین الان روی صفحه مربوطه نمایش داده می‌شه:");
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
              await tgSendTo(env, chatId, "این پست دیگه پیدا نشد.");
              await sendDashboard(env, chatId);
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
              await tgSendTo(env, chatId, "✅ پست به‌صورت پیش‌نویس ذخیره شد. برای نمایش روی سایت، دکمه «انتشار» رو بزن:");
              await sendBlogManageCard(env, chatId, item);
            }
            return new Response("ok");
          }

          if (state.mode === "editfield") {
            const item = await getPortfolioItem(env, state.id);
            const field = PF_FIELDS[state.field];
            if (item && field) {
              item[field.key] = field.key === "category" ? sanitizeCategories(text) : text.slice(0, 400);
              await savePortfolioItem(env, item);
              await clearAdminState(env, chatId);
              await tgSendTo(env, chatId, `✅ «${field.label}» بروزرسانی شد.`);
              await sendItemManageCard(env, chatId, item);
            } else {
              await clearAdminState(env, chatId);
              await tgSendTo(env, chatId, "این نمونه‌کار دیگه پیدا نشد، عملیات لغو شد.");
              await sendDashboard(env, chatId);
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
              await startCategoryPicker(env, chatId, { kind: "add", data }, []);
            } else if (state.step === "category") {
              // این مسیر دیگه استفاده نمی‌شه (جایگزین با انتخابگر دسته‌بندی شد) و فقط برای اطمینان نگه داشته شده
              data.category = sanitizeCategories(value);
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
                category: data.category || "",
                rating: 0,
                featured: false,
                addedManually: true,
              };
              await savePortfolioItem(env, item);
              await tgSendTo(env, chatId, "✅ نمونه‌کار جدید با موفقیت اضافه شد و همین الان روی سایت نمایش داده می‌شه:");
              await sendItemManageCard(env, chatId, item);
            }
            return new Response("ok");
          }
        }

        // ---------- دستورات ----------
        if (text === "/start") {
          await tgSetCommands(env);
          // حذف کامل کیبورد ثابت پایین صفحه (اگه از قبل مونده باشه) — از این به بعد فقط دکمه‌های شیشه‌ای استفاده می‌شن
          await tgSendTo(env, chatId, "سلام 👋 بات مدیریت بایت‌لب فعاله.", { reply_markup: { remove_keyboard: true } });
          await sendDashboard(env, chatId);
        } else if (text === "/dashboard") {
          await sendDashboard(env, chatId);
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
      const clientIp = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";

      // ---- محدودیت نرخ (ضد اسپم) بر اساس نوع درخواست و IP ----
      const RATE_LIMITS = {
        portfolio_submit: { max: 3, windowSeconds: 3600 },
        contact: { max: 5, windowSeconds: 3600 },
        profile: { max: 5, windowSeconds: 3600 },
        abandoned_form: { max: 10, windowSeconds: 3600 },
      };
      const rl = RATE_LIMITS[data.type];
      if (rl) {
        const allowed = await checkRateLimit(env, clientIp, data.type, rl.max, rl.windowSeconds);
        if (!allowed) {
          return new Response(
            JSON.stringify({ ok: false, error: "rate_limited", message: "تعداد درخواست‌های شما در این بازه زیاده. کمی بعد دوباره امتحان کن." }),
            { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }

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
          category: sanitizeCategories(data.category),
          rating: 0,
          featured: false,
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
              inline_keyboard: [
                [
                  { text: "✅ تماس گرفتم", callback_data: `st:${id}:contacted` },
                  { text: "⏳ بعداً", callback_data: `st:${id}:later` },
                  { text: "❌ رد شد", callback_data: `st:${id}:rejected` },
                ],
                [{ text: "📝 افزودن یادداشت", callback_data: `stnote:${id}` }],
              ],
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
    } else if (event.cron === "0 20 * * 5") {
      // بکاپ خودکار هفتگی (هر جمعه ساعت ۲۰:۰۰ به وقت UTC ≈ ۲۳:۳۰ ایران)
      // برای فعال‌شدن این خط، باید تریگر "0 20 * * 5" رو به cron_triggers توی wrangler.toml اضافه کنی
      ctx.waitUntil(exportFullBackup(env, env.TELEGRAM_CHAT_ID));
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
    `📦 مجموع لید امروز: ${todays.length}`
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
