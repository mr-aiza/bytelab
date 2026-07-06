// header.js
// این فایل هدر و منوی موبایل سایت بایت‌لب رو دقیقا مطابق index.html
// در همه صفحات تزریق می‌کنه. کافیه این فایل رو در همه صفحات لینک بدی.
(function () {
  // --- فاویکون مشترک: با اجرای این فایل روی هر صفحه، فاویکون به‌صورت خودکار اضافه می‌شه ---
  const favicons = [
    { rel: "icon", type: "image/x-icon", href: "favicon.ico" },
    { rel: "icon", type: "image/png", sizes: "32x32", href: "favicon-32.png" },
    { rel: "icon", type: "image/png", sizes: "192x192", href: "favicon-192.png" },
    { rel: "icon", type: "image/png", sizes: "512x512", href: "favicon-512.png" },
    { rel: "apple-touch-icon", sizes: "180x180", href: "favicon-180.png" }
  ];
  favicons.forEach(f => {
    const link = document.createElement("link");
    link.rel = f.rel;
    if (f.type) link.type = f.type;
    if (f.sizes) link.sizes = f.sizes;
    link.href = f.href;
    document.head.appendChild(link);
  });

  // --- PWA: مانیفست + رنگ نوار مرورگر ---
  // با تزریق خودکار از همینجا، لازم نیست این خط‌ها رو تو هر صفحه دستی اضافه کنی.
  const manifestLink = document.createElement("link");
  manifestLink.rel = "manifest";
  manifestLink.href = "manifest.json";
  document.head.appendChild(manifestLink);

  const themeColor = document.createElement("meta");
  themeColor.name = "theme-color";
  themeColor.content = "#070b12";
  document.head.appendChild(themeColor);

  // --- PWA: ثبت Service Worker برای نصب‌شدنی‌بودن و بارگذاری سریع‌تر ---
  // + تشخیص خودکار نسخه‌ی جدید و فعال‌سازی بی‌درنگش (بدون نیاز به بستن کامل تب)
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").then((reg) => {
        // هر بار صفحه لود شد، از سرور چک کن ببین نسخه جدیدتری از sw.js هست یا نه
        reg.update();

        // وقتی نسخه‌ی جدید نصب شد و منتظر فعال‌سازیه، بگو فوراً فعال بشه
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                newWorker.postMessage("SKIP_WAITING");
              }
            });
          }
        });
      }).catch(() => {
        // اگه ثبت نشد (مثلاً روی localhost بدون https)، بی‌سروصدا رد شو
      });

      // وقتی نسخه‌ی جدید کنترل صفحه رو به دست گرفت، یه بار صفحه رو رفرش کن
      // تا کاربر همون لحظه محتوای تازه رو ببینه
      let refreshed = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshed) return;
        refreshed = true;
        window.location.reload();
      });
    });
  }

  // --- استایل هدر: به‌صورت خودکار به هر صفحه‌ای که این فایل رو صدا بزنه اضافه می‌شه ---
  // اینطوری لازم نیست CSS هدر رو توی <style> هر صفحه (مثل blog.html) دستی کپی کنی.
  const headerCSS = `
    header{
      position:fixed;top:0;left:0;right:0;z-index:50;
      background:rgba(7,11,18,.72);
      backdrop-filter:blur(14px);
      border-bottom:1px solid #1e2a38;
    }
    header .nav{max-width:1180px;margin:0 auto;padding:0 24px;display:flex;align-items:center;justify-content:space-between;height:72px;}
    header .logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:18px;color:#eaf0f4;}
    header .logo .tag{font-family:'JetBrains Mono',monospace;font-size:10px;color:#7c8b9c;font-weight:400;letter-spacing:.08em;margin-right:2px;}
    header .logo-icon{width:34px;height:34px;object-fit:contain;filter:drop-shadow(0 0 10px rgba(77,240,201,.35));}
    nav.links{display:flex;gap:32px;font-size:15px;color:#7c8b9c;}
    nav.links a{color:inherit;text-decoration:none;}
    nav.links a:hover, nav.links a.active{color:#4df0c9;}
    .header-actions{display:flex;align-items:center;gap:12px;}
    .nav-cta{
      display:inline-flex;align-items:center;gap:8px;
      background:#4df0c9;color:#06120f;font-weight:700;font-size:14px;
      padding:11px 22px;border-radius:999px;text-decoration:none;
      box-shadow:0 0 24px rgba(77,240,201,.35);
      transition:transform .2s ease, box-shadow .2s ease;
    }
    .nav-cta:hover{transform:translateY(-1px);box-shadow:0 0 32px rgba(77,240,201,.55);}
    .nav-cta-app{
      display:inline-flex;align-items:center;gap:8px;
      background:rgba(156,123,255,.12);color:#c9b6ff;font-weight:700;font-size:14px;
      padding:11px 22px;border-radius:999px;text-decoration:none;
      border:1px solid #9c7bff;
      transition:transform .2s ease, background .2s ease, box-shadow .2s ease;
    }
    .nav-cta-app:hover{transform:translateY(-1px);background:rgba(156,123,255,.22);box-shadow:0 0 24px rgba(156,123,255,.35);}
    .burger{display:none;flex-direction:column;gap:5px;cursor:pointer;background:none;border:none;padding:8px;}
    .burger span{width:22px;height:2px;background:#eaf0f4;border-radius:2px;}
    .mobile-menu{
      display:none;position:fixed;top:72px;left:0;right:0;background:#0f1620;
      border-bottom:1px solid #1e2a38;padding:20px 24px;flex-direction:column;gap:18px;z-index:49;
    }
    .mobile-menu.open{display:flex;}
    .mobile-menu a{color:#eaf0f4;font-size:16px;text-decoration:none;}
    .mobile-menu a.active{color:#4df0c9;}
    .mobile-menu a.app-download-link{
      display:flex;align-items:center;justify-content:center;gap:8px;
      background:linear-gradient(135deg,#4df0c9,#9c7bff);
      color:#06120f;font-weight:800;font-size:15px;
      padding:14px 20px;border-radius:14px;margin-top:6px;
      box-shadow:0 0 20px rgba(77,240,201,.25);
    }
    @media (max-width:860px){
      nav.links, .header-actions{display:none;}
      .burger{display:flex;}
    }
  `;
  const styleTag = document.createElement("style");
  styleTag.textContent = headerCSS;
  document.head.appendChild(styleTag);

  // --- تشخیص صفحه فعلی برای هایلایت‌کردن لینک فعال تو منو ---
  const current = (location.pathname.split("/").pop() || "index.html");
  const isActive = (names) => names.includes(current);

  // --- لیست لینک‌های منو: منبع واحد برای دسکتاپ و موبایل ---
  const NAV_LINKS = [
    { href: "index.html", text: "خانه", match: ["index.html", ""] },
    { href: "tarahi-site.html", text: "طراحی سایت", match: ["tarahi-site.html"] },
    { href: "tarahi-app.html", text: "طراحی اپلیکیشن", match: ["tarahi-app.html"] },
    { href: "khadamat-computer.html", text: "خدمات کامپیوتر", match: ["khadamat-computer.html"] },
    { href: "blog.html", text: "بلاگ", match: ["blog.html", "hazine-tarahi-site.html", "app-ekhtesasi.html"] },
    { href: "index.html#contact", text: "تماس", match: [] },
    { href: "chat.html", text: "چت با هوش مصنوعی", match: ["chat.html"] }
  ];

  const linksHTML = NAV_LINKS.map(l => {
    const cls = isActive(l.match) ? ' class="active"' : "";
    return `<a href="${l.href}"${cls}>${l.text}</a>`;
  }).join("\n  ");

  const headerHTML = `
<header>
  <div class="wrap nav">
    <div class="logo">
      <img src="logo-icon.png" alt="بایت‌لب" class="logo-icon">
      <span>بایت‌لب<span class="tag">BYTE_LAB</span></span>
    </div>
    <nav class="links">
  ${linksHTML}
    </nav>
    <div class="header-actions">
      <a href="profile/login.html" class="nav-cta-app">ورود / پروفایل</a>
      <a href="Byte_Lab.apk" download class="nav-cta-app">دانلود اپلیکیشن</a>
      <a href="index.html#contact" class="nav-cta">شروع پروژه</a>
    </div>
    <button class="burger" id="burger" aria-label="منو">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>
<div class="mobile-menu" id="mobileMenu">
  ${linksHTML}
  <a href="profile/login.html" class="app-download-link" style="background:linear-gradient(135deg,#9c7bff,#4df0c9);">ورود / پروفایل</a>
  <a href="Byte_Lab.apk" download class="app-download-link">دانلود اپلیکیشن</a>
</div>
  `;

  document.addEventListener("DOMContentLoaded", function () {
    const placeholder = document.getElementById("siteHeaderPlaceholder");
    if (placeholder) {
      placeholder.outerHTML = headerHTML;
    }

    // فعال‌سازی دکمه همبرگری و بسته‌شدن منو بعد از کلیک روی لینک
    const burger = document.getElementById('burger');
    const menu = document.getElementById('mobileMenu');
    if (burger && menu) {
      burger.addEventListener('click', () => menu.classList.toggle('open'));
      menu.querySelectorAll('a').forEach(a =>
        a.addEventListener('click', () => menu.classList.remove('open'))
      );
    }

    // --- چک وضعیت لاگین کاربر تا دکمه «ورود / پروفایل» هوشمند بشه ---
    // اگه کاربر از قبل لاگین بود، به‌جای صفحه ورود، مستقیم بره صفحه پروفایل
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js").then(({ initializeApp }) => {
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js").then(({ getAuth, onAuthStateChanged }) => {
        const firebaseConfig = {
          apiKey: "AIzaSyC4H9JHfDNCFiNWSx9JXA-L2MzleiQvzQI",
          authDomain: "bytelab-bot-7a303.firebaseapp.com",
          projectId: "bytelab-bot-7a303",
          storageBucket: "bytelab-bot-7a303.firebasestorage.app",
          messagingSenderId: "350774453186",
          appId: "1:350774453186:web:15d2c832986804812c6c5b",
          measurementId: "G-76F34JK2RY"
        };
        const fbApp = initializeApp(firebaseConfig);
        const auth = getAuth(fbApp);
        onAuthStateChanged(auth, (user) => {
          if (user) {
            const displayText = user.displayName || (user.email ? user.email.split("@")[0] : "پروفایل");
            document.querySelectorAll('a[href="profile/login.html"]').forEach(a => {
              a.href = "profile/profile.html";
              a.textContent = "👤 " + displayText;
            });
          }
        });
      });
    }).catch(() => { /* اگه فایربیس لود نشد، دکمه همون لینک پیش‌فرض ورود رو نگه می‌داره */ });

    // --- اطلاع‌رسانی دانلود اپلیکیشن به تلگرام (بدون کند کردن دانلود کاربر) ---
    const TELEGRAM_WORKER_URL = "https://bytelab-telegram.bytelab-workerbytelab.workers.dev";
    document.querySelectorAll('a[href="Byte_Lab.apk"]').forEach(a => {
      a.addEventListener('click', () => {
        fetch(TELEGRAM_WORKER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "apk_download" })
        }).catch(() => {});
      });
    });

    // --- اطلاع‌رسانی بازدید صفحات مهم (هر صفحه، هر نشست، فقط یک‌بار) ---
    const TRACKED_PAGES = {
      "tarahi-site.html": "طراحی سایت",
      "tarahi-app.html": "طراحی اپلیکیشن",
      "khadamat-computer.html": "خدمات کامپیوتر",
      "hazine-tarahi-site.html": "هزینه طراحی سایت"
    };
    const pageName = TRACKED_PAGES[current];
    if (pageName && !sessionStorage.getItem("visited_" + current)) {
      sessionStorage.setItem("visited_" + current, "1");
      fetch(TELEGRAM_WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "page_visit", page: pageName })
      }).catch(() => {});
    }
  });
})();
