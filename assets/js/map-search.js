const typeSearch = document.getElementById("typeSearch");
const typeSuggestions = document.getElementById("typeSuggestions");
const typeSearchForm = document.getElementById("typeSearchForm");
const mapNotice = document.getElementById("mapNotice");
const searchBar = typeSearch ? typeSearch.closest(".search-bar") : null;
const mobileFilterToggle = document.getElementById("mobileFilterToggle");
const mapFiltersPanel = document.getElementById("mapFiltersPanel");

const scopeFilter = document.getElementById("scopeFilter");
const stateFilter = document.getElementById("stateFilter");
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

let firms = [];

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

// Use shared typeahead helper for suggestions and placeholder
let typeaheadInstance = null;
typeaheadInstance = createTypeahead({
    input: typeSearch,
    suggestions: typeSuggestions,
    form: typeSearchForm,
    placeholderMessages: PLACEHOLDER_MESSAGES,
    placeholderIntervalMs: PLACEHOLDER_INTERVAL_MS,
    fetchSuggestions(q) {
        return getMatches(q);
    },
    renderItem(item, idx, q) {
        return '<li class="suggestion-item" id="type-suggestion-' + idx + '" role="option" aria-selected="false" data-index="' + idx + '" data-value="' + escapeHtml(item) + '">' +
            '<span class="suggestion-main">' + highlightLabel(item, q) + '</span>' +
            '<span class="suggestion-hint">Category</span>' +
            '</li>';
    },
    onSelect(value) {
        typeSearch.value = value;
        typeaheadInstance.syncPlaceholderVisibility();
        typeaheadInstance.closeSuggestions();
        applyAllFilters([value]);
    },
    onApply(q, results) {
        applyAllFilters(results.slice(0, 1));
    }
});

async function loadCategoriesFromFirms() {
    try {
        const res = await fetch("../assets/data/firms.json");
        firms = await res.json();

        const types = firms.flatMap(f => {
            const t = f && f.custom && Array.isArray(f.custom.type) ? f.custom.type : [];
            return t.map(x => String(x).trim()).filter(Boolean);
        });

        state.categories = uniqSorted(types);
        const states = uniqSorted(
            firms.map(f => f.state).filter(Boolean)
        );
        const cities = uniqSorted(
            firms.map(f => f.city).filter(Boolean)
        );

        const budgets = uniqSorted(
            firms.map(f => f.custom?.budget).filter(Boolean)
        );

        fillSelect(stateFilter, states, "All states");
        fillSelect(cityFilter, cities, "All cities");
        fillSelect(budgetFilter, budgets, "All budgets");
        syncCityOptionsForState();

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

function syncCityOptionsForState() {
    if (!cityFilter || !firms.length) return;

    const selectedState = stateFilter ? stateFilter.value : "";
    const allowedCities = uniqSorted(
        firms
            .filter(f => !selectedState || f.state === selectedState)
            .map(f => f.city)
            .filter(Boolean)
    );
    const currentCity = cityFilter.value;

    fillSelect(cityFilter, allowedCities, "All cities");

    if (currentCity && !allowedCities.includes(currentCity)) {
        cityFilter.value = "";
    }
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
        state: stateFilter ? stateFilter.value : "",
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

// start placeholder animation
function startPlaceholderShuffle() {
    if (typeaheadInstance && typeof typeaheadInstance.startPlaceholderShuffle === 'function') {
        typeaheadInstance.startPlaceholderShuffle();
    }
}

if (stateFilter) {
    stateFilter.addEventListener("change", () => {
        syncCityOptionsForState();
        applyAllFilters();
    });
}

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
        if (typeaheadInstance && typeof typeaheadInstance.syncPlaceholderVisibility === "function") {
            typeaheadInstance.syncPlaceholderVisibility();
        }
        if (scopeFilter) scopeFilter.value = "nearest";
        if (stateFilter) stateFilter.value = "";
        syncCityOptionsForState();
        if (cityFilter) cityFilter.value = "";
        if (budgetFilter) budgetFilter.value = "";
        if (availabilityFilter) availabilityFilter.value = "";
        closeSuggestions();
        applyAllFilters();
    });
}

startPlaceholderShuffle();
loadCategoriesFromFirms();