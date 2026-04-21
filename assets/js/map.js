let map;
let userLoc;
let firmMarkers = [];
let infoWindow;
let routePolylines = [];
let allFirms = [];
const placeDetailsCache = new Map();
const routeInfoCache = new Map();
let resizeListenerBound = false;
let resizeTimer = null;

const MAX_NEAREST = 5;

let AdvancedMarkerElement;
let PinElement;
let Place;
let Route;

/* ================================
   MAP PAGE (user location)
================================ */
async function initMap() {
  await google.maps.importLibrary("maps");
  ({ AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker"));
  ({ Place } = await google.maps.importLibrary("places"));
  ({ Route } = await google.maps.importLibrary("routes"));

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async pos => {
      userLoc = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };

      map = new google.maps.Map(document.getElementById("map"), {
        zoom: 13,
        center: userLoc,
        mapId: "5d0d411188b9e0b219ec6bb7",
        fullscreenControl: false,
        mapTypeControl: false,
        streetViewControl: false
      });

      infoWindow = new google.maps.InfoWindow();

      const userPin = new PinElement({
        background: "#1e88e5",
        borderColor: "#1e88e5",
        glyphColor: "#fff"
      });

      new AdvancedMarkerElement({
        map,
        position: userLoc,
        title: "You are here",
        content: userPin
      });

      if (!resizeListenerBound) {
        window.addEventListener("resize", scheduleMapResize);
        window.addEventListener("orientationchange", scheduleMapResize);
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) scheduleMapResize();
        });
        resizeListenerBound = true;
      }

      loadNearestList();
    });
  }
}

/* ================================
   LAWYER DETAILS MAP (firm location)
================================ */
async function initLawyerMap() {
  await google.maps.importLibrary("maps");
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

  const mapEl = document.getElementById("map");
  if (!mapEl || !window.selectedFirmLocation) return;

  const { lat, lng, name } = window.selectedFirmLocation;

  map = new google.maps.Map(mapEl, {
    center: { lat, lng },
    zoom: 15,
    mapId: "5d0d411188b9e0b219ec6bb7",
    fullscreenControl: false,
    mapTypeControl: false,
    streetViewControl: false
  });

  new AdvancedMarkerElement({
    map,
    position: { lat, lng },
    title: name
  });
}

/* ================================
   ROUTE + LIST FUNCTIONS
================================ */
function loadNearestList() {
  fetch("../assets/data/firms.json")
    .then(res => res.json())
    .then(firms => {
      allFirms = firms;
      updateMarkersByType({});
    });
}

function updateMarkersByType(filters) {
  if (!allFirms.length || !userLoc) return 0;

  const active = filters || {};
  const selectedTypes = Array.isArray(active.types) ? active.types : [];
  const scope = active.scope === "all" ? "all" : "nearest";
  const selectedCity = (active.city || "").toLowerCase();
  const selectedBudget = (active.budget || "").toLowerCase();
  const selectedAvailability = active.available;

  let list = allFirms.filter(f => {
    const types = Array.isArray(f.custom?.type) ? f.custom.type : [];
    const city = (f.city || "").toLowerCase();
    const budget = (f.custom?.budget || "").toLowerCase();
    const available = !!f.custom?.available;

    const typeOk =
      !selectedTypes.length ||
      types.some(t => selectedTypes.includes(t));

    const cityOk = !selectedCity || city === selectedCity;
    const budgetOk = !selectedBudget || budget === selectedBudget;

    let availabilityOk = true;
    if (selectedAvailability === "true") availabilityOk = available === true;
    if (selectedAvailability === "false") availabilityOk = available === false;

    return typeOk && cityOk && budgetOk && availabilityOk;
  });

  const withDistance = list.map(f => ({
    ...f,
    distance: haversine(userLoc, { lat: f.lat, lng: f.lng })
  }));

  withDistance.sort((a, b) => a.distance - b.distance);

  const resultLimit = scope === "all"
    ? withDistance.length
    : (selectedTypes.length ? 1 : MAX_NEAREST);
  const visibleList = withDistance.slice(0, resultLimit);
  renderNearestMarkers(visibleList);
  return visibleList.length;
}

function renderNearestMarkers(list) {
  firmMarkers.forEach(m => (m.map = null));
  firmMarkers = [];

  list.forEach(firm => {
    const marker = new AdvancedMarkerElement({
      map,
      position: { lat: firm.lat, lng: firm.lng },
      title: `${firm.name} (${firm.distance.toFixed(2)} km)`
    });

    marker.addListener("gmp-click", async () => {
      await showRoute(userLoc, { lat: firm.lat, lng: firm.lng }, firm);
      showPlaceCard(firm, marker);
    });

    firmMarkers.push(marker);
  });

  fitMapToVisibleMarkers();
}

async function showPlaceCard(firm, marker) {
  const placeId = firm.placeId;

  if (!placeId) {
    infoWindow.setContent(buildCardHtml(firm, null));
    infoWindow.open({ map, anchor: marker });
    return;
  }

  let place = placeDetailsCache.get(placeId);

  if (!place) {
    try {
      place = new Place({ id: placeId });
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
      placeDetailsCache.set(placeId, place);
    } catch (err) {
      console.warn("Invalid placeId or fetchFields failed:", placeId, err);
      place = null;
    }
  }

  infoWindow.setContent(buildCardHtml(firm, place));
  infoWindow.open({ map, anchor: marker });
}

function buildCardHtml(firm, place) {
  const custom = firm.custom || {};
  const name =
    place?.displayName?.text ||
    place?.displayName ||
    firm.name;
  const escapeHtml = value => String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const rating = place?.rating ? `${place.rating} ★` : "N/A";
  const reviews = place?.userRatingCount ? `(${place.userRatingCount})` : "";
  const address = place?.formattedAddress || custom.address || "";
  const phone =
    place?.nationalPhoneNumber ||
    place?.internationalPhoneNumber ||
    custom.phone ||
    "";
  const typeText = Array.isArray(custom.type) ? custom.type.join(", ") : (custom.type || "");
  const typeDisplay = typeText || "Not specified";
  const safeTypeTitle = escapeHtml(typeDisplay);
  const isAvailable = custom.available !== false;
  const availabilityText = isAvailable ? "Available" : "Unavailable";
  const availabilityClass = isAvailable ? "" : " offline";

  const key = firm.placeId || `${firm.lat},${firm.lng}`;
  const routeInfo = routeInfoCache.get(key);
  const etaText = routeInfo?.duration || "";
  const distanceText = routeInfo?.distance || "";
  const routeSummary = [etaText, distanceText].filter(Boolean).join(" • ") || "Tap marker to preview route";

  const origin = userLoc ? `${userLoc.lat},${userLoc.lng}` : "";
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

async function showRoute(origin, destination, firm) {
  clearRoute();

  try {
    const { routes } = await Route.computeRoutes({
      origin,
      destination,
      travelMode: "DRIVING",
      fields: ["path", "localizedValues", "distanceMeters", "durationMillis"]
    });

    if (!routes || routes.length === 0) return;

    const route = routes[0];

    const key = firm?.placeId || `${destination.lat},${destination.lng}`;
    const lv = route.localizedValues;

    const durationText = lv?.duration?.text || lv?.duration || "";
    const distanceText = lv?.distance?.text || lv?.distance || "";
    const fallbackDistance =
      !distanceText && route.distanceMeters
        ? `${(route.distanceMeters / 1000).toFixed(1)} km`
        : "";

    routeInfoCache.set(key, {
      duration: durationText,
      distance: distanceText || fallbackDistance
    });

    routePolylines = route.createPolylines();
    routePolylines.forEach(poly => {
      poly.setOptions({
        strokeColor: "#1E88E5",
        strokeOpacity: 0.9,
        strokeWeight: 5
      });
      poly.setMap(map);
    });
  } catch (err) {
    console.error("Route.computeRoutes failed:", err);
  }
}

function clearRoute() {
  routePolylines.forEach(p => p.setMap(null));
  routePolylines = [];
}

function fitMapToVisibleMarkers() {
  if (!map || !google?.maps?.LatLngBounds) return;

  const bounds = new google.maps.LatLngBounds();
  let points = 0;

  if (userLoc) {
    bounds.extend(userLoc);
    points += 1;
  }

  firmMarkers.forEach(marker => {
    if (!marker?.position) return;
    bounds.extend(marker.position);
    points += 1;
  });

  if (!points) return;

  if (points === 1 && userLoc) {
    map.setCenter(userLoc);
    map.setZoom(13);
    return;
  }

  map.fitBounds(bounds, 80);
  if (map.getZoom() > 14) {
    map.setZoom(14);
  }
}

function scheduleMapResize() {
  if (!map) return;
  if (resizeTimer) window.clearTimeout(resizeTimer);

  resizeTimer = window.setTimeout(() => {
    google.maps.event.trigger(map, "resize");
    fitMapToVisibleMarkers();
  }, 120);
}

function haversine(a, b) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

window.initMap = initMap;
window.initLawyerMap = initLawyerMap;
window.updateMarkersByType = updateMarkersByType;
window.requestMapResize = scheduleMapResize;