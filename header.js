// header.js
// این فایل هدر و منوی موبایل سایت بایت‌لب رو دقیقا مطابق index.html
// در همه صفحات تزریق می‌کنه. کافیه این فایل رو در همه صفحات لینک بدی.

(function () {
  const headerHTML = `
<header>
  <div class="wrap nav">
    <div class="logo">
      <div class="mark">B</div>
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
