/* ==========================================================
   Anton Web – správanie stránky
   ========================================================== */

// Kam chodia správy z formulárov (služba FormSubmit.co – zadarmo, bez registrácie)
const FORM_ENDPOINT = 'https://formsubmit.co/ajax/svatikanton348@gmail.com';

// Schválené recenzie. Keď ti príde recenzia e-mailom a chceš ju zverejniť,
// pridaj ju sem, napríklad:
// { meno: 'Jana Nováková', firma: 'Kaderníctvo Jana', hodnotenie: 5, text: 'Super spolupráca!', datum: '12. 1. 2027' },
const RECENZIE = [
];

const ACCENT = '#C6F432';
const STAR_PATH = 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z';

function starSvg(size, filled) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', filled ? ACCENT : '#3A3E39');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', STAR_PATH);
  svg.appendChild(path);
  return svg;
}

function hviezdicky(n) {
  return n === 1 ? '1 hviezdička' : n < 5 ? n + ' hviezdičky' : n + ' hviezdičiek';
}

/* ---------- 1. Zvýraznenie sekcie v menu ---------- */
(function activeNav() {
  const links = document.querySelectorAll('.nav a');
  if (!links.length || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main section[id]').forEach((s) => observer.observe(s));
})();

/* ---------- 2. Odoslanie formulára cez FormSubmit ---------- */
async function sendForm(form, data, messages) {
  const status = form.querySelector('.form-status');
  const button = form.querySelector('button[type="submit"]');
  const honey = form.querySelector('[name="_honey"]');

  status.className = 'form-status';
  status.textContent = 'Odosielam…';
  button.disabled = true;

  const payload = { ...data, _template: 'table', _honey: honey ? honey.value : '' };

  // Keď služba neodpovie do 12 sekúnd, prestaneme čakať a použijeme záložné odoslanie
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timer);
    const json = await res.json().catch(() => ({}));
    const ok = res.ok && String(json.success) === 'true';

    if (ok) {
      status.className = 'form-status ok';
      status.textContent = messages.ok;
      form.reset();
      return true;
    }
    if (json.message && /activat/i.test(json.message)) {
      // Pri úplne prvom odoslaní treba formulár aktivovať odkazom v e-maile
      status.className = 'form-status err';
      status.textContent = 'Formulár ešte nie je aktivovaný. Majiteľ webu dostal e-mail s aktivačným odkazom.';
      return false;
    }
    throw new Error(json.message || 'Chyba ' + res.status);
  } catch (err) {
    clearTimeout(timer);
    // Záložný spôsob: klasické odoslanie formulára (stránka sa na chvíľu presmeruje na FormSubmit a vráti sa späť)
    status.className = 'form-status';
    status.textContent = 'Odosielam inou cestou…';
    classicSubmit(payload);
    return false;
  } finally {
    button.disabled = false;
  }
}

function classicSubmit(payload) {
  const f = document.createElement('form');
  f.method = 'POST';
  f.action = FORM_ENDPOINT.replace('/ajax/', '/');
  const back = location.href.split('#')[0].split('?')[0];
  const fields = { ...payload, _next: back + '?odoslane=1#kontakt', _captcha: 'false' };
  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    f.appendChild(input);
  });
  document.body.appendChild(f);
  f.submit();
}

// Po návrate zo záložného odoslania ukážeme poďakovanie
(function afterClassicSubmit() {
  if (!/[?&]odoslane=1/.test(location.search)) return;
  const status = document.querySelector('#contact-form .form-status');
  if (status) {
    status.className = 'form-status ok';
    status.textContent = 'Ďakujem! Správa bola odoslaná, ozvem sa do 24 hodín.';
  }
  history.replaceState(null, '', location.pathname + '#kontakt');
})();

function showError(form, text) {
  const status = form.querySelector('.form-status');
  status.className = 'form-status err';
  status.textContent = text;
}

// Kontaktný formulár
(function contactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const meno = form.meno.value.trim();
    const email = form.email.value.trim();
    const sprava = form.sprava.value.trim();
    if (!meno || !email || !sprava) return showError(form, 'Vyplňte prosím meno, e-mail aj správu.');
    if (!form.email.checkValidity()) return showError(form, 'Skontrolujte prosím e-mailovú adresu.');
    sendForm(form, {
      _subject: 'Nový dopyt z webu – ' + meno,
      Meno: meno,
      email: email,
      Správa: sprava
    }, { ok: 'Ďakujem! Správa bola odoslaná, ozvem sa do 24 hodín.' });
  });
})();

/* ---------- 3. Recenzie ---------- */
(function reviews() {
  const grid = document.getElementById('reviews-grid');
  const empty = document.getElementById('reviews-empty');
  if (grid) {
    RECENZIE.forEach((r) => {
      const fig = document.createElement('figure');
      fig.className = 'review';

      const top = document.createElement('div');
      top.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:12px';
      const stars = document.createElement('div');
      stars.className = 'stars';
      stars.setAttribute('role', 'img');
      stars.setAttribute('aria-label', hviezdicky(r.hodnotenie) + ' z 5');
      for (let i = 1; i <= 5; i++) stars.appendChild(starSvg(18, i <= r.hodnotenie));
      const date = document.createElement('span');
      date.style.cssText = 'font-size:12px;color:#8E938A';
      date.textContent = r.datum || '';
      top.append(stars, date);

      const quote = document.createElement('blockquote');
      quote.textContent = r.text;
      const cap = document.createElement('figcaption');
      cap.textContent = r.firma ? r.meno + ' · ' + r.firma : r.meno;

      fig.append(top, quote, cap);
      grid.appendChild(fig);
    });
    if (empty) empty.hidden = RECENZIE.length > 0;
  }

  // Výber hviezdičiek vo formulári
  const picker = document.getElementById('star-picker');
  const form = document.getElementById('review-form');
  if (!picker || !form) return;
  let rating = 5;
  const buttons = picker.querySelectorAll('.star-btn');
  function paint() {
    buttons.forEach((b) => {
      const v = Number(b.dataset.value);
      b.replaceChildren(starSvg(28, v <= rating));
      b.setAttribute('aria-pressed', v === rating ? 'true' : 'false');
    });
  }
  buttons.forEach((b) => b.addEventListener('click', () => { rating = Number(b.dataset.value); paint(); }));
  paint();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const meno = form.meno.value.trim();
    const firma = form.firma.value.trim();
    const text = form.recenzia.value.trim();
    if (!meno || !text) return showError(form, 'Vyplňte prosím meno aj text recenzie.');
    const ok = await sendForm(form, {
      _subject: 'Nová recenzia na webe – ' + meno + ' (' + rating + '/5)',
      Meno: meno,
      Firma: firma || '–',
      Hodnotenie: rating + ' z 5',
      Recenzia: text
    }, { ok: 'Ďakujem! Recenziu zverejním hneď, ako ju skontrolujem.' });
    if (ok) { rating = 5; paint(); }
  });
})();

/* ---------- 4. Cookies ---------- */
(function cookies() {
  const box = document.getElementById('cookie');
  if (!box) return;
  const KEY = 'cookie-consent';
  const options = document.getElementById('cookie-options');
  const analytics = document.getElementById('cookie-analytics');
  const marketing = document.getElementById('cookie-marketing');
  const btnSettings = box.querySelector('[data-cookie="settings"]');
  const btnSave = box.querySelector('[data-cookie="save"]');

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }
  function showSettings(on) {
    options.hidden = !on;
    btnSave.hidden = !on;
    btnSettings.hidden = on;
  }
  function open(withSettings) {
    const c = load();
    analytics.checked = !!(c && c.analytics);
    marketing.checked = !!(c && c.marketing);
    showSettings(withSettings);
    box.hidden = false;
  }
  function save(a, m) {
    const value = { analytics: a, marketing: m, date: new Date().toISOString() };
    try { localStorage.setItem(KEY, JSON.stringify(value)); } catch (e) {}
    box.hidden = true;
    applyConsent(value);
  }

  // Sem neskôr pridáš Google Analytics / Facebook Pixel – spustia sa až po súhlase.
  function applyConsent(c) {
    if (c.analytics) { /* napr. načítanie Google Analytics */ }
    if (c.marketing) { /* napr. načítanie Meta Pixel */ }
  }

  box.querySelector('[data-cookie="accept"]').addEventListener('click', () => save(true, true));
  box.querySelector('[data-cookie="reject"]').addEventListener('click', () => save(false, false));
  btnSettings.addEventListener('click', () => showSettings(true));
  btnSave.addEventListener('click', () => save(analytics.checked, marketing.checked));
  document.querySelectorAll('[data-cookie-open]').forEach((b) => b.addEventListener('click', () => open(true)));

  const saved = load();
  if (saved) applyConsent(saved);
  else open(false);
})();
