const listEl = document.getElementById("lawyerList");
const typeSearch = document.getElementById("typeSearch");
const suggestionsEl = document.getElementById("typeSuggestions");
const budgetFilter = document.getElementById("budgetFilter");
const sortFilter = document.getElementById("sortFilter");
const typeSearchForm = document.getElementById("typeSearchForm");

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

// init fuse once
FuseSearch.init(categories);

Promise.all([
  fetch("../assets/data/lawyers.json").then(res => res.json()),
  fetch("../assets/data/firms.json").then(res => res.json())
]).then(([lawyerData, firmData]) => {
  lawyers = lawyerData;
  firms = firmData;
  renderList();
});

// realtime suggestions
typeSearch.addEventListener("input", () => {
  const q = typeSearch.value.trim();
  const results = FuseSearch.search(q, 6);

  suggestionsEl.innerHTML = results
    .map(item => `<li class="suggestion-item">${item}</li>`)
    .join("");

  renderList();
});

typeSearchForm.addEventListener("submit", e => {
  e.preventDefault();
  renderList();
});

suggestionsEl.addEventListener("click", e => {
  if (e.target.classList.contains("suggestion-item")) {
    typeSearch.value = e.target.textContent;
    suggestionsEl.innerHTML = "";
    renderList();
  }
});

[budgetFilter, sortFilter].forEach(el =>
  el.addEventListener("change", renderList)
);

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