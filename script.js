/* Robotics Mulia - landing page
   Semua isi diambil dari data.json. Kontrak atribut ada di index.html:
   data-text, data-img, data-href, data-icon, data-list + data-tpl, data-table + data-cell,
   data-anim, data-speed, img[data-par] */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const sleep = ms => new Promise(res => setTimeout(res, ms));

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  const motion = hasGsap && !reduce;
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  const pending = []; // promise tiap foto dari JSON (selesai = berhasil ATAU gagal)

  /* ---------- helper data ---------- */
  const get = (o, p) => (p === '.' ? o : String(p).split('.').reduce((a, k) => (a == null ? undefined : a[k]), o));
  const str = v => (v == null || typeof v === 'object' ? '' : String(v).trim());

  /* ---------- foto: gagal dimuat tidak boleh bikin loading nyangkut ---------- */
  function loadImg(img, src) {
    pending.push(new Promise(resolve => {
      const done = ok => {
        img.dataset.ok = ok ? '1' : '0';
        if (ok) { const s = img.closest('.slot'); if (s) s.classList.add('has-img'); }
        resolve();
      };
      img.addEventListener('load', () => done(true), { once: true });
      img.addEventListener('error', () => done(false), { once: true });
      setTimeout(() => done(img.complete && img.naturalWidth > 0), 6500);
      img.src = src;
      if (img.complete && img.naturalWidth > 0) done(true);
    }));
  }

  /* ---------- render dari JSON ---------- */
  function bind(root, ctx) {
    $$('[data-text]', root).forEach(el => {
      const t = str(get(ctx, el.dataset.text));
      if (!t && el.closest('#loader')) return; // teks "Loading" bawaan tetap ada
      el.textContent = t;
      el.hidden = !t;
    });
    $$('[data-href]', root).forEach(el => {
      const h = str(get(ctx, el.dataset.href));
      if (h) el.setAttribute('href', h); else el.removeAttribute('href');
    });
    $$('[data-icon]', root).forEach(el => {
      const n = str(get(ctx, el.dataset.icon));
      const use = $('use', el);
      if (n && use && document.getElementById('i-' + n)) use.setAttribute('href', '#i-' + n);
    });
    $$('img[data-img]', root).forEach(img => {
      const s = str(get(ctx, img.dataset.img));
      if (s) loadImg(img, s);
    });
  }

  function lists(root, ctx) {
    $$('[data-list]', root).forEach(box => {
      const arr = get(ctx, box.dataset.list);
      const tpl = document.getElementById(box.dataset.tpl);
      box.replaceChildren();
      if (!Array.isArray(arr) || !tpl) return;
      arr.forEach(item => {
        const frag = tpl.content.cloneNode(true);
        render(frag, item);
        box.appendChild(frag);
      });
    });
  }

  function render(root, ctx) { bind(root, ctx); lists(root, ctx); }

  function tables(data) {
    $$('[data-table]').forEach(tb => {
      const rows = get(data, tb.dataset.table);
      if (!Array.isArray(rows)) return;
      const trs = $$('tr', tb);
      while (trs.length && trs.length < rows.length) {
        const c = trs[trs.length - 1].cloneNode(true);
        tb.appendChild(c);
        trs.push(c);
      }
      rows.forEach((r, i) => {
        $$('[data-cell]', trs[i]).forEach((td, j) => {
          td.textContent = str(Array.isArray(r) ? r[j] : r && r[td.dataset.cell]);
        });
      });
    });
  }

  /* ---------- hero: foto latar ganti tiap 5 detik ---------- */
  function hero() {
    const wrap = $('#heroSlides'), dotsBox = $('#heroDots'), empty = $('#heroEmpty');
    if (!wrap) return;
    $$('.hero-slide', wrap).forEach(s => {
      const im = $('img', s);
      if (!im || im.dataset.ok !== '1') s.remove(); // foto hilang/rusak: buang, jangan jadi slide kosong
    });
    const slides = $$('.hero-slide', wrap);
    if (empty) empty.hidden = slides.length > 0;
    if (dotsBox) dotsBox.replaceChildren();
    if (!slides.length) return;

    let i = 0, timer = null;
    const go = n => {
      i = n;
      slides.forEach((s, k) => s.classList.toggle('is-active', k === n));
      dots.forEach((d, k) => d.classList.toggle('is-active', k === n));
    };
    const start = () => {
      clearInterval(timer);
      if (slides.length > 1) timer = setInterval(() => go((i + 1) % slides.length), 5000);
    };
    const dots = slides.map((_, n) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hero-dot';
      b.setAttribute('aria-label', 'Foto ' + (n + 1));
      b.addEventListener('click', () => { go(n); start(); });
      if (dotsBox) dotsBox.appendChild(b);
      return b;
    });
    go(0);
    start();
  }

  /* ---------- navbar mobile ---------- */
  function nav() {
    const t = $('#navToggle'), m = $('#navMenu');
    if (!t || !m) return;
    const set = open => { m.classList.toggle('is-open', open); t.setAttribute('aria-expanded', String(open)); };
    t.addEventListener('click', () => set(!m.classList.contains('is-open')));
    m.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
  }

  /* ---------- tiles horizontal (pin + scrub) ---------- */
  function tilesInit(data) {
    const pin = $('#tiles'), track = $('#tilesTrack');
    if (!pin || !track) return;
    const t = data.tiles || {};
    if (!t.judul && !t.sub && !(Array.isArray(t.items) && t.items.length)) { pin.hidden = true; return; }

    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
    if (!motion || dist() < 10) { // fallback: geser manual
      pin.style.height = 'auto';
      pin.style.overflowX = 'auto';
      pin.style.padding = '4rem 0';
      return;
    }
    const tw = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true }
    });
    $$('.tile', track).forEach(tile => {
      const st = { trigger: tile, containerAnimation: tw, start: 'left right', end: 'right left', scrub: true };
      gsap.fromTo(tile, { rotation: -2.5, y: 24 }, { rotation: 2.5, y: -24, ease: 'none', scrollTrigger: st });
      const im = $('img[data-par]', tile);
      if (im) gsap.fromTo(im, { scale: 1.2, xPercent: -5 }, { xPercent: 5, ease: 'none', scrollTrigger: st });
    });
  }

  /* ---------- entrance ---------- */
  const V = { up: { y: 40 }, left: { x: -60 }, right: { x: 60 }, zoom: { scale: 0.9 }, fade: {} };

  function anims() {
    const heroEls = [];
    $$('[data-anim]').forEach(el => {
      if (el.hidden || el.closest('[hidden]')) return;
      const v = V[el.dataset.anim] || V.up;
      if (el.closest('#hero')) { gsap.set(el, { opacity: 0, ...v }); heroEls.push(el); return; }
      const idx = el.parentElement ? Array.from(el.parentElement.children).indexOf(el) : 0;
      gsap.from(el, {
        opacity: 0, ...v, duration: 0.9, ease: 'power3.out',
        delay: (idx % 4) * 0.08 + (parseFloat(el.dataset.delay) || 0),
        clearProps: 'transform,opacity',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true }
      });
    });
    return heroEls;
  }

  function heroIn(els) {
    if (!els.length) return;
    gsap.to(els, { opacity: 1, x: 0, y: 0, scale: 1, duration: 1, ease: 'power3.out', stagger: 0.12, delay: 0.15, clearProps: 'transform,opacity' });
  }

  /* ---------- parallax ---------- */
  function parallax() {
    $$('[data-speed]').forEach(el => {
      const s = parseFloat(el.dataset.speed);
      if (!s || el.closest('[hidden]')) return;
      const inHero = !!el.closest('#hero');
      gsap.fromTo(el, { y: inHero ? 0 : -s }, {
        y: s, ease: 'none',
        scrollTrigger: { trigger: inHero ? '#hero' : el, start: inHero ? 'top top' : 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    $$('img[data-par]').forEach(im => {
      if (im.closest('.tile')) return; // tiles punya parallax horizontal sendiri
      gsap.fromTo(im, { yPercent: -7 }, {
        yPercent: 7, ease: 'none',
        scrollTrigger: { trigger: im.closest('.slot') || im, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    const bg = $('#heroBg');
    if (bg) gsap.to(bg, { yPercent: 9, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  /* ---------- logo interaktif ---------- */
  function logo() {
    const stage = $('#logoStage'), box = $('#logoBox');
    if (!stage || !box || !motion) return; // efek hover CSS tetap jalan tanpa GSAP
    gsap.set(box, { rotation: -6, transformPerspective: 800 });
    const cards = $$('.float-card', stage);
    let raf = 0;

    stage.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = stage.getBoundingClientRect();
        const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
        const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
        gsap.to(box, { rotationY: nx * 18, rotationX: -ny * 18, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
        cards.forEach(c => {
          const d = parseFloat(c.dataset.depth) || 20; // beda kedalaman = beda jarak geser
          gsap.to(c, { x: -nx * d, y: -ny * d, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
        });
      });
    });
    stage.addEventListener('pointerleave', () => {
      gsap.to(box, { rotationX: 0, rotationY: 0, duration: 1.4, ease: 'elastic.out(1, 0.35)', overwrite: 'auto' });
      gsap.to(cards, { x: 0, y: 0, duration: 1.2, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
    });
    box.addEventListener('click', () => {
      gsap.fromTo(box, { scale: 0.85 }, { scale: 1, duration: 1, ease: 'elastic.out(1, 0.3)', overwrite: 'auto' });
    });
  }

  /* ---------- loader ---------- */
  function hideLoader() {
    const l = $('#loader');
    if (!l) return;
    l.style.pointerEvents = 'none';
    if (motion) gsap.to(l, { opacity: 0, duration: 0.6, ease: 'power2.out', onComplete: () => l.remove() });
    else l.remove();
  }

  /* ---------- start ---------- */
  async function init() {
    const bar = $('#loaderBar');
    let heroEls = [];
    try {
      let data = {};
      try {
        const ctl = new AbortController();
        const to = setTimeout(() => ctl.abort(), 4000);
        const res = await fetch('data.json', { signal: ctl.signal, cache: 'no-cache' });
        clearTimeout(to);
        if (res.ok) data = await res.json();
        else console.warn('data.json tidak ditemukan (status ' + res.status + '). Menampilkan kerangka kosong.');
      } catch (err) {
        console.warn('data.json tidak bisa dimuat. Pakai Live Server dan cek isi JSON-nya. Menampilkan kerangka kosong.', err);
      }

      render(document, data);
      tables(data);
      if (data.site && data.site.nama) document.title = data.site.nama;

      const total = pending.length;
      let n = 0;
      pending.forEach(p => p.then(() => { n++; if (bar) bar.style.width = Math.round((n / Math.max(total, 1)) * 100) + '%'; }));
      // tunggu semua foto (berhasil/gagal), maksimal 7 detik, minimal 0,7 detik biar tidak berkedip
      await Promise.all([Promise.race([Promise.all(pending), sleep(7000)]), sleep(700)]);
      if (bar) bar.style.width = '100%';

      hero();
      nav();
      logo();
      tilesInit(data); // harus dibuat sebelum trigger lain di bawahnya (pin spacing)
      if (motion) {
        heroEls = anims();
        parallax();
        ScrollTrigger.refresh();
      }
    } catch (err) {
      console.error(err);
      if (hasGsap) gsap.set($$('[data-anim]'), { opacity: 1, clearProps: 'transform' });
    }
    hideLoader();
    if (motion) heroIn(heroEls);
  }

  init();
})();