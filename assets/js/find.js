const listEl = document.getElementById("lawyerList");
const typeSearch = document.getElementById("typeSearch");
const suggestionsEl = document.getElementById("typeSuggestions");
const stateFilter = document.getElementById("stateFilter");
const cityFilter = document.getElementById("cityFilter");
const budgetFilter = document.getElementById("budgetFilter");
const availabilityFilter = document.getElementById("availabilityFilter");
const sortFilter = document.getElementById("sortFilter");
const clearFiltersBtn = document.getElementById("clearFilters");
const typeSearchForm = document.getElementById("typeSearchForm");
const searchBar = typeSearch ? typeSearch.closest(".search-bar") : null;

const PLACEHOLDER_MESSAGES = [
  "Search legal category...",
  "Try: Family Law",
  "Try: Property Disputes",
  "Try: Corporate Advisory",
  "Try: Criminal Defense"
];
const PLACEHOLDER_INTERVAL_MS = 3200;

const state = {
  activeIndex: -1,
  currentPage: 1,
  itemsPerPage: 9
};

const categories = [
  "Accidents and Personal Injury Claims",
  "Administrative and Constitutional Law",
  "Arbitration and Alternate Dispute Resolution",
  "Aviation",
  "Banking, Finance and Securities",
  "Commercial Arbitration",
  "Commercial Crime",
  "Commisioner for Oaths",
  "Competition Law and Antitrust",
  "Construction Adjudication",
  "Consumer Protection",
  "Contentious Probate Proceedings",
  "Contractual Disputes",
  "Conveyancing and Properties",
  "Copyright",
  "Corporate and Commercial",
  "Corporate Compliance and Regulatory Issues",
  "Corporate Disputes",
  "Criminal",
  "Customs and Immigration",
  "Cybercrime",
  "Debt Recovery",
  "Defamation",
  "Disciplinary Proceedings",
  "Election",
  "Employment",
  "Energy, Natural Resources and Green Technology",
  "Environment and Climate Change",
  "Environmental, Social and Governance (ESG)",
  "Extradition and Mutual Assistance",
  "Family",
  "Family Court",
  "Family Mediation",
  "Faraid",
  "Fraud and Asset Recovery",
  "General and Civil Litigation",
  "Hibah and Wasiat",
  "Human Rights",
  "Incorporation of Companies",
  "Infrastructure and Projects",
  "Insolvency and Winding Up",
  "Insurance",
  "Insurance and Reinsurance",
  "Intellectual Property",
  "International",
  "Islamic Finance",
  "Land Disputes",
  "Media and Entertainment",
  "Mediation",
  "Medical Negligence",
  "Mergers and Acquisitions",
  "Notary Public",
  "Offences Affecting the Human Body",
  "Offences against Property",
  "Patent",
  "Personal Data Protection and Privacy",
  "Professional Conduct and Discipline",
  "Professional Negligence",
  "Shipping and Admiralty",
  "Sports Arbitration",
  "Syariah",
  "Tax",
  "Technology and Communications",
  "Trademark",
  "Trusts and Other Legal Arrangements",
  "Wealth Management",
  "Wealth Management, Inheritance and Succession Planning",
  "Wills, Probate and Estate Administration"
];

let lawyers = [];
let firms = [];

function uniqSorted(arr) {
  return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
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

// wire up shared typeahead
let typeaheadInstance = null;
typeaheadInstance = createTypeahead({
  input: typeSearch,
  suggestions: suggestionsEl,
  form: typeSearchForm,
  placeholderMessages: PLACEHOLDER_MESSAGES,
  placeholderIntervalMs: PLACEHOLDER_INTERVAL_MS,
  fetchSuggestions(q) {
    return FuseSearch.search(q, 6);
  },
  onSelect(value) {
    typeSearch.value = value;
    typeaheadInstance.syncPlaceholderVisibility();
    typeaheadInstance.closeSuggestions();
    renderList();
  },
  onApply(q, results) {
    renderSuggestions(results);
    renderList();
  }
});

function startPlaceholderShuffle() {
  if (typeaheadInstance && typeof typeaheadInstance.startPlaceholderShuffle === 'function') {
    typeaheadInstance.startPlaceholderShuffle();
  }
}

function closeSuggestions() {
  suggestionsEl.innerHTML = "";
  state.activeIndex = -1;
  typeSearch.setAttribute("aria-expanded", "false");
  typeSearch.removeAttribute("aria-activedescendant");
}

function renderSuggestions(items) {
  if (!items.length) {
    closeSuggestions();
    return;
  }

  suggestionsEl.innerHTML = items
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

function applySearch(rawQuery) {
  const q = String(rawQuery || "").trim();
  if (!q) {
    closeSuggestions();
    renderList();
    return;
  }

  const results = FuseSearch.search(q, 6);
  renderSuggestions(results);
  renderList();
}

// init fuse once
FuseSearch.init(categories);

Promise.all([
  fetch("../assets/data/lawyers.json").then(res => res.json()),
  fetch("../assets/data/firms.json").then(res => res.json())
]).then(([lawyerData, firmData]) => {
  lawyers = lawyerData;
  firms = firmData;

  fillSelect(
    stateFilter,
    uniqSorted(firms.map(f => f.state).filter(Boolean)),
    "All states"
  );

  syncCityOptionsForState();

  fillSelect(
    budgetFilter,
    uniqSorted(firms.map(f => f.custom?.budget).filter(Boolean)),
    "All budgets"
  );

  // Check URL parameters for initial filters (e.g. from the interactive map)
  const urlParams = new URLSearchParams(window.location.search);
  const stateParam = urlParams.get('state');
  if (stateParam && stateFilter) {
    // Attempt to match the state
    const stateExists = Array.from(stateFilter.options).some(opt => opt.value === stateParam);
    if (stateExists) {
      stateFilter.value = stateParam;
    }
  }

  syncCityOptionsForState();

  renderList();
});

// legacy functions kept for compatibility with other code in this file
function renderSuggestions(items) {
  if (!items || !items.length) {
    if (typeaheadInstance) typeaheadInstance.closeSuggestions();
    return;
  }

  suggestionsEl.innerHTML = items
    .map((item, idx) => (
      '<li class="suggestion-item" id="type-suggestion-' + idx + '" role="option" aria-selected="false" data-index="' + idx + '" data-value="' + escapeHtml(item) + '">' +
      '<span class="suggestion-main">' + highlightLabel(item, typeSearch.value) + "</span>" +
      '<span class="suggestion-hint">Category</span>' +
      "</li>"
    ))
    .join("");
}

if (stateFilter) {
  stateFilter.addEventListener("change", () => {
    syncCityOptionsForState();
    renderList();
  });
}

[cityFilter, budgetFilter, availabilityFilter, sortFilter].forEach(el => {
  if (!el) return;
  el.addEventListener("change", () => {
    state.currentPage = 1;
    renderList();
  });
});

if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener("click", () => {
    typeSearch.value = "";
    state.currentPage = 1;
    if (typeaheadInstance && typeof typeaheadInstance.syncPlaceholderVisibility === "function") {
      typeaheadInstance.syncPlaceholderVisibility();
    }

    if (stateFilter) stateFilter.value = "";
    syncCityOptionsForState();
    if (cityFilter) cityFilter.value = "";
    if (budgetFilter) budgetFilter.value = "";
    if (availabilityFilter) availabilityFilter.value = "";
    if (sortFilter) sortFilter.value = "rating-desc";

    closeSuggestions();
    renderList();
  });
}

// Mobile filter toggle functionality
const mobileFilterToggle = document.getElementById("mobileFilterToggle");
const findFiltersPanel = document.getElementById("findFiltersPanel");

function setFiltersPanelOpen(isOpen) {
  if (!findFiltersPanel || !mobileFilterToggle) return;

  findFiltersPanel.classList.toggle("is-open", isOpen);
  mobileFilterToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function closeFiltersPanel() {
  if (!findFiltersPanel || !mobileFilterToggle) return;

  if (findFiltersPanel.classList.contains("is-open")) {
    findFiltersPanel.classList.remove("is-open");
    mobileFilterToggle.setAttribute("aria-expanded", "false");
  }
}

function updateMobileFilterToggleOnResize() {
  const open = findFiltersPanel.classList.contains("is-open");
  mobileFilterToggle.setAttribute("aria-expanded", open ? "true" : "false");
}

if (mobileFilterToggle && findFiltersPanel) {
  mobileFilterToggle.addEventListener("click", () => {
    const isOpen = findFiltersPanel.classList.contains("is-open");
    setFiltersPanelOpen(!isOpen);
  });

  window.addEventListener("resize", updateMobileFilterToggleOnResize);
}

function renderPaginationControls(totalPages) {
  const paginationEl = document.getElementById("paginationControls");
  if (!paginationEl) return;

  if (totalPages <= 1) {
    paginationEl.innerHTML = "";
    return;
  }

  let html = "";
  for (let i = 1; i <= totalPages; i++) {
    html += `
      <button class="page-btn ${i === state.currentPage ? 'active' : ''}" data-page="${i}">
        ${i}
      </button>
    `;
  }
  paginationEl.innerHTML = html;

  paginationEl.querySelectorAll(".page-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      state.currentPage = parseInt(btn.dataset.page);
      renderList();
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 10);
    });
  });
}

function syncResultsGridHeight(totalPages) {
  if (!listEl) return;

  if (totalPages <= 1) {
    listEl.style.minHeight = "";
    return;
  }

  const styles = window.getComputedStyle(listEl);
  const columns = Math.max(1, styles.gridTemplateColumns.split(" ").filter(Boolean).length);
  const rows = Math.ceil(state.itemsPerPage / columns);
  const firstCard = listEl.firstElementChild;
  const rowGap = parseFloat(styles.rowGap || styles.gap || "0") || 0;
  const cardHeight = firstCard ? firstCard.getBoundingClientRect().height : 0;

  if (!cardHeight) {
    listEl.style.minHeight = "";
    return;
  }

  listEl.style.minHeight = `${(cardHeight * rows) + (rowGap * (rows - 1))}px`;
}

window.addEventListener("resize", () => {
  const totalPages = Math.ceil(listEl.children.length / state.itemsPerPage);
  syncResultsGridHeight(totalPages);
});

startPlaceholderShuffle();

function renderList() {
  const firmMap = new Map(firms.map(f => [f.firmId, f]));

  let merged = lawyers.map(l => ({
    ...l,
    firm: firmMap.get(l.firmId)
  }));

  const q = typeSearch.value.trim();
  if (q) {
    const matches = FuseSearch.search(q, 50);
    merged = merged.filter(l =>
      Array.isArray(l.type) && l.type.some(t => matches.includes(t))
    );
  }

  if (budgetFilter.value) {
    merged = merged.filter(l => l.firm?.custom?.budget === budgetFilter.value);
  }

  if (stateFilter && stateFilter.value) {
    merged = merged.filter(l => l.firm?.state === stateFilter.value);
  }

  if (cityFilter && cityFilter.value) {
    merged = merged.filter(l => l.firm?.city === cityFilter.value);
  }

  if (availabilityFilter && availabilityFilter.value) {
    const requiredAvailability = availabilityFilter.value === "true";
    merged = merged.filter(l =>
      Boolean(l.firm?.custom?.available) === requiredAvailability
    );
  }

  if (sortFilter.value === "name-asc") {
    merged.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortFilter.value === "name-desc") {
    merged.sort((a, b) => b.name.localeCompare(a.name));
  } else if (sortFilter.value === "rating-asc") {
    merged.sort((a, b) => (a.rating || 0) - (b.rating || 0));
  } else {
    merged.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  const totalItems = merged.length;
  const totalPages = Math.ceil(totalItems / state.itemsPerPage);

  if (state.currentPage > totalPages) state.currentPage = totalPages || 1;

  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const paginatedItems = merged.slice(startIndex, startIndex + state.itemsPerPage);

  listEl.innerHTML = paginatedItems.map(l => {
    const firm = l.firm || {};
    const city = firm.city || "N/A";
    const budget = firm.custom?.budget || "N/A";
    const firmName = firm.name || "Unknown Firm";
    const rawRating = l.rating;
    const rating = Number.isFinite(Number(rawRating)) ? `⭐ ${Number(rawRating).toFixed(1)}` : "N/A";
    const image = l.profile_image || "lawyer.jpg";

    return `
      <a class="card lawyer-card" href="lawyer-details.html?id=${l.id}" data-tooltip="View profile" title="View profile">
        <div><img src="../assets/images/${image}" alt="${l.name}"></div>
        <div>
        <h3>${l.name}</h3>
        <p>📍${city}</p>
        <p>
          <span>${(l.type || []).join(" • ")}</span>
        </p>
        <p>${rating}</p>
        </div>
      </a>
    `;
  }).join("");

  renderPaginationControls(totalPages);
  syncResultsGridHeight(totalPages);
}