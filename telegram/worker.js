
// worker.js — بایت‌لب: ارسال لید به تلگرام + مدیریت وضعیت + دستورات بات + گزارش روزانه
// نیازمند: Secret های TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
// نیازمند: Binding به KV با اسم LEADS_KV

const TG_API = (env) => `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;

async function tgSend(env, text, extra = {}) {
  const res = await fetch(`${TG_API(env)}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, ...extra }),
  });
  return res.json();
}

async function tgEditMarkup(env, chatId, messageId, replyMarkup) {
  return fetch(`${TG_API(env)}/editMessageReplyMarkup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: replyMarkup }),
  });
}

async function tgAnswerCallback(env, callbackQueryId, text) {
  return fetch(`${TG_API(env)}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
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

function statusLabel(status) {
  if (status === "contacted") return "✅ تماس گرفته شد";
  if (status === "rejected") return "❌ رد شد";
  if (status === "later") return "⏳ تماس بعداً";
  return "🆕 جدید";
}

function mainMenu() {
  return {
    keyboard: [
      [{ text: "📊 آمار" }, { text: "📋 لیدها" }],
      [{ text: "🎨 نمونه‌کارها" }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://mr-aiza.github.io",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // ================== وبهوک تلگرام (دکمه‌ها + دستورات) ==================
    if (url.pathname === "/tg") {
      if (request.method !== "POST") return new Response("ok");

      const update = await request.json();

      if (update.callback_query) {
        const cq = update.callback_query;
        const data = cq.data || "";

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
            await tgEditMarkup(env, cq.message.chat.id, cq.message.message_id, {
              inline_keyboard: [[{ text: statusLabel(newStatus) + " (ثبت شد)", callback_data: "noop" }]],
            });
            await tgAnswerCallback(env, cq.id, "وضعیت ثبت شد ✅");
          } else {
            await tgAnswerCallback(env, cq.id, "این لید پیدا نشد.");
          }
        } else {
          await tgAnswerCallback(env, cq.id, "");
        }
        return new Response("ok");
      }

      if (update.message && update.message.text) {
        const chatId = update.message.chat.id;
        const text = update.message.text.trim();

        if (String(chatId) !== String(env.TELEGRAM_CHAT_ID)) {
          return new Response("ok");
        }

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
            `🆕 در انتظار پیگیری: ${pending}`,
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
        } else if (text === "/portfolio" || text === "🎨 نمونه‌کارها") {
          await tgSend(env,
            `🎨 نمونه‌کارهای بایت‌لب:\n\n` +
            `https://mr-aiza.github.io/bytelab/portfolio.html`,
            { reply_markup: mainMenu() }
          );
        } else if (text === "/start") {
          await tgSend(env, "سلام 👋 بات اطلاع‌رسانی بایت‌لب فعاله.\n\nاز منوی پایین صفحه استفاده کن، یا این دستورات رو بفرست:\n/stats — آمار کلی\n/leads — آخرین لیدها\n/portfolio — لینک نمونه‌کارها",
            { reply_markup: mainMenu() }
          );
        }
      }
      return new Response("ok");
    }

    // ================== درخواست‌های سایت (فرم تماس / ثبت‌نام) ==================
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    try {
      const data = await request.json();
      const id = crypto.randomUUID();
      const createdAt = Date.now();

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
