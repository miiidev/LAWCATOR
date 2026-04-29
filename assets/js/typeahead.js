// Shared typeahead / autocomplete UI helper
(function () {
  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function highlightLabel(label, query) {
    const safeLabel = escapeHtml(label);
    const q = String(query || "").trim();
    if (!q) return safeLabel;

    const idx = label.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return safeLabel;

    const before = escapeHtml(label.slice(0, idx));
    const match = escapeHtml(label.slice(idx, idx + q.length));
    const after = escapeHtml(label.slice(idx + q.length));
    return before + "<mark>" + match + "</mark>" + after;
  }

  window.createTypeahead = function (opts) {
    const input = opts.input;
    const suggestions = opts.suggestions;
    const form = opts.form;
    const placeholderMessages = Array.isArray(opts.placeholderMessages) ? opts.placeholderMessages : [];
    const placeholderIntervalMs = Number(opts.placeholderIntervalMs) || 3200;
    const fetchSuggestions = typeof opts.fetchSuggestions === "function" ? opts.fetchSuggestions : () => [];
    const renderItem = typeof opts.renderItem === "function" ? opts.renderItem : (item, idx, q) =>
      `<li class="suggestion-item" id="type-suggestion-${idx}" role="option" aria-selected="false" data-index="${idx}" data-value="${escapeHtml(item)}"><span class="suggestion-main">${highlightLabel(item, q)}</span></li>`;
    const onSelect = typeof opts.onSelect === "function" ? opts.onSelect : () => {};
    const onApply = typeof opts.onApply === "function" ? opts.onApply : () => {};

    let placeholderEl = null;
    let placeholderIndex = 0;
    let placeholderTimer = null;
    const state = { activeIndex: -1, items: [] };

    function ensureAnimatedPlaceholder() {
      if (!input) return;
      const searchBar = input.closest(".search-bar");
      if (!searchBar || placeholderEl) return;
      placeholderEl = document.createElement("span");
      placeholderEl.className = "search-placeholder-anim";
      placeholderEl.setAttribute("aria-hidden", "true");
      placeholderEl.textContent = placeholderMessages[0] || "";
      searchBar.appendChild(placeholderEl);
    }

    function syncPlaceholderVisibility() {
      if (!form || !placeholderEl || !input) return;
      form.classList.toggle("has-value", input.value.trim().length > 0);
    }

    function animatePlaceholderTo(nextText) {
      if (!placeholderEl) return;
      placeholderEl.classList.remove("swipe-in");
      placeholderEl.classList.add("swipe-out");

      const handleOut = event => {
        if (event.animationName !== "placeholder-swipe-out") return;
        placeholderEl.removeEventListener("animationend", handleOut);
        placeholderEl.textContent = nextText;
        placeholderEl.classList.remove("swipe-out");
        placeholderEl.classList.add("swipe-in");

        const handleIn = inEvent => {
          if (inEvent.animationName !== "placeholder-swipe-in") return;
          placeholderEl.removeEventListener("animationend", handleIn);
          placeholderEl.classList.remove("swipe-in");
        };

        placeholderEl.addEventListener("animationend", handleIn);
      };

      placeholderEl.addEventListener("animationend", handleOut);
    }

    function startPlaceholderShuffle() {
      ensureAnimatedPlaceholder();
      if (!placeholderEl || !input) return;
      input.setAttribute("placeholder", "");
      syncPlaceholderVisibility();

      if (placeholderTimer) window.clearInterval(placeholderTimer);
      placeholderTimer = window.setInterval(() => {
        if (input.value.trim()) return;
        placeholderIndex = (placeholderIndex + 1) % placeholderMessages.length;
        animatePlaceholderTo(placeholderMessages[placeholderIndex]);
      }, placeholderIntervalMs);
    }

    function closeSuggestions() {
      if (!suggestions) return;
      suggestions.innerHTML = "";
      state.activeIndex = -1;
      state.items = [];
      if (input) {
        input.setAttribute("aria-expanded", "false");
        input.removeAttribute("aria-activedescendant");
      }
    }

    function renderSuggestions(items) {
      if (!suggestions) return;
      if (!items || !items.length) {
        closeSuggestions();
        return;
      }

      state.items = items;
      suggestions.innerHTML = items.map((it, idx) => renderItem(it, idx, input ? input.value : "")).join("");
      state.activeIndex = -1;
      if (input) input.setAttribute("aria-expanded", "true");
    }

    function applySearch(rawQuery) {
      const q = String(rawQuery || "").trim();
      if (!q) {
        closeSuggestions();
        onApply(q, []);
        return;
      }

      const results = fetchSuggestions(q) || [];
      renderSuggestions(results);
      onApply(q, results);
    }

    function activateIndex(idx) {
      const items = Array.from(suggestions.querySelectorAll('.suggestion-item'));
      if (!items.length) return;
      state.activeIndex = idx;
      items.forEach((el, i) => {
        const isActive = i === idx;
        el.classList.toggle('active', isActive);
        el.setAttribute('aria-selected', isActive ? 'true' : 'false');
        if (isActive) {
          if (input) input.setAttribute('aria-activedescendant', el.id);
          el.scrollIntoView({ block: 'nearest' });
        }
      });
    }

    function handleKeydown(e) {
      const items = Array.from(suggestions.querySelectorAll('.suggestion-item'));
      if (!items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activateIndex((state.activeIndex + 1) % items.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activateIndex((state.activeIndex - 1 + items.length) % items.length);
      } else if (e.key === 'Enter') {
        if (state.activeIndex >= 0 && items[state.activeIndex]) {
          e.preventDefault();
          const value = items[state.activeIndex].getAttribute('data-value') || '';
          closeSuggestions();
          onSelect(value);
        }
        return;
      } else if (e.key === 'Escape') {
        closeSuggestions();
        return;
      }
    }

    function bind() {
      if (!input) return;

      input.addEventListener('input', () => {
        syncPlaceholderVisibility();
        applySearch(input.value);
      });

      input.addEventListener('keydown', handleKeydown);

      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const q = input.value.trim();
          if (!q) {
            closeSuggestions();
            onApply(q, []);
            return;
          }
          const results = fetchSuggestions(q) || [];
          closeSuggestions();
          onApply(q, results);
        });
      }

      if (suggestions) {
        suggestions.addEventListener('click', (e) => {
          const item = e.target.closest('.suggestion-item');
          if (!item) return;
          const value = item.getAttribute('data-value') || '';
          if (!value) return;
          input.value = value;
          syncPlaceholderVisibility();
          closeSuggestions();
          onSelect(value);
        });

        suggestions.addEventListener('mousemove', (e) => {
          const item = e.target.closest('.suggestion-item');
          if (!item) return;
          const idx = Number(item.getAttribute('data-index'));
          if (!Number.isFinite(idx)) return;
          activateIndex(idx);
        });
      }

      document.addEventListener('click', (e) => {
        if (!form || !suggestions) return;
        if (!form.contains(e.target) && !suggestions.contains(e.target)) closeSuggestions();
      });
    }

    bind();

    return {
      startPlaceholderShuffle,
      closeSuggestions,
      applySearch,
      syncPlaceholderVisibility
    };
  };
})();
