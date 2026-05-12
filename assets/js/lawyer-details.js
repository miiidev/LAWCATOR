const params = new URLSearchParams(window.location.search);
const lawyerId = params.get("id");

let selectedFirm = null;
let mapReady = false;
let lawyerMap = null;
let lawyerMarker = null;
let lawyerUserMarker = null;
let lawyerInfoWindow = null;
let lawyerRouteSummary = null;
let lawyerUserLoc = null;
let lawyerUserLocRequest = null;
let lawyerRoutePolylines = [];
let lawyerRouteRequestId = 0;
let activeModal = null;
let lastModalTrigger = null;
let toastTimerId = null;

let LawyerAdvancedMarkerElement;
let LawyerPinElement;
let LawyerPlace;
let LawyerRoute;

const lawyerPlaceDetailsCache = new Map();

const demoToast = document.querySelector("[data-demo-toast]");

function isGoogleMapsReady() {
    return !!(window.google && window.google.maps && typeof window.google.maps.importLibrary === "function");
}

function requestMapRender(retryCount = 0) {
    if (!selectedFirm) return;

    if (isGoogleMapsReady()) {
        renderMap();
        return;
    }

    if (retryCount >= 40) return;

    window.setTimeout(() => {
        requestMapRender(retryCount + 1);
    }, 150);
}

// initialize shared UI behaviors
if (window.UI && UI.accordion) {
    UI.accordion.init();
}

const refreshAccordionHeights = () => {
    if (window.UI && UI.accordion) UI.accordion.refresh();
};

function showDemoToast(message) {
    if (!demoToast) return;

    window.clearTimeout(toastTimerId);
    demoToast.textContent = message;
    demoToast.hidden = false;

    window.requestAnimationFrame(() => {
        demoToast.classList.add("is-visible");
    });

    toastTimerId = window.setTimeout(() => {
        demoToast.classList.remove("is-visible");
        window.setTimeout(() => {
            demoToast.hidden = true;
        }, 220);
    }, 2600);
}

// initialize generic modal handling and wire demo form behavior
if (window.UI && UI.modals) UI.modals.init();

const bookingForm = document.querySelector("[data-booking-form]");
if (bookingForm) {
    bookingForm.addEventListener("submit", (event) => {
        event.preventDefault();
        showDemoToast("Demo booking submitted. No real appointment was created.");
        bookingForm.reset();
        if (window.UI && UI.modals) UI.modals.close(UI.modals.getModalById("book-consultation"));
    });
}

const messageForm = document.querySelector("[data-message-form]");
const messageInput = document.querySelector("[data-message-input]");
if (messageForm && messageInput) {
    messageForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!messageInput.value.trim()) {
            messageInput.focus();
            messageInput.reportValidity();
            return;
        }
        showDemoToast("Demo message sent. It was not delivered to a live inbox.");
        messageInput.value = "";
        messageInput.focus();
    });
}

function initLawyerMap() {
    mapReady = true;

    // If data already loaded, draw immediately
    if (selectedFirm) requestMapRender();
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

    // Expose firm location for map.js (shared map file)
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

    const typeList = (Array.isArray(lawyer.type) ? lawyer.type : [lawyer.type])
        .flatMap((type) => String(type || "").split(","))
        .map((type) => type.trim())
        .filter(Boolean);
    const specialties = Array.isArray(lawyer.specialties) ? lawyer.specialties.filter(Boolean) : [];
    const specialtyText = specialties.length ? specialties.join(" • ") : (typeList.join(" • ") || "N/A");
    const languages = Array.isArray(lawyer.languages) ? lawyer.languages.filter(Boolean) : [];
    const languagesText = languages.length ? languages.join(", ") : "N/A";
    const feeCurrency = lawyer.fees?.currency || "MYR";
    const formatFee = (value) => {
        if (!Number.isFinite(Number(value))) return "N/A";

        try {
            return new Intl.NumberFormat("en-MY", {
                style: "currency",
                currency: feeCurrency
            }).format(Number(value));
        } catch {
            return `${feeCurrency} ${Number(value).toLocaleString("en-MY")}`;
        }
    };
    const consultationFee = formatFee(lawyer.fees?.consultation_fee);
    const hourlyRate = formatFee(lawyer.fees?.hourly_rate);
    const email = lawyer.contact?.email || "N/A";
    const availabilityDays = Array.isArray(lawyer.availability?.days) && lawyer.availability.days.length
        ? lawyer.availability.days.join(", ")
        : "N/A";
    const availabilityHours = lawyer.availability?.hours || "N/A";

    document.querySelector(".lawyer-info h2").textContent = lawyer.name;
    document.querySelector(".lawyer-specialty").textContent = `Specialty: ${specialtyText}`;
    document.querySelector(".lawyer-location").textContent = `📍 ${city}`;

    document.querySelector(".lawyer-meta").innerHTML = `
    <span>⭐ ${lawyer.rating || "N/A"}</span>
    <span>💼 ${lawyer.experience_years || "N/A"} years experience</span>
    <span>🗣️ ${languagesText}</span>
    <span>🕒 ${availabilityHours}</span>
    <span>💳 Consult: ${consultationFee}</span>
    <span>✉️ ${email}</span>
  `;

    document.querySelector(".lawyer-section.about p").textContent =
        lawyer.biography  || "No biography available.";

        const feeGrid = document.querySelector(".fee-grid");
        if (feeGrid) {
                feeGrid.innerHTML = `
                <div class="fee-card">
                    <span class="fee-label">Consultation Fee</span>
                    <span class="fee-value">${consultationFee}</span>
                </div>
                <div class="fee-card">
                    <span class="fee-label">Hourly Rate</span>
                    <span class="fee-value">${hourlyRate}</span>
                </div>
                <div class="fee-card">
                    <span class="fee-label">Currency</span>
                    <span class="fee-value">${feeCurrency || "N/A"}</span>
                </div>
            `;
        }

    const serviceTypes = typeList;

    const serviceList = document.querySelector(".service-list");
    if (serviceList) {
        serviceList.classList.toggle("is-scrollable", serviceTypes.length > 10);
    }

    serviceList.innerHTML =
        serviceTypes.map((type) => `<li>${type}</li>`).join("");

        document.querySelector(".availability-mon-fri").textContent =
            lawyer.availability?.mon_fri || `Days: ${availabilityDays}`;
        document.querySelector(".availability-sat").textContent =
            lawyer.availability?.sat || `Hours: ${availabilityHours}`;

        document.querySelector(".contact-phone").textContent = phone;
        document.querySelector(".contact-address").textContent = address;

        refreshAccordionHeights();

    if (mapReady || isGoogleMapsReady()) requestMapRender();
});

async function renderMap() {
    if (!selectedFirm || !isGoogleMapsReady()) return;

    await google.maps.importLibrary("maps");
    ({ AdvancedMarkerElement: LawyerAdvancedMarkerElement, PinElement: LawyerPinElement } = await google.maps.importLibrary("marker"));
    ({ Place: LawyerPlace } = await google.maps.importLibrary("places"));
    ({ Route: LawyerRoute } = await google.maps.importLibrary("routes"));

    const position = { lat: selectedFirm.lat, lng: selectedFirm.lng };

    if (!lawyerMap) {
        lawyerMap = new google.maps.Map(document.getElementById("map"), {
            center: position,
            zoom: 15,
            mapId: "5d0d411188b9e0b219ec6bb7", // required for advanced markers
            fullscreenControl: false,
            mapTypeControl: false,
            streetViewControl: false
        });

        lawyerInfoWindow = new google.maps.InfoWindow();
        lawyerInfoWindow.addListener("closeclick", () => {
            invalidateLawyerRoute();
            fitLawyerMapBounds();
        });
    } else {
        lawyerMap.setCenter(position);
    }

    if (lawyerMarker) {
        lawyerMarker.map = null;
    }

    lawyerMarker = new LawyerAdvancedMarkerElement({
        map: lawyerMap,
        position,
        title: selectedFirm.name
    });

    lawyerMarker.addListener("gmp-click", () => {
        updateLawyerRouteAndCard();
    });

    lawyerUserLoc = await ensureLawyerUserLocation();

    if (lawyerUserLoc) {
        placeLawyerUserMarker();
    }

    await updateLawyerRouteAndCard();
    refreshAccordionHeights();
}

function placeLawyerUserMarker() {
    if (!lawyerUserLoc || !lawyerMap || !LawyerAdvancedMarkerElement) return;

    const userPin = LawyerPinElement
        ? new LawyerPinElement({
            background: window.MapTheme?.getPinBackground?.() || "#d7d7d7",
            borderColor: window.MapTheme?.getPinBorder?.() || "#8a8a8a",
            glyphColor: window.MapTheme?.getPinGlyph?.() || "#101010"
        })
        : null;

    if (!lawyerUserMarker) {
        lawyerUserMarker = new LawyerAdvancedMarkerElement({
            map: lawyerMap,
            position: lawyerUserLoc,
            title: "You are here",
            ...(userPin ? { content: userPin } : {})
        });
        return;
    }

    lawyerUserMarker.position = lawyerUserLoc;
    lawyerUserMarker.map = lawyerMap;
    if (userPin) {
        lawyerUserMarker.content = userPin;
    }
}

async function ensureLawyerUserLocation() {
    if (lawyerUserLoc) return lawyerUserLoc;
    if (lawyerUserLocRequest) return lawyerUserLocRequest;

    if (!navigator.geolocation) return null;

    lawyerUserLocRequest = new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                lawyerUserLoc = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                lawyerUserLocRequest = null;
                resolve(lawyerUserLoc);
            },
            () => {
                lawyerUserLocRequest = null;
                resolve(null);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 30000
            }
        );
    });

    return lawyerUserLocRequest;
}

function clearLawyerRoute() {
    lawyerRoutePolylines.forEach((polyline) => polyline.setMap(null));
    lawyerRoutePolylines = [];
}

function invalidateLawyerRoute() {
    lawyerRouteRequestId += 1;
    clearLawyerRoute();
    lawyerRouteSummary = null;
}

function fitLawyerMapBounds() {
    if (!lawyerMap || !selectedFirm || !google?.maps?.LatLngBounds) return;

    const destination = { lat: selectedFirm.lat, lng: selectedFirm.lng };

    if (!lawyerUserLoc) {
        lawyerMap.setCenter(destination);
        lawyerMap.setZoom(15);
        return;
    }

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(lawyerUserLoc);
    bounds.extend(destination);
    lawyerMap.fitBounds(bounds, 80);

    if (lawyerMap.getZoom() > 14) {
        lawyerMap.setZoom(14);
    }
}

async function fetchPlaceDetails(firm) {
    const placeId = firm?.placeId;
    if (!placeId || !LawyerPlace) return null;

    let place = lawyerPlaceDetailsCache.get(placeId);
    if (place) return place;

    try {
        place = new LawyerPlace({ id: placeId });
        await place.fetchFields({
            fields: [
                "displayName",
                "formattedAddress",
                "rating",
                "userRatingCount",
                "nationalPhoneNumber",
                "internationalPhoneNumber"
            ]
        });
        lawyerPlaceDetailsCache.set(placeId, place);
        return place;
    } catch (err) {
        console.warn("Unable to fetch place details:", placeId, err);
        return null;
    }
}

async function drawLawyerRoute(origin, destination, requestId) {
    clearLawyerRoute();
    lawyerRouteSummary = null;

    if (!LawyerRoute) return;

    try {
        const { routes } = await LawyerRoute.computeRoutes({
            origin,
            destination,
            travelMode: "DRIVING",
            fields: ["path", "localizedValues", "distanceMeters", "durationMillis"]
        });

        if (!routes || !routes.length) {
            fitLawyerMapBounds();
            return;
        }

        if (requestId !== lawyerRouteRequestId) {
            return;
        }

        const route = routes[0];
        const localized = route.localizedValues;
        const durationText = localized?.duration?.text || localized?.duration || "";
        const distanceText = localized?.distance?.text || localized?.distance || "";
        const fallbackDistance =
            !distanceText && route.distanceMeters
                ? `${(route.distanceMeters / 1000).toFixed(1)} km`
                : "";

        lawyerRouteSummary = {
            duration: durationText,
            distance: distanceText || fallbackDistance
        };

        lawyerRoutePolylines = route.createPolylines();
        lawyerRoutePolylines.forEach((polyline) => {
            polyline.setOptions({
                strokeColor: window.MapTheme?.getRouteColor?.() || "#0000ff",
                strokeOpacity: 0.9,
                strokeWeight: 5
            });
            polyline.setMap(lawyerMap);
        });

        fitLawyerMapBounds();
    } catch (err) {
        console.error("Route.computeRoutes failed on lawyer-details:", err);
        fitLawyerMapBounds();
    }
}

function buildLawyerCardHtml(firm, place) {
    const custom = firm.custom || {};
    const name = place?.displayName?.text || place?.displayName || firm.name;
    const escapeHtml = (value) => String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const rating = place?.rating ? `${place.rating} ★` : "N/A";
    const reviews = place?.userRatingCount ? `(${place.userRatingCount})` : "";
    const address = place?.formattedAddress || custom.address || "";
    const phone = place?.nationalPhoneNumber || place?.internationalPhoneNumber || custom.phone || "";
    const typeText = Array.isArray(custom.type) ? custom.type.join(", ") : (custom.type || "");
    const typeDisplay = typeText || "Not specified";
    const safeTypeTitle = escapeHtml(typeDisplay);
    const isAvailable = custom.available !== false;
    const availabilityText = isAvailable ? "Available" : "Unavailable";
    const availabilityClass = isAvailable ? "" : " offline";
    const routeSummary = lawyerRouteSummary
        ? [lawyerRouteSummary.duration, lawyerRouteSummary.distance].filter(Boolean).join(" • ")
        : "Allow location to see live ETA";

    const origin = lawyerUserLoc ? `${lawyerUserLoc.lat},${lawyerUserLoc.lng}` : "";
    const destination = `${firm.lat},${firm.lng}`;
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
    const wazeUrl = `https://waze.com/ul?ll=${encodeURIComponent(destination)}&navigate=yes`;

    return `
    <div class="basic-card">
      <div class="basic-card-header">
        <div class="basic-title" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
        <div class="basic-pill${availabilityClass}">${availabilityText}</div>
      </div>

      <div class="basic-meta-row">
        <span>${escapeHtml(rating)} ${escapeHtml(reviews)}</span>
        <span class="basic-dot">•</span>
        <span>${escapeHtml(routeSummary)}</span>
      </div>

      <div class="basic-service-row">
        <span class="basic-label">Services</span>
        <span class="type-line" title="${safeTypeTitle}">${escapeHtml(typeDisplay)}</span>
      </div>

      <div class="basic-sub">${escapeHtml(address || "Address not available")}</div>
      <div class="basic-sub">${escapeHtml(phone || "Phone not available")}</div>

      <div class="basic-actions">
        <a class="nav-btn nav-btn-primary" href="${googleMapsUrl}" target="_blank" rel="noopener">Google Maps</a>
        <a class="nav-btn" href="${wazeUrl}" target="_blank" rel="noopener">Waze</a>
      </div>
    </div>
  `;
}

async function updateLawyerRouteAndCard() {
    if (!selectedFirm || !lawyerMap || !lawyerMarker || !lawyerInfoWindow) return;

    if (!lawyerUserLoc) {
        lawyerUserLoc = await ensureLawyerUserLocation();
        if (lawyerUserLoc) {
            placeLawyerUserMarker();
        }
    }

    const destination = { lat: selectedFirm.lat, lng: selectedFirm.lng };
    const place = await fetchPlaceDetails(selectedFirm);
    const requestId = ++lawyerRouteRequestId;

    if (lawyerUserLoc) {
        await drawLawyerRoute(lawyerUserLoc, destination, requestId);
    } else {
        invalidateLawyerRoute();
        fitLawyerMapBounds();
    }

    lawyerInfoWindow.setContent(buildLawyerCardHtml(selectedFirm, place));
    lawyerInfoWindow.open({ map: lawyerMap, anchor: lawyerMarker });
}

window.initLawyerMap = initLawyerMap;
