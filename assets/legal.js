/* Lattag — 規約ページ:目次の 現在地を しめす */
(() => {
  'use strict';
  const links = [...document.querySelectorAll('.toc a')];
  if (!links.length || !('IntersectionObserver' in window)) return;
  const setCurrent = (id) => {
    for (const a of links) {
      if (a.getAttribute('href') === `#${id}`) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) setCurrent(e.target.id);
  }, { rootMargin: '-18% 0px -72% 0px' });
  document.querySelectorAll('.legal-body section[id]').forEach((s) => io.observe(s));
})();
