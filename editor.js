/* =========================================================================
   editor.js — بایت‌لب / محیط ویرایش آنلاین قالب‌های نمونه‌کار
   -------------------------------------------------------------------------
   این فایل کاملاً مستقل و سمت کاربر (client-side) اجرا می‌شه.
   کارش اینه که کد واقعیِ یکی از قالب‌های پوشه‌ی portfolio/ رو با fetch
   می‌گیره، داخل یک iframe (با srcdoc) نمایش می‌ده و بعد با دستکاری DOM
   همون iframe، امکان ویرایش زنده‌ی متن‌ها و رنگ‌ها رو فراهم می‌کنه.

   نکته‌ی مهم: هیچ درخواستی به سرور برای «ذخیره» یا «ثبت نهایی» فرستاده
   نمی‌شه. همه‌چیز فقط تو حافظه‌ی مرورگر خود کاربره و با رفرش صفحه از
   بین می‌ره. این یک پیش‌نمایشِ آزمایشیه، نه فرم سفارش.
   ========================================================================= */

(function () {
  'use strict';

  /* ---------------------------------------------------------------------
     ۱) تنظیمات هر قالب: فایل مبدأ، رنگ‌های قابل‌تغییر و فیلدهای متنی.
     هر فیلد متنی یک apply(doc, value) داره که دقیقاً می‌دونه کجای DOM
     قالب رو باید عوض کنه (چون ساختار هر ۴ قالب با هم فرق داره).
     -------------------------------------------------------------------- */
  const TEMPLATES = {
    tashrifat: {
      label: 'تشریفات رویایی',
      sub: 'خدمات مراسم',
      file: 'portfolio/tasharifat-royaee-v2.html',
      colors: [
        { varName: '--gold', label: 'طلایی', default: '#C8A96E' },
        { varName: '--rose', label: 'رز', default: '#B5506B' },
        { varName: '--deep', label: 'پس‌زمینه تیره', default: '#1A0E12' }
      ],
      fields: [
        {
          key: 'brand', label: 'نام برند', type: 'text', maxLength: 40,
          default: 'تشریفات رویایی',
          apply(doc, val) {
            const el = doc.querySelector('.nav-logo');
            if (!el) return;
            const span = el.querySelector('span');
            el.childNodes[0].nodeValue = ' ✦ ' + val + ' ';
            if (span) el.appendChild(span);
          }
        },
        {
          key: 'h1', label: 'عنوان اصلی (هیرو)', type: 'text', maxLength: 80,
          default: 'هر عروسی، یک بار در زندگی اتفاق می‌افتد',
          apply(doc, val) {
            const el = doc.querySelector('.hero h1');
            if (el) el.textContent = val;
          }
        },
        {
          key: 'sub', label: 'توضیح زیر عنوان', type: 'textarea', maxLength: 160,
          default: 'ما این «یک بار» را به خاص‌ترین شکل ممکن رقم می‌زنیم.',
          apply(doc, val) {
            const el = doc.querySelector('.hero .hero-sub');
            if (el) el.textContent = val;
          }
        }
      ]
    },

    gold: {
      label: 'زرّین گالری',
      sub: 'طلا و جواهر',
      file: 'portfolio/zarrin-gallery-gold-shop.html',
      colors: [
        { varName: '--gold', label: 'طلایی اصلی', default: '#C9A84C' },
        { varName: '--gold-light', label: 'طلایی روشن', default: '#D9BC68' },
        { varName: '--bg', label: 'پس‌زمینه', default: '#0F1115' }
      ],
      fields: [
        {
          key: 'brand', label: 'نام برند', type: 'text', maxLength: 30,
          default: 'زرّین گالری',
          apply(doc, val) {
            const el = doc.querySelector('.brand-name');
            if (el) el.textContent = val;
          }
        },
        {
          key: 'h1', label: 'عنوان اصلی (هیرو)', type: 'text', maxLength: 80,
          default: 'طلایی که با قیمت روز خریداری می‌کنید',
          apply(doc, val) {
            const el = doc.querySelector('.hero h1');
            if (el) el.textContent = val;
          }
        },
        {
          key: 'sub', label: 'توضیح زیر عنوان', type: 'textarea', maxLength: 160,
          default: 'هر قطعه با وزن دقیق، اجرت ساخت شفاف و گواهی اصالت.',
          apply(doc, val) {
            const el = doc.querySelector('.hero .lead');
            if (el) el.textContent = val;
          }
        }
      ]
    },

    car: {
      label: 'گالری پرستیژ',
      sub: 'نمایشگاه خودرو',
      file: 'portfolio/galeriy-mashin.html',
      colors: [
        { varName: '--red', label: 'قرمز', default: '#D42B2B' },
        { varName: '--amber', label: 'کهربایی', default: '#E8A020' },
        { varName: '--carbon', label: 'پس‌زمینه', default: '#0A0A0C' }
      ],
      fields: [
        {
          key: 'brand', label: 'نام برند', type: 'text', maxLength: 30,
          default: 'PRESTIGE AUTO',
          apply(doc, val) {
            const el = doc.querySelector('.nav-logo');
            if (!el) return;
            const small = el.querySelector('small');
            el.textContent = val + ' ';
            if (small) el.appendChild(small);
          }
        },
        {
          key: 'h1', label: 'عنوان اصلی (هیرو)', type: 'text', maxLength: 60,
          default: 'قدرت بی‌حد',
          apply(doc, val) {
            const el = doc.querySelector('.hero h1');
            if (el) el.textContent = val;
          }
        },
        {
          key: 'sub', label: 'توضیح زیر عنوان', type: 'textarea', maxLength: 160,
          default: 'نمایشگاه آنلاین خودروهای لوکس و کلاسیک.',
          apply(doc, val) {
            const el = doc.querySelector('.hero .hero-sub');
            if (el) el.textContent = val;
          }
        }
      ]
    },

    cafe: {
      label: 'کافه اِمبر',
      sub: 'کافه و رستوران',
      file: 'portfolio/cafe-restoran-amber.html',
      colors: [
        { varName: '--ember', label: 'کهربایی', default: '#f0a94e' },
        { varName: '--ember-2', label: 'نارنجی-قرمز', default: '#ff6b4a' },
        { varName: '--cyan', label: 'فیروزه‌ای', default: '#2fd8e8' }
      ],
      fields: [
        {
          key: 'brand', label: 'نام برند', type: 'text', maxLength: 30,
          default: 'کافه اِمبر',
          apply(doc, val) {
            const el = doc.querySelector('.brand-name');
            if (el) el.textContent = val;
          }
        },
        {
          key: 'h1', label: 'عنوان اصلی (هیرو)', type: 'text', maxLength: 60,
          default: 'طعمی که می‌درخشد در دل شب.',
          apply(doc, val) {
            const el = doc.querySelector('.hero h1');
            if (el) el.textContent = val;
          }
        },
        {
          key: 'sub', label: 'توضیح زیر عنوان', type: 'textarea', maxLength: 200,
          default: 'یک نمونه‌کار از منوی دیجیتال کافه و رستوران.',
          apply(doc, val) {
            const el = doc.querySelector('.hero p');
            if (el) el.textContent = val;
          }
        }
      ]
    }
  };

  const DEVICES = {
    desktop: { w: 1280, h: 800 },
    mobile: { w: 390, h: 780 }
  };

  /* ---------------------------------------------------------------------
     ۲) وضعیت اجرا
     -------------------------------------------------------------------- */
  const state = {
    key: null,
    tpl: null,
    device: 'desktop',
    rawHTML: '',
    values: {} // مقدار فعلی هر فیلد متنی + رنگ‌ها، فقط تو حافظه
  };

  const qs = new URLSearchParams(location.search);

  /* عناصر DOM صفحه‌ی ویرایشگر */
  const els = {
    tabs: document.getElementById('edTabs'),
    frame: document.getElementById('edFrame'),
    frameWrap: document.getElementById('edFrameWrap'),
    deviceWrap: document.getElementById('edDevice'),
    fieldsWrap: document.getElementById('edFields'),
    colorsWrap: document.getElementById('edColors'),
    resetBtn: document.getElementById('edReset'),
    downloadBtn: document.getElementById('edDownload'),
    currentLabel: document.getElementById('edCurrentLabel'),
    loading: document.getElementById('edLoading')
  };

  function setLoading(on) {
    if (els.loading) els.loading.style.display = on ? 'flex' : 'none';
  }

  /* ---------------------------------------------------------------------
     ۳) لود قالب انتخابی و ساخت فرم‌های ویرایش
     -------------------------------------------------------------------- */
  async function loadTemplate(key) {
    const tpl = TEMPLATES[key];
    if (!tpl) return;
    state.key = key;
    state.tpl = tpl;
    state.values = {};
    tpl.fields.forEach(f => { state.values[f.key] = f.default; });
    tpl.colors.forEach(c => { state.values['color:' + c.varName] = c.default; });

    if (els.tabs) {
      els.tabs.querySelectorAll('.ed-tab').forEach(b => b.classList.toggle('active', b.dataset.key === key));
    }
    if (els.currentLabel) els.currentLabel.textContent = tpl.label + ' — ' + tpl.sub;

    // آدرس رو بدون رفرش آپدیت می‌کنیم تا لینک قابل اشتراک‌گذاری بمونه
    const url = new URL(location.href);
    url.searchParams.set('t', key);
    history.replaceState(null, '', url);

    setLoading(true);
    try {
      const res = await fetch(tpl.file, { cache: 'no-store' });
      state.rawHTML = await res.text();
    } catch (err) {
      setLoading(false);
      if (els.frameWrap) {
        els.frameWrap.innerHTML = '<div class="ed-error">قالب لود نشد. اگه این صفحه رو به‌صورت فایل محلی باز کردی، باید از یه سرور (مثل همون هاست سایت) اجرا بشه تا fetch کار کنه.</div>';
      }
      return;
    }

    buildFieldForm();
    buildColorForm();
    renderFrame();
  }

  function buildFieldForm() {
    if (!els.fieldsWrap) return;
    els.fieldsWrap.innerHTML = '';
    state.tpl.fields.forEach(f => {
      const row = document.createElement('label');
      row.className = 'ed-field';
      const cap = document.createElement('span');
      cap.className = 'ed-field-label';
      cap.textContent = f.label;
      row.appendChild(cap);

      const input = document.createElement(f.type === 'textarea' ? 'textarea' : 'input');
      if (f.type !== 'textarea') input.type = 'text';
      if (f.maxLength) input.maxLength = f.maxLength;
      input.value = state.values[f.key];
      input.addEventListener('input', () => {
        state.values[f.key] = input.value;
        applyField(f, input.value);
      });
      row.appendChild(input);
      els.fieldsWrap.appendChild(row);
    });
  }

  function buildColorForm() {
    if (!els.colorsWrap) return;
    els.colorsWrap.innerHTML = '';
    state.tpl.colors.forEach(c => {
      const row = document.createElement('label');
      row.className = 'ed-color';
      const cap = document.createElement('span');
      cap.textContent = c.label;
      row.appendChild(cap);
      const input = document.createElement('input');
      input.type = 'color';
      input.value = state.values['color:' + c.varName];
      input.addEventListener('input', () => {
        state.values['color:' + c.varName] = input.value;
        applyColor(c.varName, input.value);
      });
      row.appendChild(input);
      els.colorsWrap.appendChild(row);
    });
  }

  /* ---------------------------------------------------------------------
     ۴) رندر iframe (srcdoc) و اعمال مقادیر فعلی بعد از لود
     -------------------------------------------------------------------- */
  function renderFrame() {
    if (!els.frame) return;
    setLoading(true);
    els.frame.srcdoc = state.rawHTML;
    els.frame.onload = () => {
      applyAllValues();
      applyDeviceSize();
      setLoading(false);
    };
  }

  function frameDoc() {
    return els.frame && els.frame.contentDocument;
  }

  function applyField(field, value) {
    const doc = frameDoc();
    if (!doc) return;
    try { field.apply(doc, value); } catch (e) { /* اگه ساختار قالب فرق داشت، بی‌سروصدا رد می‌شیم */ }
  }

  function applyColor(varName, value) {
    const doc = frameDoc();
    if (!doc || !doc.documentElement) return;
    doc.documentElement.style.setProperty(varName, value);
  }

  function applyAllValues() {
    if (!state.tpl) return;
    state.tpl.fields.forEach(f => applyField(f, state.values[f.key]));
    state.tpl.colors.forEach(c => applyColor(c.varName, state.values['color:' + c.varName]));
  }

  function applyDeviceSize() {
    const d = DEVICES[state.device];
    if (!els.frame || !els.frameWrap) return;
    els.frame.style.width = d.w + 'px';
    els.frame.style.height = d.h + 'px';
    const scale = els.frameWrap.clientWidth / d.w;
    els.frame.style.transform = 'scale(' + scale + ')';
    els.frameWrap.classList.toggle('is-mobile', state.device === 'mobile');
  }

  /* ---------------------------------------------------------------------
     ۵) دکمه‌های بازنشانی و دانلود (فقط محلی — هیچ ارسالی به سرور نیست)
     -------------------------------------------------------------------- */
  function resetAll() {
    if (!state.tpl) return;
    loadTemplate(state.key);
  }

  function downloadCurrent() {
    const doc = frameDoc();
    if (!doc) return;
    const html = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bytelab-preview-' + state.key + '.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /* ---------------------------------------------------------------------
     ۶) اتصال رویدادها
     -------------------------------------------------------------------- */
  function bindEvents() {
    if (els.tabs) {
      els.tabs.querySelectorAll('.ed-tab').forEach(btn => {
        btn.addEventListener('click', () => loadTemplate(btn.dataset.key));
      });
    }
    if (els.deviceWrap) {
      els.deviceWrap.querySelectorAll('.ed-dev-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.device = btn.dataset.device;
          els.deviceWrap.querySelectorAll('.ed-dev-btn').forEach(b => b.classList.toggle('active', b === btn));
          applyDeviceSize();
        });
      });
    }
    if (els.resetBtn) els.resetBtn.addEventListener('click', resetAll);
    if (els.downloadBtn) els.downloadBtn.addEventListener('click', downloadCurrent);
    window.addEventListener('resize', applyDeviceSize);
  }

  /* ---------------------------------------------------------------------
     ۷) شروع
     -------------------------------------------------------------------- */
  function init() {
    bindEvents();
    const requested = qs.get('t');
    const startKey = TEMPLATES[requested] ? requested : 'tashrifat';
    loadTemplate(startKey);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
