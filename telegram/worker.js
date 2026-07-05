// worker.js 
// این کد رو توی Cloudflare Workers (workers.cloudflare.com) به‌عنوان یه Worker جدید بذارید.
// توکن بات و chat_id رو به‌صورت Secret تنظیم کنید (نه داخل کد!) — بخش پایین توضیح داره.

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://mr-aiza.github.io",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // درخواست پیش‌بررسی مرورگر (preflight) باید همیشه قبل از هر چک دیگه‌ای جواب داده بشه
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    try {
      const data = await request.json();

      // نوع پیام رو تشخیص بده: فرم تماس یا پروفایل کاربر
      let text = "";
      if (data.type === "contact") {
        text =
          `📩 پیام جدید از فرم تماس\n\n` +
          `👤 نام: ${escapeHtml(data.name || "-")}\n` +
          `📞 شماره: ${escapeHtml(data.phone || "-")}\n` +
          `🛠 خدمات: ${escapeHtml(data.service || "-")}\n` +
          `💬 پیام: ${escapeHtml(data.message || "-")}`;
      } else if (data.type === "profile") {
        text =
          `👤 کاربر جدید ثبت‌نام کرد\n\n` +
          `📧 ایمیل: ${escapeHtml(data.email || "-")}\n` +
          `🆔 UID: ${escapeHtml(data.uid || "-")}\n` +
          `📱 منبع: ${escapeHtml(data.source || "سایت/اپ")}`;
      } else {
        text = `📦 داده دریافتی:\n${JSON.stringify(data, null, 2)}`;
      }

      const tgResponse = await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: env.TELEGRAM_CHAT_ID,
            text: text,
          }),
        }
      );

      if (!tgResponse.ok) {
        const errText = await tgResponse.text();
        return new Response(JSON.stringify({ ok: false, error: errText }), {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: String(err) }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  },
};

function escapeHtml(str) {
  return String(str).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
}
