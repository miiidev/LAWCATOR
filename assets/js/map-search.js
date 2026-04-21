const typeSearch = document.getElementById("typeSearch");
const typeSuggestions = document.getElementById("typeSuggestions");
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

const fuse = new Fuse(categories, {
    threshold: 0.3,
    ignoreLocation: true
});

function applySearch() {
    const q = typeSearch.value.trim();
    const matches = q ? fuse.search(q).map(r => r.item) : [];
    window.updateMarkersByType(matches);
}

typeSearch.addEventListener("input", () => {
    const q = typeSearch.value.trim();

    if (!q) {
        typeSuggestions.innerHTML = "";
        window.updateMarkersByType([]);
        return;
    }

    const results = fuse.search(q).slice(0, 6).map(r => r.item);

    typeSuggestions.innerHTML = results
        .map(item => `<li class="suggestion-item">${item}</li>`)
        .join("");

    applySearch();
});

typeSuggestions.addEventListener("click", e => {
    if (e.target.classList.contains("suggestion-item")) {
        typeSearch.value = e.target.textContent;
        typeSuggestions.innerHTML = "";
        applySearch();
    }
});

typeSearchForm.addEventListener("submit", e => {
    e.preventDefault();
    typeSuggestions.innerHTML = "";
    applySearch();
});