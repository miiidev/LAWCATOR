const typeSearch = document.getElementById("typeSearch");
const typeSuggestions = document.getElementById("typeSuggestions");
const typeSearchForm = document.getElementById("typeSearchForm");
const mapNotice = document.getElementById("mapNotice");

const scopeFilter = document.getElementById("scopeFilter");
const cityFilter = document.getElementById("cityFilter");
const budgetFilter = document.getElementById("budgetFilter");
const availabilityFilter = document.getElementById("availabilityFilter");
const clearFiltersBtn = document.getElementById("clearFilters");

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

function uniqSorted(arr) {
    return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
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
}

function renderSuggestions(items) {
    if (!items.length) {
        closeSuggestions();
        return;
    }

    typeSuggestions.innerHTML = items
        .map((item, idx) => (
            '<li class="suggestion-item" role="option" data-index="' + idx + '" data-value="' + item.replace(/"/g, "&quot;") + '">' +
            item +
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
}

typeSearch.addEventListener("input", () => {
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
            closeSuggestions();
            applyAllFilters([value]);
        }
        return;
    } else if (e.key === "Escape") {
        closeSuggestions();
        return;
    }

    items.forEach((el, idx) => {
        el.classList.toggle("active", idx === state.activeIndex);
    });
});

typeSuggestions.addEventListener("click", e => {
    const item = e.target.closest(".suggestion-item");
    if (!item) return;

    const value = item.getAttribute("data-value") || "";
    typeSearch.value = value;
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

if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => {
        typeSearch.value = "";
        if (scopeFilter) scopeFilter.value = "nearest";
        if (cityFilter) cityFilter.value = "";
        if (budgetFilter) budgetFilter.value = "";
        if (availabilityFilter) availabilityFilter.value = "";
        closeSuggestions();
        applyAllFilters();
    });
}
loadCategoriesFromFirms();