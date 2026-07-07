// blog-dynamic.js — لیست پست‌های بلاگ را از KV (مدیریت‌شده در تلگرام) می‌گیرد و نمایش می‌دهد
//
// نحوه استفاده در blog.html:
//   ۱. داخل <section class="blog-section"><div class="wrap"> این ساختار باید باشه:
//        <div id="blogList"></div>
//        <div id="staticPosts"> ...کارت‌های ثابت فعلی... </div>
//   ۲. این فایل رو بعد از header.js لینک بده: <script src="blog-dynamic.js"></script>
//
// رفتار:
//   - اگه حداقل یک پست دینامیک (نوشته‌شده از تلگرام) منتشر شده باشه، همون‌ها بالای صفحه نشون داده می‌شن
//     و کارت‌های ثابت (staticPosts) به‌طور خودکار مخفی می‌شن.
//   - اگه هنوز هیچ پستی منتشر نشده یا اتصال به سرور مشکل داشت، کارت‌های ثابت همون‌طور که هستن می‌مونن
//     تا صفحه‌ی بلاگ هیچ‌وقت خالی نباشه.
(function () {
  const TELEGRAM_WORKER_URL = "https://bytelab-telegram.bytelab-workerbytelab.workers.dev";

  document.addEventListener("DOMContentLoaded", function () {
    const list = document.getElementById("blogList");
    const staticPosts = document.getElementById("staticPosts");
    const loadingEl = document.getElementById("blogLoading");
    if (!list) return;

    if (loadingEl) loadingEl.classList.add("show");

    fetch(TELEGRAM_WORKER_URL + "/api/blog")
      .then((r) => r.json())
      .then((res) => {
        const posts = (res && res.posts) || [];
        if (loadingEl) loadingEl.classList.remove("show");

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

        // حالا که حداقل یک پست واقعی داریم، دیگه نیازی به کارت‌های ثابت نیست
        if (staticPosts) staticPosts.style.display = "none";
      })
      .catch(() => {
        // اگه لود نشد، کارت‌های ثابت موجود همون‌طور می‌مونن
        if (loadingEl) loadingEl.classList.remove("show");
      });
  });

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }
})();
