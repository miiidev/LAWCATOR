/**
 * theme-toggle.js
 * Runs immediately (in <head>) to apply saved theme before paint,
 * then wires the toggle button once the DOM is ready.
 */
(function () {
  /* ── 1. Apply saved theme immediately to prevent FOUC ── */
  var saved = localStorage.getItem('lawcator-theme') || 'dark';
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  /* ── 2. Wire the button after DOM is ready ── */
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('themeToggle');
    if (!btn) return;

    function applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('lawcator-theme', theme);
    }

    btn.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme') || 'dark';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  });
})();