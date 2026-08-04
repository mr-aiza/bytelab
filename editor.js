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
    values: {}, // مقدار فعلی هر فیلد متنی + رنگ‌ها، فقط تو حافظه
    inlineEdit: true // ویرایش مستقیم با کلیک روی متن‌های داخل پیش‌نمایش
  };

  // تگ‌هایی که معمولاً متن مستقیم دارن (برای تصمیم اینکه باکس متن نشون بدیم یا نه)
  const TEXTY_TAGS = 'h1,h2,h3,h4,h5,h6,p,span,a,button,li,small,em,strong,b,label,div';

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
    inlineToggle: document.getElementById('edInlineToggle'),
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
      if (window.BYTELAB_TEMPLATES_HTML && window.BYTELAB_TEMPLATES_HTML[key]) {
        // اولویت با نسخه‌ی جاسازی‌شده (templates-data.js)؛ نیازی به fetch/شبکه نداره
        // و تحت file:// یا webviewهای محدود هم بی‌مشکل کار می‌کنه.
        state.rawHTML = window.BYTELAB_TEMPLATES_HTML[key];
      } else {
        const res = await fetch(tpl.file, { cache: 'no-store' });
        state.rawHTML = await res.text();
      }
    } catch (err) {
      setLoading(false);
      if (els.frameWrap) {
        els.frameWrap.innerHTML = '<div class="ed-error">قالب لود نشد. مطمئن شو فایل templates-data.js هم کنار editor.js لینک شده.</div>';
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
      initInlineEditing(frameDoc());
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
     ۴.۵) ویرایش مستقیم با کلیک: روی هر متنی تو پیش‌نمایش بزنی، یه کادر
     کوچیک همون‌جا باز می‌شه که می‌تونی متن و رنگ همون المنت رو عوض کنی.
     چیزی ذخیره نمی‌شه؛ فقط DOM همون iframe (تو حافظه) تغییر می‌کنه.
     -------------------------------------------------------------------- */
  function rgbToHex(rgb) {
    if (!rgb) return '#000000';
    const m = rgb.match(/\d+(\.\d+)?/g);
    if (!m || m.length < 3) return '#000000';
    const toHex = n => Math.max(0, Math.min(255, parseInt(n, 10))).toString(16).padStart(2, '0');
    return '#' + toHex(m[0]) + toHex(m[1]) + toHex(m[2]);
  }

  // true اگه رنگ پس‌زمینه‌ی محاسبه‌شده، شفاف/بی‌رنگ باشه (نه یه رنگ واقعی)
  function isTransparentColor(rgb) {
    if (!rgb || rgb === 'transparent') return true;
    const m = rgb.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (!m) return true;
    const alpha = m[4] === undefined ? 1 : parseFloat(m[4]);
    return alpha === 0;
  }

  function isEditableCandidate(el) {
    if (!el || !el.matches || !el.matches(INLINE_SELECTOR)) return false;
    if (el.closest('.bl-pop')) return false;
    const hasDirectText = Array.prototype.some.call(el.childNodes, n => n.nodeType === 3 && n.textContent.trim().length > 0);
    return hasDirectText;
  }

  function injectInlineStyles(doc) {
    if (doc.getElementById('bl-editor-style')) return;
    const style = doc.createElement('style');
    style.id = 'bl-editor-style';
    style.textContent = `
      .bl-hl{outline:2px dashed #4df0c9 !important;outline-offset:2px;cursor:pointer !important;}
      .bl-pop{
        position:fixed;z-index:2147483647;background:#0f1620;border:1px solid #1e2a38;
        border-radius:14px;padding:14px;width:260px;box-shadow:0 12px 34px rgba(0,0,0,.5);
        font-family:'Vazirmatn',sans-serif;direction:rtl;color:#eaf0f4;
      }
      .bl-pop textarea{
        width:100%;min-height:64px;background:#141d2b;border:1px solid #1e2a38;border-radius:8px;
        color:#eaf0f4;font-family:inherit;font-size:13px;padding:8px;resize:vertical;box-sizing:border-box;
      }
      .bl-pop .bl-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px;font-size:12.5px;color:#7c8b9c;}
      .bl-pop input[type=color]{width:32px;height:26px;border:1px solid #1e2a38;border-radius:6px;padding:1px;background:none;cursor:pointer;}
      .bl-pop .bl-actions{display:flex;justify-content:space-between;align-items:center;margin-top:12px;}
      .bl-pop button{
        font-family:inherit;font-size:12px;font-weight:700;border-radius:999px;padding:6px 12px;cursor:pointer;border:1px solid #1e2a38;background:none;color:#eaf0f4;
      }
      .bl-pop .bl-close{color:#7c8b9c;border:none;background:none;font-size:16px;line-height:1;padding:2px 6px;}
      .bl-pop .bl-clear{color:#7c8b9c;}
    `;
    doc.head.appendChild(style);
  }

  function closeInlinePopup(doc) {
    const old = doc.querySelector('.bl-pop');
    if (old) old.remove();
    const hl = doc.querySelector('.bl-hl');
    if (hl) hl.classList.remove('bl-hl');
  }

  function openInlinePopup(doc, el) {
    closeInlinePopup(doc);
    el.classList.add('bl-hl');

    const rect = el.getBoundingClientRect();
    const pop = doc.createElement('div');
    pop.className = 'bl-pop';

    const closeBtn = doc.createElement('button');
    closeBtn.className = 'bl-close';
    closeBtn.type = 'button';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => closeInlinePopup(doc));

    const title = doc.createElement('div');
    title.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;font-size:12px;font-weight:700;color:#9c7bff;margin-bottom:8px;';
    title.textContent = 'ویرایش این متن';
    title.appendChild(closeBtn);

    const textarea = doc.createElement('textarea');
    textarea.value = el.textContent.trim();
    textarea.addEventListener('input', () => { el.textContent = textarea.value; });

    const colorRow = doc.createElement('div');
    colorRow.className = 'bl-row';
    const colorLabel = doc.createElement('span');
    colorLabel.textContent = 'رنگ متن';
    const colorInput = doc.createElement('input');
    colorInput.type = 'color';
    colorInput.value = rgbToHex(getComputedStyle(el).color);
    colorInput.addEventListener('input', () => { el.style.color = colorInput.value; });
    colorRow.appendChild(colorLabel);
    colorRow.appendChild(colorInput);

    const bgRow = doc.createElement('div');
    bgRow.className = 'bl-row';
    const bgLabel = doc.createElement('span');
    bgLabel.textContent = 'رنگ پس‌زمینه';
    const bgInput = doc.createElement('input');
    bgInput.type = 'color';
    const bgComputed = getComputedStyle(el).backgroundColor;
    bgInput.value = isTransparentColor(bgComputed) ? '#000000' : rgbToHex(bgComputed);
    bgInput.addEventListener('input', () => { el.style.backgroundColor = bgInput.value; });
    bgRow.appendChild(bgLabel);
    bgRow.appendChild(bgInput);

    const sizeRow = doc.createElement('div');
    sizeRow.className = 'bl-row';
    const sizeLabel = doc.createElement('span');
    const startSize = parseFloat(getComputedStyle(el).fontSize) || 16;
    sizeLabel.textContent = 'اندازه متن';
    const sizeControls = doc.createElement('div');
    sizeControls.style.cssText = 'display:flex;align-items:center;gap:6px;';
    const sizeMinus = doc.createElement('button');
    sizeMinus.type = 'button'; sizeMinus.textContent = '−';
    sizeMinus.style.cssText = 'width:26px;height:26px;padding:0;';
    const sizeVal = doc.createElement('span');
    sizeVal.className = 'mono';
    sizeVal.style.cssText = 'min-width:38px;text-align:center;font-size:11.5px;color:#7c8b9c;';
    const sizePlus = doc.createElement('button');
    sizePlus.type = 'button'; sizePlus.textContent = '+';
    sizePlus.style.cssText = 'width:26px;height:26px;padding:0;';
    let curSize = startSize;
    function renderSize() {
      sizeVal.textContent = Math.round(curSize) + 'px';
      el.style.fontSize = curSize + 'px';
    }
    sizeMinus.addEventListener('click', () => { curSize = Math.max(8, curSize - 2); renderSize(); });
    sizePlus.addEventListener('click', () => { curSize = Math.min(140, curSize + 2); renderSize(); });
    sizeVal.textContent = Math.round(curSize) + 'px';
    sizeControls.appendChild(sizeMinus);
    sizeControls.appendChild(sizeVal);
    sizeControls.appendChild(sizePlus);
    sizeRow.appendChild(sizeLabel);
    sizeRow.appendChild(sizeControls);

    const boldRow = doc.createElement('div');
    boldRow.className = 'bl-row';
    const boldLabel = doc.createElement('span');
    boldLabel.textContent = 'ضخیم (Bold)';
    const boldInput = doc.createElement('input');
    boldInput.type = 'checkbox';
    boldInput.checked = parseInt(getComputedStyle(el).fontWeight, 10) >= 600;
    boldInput.style.cssText = 'width:18px;height:18px;cursor:pointer;';
    boldInput.addEventListener('change', () => { el.style.fontWeight = boldInput.checked ? '700' : '400'; });
    boldRow.appendChild(boldLabel);
    boldRow.appendChild(boldInput);

    const actions = doc.createElement('div');
    actions.className = 'bl-actions';
    const clearBtn = doc.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'bl-clear';
    clearBtn.textContent = 'حذف پس‌زمینه';
    clearBtn.addEventListener('click', () => { el.style.backgroundColor = ''; });
    const doneBtn = doc.createElement('button');
    doneBtn.type = 'button';
    doneBtn.textContent = 'باشه ✓';
    doneBtn.addEventListener('click', () => closeInlinePopup(doc));
    actions.appendChild(clearBtn);
    actions.appendChild(doneBtn);

    pop.appendChild(title);
    pop.appendChild(textarea);
    pop.appendChild(colorRow);
    pop.appendChild(bgRow);
    pop.appendChild(sizeRow);
    pop.appendChild(boldRow);
    pop.appendChild(actions);
    doc.body.appendChild(pop);

    // موقعیت‌دهی: زیر المنت، با جلوگیری از بیرون‌زدن از صفحه
    const popW = 260;
    let left = rect.left;
    let top = rect.bottom + 8;
    const vw = doc.documentElement.clientWidth;
    const vh = doc.documentElement.clientHeight;
    if (left + popW > vw - 8) left = Math.max(8, vw - popW - 8);
    if (top + 300 > vh - 8) top = Math.max(8, rect.top - 308);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';

    textarea.focus();
  }

  function initInlineEditing(doc) {
    if (!doc || !doc.body) return;
    try {
      injectInlineStyles(doc);

      if (doc.body.dataset.blBound) return; // فقط یه‌بار برای هر لود جدید iframe وصل می‌شیم
      doc.body.dataset.blBound = '1';

      doc.addEventListener('mouseover', e => {
        if (!state.inlineEdit) return;
        const el = e.target.closest(INLINE_SELECTOR);
        if (el && isEditableCandidate(el)) el.classList.add('bl-hl');
      });
      doc.addEventListener('mouseout', e => {
        const el = e.target.closest(INLINE_SELECTOR);
        if (el && !doc.querySelector('.bl-pop')) el.classList.remove('bl-hl');
      });

      doc.addEventListener('click', e => {
        if (!state.inlineEdit) return; // اگه حالت ویرایش خاموشه، رفتار عادی قالب (ناوبری داخلی) دست‌نخورده می‌مونه
        if (e.target.closest('.bl-pop')) return; // کلیک داخل خود کادر ویرایش
        e.preventDefault();
        e.stopPropagation();
        const el = e.target.closest(INLINE_SELECTOR);
        if (el && isEditableCandidate(el)) {
          openInlinePopup(doc, el);
        } else {
          closeInlinePopup(doc);
        }
      }, true);
    } catch (err) {
      console.error('[bytelab-editor] initInlineEditing failed:', err);
    }
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
    if (els.inlineToggle) {
      els.inlineToggle.addEventListener('click', () => {
        state.inlineEdit = !state.inlineEdit;
        els.inlineToggle.classList.toggle('active', state.inlineEdit);
        els.inlineToggle.textContent = state.inlineEdit
          ? '✎ ویرایش مستقیم: فعال'
          : '✎ ویرایش مستقیم: غیرفعال';
        const doc = frameDoc();
        if (doc) closeInlinePopup(doc);
      });
    }
    window.addEventListener('resize', applyDeviceSize);
  }

  /* ---------------------------------------------------------------------
     ۷) شروع
     -------------------------------------------------------------------- */
  function init() {
    bindEvents();
    if (els.inlineToggle) els.inlineToggle.classList.toggle('active', state.inlineEdit);
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
