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
      display:inline-flex;align-items:center;gap:7px;
      background:rgba(156,123,255,.12);color:#c9b6ff;font-weight:700;font-size:13.5px;
      padding:10px 18px;border-radius:999px;text-decoration:none;
      border:1px solid #9c7bff;white-space:nowrap;
      transition:transform .2s ease, background .2s ease, box-shadow .2s ease;
    }
    .nav-cta-app:hover{transform:translateY(-1px);background:rgba(156,123,255,.22);box-shadow:0 0 24px rgba(156,123,255,.35);}
    .nav-cta-chat{
      display:inline-flex;align-items:center;gap:7px;
      background:rgba(77,240,201,.08);color:#4df0c9;font-weight:700;font-size:13.5px;
      padding:10px 18px;border-radius:999px;text-decoration:none;white-space:nowrap;
      border:1px solid rgba(77,240,201,.45);
      transition:transform .2s ease, background .2s ease, box-shadow .2s ease;
    }
    .nav-cta-chat:hover{transform:translateY(-1px);background:rgba(77,240,201,.18);box-shadow:0 0 24px rgba(77,240,201,.3);}

    /* دکمه همبرگری: با باز شدن منو به ضربدر تبدیل می‌شه */
    .burger{display:none;flex-direction:column;justify-content:center;gap:5px;cursor:pointer;background:none;border:none;padding:8px;width:38px;height:38px;position:relative;z-index:61;}
    .burger span{width:22px;height:2px;background:#eaf0f4;border-radius:2px;transition:transform .25s ease, opacity .25s ease;}
    .burger.open span:nth-child(1){transform:translateY(7px) rotate(45deg);}
    .burger.open span:nth-child(2){opacity:0;}
    .burger.open span:nth-child(3){transform:translateY(-7px) rotate(-45deg);}

    /* پرده‌ی تیره پشت منوی کشویی */
    .menu-overlay{
      position:fixed;inset:0;background:rgba(4,7,12,.62);backdrop-filter:blur(2px);
      z-index:58;opacity:0;pointer-events:none;transition:opacity .3s ease;
    }
    .menu-overlay.open{opacity:1;pointer-events:auto;}

    /* منوی کشویی (Drawer) موبایل: از راست به داخل کشیده می‌شه */
    .mobile-menu{
      display:flex;flex-direction:column;gap:20px;
      position:fixed;top:0;right:0;height:100%;width:min(320px,84vw);
      background:#0f1620;border-left:1px solid #1e2a38;
      padding:20px 20px 28px;z-index:59;overflow-y:auto;
      transform:translateX(100%);transition:transform .32s cubic-bezier(.4,0,.2,1);
      box-shadow:-18px 0 40px rgba(0,0,0,.35);
    }
    .mobile-menu.open{transform:translateX(0);}
    .mm-head{display:flex;align-items:center;justify-content:space-between;padding-bottom:4px;}
    .mm-head .logo{display:flex;align-items:center;gap:8px;font-weight:800;font-size:15px;color:#eaf0f4;}
    .mm-head .logo-icon{width:26px;height:26px;object-fit:contain;}
    .mm-close{
      background:none;border:1px solid #1e2a38;color:#eaf0f4;width:34px;height:34px;border-radius:10px;
      font-size:16px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;
    }
    .mm-links{display:flex;flex-direction:column;}
    .mobile-menu a{color:#eaf0f4;font-size:15.5px;text-decoration:none;padding:11px 2px;border-bottom:1px solid rgba(30,42,56,.7);}
    .mobile-menu a.active{color:#4df0c9;}
    .mm-divider{height:1px;background:#1e2a38;}
    .mm-label{font-size:11.5px;color:#7c8b9c;font-weight:700;letter-spacing:.02em;}
    .mm-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
    .mm-action{
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;
      border:1px solid #1e2a38;border-radius:14px;padding:14px 8px;
      color:#eaf0f4;font-size:12.5px;font-weight:600;text-align:center;
      background:rgba(255,255,255,.02);text-decoration:none;border-bottom:1px solid #1e2a38;
      transition:border-color .2s ease, background .2s ease;
    }
    .mm-action:active{background:rgba(255,255,255,.06);}
    .mm-action.accent{border-color:rgba(77,240,201,.45);color:#4df0c9;}
    .mobile-menu a.app-download-link{
      display:flex;align-items:center;justify-content:center;gap:8px;
      background:linear-gradient(135deg,#4df0c9,#9c7bff);
      color:#06120f;font-weight:800;font-size:15px;
      padding:14px 20px;border-radius:14px;margin-top:2px;border-bottom:none;
      box-shadow:0 0 20px rgba(77,240,201,.25);
    }
    body.menu-open{overflow:hidden;}
    @media (max-width:1040px){
      nav.links, .header-actions{display:none;}
      .burger{display:flex;}
    }

    /* بنر اعلانات سایت */
    #siteAnnouncementBanner{
      position:fixed;top:0;left:0;right:0;z-index:60;
      background:linear-gradient(90deg,#4df0c9,#9c7bff);
      color:#06120f;font-weight:700;font-size:13.5px;
      padding:10px 44px 10px 16px;text-align:center;
      display:flex;align-items:center;justify-content:center;gap:8px;
      line-height:1.5;
    }
    #siteAnnouncementBanner a{text-decoration:underline;color:#06120f;}
    #siteAnnouncementBanner .banner-close{
      position:absolute;left:14px;top:50%;transform:translateY(-50%);
      background:none;border:none;color:#06120f;font-size:16px;cursor:pointer;
      width:26px;height:26px;line-height:26px;opacity:.7;
    }
    #siteAnnouncementBanner .banner-close:hover{opacity:1;}

    /* نشانگر وضعیت پاسخگویی آنلاین/آفلاین */
    #siteStatusBadge{
      position:fixed;left:18px;bottom:18px;z-index:55;
      display:flex;align-items:center;gap:8px;
      background:rgba(15,22,32,.9);backdrop-filter:blur(10px);
      border:1px solid #1e2a38;border-radius:999px;
      padding:9px 16px 9px 12px;font-size:12.5px;color:#eaf0f4;
      box-shadow:0 4px 18px rgba(0,0,0,.35);
    }
    #siteStatusBadge .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
    #siteStatusBadge .dot.online{background:#4df0c9;box-shadow:0 0 0 0 rgba(77,240,201,.6);animation:statusPulse 1.8s infinite;}
    #siteStatusBadge .dot.offline{background:#ff6b6b;}
    @keyframes statusPulse{
      0%{box-shadow:0 0 0 0 rgba(77,240,201,.55);}
      70%{box-shadow:0 0 0 8px rgba(77,240,201,0);}
      100%{box-shadow:0 0 0 0 rgba(77,240,201,0);}
    }
    @media (max-width:560px){
      #siteStatusBadge{left:10px;bottom:10px;padding:8px 14px 8px 10px;font-size:11.5px;}
      #siteAnnouncementBanner{font-size:12.5px;padding:9px 40px 9px 12px;}
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
    { href: "telegram/contact.html", text: "تماس", match: [] }
  ];

  // مسیر صفحه‌ی نمونه‌کارها (دکمه‌ی هدر اول به همین‌جا میره، دکمه‌ی ارسال داخل خودشه)
  const PORTFOLIO_SUBMIT_HREF = "portfolio.html";

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
      <a href="chat.html" class="nav-cta-chat">💬 چت با هوش مصنوعی</a>
      <a href="profile/login.html" class="nav-cta-app">ورود / پروفایل</a>
      <a href="${PORTFOLIO_SUBMIT_HREF}" class="nav-cta-app">🎨 نمونه‌کارها</a>
      <a href="Byte_Lab.apk" download class="nav-cta-app">دانلود اپلیکیشن</a>
      <a href="index.html#contact" class="nav-cta">شروع پروژه</a>
    </div>
    <button class="burger" id="burger" aria-label="باز کردن منو">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>
<div class="menu-overlay" id="menuOverlay"></div>
<div class="mobile-menu" id="mobileMenu" role="dialog" aria-label="منوی سایت">
  <div class="mm-head">
    <div class="logo">
      <img src="logo-icon.png" alt="بایت‌لب" class="logo-icon">
      <span>بایت‌لب<span class="tag">BYTE_LAB</span></span>
    </div>
    <button class="mm-close" id="mmClose" aria-label="بستن منو">✕</button>
  </div>
  <div class="mm-links">
  ${linksHTML}
  </div>
  <div class="mm-divider"></div>
  <span class="mm-label">دسترسی سریع</span>
  <div class="mm-actions">
    <a href="chat.html" class="mm-action accent">💬<span>چت با هوش مصنوعی</span></a>
    <a href="${PORTFOLIO_SUBMIT_HREF}" class="mm-action">🎨<span>نمونه‌کارها</span></a>
    <a href="Byte_Lab.apk" download class="mm-action">⬇️<span>دانلود اپلیکیشن</span></a>
    <a href="profile/login.html" class="mm-action">👤<span>ورود / پروفایل</span></a>
  </div>
  <a href="index.html#contact" class="app-download-link">شروع پروژه ←</a>
</div>
  `;

  document.addEventListener("DOMContentLoaded", function () {
    const placeholder = document.getElementById("siteHeaderPlaceholder");
    if (placeholder) {
      placeholder.outerHTML = headerHTML;
    }

    // فعال‌سازی دکمه همبرگری و منوی کشویی (Drawer)
    const burger = document.getElementById('burger');
    const menu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('menuOverlay');
    const closeBtn = document.getElementById('mmClose');

    function openMenu() {
      menu.classList.add('open');
      overlay.classList.add('open');
      burger.classList.add('open');
      document.body.classList.add('menu-open');
    }
    function closeMenu() {
      menu.classList.remove('open');
      overlay.classList.remove('open');
      burger.classList.remove('open');
      document.body.classList.remove('menu-open');
    }
    if (burger && menu && overlay) {
      burger.addEventListener('click', () => {
        menu.classList.contains('open') ? closeMenu() : openMenu();
      });
      overlay.addEventListener('click', closeMenu);
      if (closeBtn) closeBtn.addEventListener('click', closeMenu);
      menu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
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

    // --- بنر اعلانات سایت: از تلگرام روشن/خاموش می‌شه ---
    (function loadBanner() {
      fetch(TELEGRAM_WORKER_URL + "/banner")
        .then((r) => r.json())
        .then((res) => {
          const banner = res && res.banner;
          if (!banner || !banner.enabled || !banner.text) return;
          const dismissKey = "banner_dismissed_" + btoa(unescape(encodeURIComponent(banner.text))).slice(0, 40);
          if (sessionStorage.getItem(dismissKey)) return;

          const el = document.createElement("div");
          el.id = "siteAnnouncementBanner";
          const linkHTML = banner.link ? ` <a href="${banner.link}">بیشتر بدانید ←</a>` : "";
          el.innerHTML = `<span>${banner.text}${linkHTML}</span><button class="banner-close" aria-label="بستن">✕</button>`;
          document.body.prepend(el);

          // هدر رو به اندازه ارتفاع بنر پایین‌تر می‌بریم تا روی هم نیفتن
          const header = document.querySelector("header");
          requestAnimationFrame(() => {
            const h = el.offsetHeight;
            if (header) header.style.top = h + "px";
          });

          el.querySelector(".banner-close").addEventListener("click", () => {
            el.remove();
            if (header) header.style.top = "0";
            sessionStorage.setItem(dismissKey, "1");
          });
        })
        .catch(() => { /* اگه بنر لود نشد، بی‌سروصدا رد شو */ });
    })();

    // --- وضعیت پاسخگویی آنلاین/آفلاین: از تلگرام روشن/خاموش می‌شه ---
    (function loadStatus() {
      fetch(TELEGRAM_WORKER_URL + "/status")
        .then((r) => r.json())
        .then((res) => {
          if (!res || typeof res.online !== "boolean") return;
          const badge = document.createElement("div");
          badge.id = "siteStatusBadge";
          badge.innerHTML = res.online
            ? `<span class="dot online"></span><span>پاسخگو هستیم 🟢</span>`
            : `<span class="dot offline"></span><span>فعلاً خارج از دسترس</span>`;
          document.body.appendChild(badge);
        })
        .catch(() => { /* اگه وضعیت لود نشد، بی‌سروصدا رد شو */ });
    })();
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
