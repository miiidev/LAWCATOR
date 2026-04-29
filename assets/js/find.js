const listEl = document.getElementById("lawyerList");
const typeSearch = document.getElementById("typeSearch");
const suggestionsEl = document.getElementById("typeSuggestions");
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
  activeIndex: -1
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
    cityFilter,
    uniqSorted(firms.map(f => f.city).filter(Boolean)),
    "All cities"
  );

  fillSelect(
    budgetFilter,
    uniqSorted(firms.map(f => f.custom?.budget).filter(Boolean)),
    "All budgets"
  );

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

[cityFilter, budgetFilter, availabilityFilter, sortFilter].forEach(el => {
  if (!el) return;
  el.addEventListener("change", renderList);
});

if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener("click", () => {
    typeSearch.value = "";
    if (typeaheadInstance && typeof typeaheadInstance.syncPlaceholderVisibility === "function") {
      typeaheadInstance.syncPlaceholderVisibility();
    }

    if (cityFilter) cityFilter.value = "";
    if (budgetFilter) budgetFilter.value = "";
    if (availabilityFilter) availabilityFilter.value = "";
    if (sortFilter) sortFilter.value = "rating";

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

  if (cityFilter && cityFilter.value) {
    merged = merged.filter(l => l.firm?.city === cityFilter.value);
  }

  if (availabilityFilter && availabilityFilter.value) {
    const requiredAvailability = availabilityFilter.value === "true";
    merged = merged.filter(l =>
      Boolean(l.firm?.custom?.availability) === requiredAvailability
    );
  }

  if (sortFilter.value === "name") {
    merged.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    merged.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  listEl.innerHTML = merged.map(l => {
    const firm = l.firm || {};
    const city = firm.city || "N/A";
    const budget = firm.custom?.budget || "N/A";
    const firmName = firm.name || "Unknown Firm";
    const rating = l.rating || "N/A";
    const image = l.profile_image || "lawyer.jpg";

    return `
      <a class="card lawyer-card" href="lawyer-details.html?id=${l.id}">
        <img src="../assets/images/${image}" alt="${l.name}">
        <h3>${l.name}</h3>
        <p>${firmName}</p>
        <p>${city}</p>
        <p class="type-line">
          <span class="type-text">${(l.type || []).join(", ")}</span>
        </p>
        <p>Rating: ${rating}</p>
        <p>Budget: ${budget}</p>
        <span class="btn-link">View Details</span>
      </a>
    `;
  }).join("");
}