
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
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
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
        if (state && !text.startsWith("/") && !["📊 آمار", "📋 لیدها", "🎨 نمونه‌کارهای جدید", "🗂 مدیریت گالری", "➕ افزودن نمونه‌کار دستی"].includes(text)) {
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
