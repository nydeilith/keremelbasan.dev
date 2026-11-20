// Copy-to-clipboard buttons (mailto: is dead on most desktops).
(function () {
  const toast = document.createElement('div');
  toast.className = 'toast'; toast.setAttribute('role', 'status');
  document.body.appendChild(toast);
  let t;
  function show(msg) {
    toast.textContent = msg; toast.classList.add('is-on');
    clearTimeout(t); t = setTimeout(() => toast.classList.remove('is-on'), 1800);
  }
  document.querySelectorAll('.js-copy').forEach(btn => {
    btn.addEventListener('click', async () => {
      const v = btn.dataset.copy;
      try { await navigator.clipboard.writeText(v); show('Copied: ' + v); }
      catch (e) { window.location.href = 'mailto:' + v; }
    });
  });
})();

// Scroll story.
// Phase A (0–0.28): the phone rises, un-tilts and scales in.
// Phase B (0.28–1): a strip of screens scrolls inside the phone. Each step dwells,
// then slides to the next while the phone nudges on its Y axis. Captions are driven
// by the same scroll progress, so fast scrolling can't desync them.
// Falls back to a static stacked layout for reduced motion and short viewports.
(function () {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const short = window.matchMedia('(max-height: 640px), (max-width: 760px) and (max-height: 720px)');

  const story = document.querySelector('.story');
  const phone = document.getElementById('phone');
  const strip = document.getElementById('strip');
  const captions = Array.from(document.querySelectorAll('.caption'));
  const steps = captions.length;
  if (!story || !phone || !strip || !steps) return;

  if (reduce.matches) { root.classList.add('reduce-motion'); return; }
  root.classList.replace('no-js', 'js');

  const dots = document.createElement('div');
  dots.className = 'story-dots'; dots.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < steps; i++) dots.appendChild(document.createElement('i'));
  story.querySelector('.story-sticky').appendChild(dots);
  const dotEls = Array.from(dots.children);

  const ENTER = 0.28;
  const DWELL = 0.55;              // share of each step spent holding the screen still
  const mobile = window.matchMedia('(max-width: 760px)');
  let ticking = false;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const smooth = t => t * t * (3 - 2 * t);

  function setStatic(on) {
    root.classList.toggle('static-story', on);
    if (on) {
      phone.style.transform = ''; strip.style.transform = '';
      captions.forEach(c => { c.style.opacity = ''; c.style.transform = ''; });
    }
  }

  function render() {
    ticking = false;
    if (short.matches) { setStatic(true); return; }
    setStatic(false);

    const rect = story.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = story.offsetHeight - vh;
    const p = clamp(-rect.top / total, 0, 1);
    const m = mobile.matches;

    // phase A
    const a = easeOut(clamp(p / ENTER, 0, 1));
    const y = (m ? 30 : 35) * (1 - a);
    const s0 = m ? 0.7 : 0.62;
    const s = s0 + (1 - s0) * a;
    const rx = (m ? 18 : 22) * (1 - a);
    story.classList.toggle('is-in', a > 0.85);

    // phase B: continuous position along the strip, with dwell + slide per step
    const b = clamp((p - ENTER) / (1 - ENTER), 0, 0.9999) * steps;   // 0 … steps
    const i = Math.floor(b);
    const frac = b - i;
    const slide = i >= steps - 1 ? 0 : smooth(clamp((frac - DWELL) / (1 - DWELL), 0, 1));
    const pos = Math.min(i + slide, steps - 1);
    strip.style.transform = `translateY(${-pos * 100}%)`;

    // nudge the phone while a slide is in progress
    const ry = Math.sin(slide * Math.PI) * -7;
    const lift = Math.sin(slide * Math.PI) * -1.2;
    phone.style.transform = `translateY(${y + lift}vh) scale(${s}) rotateX(${rx}deg) rotateY(${ry}deg)`;

    // captions: outgoing fades in the first half of the slide, incoming rises in the second
    captions.forEach((c, k) => {
      let o = 0, ty = 18;
      if (k === i) { o = 1 - clamp(slide * 2, 0, 1); ty = -18 * clamp(slide * 2, 0, 1); }
      else if (k === i + 1) { const u = clamp(slide * 2 - 1, 0, 1); o = u; ty = 18 * (1 - u); }
      c.style.opacity = o;
      c.style.transform = `translateY(${ty}px)`;
      c.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
    });
    const active = Math.round(pos);
    dotEls.forEach((d, k) => d.classList.toggle('is-active', k === active));
  }

  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(render); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  render();

  // "Work" should land on the first fully-visible story state, not the entrance phase.
  document.querySelectorAll('a[href="#work"]').forEach(a => {
    a.addEventListener('click', e => {
      if (short.matches) return;
      e.preventDefault();
      const top = story.offsetTop + (story.offsetHeight - window.innerHeight) * (ENTER + 0.02);
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();

// Side rail: one dot per section, filled track shows overall progress. Desktop only (CSS).
(function () {
  const sections = Array.from(document.querySelectorAll('[data-nav]'));
  if (!sections.length) return;
  const rail = document.createElement('ol');
  rail.className = 'rail'; rail.setAttribute('aria-label', 'Page sections');
  const track = document.createElement('div'); track.className = 'rail-track';
  const fill = document.createElement('div'); fill.className = 'rail-fill'; track.appendChild(fill);
  rail.appendChild(track);
  const links = sections.map((sec, k) => {
    const li = document.createElement('li');
    const a = document.createElement('a'); a.href = '#' + sec.id;
    a.innerHTML = '<span>' + String(k + 1).padStart(2, '0') + ' · ' + sec.dataset.nav + '</span><i></i>';
    li.appendChild(a); rail.appendChild(li); return a;
  });
  document.body.appendChild(rail);

  let ticking = false;
  function update() {
    ticking = false;
    const mid = window.scrollY + window.innerHeight * 0.4;
    let active = 0;
    sections.forEach((sec, k) => { if (sec.offsetTop <= mid) active = k; });
    links.forEach((a, k) => a.classList.toggle('is-active', k === active));
    const max = document.documentElement.scrollHeight - window.innerHeight;
    fill.style.height = (max > 0 ? Math.min(1, window.scrollY / max) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

// ---------- v2 kinetic layer ----------
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Hero headline: letters start scattered and assemble on load (≈1.2s), then drift apart
// line by line as the hero scrolls away. Screen readers get the h1's aria-label.
(function () {
  const h1 = document.querySelector('.kinetic');
  if (!h1) return;
  const root = document.documentElement;
  const lines = Array.from(h1.querySelectorAll('.line'));

  if (!reduceMotion && h1.animate) {
    const chars = [];
    const walk = node => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(tok => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
            for (const c of tok) {
              const s = document.createElement('span'); s.className = 'ch'; s.textContent = c;
              w.appendChild(s); chars.push(s);
            }
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    lines.forEach(walk);

    const vw = window.innerWidth, vh = window.innerHeight;
    const r = (a, b) => a + Math.random() * (b - a);
    const anims = [];
    chars.forEach((c, i) => {
      const from = `translate(${r(-0.45, 0.45) * vw}px, ${r(-0.35, 0.5) * vh}px) rotate(${r(-160, 160)}deg) scale(${r(0.5, 1.6)})`;
      anims.push(c.animate(
        [{ transform: from, opacity: 0 }, { opacity: 1, offset: 0.35 }, { transform: 'none', opacity: 1 }],
        { duration: r(700, 1050), delay: 60 + i * 14, easing: 'cubic-bezier(.16,.84,.24,1)', fill: 'backwards' }
      ));
    });
    // Never leave the headline unreadable: if the timeline stalls (throttled tab), snap to the end.
    setTimeout(() => anims.forEach(a => { try { a.finish(); } catch (e) {} }), 2400);
  }
  root.classList.add('kin-ready');

  if (reduceMotion) return;
  const hero = document.querySelector('.hero');
  let ticking = false;
  function drift() {
    ticking = false;
    const p = Math.min(1, Math.max(0, window.scrollY / (hero.offsetHeight * 0.9)));
    lines.forEach((l, k) => {
      const dir = k % 2 ? 1 : -1;
      l.style.transform = p ? `translateX(${dir * p * (8 + k * 4)}vw)` : '';
    });
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(drift); } }, { passive: true });
})();

// Nav timecode: the page is a 2-minute reel; scroll position maps onto it.
(function () {
  const tc = document.getElementById('tc');
  if (!tc) return;
  const LEN = 120;
  let ticking = false;
  function upd() {
    ticking = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const s = Math.round((max > 0 ? window.scrollY / max : 0) * LEN);
    tc.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
  upd();
})();

// Facts: count up once when the row enters view. Final text is already in the HTML.
(function () {
  const els = Array.from(document.querySelectorAll('[data-count]'));
  if (!els.length || reduceMotion || !('IntersectionObserver' in window)) return;
  const fmt = (el, v) => {
    const dec = +(el.dataset.dec || 0);
    let s = v.toFixed(dec);
    if (el.dataset.sep) s = Math.round(v).toLocaleString('en-US');
    return s + (el.dataset.suffix || '');
  };
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target, to = +el.dataset.count, t0 = performance.now(), D = 1100;
      const step = now => {
        const k = Math.min(1, (now - t0) / D), ease = 1 - Math.pow(1 - k, 4);
        el.textContent = fmt(el, to * ease);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      // rAF can stall in throttled tabs; never leave a half-counted number on screen.
      const final = el.dataset.final;
      setTimeout(() => { el.textContent = final; }, D + 600);
    });
  }, { threshold: 0.6 });
  els.forEach(el => { el.dataset.final = el.textContent; });
  els.forEach(el => io.observe(el));
})();

// Internship statement: words light up as the paragraph scrolls through the viewport.
(function () {
  const el = document.querySelector('.js-scrub');
  if (!el || reduceMotion) return;
  const words = [];
  const walk = node => {
    Array.from(node.childNodes).forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(tok => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
          const s = document.createElement('span'); s.className = 'sw'; s.textContent = tok;
          frag.appendChild(s); words.push(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
  };
  walk(el);
  let ticking = false;
  function upd() {
    ticking = false;
    const r = el.getBoundingClientRect(), vh = window.innerHeight;
    // 0 when the top hits 85% of the viewport, 1 when the bottom reaches 45%
    const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.4 + r.height)));
    const lit = p * words.length;
    words.forEach((w, i) => w.style.setProperty('--o', Math.min(1, Math.max(0.15, lit - i + 0.15))));
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
  window.addEventListener('resize', upd);
  upd();
})();
