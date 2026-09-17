// Scroll story: phase A (0–0.28) the phone rises and scales in;
// phase B (0.28–1) each step swaps the screen and its caption.
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) { document.documentElement.classList.add('reduce-motion'); return; }

  const story = document.querySelector('.story');
  const phone = document.getElementById('phone');
  const screens = Array.from(document.querySelectorAll('.screen'));
  const captions = Array.from(document.querySelectorAll('.caption'));
  const steps = captions.length;
  if (!story || !phone || !steps) return;

  const dots = document.createElement('div');
  dots.className = 'story-dots';
  dots.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < steps; i++) dots.appendChild(document.createElement('i'));
  story.querySelector('.story-sticky').appendChild(dots);
  const dotEls = Array.from(dots.children);

  const ENTER = 0.28;
  let current = -1;
  let ticking = false;
  const mobile = window.matchMedia('(max-width: 760px)');

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = t => 1 - Math.pow(1 - t, 3);

  function setStep(i) {
    if (i === current) return;
    current = i;
    screens.forEach(s => s.classList.toggle('is-active', +s.dataset.step === i));
    captions.forEach(c => c.classList.toggle('is-active', +c.dataset.step === i));
    dotEls.forEach((d, k) => d.classList.toggle('is-active', k === i));
  }

  function render() {
    ticking = false;
    const rect = story.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = story.offsetHeight - vh;
    const p = clamp(-rect.top / total, 0, 1);

    // phase A: rise + scale + un-tilt
    const a = ease(clamp(p / ENTER, 0, 1));
    const y = (mobile.matches ? 30 : 35) * (1 - a);
    const s = (mobile.matches ? 0.7 : 0.62) + (1 - (mobile.matches ? 0.7 : 0.62)) * a;
    const rx = (mobile.matches ? 18 : 22) * (1 - a);
    phone.style.transform = `translateY(${y}vh) scale(${s}) rotateX(${rx}deg)`;
    story.classList.toggle('is-in', a > 0.85);

    // phase B: which screen
    const b = clamp((p - ENTER) / (1 - ENTER), 0, 0.9999);
    setStep(Math.floor(b * steps));
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(render); }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  render();
})();
