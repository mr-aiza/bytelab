var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var SITE_URL = "https://mr-aiza.github.io/bytelab/index.html";
var MODELS = [
  "@cf/meta/llama-3.1-8b-instruct-fast",
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
];
function stripHtml(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
__name(stripHtml, "stripHtml");
async function getSiteContext() {
  try {
    const res = await fetch(SITE_URL, { cf: { cacheTtl: 300, cacheEverything: true } });
    const html = await res.text();
    const text = stripHtml(html);
    return text.slice(0, 3e3);
  } catch (e) {
    return "";
  }
}
__name(getSiteContext, "getSiteContext");
async function runWithFallback(env, aiMessages) {
  let lastError = null;
  for (const model of MODELS) {
    try {
      const result = await env.AI.run(model, { messages: aiMessages });
      if (result && result.response) {
        return { response: result.response, modelUsed: model };
      }
      lastError = new Error(`\u0645\u062F\u0644 ${model} \u067E\u0627\u0633\u062E \u062E\u0627\u0644\u06CC \u0628\u0631\u06AF\u0631\u062F\u0627\u0646\u062F.`);
    } catch (err) {
      lastError = err;
      continue;
    }
  }
  throw lastError || new Error("\u0647\u0645\u0647 \u0645\u062F\u0644\u200C\u0647\u0627 \u0634\u06A9\u0633\u062A \u062E\u0648\u0631\u062F\u0646\u062F.");
}
__name(runWithFallback, "runWithFallback");
var index_default = {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method === "GET") {
      try {
        const testMessages = [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "\u0628\u06AF\u0648 '\u0633\u0644\u0627\u0645\u060C \u0645\u0646 \u0641\u0639\u0627\u0644\u0645'" }
        ];
        const { response, modelUsed } = await runWithFallback(env, testMessages);
        return new Response(
          "\u2705 \u0647\u0645\u0647\u200C\u0686\u06CC\u0632 \u0633\u0627\u0644\u0645\u0647!\n\u0645\u062F\u0644 \u0627\u0633\u062A\u0641\u0627\u062F\u0647\u200C\u0634\u062F\u0647: " + modelUsed + "\n\u062C\u0648\u0627\u0628: " + response,
          { headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" } }
        );
      } catch (err) {
        return new Response(
          "\u274C \u062E\u0637\u0627 \u062F\u0631 \u062A\u0645\u0627\u0633 \u0628\u0627 AI:\n" + (err && err.message ? err.message : String(err)) + "\n\nStack:\n" + (err && err.stack ? err.stack : "\u0646\u062F\u0627\u0631\u062F"),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" } }
        );
      }
    }
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }
    try {
      const { system, messages } = await request.json();
      const siteContext = await getSiteContext();
      const fullSystem = `${system}

===== \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0632\u0646\u062F\u0647 \u0633\u0627\u06CC\u062A \u0628\u0627\u06CC\u062A\u200C\u0644\u0628 (\u062A\u0627\u0632\u0647\u200C\u062E\u0648\u0627\u0646\u06CC\u200C\u0634\u062F\u0647 \u0627\u0632 \u062E\u0648\u062F \u0633\u0627\u06CC\u062A) =====
${siteContext}
===== \u067E\u0627\u06CC\u0627\u0646 \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0633\u0627\u06CC\u062A =====`;
      const aiMessages = [
        { role: "system", content: fullSystem },
        ...messages.map((m) => ({ role: m.role, content: m.content }))
      ];
      const { response, modelUsed } = await runWithFallback(env, aiMessages);
      const wrapped = {
        content: [{ type: "text", text: response || "\u067E\u0627\u0633\u062E\u06CC \u062F\u0631\u06CC\u0627\u0641\u062A \u0646\u0634\u062F." }],
        _debug_model: modelUsed
        // برای دیباگ؛ اگه نخواستی می‌تونی حذفش کنی
      };
      return new Response(JSON.stringify(wrapped), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "\u062E\u0637\u0627: " + (err && err.message ? err.message : String(err)) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
