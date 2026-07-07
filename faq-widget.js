// faq-widget.js — نمایش سوالات متداول مدیریت‌شده از تلگرام
// نحوه استفاده: یک تگ با این ساختار داخل صفحه بگذار، هرجا که می‌خوای FAQ نمایش داده شود:
//   <div id="faqWidget" data-service="site"></div>
// مقدار data-service باید یکی از این‌ها باشد: site (طراحی سایت) | app (طراحی اپلیکیشن) | computer (خدمات کامپیوتر)
// سپس این فایل را در پایین صفحه لینک بده: <script src="faq-widget.js"></script>
(function () {
  const TELEGRAM_WORKER_URL = "https://bytelab-telegram.bytelab-workerbytelab.workers.dev";

  document.addEventListener("DOMContentLoaded", function () {
    const container = document.getElementById("faqWidget");
    if (!container) return;

    const service = container.getAttribute("data-service") || "";
    container.innerHTML = `<p style="color:#7c8b9c;font-size:14px;">در حال بارگذاری سوالات متداول...</p>`;

    fetch(TELEGRAM_WORKER_URL + "/api/faq?service=" + encodeURIComponent(service))
      .then((r) => r.json())
      .then((res) => {
        const items = (res && res.items) || [];
        if (items.length === 0) {
          container.innerHTML = "";
          return;
        }
        container.innerHTML = items
          .map(
            (it) => `
          <details class="faq-item reveal in">
            <summary>${escapeHTML(it.question)}</summary>
            <p>${escapeHTML(it.answer)}</p>
          </details>`
          )
          .join("");
      })
      .catch(() => {
        container.innerHTML = "";
      });
  });

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }
})();
