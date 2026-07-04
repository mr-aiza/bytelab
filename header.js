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
    nav.links a:hover{color:#4df0c9;}
    .nav-cta{
      display:inline-flex;align-items:center;gap:8px;
      background:#4df0c9;color:#06120f;font-weight:700;font-size:14px;
      padding:11px 22px;border-radius:999px;text-decoration:none;
      box-shadow:0 0 24px rgba(77,240,201,.35);
      transition:transform .2s ease, box-shadow .2s ease;
    }
    .nav-cta:hover{transform:translateY(-1px);box-shadow:0 0 32px rgba(77,240,201,.55);}
    .burger{display:none;flex-direction:column;gap:5px;cursor:pointer;background:none;border:none;padding:8px;}
    .burger span{width:22px;height:2px;background:#eaf0f4;border-radius:2px;}
    .mobile-menu{
      display:none;position:fixed;top:72px;left:0;right:0;background:#0f1620;
      border-bottom:1px solid #1e2a38;padding:20px 24px;flex-direction:column;gap:18px;z-index:49;
    }
    .mobile-menu.open{display:flex;}
    .mobile-menu a{color:#eaf0f4;font-size:16px;text-decoration:none;}
    @media (max-width:860px){
      nav.links, .nav-cta{display:none;}
      .burger{display:flex;}
    }
  `;
  const styleTag = document.createElement("style");
  styleTag.textContent = headerCSS;
  document.head.appendChild(styleTag);

  const headerHTML = `
<header>
  <div class="wrap nav">
    <div class="logo">
      <img src="logo-icon.png" alt="بایت‌لب" class="logo-icon">
      <span>بایت‌لب<span class="tag">BYTE_LAB</span></span>
    </div>
    <nav class="links">
  <a href="index.html">خانه</a>    
  <a href="tarahi-site.html">طراحی سایت</a>
  <a href="tarahi-app.html">طراحی اپلیکیشن</a>
  <a href="khadamat-computer.html">خدمات کامپیوتر</a>
  <a href="blog.html">بلاگ</a>
  <a href="#contact">تماس</a>
  <a href="chat.html">چت با هوش مصنوعی</a>
  <a href="ticket.html">🎫 ثبت تیکت</a>
    </nav>
    <a href="#contact" class="nav-cta">شروع پروژه</a>
    <button class="burger" id="burger" aria-label="منو">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>
<div class="mobile-menu" id="mobileMenu">
  <a href="index.html">خانه</a>    
  <a href="tarahi-site.html">طراحی سایت</a>
  <a href="tarahi-app.html">طراحی اپلیکیشن</a>
  <a href="khadamat-computer.html">خدمات کامپیوتر</a>
  <a href="blog.html">بلاگ</a>
  <a href="#contact">تماس</a>
  <a href="chat.html">چت با هوش مصنوعی</a>
  <a href="ticket.html">🎫 ثبت تیکت</a>
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
  });
})();
