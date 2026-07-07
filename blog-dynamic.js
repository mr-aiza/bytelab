// blog-dynamic.js — لیست پست‌های بلاگ را از KV (مدیریت‌شده در تلگرام) می‌گیرد و نمایش می‌دهد
// نحوه استفاده در blog.html:
//   ۱. داخل <section class="blog-section"><div class="wrap"> ... </div></section>
//      یک <div id="blogList"></div> بگذار (به‌جای یا کنار کارت‌های ثابت فعلی)
//   ۲. این فایل را بعد از header.js لینک بده: <script src="blog-dynamic.js"></script>
(function () {
  const TELEGRAM_WORKER_URL = "https://bytelab-telegram.bytelab-workerbytelab.workers.dev";

  document.addEventListener("DOMContentLoaded", function () {
    const list = document.getElementById("blogList");
    if (!list) return;

    fetch(TELEGRAM_WORKER_URL + "/api/blog")
      .then((r) => r.json())
      .then((res) => {
        const posts = (res && res.posts) || [];
        if (posts.length === 0) return; // کارت‌های ثابت موجود همون‌طور می‌مونن

        list.innerHTML = posts
          .map(
            (p) => `
          <div class="post-card reveal in">
            <span class="meta">${escapeHTML(p.tag || "بایت‌لب")}</span>
            <h3><a href="blog-post.html?id=${encodeURIComponent(p.id)}">${escapeHTML(p.title)}</a></h3>
            <p>${escapeHTML(p.excerpt || "")}</p>
            <a href="blog-post.html?id=${encodeURIComponent(p.id)}" class="more">ادامه مطلب ←</a>
          </div>`
          )
          .join("");
      })
      .catch(() => { /* اگه لود نشد، کارت‌های ثابت موجود همون‌طور می‌مونن */ });
  });

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }
})();
