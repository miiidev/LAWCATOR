// Lightweight tooltip module
(function () {
  const TOOLTIP_ID = 'site-tooltip-root';
  let root = null;
  let currentTarget = null;
  let listenersAttached = false;

  function createRoot() {
    root = document.createElement('div');
    root.id = TOOLTIP_ID;
    root.className = 'tooltip-root';
    root.setAttribute('role', 'tooltip');
    root.setAttribute('aria-hidden', 'true');

    const box = document.createElement('div');
    box.className = 'tooltip-box';
    root.appendChild(box);

    const arrow = document.createElement('div');
    arrow.className = 'tooltip-arrow';
    root.appendChild(arrow);

    document.body.appendChild(root);
    return root;
  }

  function show(el) {
    if (!root) createRoot();
    const text = el.dataset.tooltip || el.getAttribute('title') || '';
    if (!text) return;
    const box = root.querySelector('.tooltip-box');
    box.textContent = text;
    root.classList.add('is-visible');
    root.setAttribute('aria-hidden', 'false');
    position(el);
    // aria-describedby: point to tooltip id for assistive tech
    el.setAttribute('aria-describedby', TOOLTIP_ID);
    currentTarget = el;
  }

  function hide(el) {
    if (!root) return;
    root.classList.remove('is-visible');
    root.setAttribute('aria-hidden', 'true');
    if (el) el.removeAttribute('aria-describedby');
    currentTarget = null;
  }

  function position(el) {
    if (!root) return;
    const rect = el.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const box = root.querySelector('.tooltip-box');

    // place above the element if possible
    const margin = 8;
    const top = rect.top - rootRect.height - margin;
    const left = rect.left + rect.width / 2 - (rootRect.width / 2);

    // compute width by letting content size
    root.style.left = Math.max(8, left) + 'px';
    root.style.top = Math.max(8, rect.top - rootRect.height - margin) + 'px';
  }

  function getTooltipTarget(node) {
    return node && node.closest ? node.closest('[data-tooltip]') : null;
  }

  function onPointerOver(e) {
    const target = getTooltipTarget(e.target);
    if (!target || target === currentTarget) return;
    show(target);
  }

  function onPointerOut(e) {
    const target = getTooltipTarget(e.target);
    if (!target || target !== currentTarget) return;
    const nextTarget = getTooltipTarget(e.relatedTarget);
    if (nextTarget === target) return;
    hide(target);
  }

  function onFocusIn(e) {
    const target = getTooltipTarget(e.target);
    if (target) show(target);
  }

  function onFocusOut(e) {
    const target = getTooltipTarget(e.target);
    if (target) hide(target);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' && currentTarget) {
      hide(currentTarget);
      if (currentTarget) currentTarget.blur();
    }
  }

  function attachTo(el) {
    if (!el) return;
    // leave existing title attribute as fallback
    el.setAttribute('tabindex', el.getAttribute('tabindex') || '0');
  }

  function attachDelegatedListeners() {
    if (listenersAttached) return;
    document.addEventListener('mouseover', onPointerOver, true);
    document.addEventListener('mouseout', onPointerOut, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
    listenersAttached = true;
  }

  function init(scope = document) {
    if (typeof window === 'undefined') return;
    document.addEventListener('keydown', onKeyDown);
    attachDelegatedListeners();
    const els = Array.from(scope.querySelectorAll('[data-tooltip], [title]'));
    els.forEach(el => {
      // skip if it's purely decorative or non-interactive
      if (el.matches('img') && el.getAttribute('alt')) return; // images have alt
      attachTo(el);
    });
  }

  window.SiteTooltip = {
    init,
    show,
    hide
  };

  // auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(document));
  } else {
    init(document);
  }
})();
