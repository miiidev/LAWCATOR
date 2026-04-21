const typeSearch = document.getElementById("typeSearch");
const typeSuggestions = document.getElementById("typeSuggestions");
const typeSearchForm = document.getElementById("typeSearchForm");
const mapNotice = document.getElementById("mapNotice");
const searchBar = typeSearch ? typeSearch.closest(".search-bar") : null;
const mobileFilterToggle = document.getElementById("mobileFilterToggle");
const mapFiltersPanel = document.getElementById("mapFiltersPanel");

const scopeFilter = document.getElementById("scopeFilter");
const cityFilter = document.getElementById("cityFilter");
const budgetFilter = document.getElementById("budgetFilter");
const availabilityFilter = document.getElementById("availabilityFilter");
const clearFiltersBtn = document.getElementById("clearFilters");

const PLACEHOLDER_MESSAGES = [
    "Search legal category...",
    "Try: Family Law",
    "Try: Property Disputes",
    "Try: Corporate Advisory",
    "Try: Criminal Defense"
];
const PLACEHOLDER_INTERVAL_MS = 3200;

let placeholderEl = null;
let placeholderIndex = 0;
let placeholderTimer = null;

const state = {
    categories: [],
    fuse: null,
    activeIndex: -1
};

function normalize(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

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

function uniqSorted(arr) {
    return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
}

function ensureAnimatedPlaceholder() {
    if (!searchBar || placeholderEl) return;

    placeholderEl = document.createElement("span");
    placeholderEl.className = "search-placeholder-anim";
    placeholderEl.setAttribute("aria-hidden", "true");
    placeholderEl.textContent = PLACEHOLDER_MESSAGES[0];
    searchBar.appendChild(placeholderEl);
}

function syncPlaceholderVisibility() {
    if (!typeSearchForm || !placeholderEl) return;
    typeSearchForm.classList.toggle("has-value", typeSearch.value.trim().length > 0);
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
    if (!placeholderEl) return;

    // Keep native placeholder as empty so custom animated text does not overlap.
    typeSearch.setAttribute("placeholder", "");
    syncPlaceholderVisibility();

    if (placeholderTimer) {
        window.clearInterval(placeholderTimer);
    }

    placeholderTimer = window.setInterval(() => {
        if (typeSearch.value.trim()) return;
        placeholderIndex = (placeholderIndex + 1) % PLACEHOLDER_MESSAGES.length;
        animatePlaceholderTo(PLACEHOLDER_MESSAGES[placeholderIndex]);
    }, PLACEHOLDER_INTERVAL_MS);
}

async function loadCategoriesFromFirms() {
    try {
        const res = await fetch("../assets/data/firms.json");
        const firms = await res.json();

        const types = firms.flatMap(f => {
            const t = f && f.custom && Array.isArray(f.custom.type) ? f.custom.type : [];
            return t.map(x => String(x).trim()).filter(Boolean);
        });

        state.categories = uniqSorted(types);
        const cities = uniqSorted(
            firms.map(f => f.city).filter(Boolean)
        );

        const budgets = uniqSorted(
            firms.map(f => f.custom?.budget).filter(Boolean)
        );

        fillSelect(cityFilter, cities, "All cities");
        fillSelect(budgetFilter, budgets, "All budgets");

        state.fuse = new Fuse(
            state.categories.map(label => ({
                label,
                normalized: normalize(label)
            })),
            {
                keys: ["label", "normalized"],
                threshold: 0.33,
                ignoreLocation: true
            }
        );

        if (typeSearch.value.trim()) {
            applySearch(typeSearch.value.trim());
        } else {
            applyAllFilters();
        }
    } catch (err) {
        console.error("Failed loading categories from firms.json:", err);
    }
}

function closeSuggestions() {
    typeSuggestions.innerHTML = "";
    state.activeIndex = -1;
    typeSearch.setAttribute("aria-expanded", "false");
    typeSearch.removeAttribute("aria-activedescendant");
}

function renderSuggestions(items) {
    if (!items.length) {
        closeSuggestions();
        return;
    }

    typeSuggestions.innerHTML = items
        .map((item, idx) => (
            '<li class="suggestion-item" id="type-suggestion-' + idx + '" role="option" aria-selected="false" data-index="' + idx + '" data-value="' + escapeHtml(item) + '">' +
            '<span class="suggestion-main">' + highlightLabel(item, typeSearch.value) + "</span>" +
            '<span class="suggestion-hint">Category</span>' +
            "</li>"
        ))
        .join("");

    state.activeIndex = -1;
    typeSearch.setAttribute("aria-expanded", "true");
}

function getMatches(query) {
    if (!query || !state.fuse) return [];

    const qn = normalize(query);

    const exact = state.categories.find(c => normalize(c) === qn);
    if (exact) return [exact];

    return state.fuse.search(query).slice(0, 6).map(r => r.item.label);
}

function applySearch(rawQuery) {
    const q = (rawQuery || "").trim();

    if (!q) {
        closeSuggestions();
        applyAllFilters([]);
        return;
    }

    const matches = getMatches(q);
    renderSuggestions(matches);
    applyAllFilters(matches.slice(0, 1));
}

function fillSelect(selectEl, values, allLabel) {
    if (!selectEl) return;
    selectEl.innerHTML = "";

    const first = document.createElement("option");
    first.value = "";
    first.textContent = allLabel;
    selectEl.appendChild(first);

    values.forEach(value => {
        const opt = document.createElement("option");
        opt.value = value;
        opt.textContent = value;
        selectEl.appendChild(opt);
    });
}

function setMapNotice(message) {
    if (!mapNotice) return;
    mapNotice.textContent = message || "";
}

function setMobileToggleLabel(isOpen) {
    if (!mobileFilterToggle) return;

    const label = isOpen ? "Hide Filters" : "Filters";
    mobileFilterToggle.innerHTML =
        '<span class="material-symbols-outlined" aria-hidden="true">filter_alt</span>' +
        '<span>' + label + '</span>';
}

function setFiltersPanelOpen(isOpen) {
    if (!mapFiltersPanel || !mobileFilterToggle) return;

    mapFiltersPanel.classList.toggle("is-open", isOpen);
    mobileFilterToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    setMobileToggleLabel(isOpen);

    if (typeof window.requestMapResize === "function") {
        window.requestMapResize();
    }
}

function syncFiltersPanelForViewport() {
    if (!mapFiltersPanel || !mobileFilterToggle) return;

    const mobileView = window.matchMedia("(max-width: 820px)").matches;

    if (!mobileView) {
        mapFiltersPanel.classList.remove("is-open");
        mobileFilterToggle.setAttribute("aria-expanded", "false");
        setMobileToggleLabel(false);
        return;
    }

    const open = mapFiltersPanel.classList.contains("is-open");
    mobileFilterToggle.setAttribute("aria-expanded", open ? "true" : "false");
    setMobileToggleLabel(open);
}

function applyAllFilters(typeMatchesOverride) {
    const q = typeSearch.value.trim();
    const typeMatches = Array.isArray(typeMatchesOverride)
        ? typeMatchesOverride
        : (q ? getMatches(q).slice(0, 1) : []);

    const renderedCount = Number(window.updateMarkersByType({
        types: typeMatches,
        scope: scopeFilter ? scopeFilter.value : "nearest",
        city: cityFilter ? cityFilter.value : "",
        budget: budgetFilter ? budgetFilter.value : "",
        available: availabilityFilter ? availabilityFilter.value : ""
    })) || 0;

    if (!q) {
        setMapNotice("");
        return;
    }

    if (!typeMatches.length) {
        setMapNotice("No matching legal category found. Try another keyword.");
        return;
    }

    if (renderedCount === 0) {
        setMapNotice("No firm found for this legal category with current filters.");
        return;
    }

    setMapNotice("");

    if (typeof window.requestMapResize === "function") {
        window.requestMapResize();
    }
}

typeSearch.addEventListener("input", () => {
    syncPlaceholderVisibility();
    applySearch(typeSearch.value);
});

typeSearch.addEventListener("keydown", e => {
    const items = Array.from(typeSuggestions.querySelectorAll(".suggestion-item"));
    if (!items.length) return;

    if (e.key === "ArrowDown") {
        e.preventDefault();
        state.activeIndex = (state.activeIndex + 1) % items.length;
    } else if (e.key === "ArrowUp") {
        e.preventDefault();
        state.activeIndex = (state.activeIndex - 1 + items.length) % items.length;
    } else if (e.key === "Enter") {
        if (state.activeIndex >= 0 && items[state.activeIndex]) {
            e.preventDefault();
            const value = items[state.activeIndex].getAttribute("data-value");
            typeSearch.value = value;
            syncPlaceholderVisibility();
            closeSuggestions();
            applyAllFilters([value]);
        }
        return;
    } else if (e.key === "Escape") {
        closeSuggestions();
        return;
    }

    items.forEach((el, idx) => {
        const isActive = idx === state.activeIndex;
        el.classList.toggle("active", isActive);
        el.setAttribute("aria-selected", isActive ? "true" : "false");
        if (isActive) {
            typeSearch.setAttribute("aria-activedescendant", el.id);
            el.scrollIntoView({ block: "nearest" });
        }
    });
});

typeSuggestions.addEventListener("mousemove", e => {
    const item = e.target.closest(".suggestion-item");
    if (!item) return;

    const items = Array.from(typeSuggestions.querySelectorAll(".suggestion-item"));
    const idx = Number(item.getAttribute("data-index"));
    if (!Number.isFinite(idx)) return;

    state.activeIndex = idx;
    items.forEach((el, currentIdx) => {
        const isActive = currentIdx === idx;
        el.classList.toggle("active", isActive);
        el.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    typeSearch.setAttribute("aria-activedescendant", item.id);
});

typeSuggestions.addEventListener("click", e => {
    const item = e.target.closest(".suggestion-item");
    if (!item) return;

    const value = item.getAttribute("data-value") || "";
    typeSearch.value = value;
    syncPlaceholderVisibility();
    closeSuggestions();
    applyAllFilters([value]);
});

typeSearchForm.addEventListener("submit", e => {
    e.preventDefault();

    const q = typeSearch.value.trim();
    if (!q) {
        closeSuggestions();
        applyAllFilters([]);
        return;
    }

    const matches = getMatches(q);
    closeSuggestions();
    applyAllFilters(matches.slice(0, 1));
});

document.addEventListener("click", e => {
    if (!typeSearchForm.contains(e.target) && !typeSuggestions.contains(e.target)) {
        closeSuggestions();
    }
});

[scopeFilter, cityFilter, budgetFilter, availabilityFilter].forEach(el => {
    if (!el) return;
    el.addEventListener("change", applyAllFilters);
});

if (mobileFilterToggle && mapFiltersPanel) {
    mobileFilterToggle.addEventListener("click", () => {
        const isOpen = mapFiltersPanel.classList.contains("is-open");
        setFiltersPanelOpen(!isOpen);
    });

    window.addEventListener("resize", syncFiltersPanelForViewport);
    syncFiltersPanelForViewport();
}

if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => {
        typeSearch.value = "";
        syncPlaceholderVisibility();
        if (scopeFilter) scopeFilter.value = "nearest";
        if (cityFilter) cityFilter.value = "";
        if (budgetFilter) budgetFilter.value = "";
        if (availabilityFilter) availabilityFilter.value = "";
        closeSuggestions();
        applyAllFilters();

        if (window.matchMedia("(max-width: 820px)").matches) {
            setFiltersPanelOpen(false);
        }
    });
}

startPlaceholderShuffle();
loadCategoriesFromFirms();