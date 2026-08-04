// header.js
// این فایل هدر و منوی موبایل سایت بایت‌لب رو دقیقا مطابق index.html
// در همه صفحات تزریق می‌کنه. کافیه این فایل رو در همه صفحات لینک بدی.
(function () {
  // --- جلوگیری از «دارک‌مود اجباری» کروم اندروید که باعث هم‌رنگ شدن متن با پس‌زمینه می‌شد ---
if (!document.querySelector('meta[name="color-scheme"]')) {
  const colorScheme = document.createElement("meta");
  colorScheme.name = "color-scheme";
  colorScheme.content = "dark";
  document.head.appendChild(colorScheme);
}
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
    .burger{display:flex;flex-direction:column;justify-content:center;gap:5px;cursor:pointer;background:none;border:none;padding:8px;width:38px;height:38px;position:relative;z-index:61;}
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
    nav.links{display:none;}
    .nav-right{display:flex;align-items:center;gap:14px;}
    @media (max-width:640px){
      header .nav{padding:0 14px;}
      .header-actions{display:none;}
      .logo .tag{display:none;}
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

    /* --- دسترسی سریع شناور (Meniscus Dock): بشقاب SVG با یه بریدگی پارامتریک که مهره‌ی نورانی توش می‌شینه --- */
    .mn-dock{
      position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:56;
      width:min(430px,95vw);height:58px;
    }
    .mn-dock .dock__skin{position:absolute;inset:0;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 12px 30px rgba(0,0,0,.5));}
    .mn-dock .dock__bead{
      position:absolute;top:0;left:0;width:38px;height:38px;margin:-19px 0 0 -19px;
      border-radius:50%;pointer-events:auto;z-index:3;cursor:grab;touch-action:none;
      background:radial-gradient(circle at 32% 28%, #fff, #4df0c9 55%, #0f1620 100%);
      box-shadow:0 0 20px 2px rgba(77,240,201,.55), 0 0 0 4px rgba(77,240,201,.14);
      background:radial-gradient(circle at 32% 28%, #fff, var(--acc,#4df0c9) 55%, color-mix(in srgb, var(--acc,#4df0c9) 60%, #000) 100%);
      box-shadow:0 0 20px 2px color-mix(in srgb, var(--acc,#4df0c9) 70%, transparent), 0 0 0 4px color-mix(in srgb, var(--acc,#4df0c9) 14%, transparent);
      transition:box-shadow .25s ease;
    }
    .mn-dock .dock__bead:active{cursor:grabbing;}
    .mn-dock .dock__tabs{position:relative;z-index:2;display:flex;width:100%;height:100%;}
    .mn-dock .tab{
      flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;
      background:none;border:none;color:#7c8b9c;text-decoration:none;cursor:pointer;padding:0 1px;
      transition:color .25s ease, transform .15s ease;
    }
    .mn-dock .tab:active{transform:scale(.9);}
    .mn-dock .tab .tab__icon{font-size:16px;line-height:1;transition:transform .3s cubic-bezier(.34,1.56,.4,1);}
    .mn-dock .tab .tab__label{
      font-size:8px;font-weight:700;max-height:0;opacity:0;overflow:hidden;
      white-space:nowrap;max-width:100%;text-overflow:ellipsis;
      transition:max-height .25s ease, opacity .2s ease;
    }
    .mn-dock .tab.is-active{color:var(--acc,#4df0c9);}
    .mn-dock .tab.is-active .tab__icon{transform:translateY(-14px) scale(1.05);}
    .mn-dock .tab.is-active .tab__label{max-height:12px;opacity:1;}
    body{padding-bottom:0;}
    body.has-mn-dock{padding-bottom:88px;}
    @media (max-width:360px){
      .mn-dock{height:54px;}
      .mn-dock .dock__bead{width:34px;height:34px;margin:-17px 0 0 -17px;}
      .mn-dock .tab .tab__icon{font-size:14px;}
      .mn-dock .tab.is-active .tab__icon{transform:translateY(-12px) scale(1.05);}
    }
    @media (min-width:641px){
      .mn-dock{display:none;}
      body.has-mn-dock{padding-bottom:0;}
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

  // --- دسترسی سریع شناور: توی صفحه چت (که خودش صفحه هوش مصنوعیه) نمایش داده نمی‌شه ---
  const SHOW_QUICK_DOCK = current !== "chat.html";
  const isPortfolioPage = current === "portfolio.html" || location.pathname.indexOf("/portfolio/") !== -1;

  // --- صفحات مهم سایت + دسترسی‌های سریع، همه با هم توی همین یه نوار ---
  const DOCK_TABS = [
    { id: "home", href: "index.html", icon: "🏠", label: "خانه", acc: "#4df0c9", match: ["index.html", ""] },
    { id: "site", href: "tarahi-site.html", icon: "🌐", label: "سایت", acc: "#4df0c9", match: ["tarahi-site.html"] },
    { id: "app", href: "tarahi-app.html", icon: "📱", label: "اپلیکیشن", acc: "#9c7bff", match: ["tarahi-app.html"] },
    { id: "computer", href: "khadamat-computer.html", icon: "🖥️", label: "کامپیوتر", acc: "#f2c14e", match: ["khadamat-computer.html"] },
    { id: "chat", href: "chat.html", icon: "💬", label: "هوش مصنوعی", acc: "#4df0c9", match: ["chat.html"] },
    { id: "portfolio", href: PORTFOLIO_SUBMIT_HREF, icon: "🎨", label: "نمونه‌کار", acc: "#9c7bff", match: [], forceActive: isPortfolioPage },
    { id: "bazaar", href: "https://cafebazaar.ir/app/com.bytelab.app", icon: "⬇️", label: "دانلود", acc: "#f2c14e", external: true, match: [] }
  ].map(t => ({ ...t, active: t.forceActive || isActive(t.match) }));
  const dockDefaultTab = DOCK_TABS.find(t => t.active) || DOCK_TABS[0];

  const quickDockHTML = SHOW_QUICK_DOCK ? `
<div class="mn-dock" id="mnDock" style="--acc:${dockDefaultTab.acc}">
  <svg class="dock__skin" id="dockSkin" preserveAspectRatio="none">
    <defs>
      <linearGradient id="mnPlate" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#141d2b"/>
        <stop offset="1" stop-color="#0f1620"/>
      </linearGradient>
      <linearGradient id="mnRim" x1="0" y1="0" x2="1" y2="0">
        <stop id="mnRimStop1" offset="0" stop-color="${dockDefaultTab.acc}" stop-opacity=".9"/>
        <stop id="mnRimStop2" offset="1" stop-color="${dockDefaultTab.acc}" stop-opacity=".25"/>
      </linearGradient>
    </defs>
    <path id="skinFill" fill="url(#mnPlate)" stroke="url(#mnRim)" stroke-width="1.5"></path>
  </svg>
  <span class="dock__bead" id="dockBead"></span>
  <div class="dock__tabs" role="tablist" id="dockTabs">
    ${DOCK_TABS.map(t => `
    <a href="${t.href}"${t.external ? ' target="_blank" rel="noopener"' : ""} class="tab${t.active ? " is-active" : ""}" role="tab" data-acc="${t.acc}">
      <span class="tab__icon">${t.icon}</span><span class="tab__label">${t.label}</span>
    </a>`).join("")}
  </div>
</div>` : "";

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
    <div class="nav-right">
      <div class="header-actions">
        <a href="chat.html" class="nav-cta-chat"><span class="ico">💬</span><span class="lbl">چت با هوش مصنوعی</span></a>
        <a href="${PORTFOLIO_SUBMIT_HREF}" class="nav-cta-app"><span class="ico">🎨</span><span class="lbl">نمونه‌کارها</span></a>
        <a href="https://cafebazaar.ir/app/com.bytelab.app" target="_blank" rel="noopener" class="nav-cta-app"><span class="ico">⬇️</span><span class="lbl">دانلود از کافه‌بازار</span></a>
      </div>
      <button class="burger" id="burger" aria-label="باز کردن منو">
        <span></span><span></span><span></span>
      </button>
    </div>
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
    <a href="https://cafebazaar.ir/app/com.bytelab.app" target="_blank" rel="noopener" class="mm-action">⬇️<span>دانلود از کافه‌بازار</span></a>
  </div>
</div>
${quickDockHTML}
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

    // --- دسترسی سریع شناور (Meniscus Dock): مسیر SVG بریدگی رو پشت مهره‌ی فعال می‌سازه ---
    // بریدگی، یه کمان مماس بر دایره‌ی مهره‌ست: reach = sqrt(R² − (R−D)²)
    // شبیه یه قطره که با سطح بشقاب یکی شده (منیسکوس)
    function buildDockPath(bx, w, h, R, D) {
      const CR = h / 2;
      const reach = Math.sqrt(Math.max(1, R * R - Math.pow(R - D, 2)));
      let nx1 = Math.max(CR + 6, bx - reach);
      let nx2 = Math.min(w - CR - 6, bx + reach);
      if (nx2 - nx1 < 10) { const m = (nx1 + nx2) / 2; nx1 = m - 5; nx2 = m + 5; }
      const hL = (bx - nx1) * 0.55, hR = (nx2 - bx) * 0.55;
      return `M ${CR} 0 L ${nx1} 0 C ${nx1 + hL} 0 ${bx - hL * 0.4} ${D} ${bx} ${D} `
        + `C ${bx + hR * 0.4} ${D} ${nx2 - hR} 0 ${nx2} 0 L ${w - CR} 0 `
        + `A ${CR} ${CR} 0 0 1 ${w - CR} ${h} L ${CR} ${h} A ${CR} ${CR} 0 0 1 ${CR} 0 Z`;
    }

    const mnDock = document.getElementById('mnDock');
    if (mnDock) {
      document.body.classList.add('has-mn-dock');
      const skin = document.getElementById('dockSkin');
      const skinFill = document.getElementById('skinFill');
      const bead = document.getElementById('dockBead');
      const tabsWrap = document.getElementById('dockTabs');
      const tabs = Array.from(tabsWrap.querySelectorAll('.tab'));
      const rimStop1 = document.getElementById('mnRimStop1');
      const rimStop2 = document.getElementById('mnRimStop2');

      let R = 20, D = 12; // شعاع/عمق بریدگی؛ از روی اندازه‌ی واقعی مهره (که با رسپانسیو عوض می‌شه) دوباره محاسبه می‌شه
      let W = 0, H = 0, centers = [];
      let bx = 0, dragging = false, dragMoved = false, startX = 0;

      function measure() {
        const rect = mnDock.getBoundingClientRect();
        W = rect.width; H = rect.height;
        const beadRect = bead.getBoundingClientRect();
        R = beadRect.width / 2;
        D = R * 0.6;
        skin.setAttribute('viewBox', `0 0 ${W} ${H}`);
        skin.setAttribute('width', W);
        skin.setAttribute('height', H);
        centers = tabs.map(t => {
          const r = t.getBoundingClientRect();
          return (r.left - rect.left) + r.width / 2;
        });
      }

      function paint(x) {
        skinFill.setAttribute('d', buildDockPath(x, W, H, R, D));
        bead.style.transform = `translate(${x}px, ${D}px)`;
      }

      function setAccent(hex) {
        mnDock.style.setProperty('--acc', hex);
        if (rimStop1) rimStop1.setAttribute('stop-color', hex);
        if (rimStop2) rimStop2.setAttribute('stop-color', hex);
      }

      function nearestIndex(x) {
        let bi = 0, bd = Infinity;
        centers.forEach((c, i) => { const d = Math.abs(c - x); if (d < bd) { bd = d; bi = i; } });
        return bi;
      }

      function setActiveTab(i, animate) {
        tabs.forEach((t, idx) => t.classList.toggle('is-active', idx === i));
        setAccent(tabs[i].dataset.acc);
        bead.style.transition = animate ? 'transform .38s cubic-bezier(.34,1.4,.4,1)' : 'none';
        paint(centers[i]);
        bx = centers[i];
        if (animate) setTimeout(() => { bead.style.transition = ''; }, 400);
      }

      measure();
      const initialActive = tabs.findIndex(t => t.classList.contains('is-active'));
      setActiveTab(initialActive >= 0 ? initialActive : 0, false);

      window.addEventListener('resize', () => {
        measure();
        const ai = tabs.findIndex(t => t.classList.contains('is-active'));
        setActiveTab(ai >= 0 ? ai : 0, false);
      });

      // --- درگ مهره روی نوار: بریدگی و مهره زنده دنبال انگشت می‌رن ---
      bead.addEventListener('pointerdown', (e) => {
        dragging = true; dragMoved = false; startX = e.clientX;
        bead.setPointerCapture(e.pointerId);
        bead.style.transition = 'none';
      });
      bead.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        if (Math.abs(e.clientX - startX) > 4) dragMoved = true;
        const rect = mnDock.getBoundingClientRect();
        const x = Math.max(28, Math.min(W - 28, e.clientX - rect.left));
        paint(x);
        bx = x;
      });
      function endDrag() {
        if (!dragging) return;
        dragging = false;
        const i = nearestIndex(bx);
        setActiveTab(i, true);
        if (dragMoved) {
          const tab = tabs[i];
          setTimeout(() => {
            if (tab.target === '_blank') window.open(tab.href, '_blank', 'noopener');
            else window.location.href = tab.href;
          }, 260);
        }
      }
      bead.addEventListener('pointerup', endDrag);
      bead.addEventListener('pointercancel', endDrag);

      // --- تپ روی هر تب ---
      tabs.forEach((t, i) => {
        t.addEventListener('click', (e) => {
          if (dragMoved) { e.preventDefault(); dragMoved = false; return; }
          setActiveTab(i, true);
        });
      });
    }

    // --- اطلاع‌رسانی دانلود اپلیکیشن به تلگرام (بدون کند کردن دانلود کاربر) ---
    const TELEGRAM_WORKER_URL = "https://bytelab-telegram.bytelab.workers.dev/";

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
    document.querySelectorAll('a[href="https://cafebazaar.ir/app/com.bytelab.app"]').forEach(a => {
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
