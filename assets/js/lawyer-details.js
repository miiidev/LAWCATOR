const params = new URLSearchParams(window.location.search);
const lawyerId = params.get("id");

let selectedFirm = null;
let mapReady = false;

function initLawyerMap() {
    mapReady = true;

    // If data already loaded, draw immediately
    if (selectedFirm) renderMap();
}

Promise.all([
    fetch("../assets/data/lawyers.json").then(r => r.json()),
    fetch("../assets/data/firms.json").then(r => r.json())
]).then(([lawyers, firms]) => {
    const firmMap = new Map(firms.map(f => [f.firmId, f]));
    const lawyer = lawyers.find(l => l.id === lawyerId);

    if (!lawyer) {
        document.querySelector("main").innerHTML = "<p>Lawyer not found.</p>";
        return;
    }

    selectedFirm = firmMap.get(lawyer.firmId) || null;

    // ✅ expose firm location for map.js (shared map file)
    if (selectedFirm) {
        window.selectedFirmLocation = {
            lat: selectedFirm.lat,
            lng: selectedFirm.lng,
            name: selectedFirm.name
        };
    }

    const phone = lawyer.contact?.phone || selectedFirm?.custom?.phone || "N/A";
    const city = selectedFirm?.city || "N/A";
    const address = selectedFirm?.custom?.address || "N/A";
    const image = lawyer.profile_image || "lawyer.jpg";

    document.querySelector(".lawyer-avatar img").src = `../assets/images/${image}`;
    document.querySelector(".lawyer-avatar img").alt = lawyer.name;

    document.querySelector(".lawyer-info h2").textContent = lawyer.name;
    document.querySelector(".lawyer-specialty").textContent = (lawyer.type || []).join(" • ");
    document.querySelector(".lawyer-location").textContent = `📍 ${city}`;

    document.querySelector(".lawyer-meta").innerHTML = `
    <span>⭐ ${lawyer.rating || "N/A"}</span>
    <span>💼 ${lawyer.experience_years || "N/A"} years experience</span>
  `;

    document.querySelector(".lawyer-section.about p").textContent =
        lawyer.bio || "No biography available.";

    document.querySelector(".service-list").innerHTML =
        (lawyer.type || []).map(t => `<li>${t}</li>`).join("");

    document.querySelector(".lawyer-section.availability").innerHTML = `
    <h3>Availability</h3>
    <p>${lawyer.availability?.mon_fri || "Mon–Fri: N/A"}</p>
    <p>${lawyer.availability?.sat || "Sat: N/A"}</p>
  `;

    document.querySelector(".lawyer-section.contact").innerHTML = `
    <h3>Contact</h3>
    <p>${phone}</p>
    <p>${address}</p>
  `;

    if (mapReady) renderMap();
});

async function renderMap() {
    if (!selectedFirm) return;

    await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    const position = { lat: selectedFirm.lat, lng: selectedFirm.lng };

    const map = new google.maps.Map(document.getElementById("map"), {
        center: position,
        zoom: 15,
        mapId: "5d0d411188b9e0b219ec6bb7", // required for advanced markers
        fullscreenControl: false,
        mapTypeControl: false,
        streetViewControl: false
    });

    new AdvancedMarkerElement({
        map,
        position,
        title: selectedFirm.name
    });
}

window.initLawyerMap = initLawyerMap;