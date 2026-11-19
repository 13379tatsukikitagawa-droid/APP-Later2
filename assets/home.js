/* Lattag — トップページの うごき */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ヘッダー:スクロールしたら すりガラスに */
  const header = document.getElementById('header');
  const onHeader = () => header.classList.toggle('is-stuck', window.scrollY > 12);
  onHeader();
  window.addEventListener('scroll', onHeader, { passive: true });

  /* スクロールで あらわれる */
  const targets = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    targets.forEach((t) => io.observe(t));
  } else {
    targets.forEach((t) => t.classList.add('is-in'));
  }

  /* タグの 帯:画面の 幅が うまるまで 複製して、とぎれなく 流す */
  document.querySelectorAll('.tags-row').forEach((row) => {
    const first = row.querySelector('ul');
    if (!first) return;
    const w = first.getBoundingClientRect().width;
    if (!w) return;
    const need = Math.ceil((window.innerWidth * 1.2) / w) + 1;
    while (row.children.length < need) row.appendChild(first.cloneNode(true));
    row.style.setProperty('--shift', `${-w}px`);
  });

  /* つぎの 9:00 までの カウントダウン(見ている人の 時刻で) */
  const cd = document.getElementById('countdownTime');
  if (cd) {
    const pad = (n) => String(n).padStart(2, '0');
    const tick = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(9, 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      const s = Math.floor((next - now) / 1000);
      cd.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  /* 7セグの 時計 */
  const lcd = document.getElementById('lcd');
  const SEG = { // a b c d e f g
    0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg',
  };
  const H = (x, y) => `${x + 1},${y} ${x + 7},${y} ${x + 8},${y + 1} ${x + 7},${y + 2} ${x + 1},${y + 2} ${x},${y + 1}`;
  const V = (x, y) => `${x + 1},${y} ${x + 2},${y + 1} ${x + 2},${y + 7} ${x + 1},${y + 8} ${x},${y + 7} ${x},${y + 1}`;
  const SHAPE = { a: H(1, 0), g: H(1, 8), d: H(1, 16), f: V(0, 1), b: V(8, 1), e: V(0, 9), c: V(8, 9) };
  let lcdText = '';
  const drawLcd = (text) => {
    if (!lcd || text === lcdText) return;
    lcdText = text;
    let x = 0; let out = '';
    for (const ch of text) {
      if (ch === ':') {
        out += `<g transform="translate(${x})"><rect class="on" x="1" y="5" width="2" height="2" rx=".4"/><rect class="on" x="1" y="11" width="2" height="2" rx=".4"/></g>`;
        x += 6;
      } else if (ch === ' ') {
        x += 13;
      } else {
        const lit = SEG[ch] || '';
        out += `<g transform="translate(${x})">` + Object.keys(SHAPE).map((k) => `<polygon class="${lit.includes(k) ? 'on' : 'off'}" points="${SHAPE[k]}"/>`).join('') + '</g>';
        x += 13;
      }
    }
    lcd.innerHTML = `<svg viewBox="-1 0 ${x} 18" aria-hidden="true"><g transform="skewX(-5)">${out}</g></svg>`;
  };

  /* 現像:スクロールに あわせて、夜 → 朝 9:00 */
  const dev = document.getElementById('develop');
  if (dev && lcd) {
    const START = 20 * 60 + 43; // 20:43
    const SPAN = (24 * 60 - START) + 9 * 60; // 9:00 まで
    const clamp = (v) => Math.min(1, Math.max(0, v));
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const fmt = (min) => { const m = ((min % 1440) + 1440) % 1440; return `${Math.floor(m / 60)}:${String(Math.floor(m % 60)).padStart(2, '0')}`; };
    let ticking = false;
    const update = () => {
      ticking = false;
      if (reduce.matches) { dev.style.setProperty('--p', 1); dev.classList.remove('is-waiting'); drawLcd('9:00'); return; }
      const r = dev.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const t = total > 0 ? clamp(-r.top / total) : 1;
      const clock = ease(clamp((t - 0.04) / 0.62));      // 時計が すすむ
      const p = ease(clamp((t - 0.34) / 0.44));          // ミルク色が とける
      dev.style.setProperty('--p', p.toFixed(4));
      dev.classList.toggle('is-waiting', p < 0.985);
      drawLcd(clock >= 1 ? '9:00' : fmt(START + Math.round(SPAN * clock)));
    };
    const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    reduce.addEventListener('change', request);
    update();
  }
})();
