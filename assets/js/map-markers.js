// Marker rendering and place card display
window.MapMarkers = (function () {
  const State = window.MapState;
  const Utils = window.MapUtils;

  function filterFirmsByType(filters) {
    const allFirms = State.getAllFirms();
    if (!allFirms.length) return [];

    const active = filters || {};
    const selectedTypes = Array.isArray(active.types) ? active.types : [];
    const selectedState = (active.state || "").toLowerCase();
    const selectedCity = (active.city || "").toLowerCase();
    const selectedBudget = (active.budget || "").toLowerCase();
    const selectedAvailability = active.available;

    return allFirms.filter((f) => {
      const types = Array.isArray(f.custom?.type) ? f.custom.type : [];
      const state = (f.state || "").toLowerCase();
      const city = (f.city || "").toLowerCase();
      const budget = (f.custom?.budget || "").toLowerCase();
      const available = !!f.custom?.available;

      const typeOk = !selectedTypes.length || types.some((t) => selectedTypes.includes(t));
      const stateOk = !selectedState || state === selectedState;
      const cityOk = !selectedCity || city === selectedCity;
      const budgetOk = !selectedBudget || budget === selectedBudget;

      let availabilityOk = true;
      if (selectedAvailability === "true") availabilityOk = available === true;
      if (selectedAvailability === "false") availabilityOk = available === false;

      return typeOk && stateOk && cityOk && budgetOk && availabilityOk;
    });
  }

  function renderNearestMarkers(list) {
    const AdvancedMarkerElement = State.getAdvancedMarkerElement();
    const map = State.getMap();
    const userLoc = State.getUserLoc();

    State.getFirmMarkers().forEach((m) => (m.map = null));
    State.clearFirmMarkers();

    list.forEach((firm) => {
      const marker = new AdvancedMarkerElement({
        map,
        position: { lat: firm.lat, lng: firm.lng },
        title: `${firm.name} (${firm.distance.toFixed(2)} km)`
      });

      marker.addListener("gmp-click", async () => {
        const requestId = State.incrementRouteRequestId();
        await window.MapRoute?.showRoute(userLoc, { lat: firm.lat, lng: firm.lng }, firm, requestId);
        showPlaceCard(firm, marker);
      });

      State.addFirmMarker(marker);
    });

    window.MapView?.fitMapToVisibleMarkers();
  }

  async function showPlaceCard(firm, marker) {
    const infoWindow = State.getInfoWindow();
    const placeId = firm.placeId;

    if (!placeId) {
      infoWindow.setContent(buildCardHtml(firm, null));
      infoWindow.open({ map: State.getMap(), anchor: marker });
      return;
    }

    let place = State.getPlaceDetailsCache().get(placeId);

    if (!place) {
      try {
        const Place = State.getPlace();
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
        State.getPlaceDetailsCache().set(placeId, place);
      } catch (err) {
        console.warn("Invalid placeId or fetchFields failed:", placeId, err);
        place = null;
      }
    }

    infoWindow.setContent(buildCardHtml(firm, place));
    infoWindow.open({ map: State.getMap(), anchor: marker });
  }

  function buildCardHtml(firm, place) {
    const custom = firm.custom || {};
    const name =
      place?.displayName?.text || place?.displayName || firm.name;

    const rating = place?.rating ? `${place.rating} ★` : "N/A";
    const reviews = place?.userRatingCount ? `(${place.userRatingCount})` : "";
    const address = place?.formattedAddress || custom.address || "";
    const phone =
      place?.nationalPhoneNumber ||
      place?.internationalPhoneNumber ||
      custom.phone ||
      "";
    const typeText = Array.isArray(custom.type)
      ? custom.type.join(", ")
      : custom.type || "";
    const typeDisplay = typeText || "Not specified";
    const safeTypeTitle = Utils.escapeHtml(typeDisplay);
    const isAvailable = custom.available !== false;
    const availabilityText = isAvailable ? "Available" : "Unavailable";
    const availabilityClass = isAvailable ? "" : " offline";

    const key = firm.placeId || `${firm.lat},${firm.lng}`;
    const routeInfo = State.getRouteInfoCache().get(key);
    const etaText = routeInfo?.duration || "";
    const distanceText = routeInfo?.distance || "";
    const routeSummary =
      [etaText, distanceText].filter(Boolean).join(" • ") ||
      "Tap marker to preview route";

    const userLoc = State.getUserLoc();
    const origin = userLoc ? `${userLoc.lat},${userLoc.lng}` : "";
    const destination = `${firm.lat},${firm.lng}`;

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      origin
    )}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
    const wazeUrl = `https://waze.com/ul?ll=${encodeURIComponent(destination)}&navigate=yes`;

    return `
    <div class="basic-card">
      <div class="basic-card-header">
        <div class="basic-title" title="${Utils.escapeHtml(name)}">${Utils.escapeHtml(name)}</div>
        <div class="basic-pill${availabilityClass}">${availabilityText}</div>
      </div>

      <div class="basic-meta-row">
        <span>${Utils.escapeHtml(rating)} ${Utils.escapeHtml(reviews)}</span>
        <span class="basic-dot">•</span>
        <span>${Utils.escapeHtml(routeSummary)}</span>
      </div>

      <div class="basic-service-row">
        <span class="basic-label">Services</span>
        <span class="type-line" title="${safeTypeTitle}">${Utils.escapeHtml(typeDisplay)}</span>
      </div>

      <div class="basic-sub">${Utils.escapeHtml(address || "Address not available")}</div>
      <div class="basic-sub">${Utils.escapeHtml(phone || "Phone not available")}</div>

      <div class="basic-actions">
        <a class="nav-btn nav-btn-primary" href="${googleMapsUrl}" target="_blank" rel="noopener">Google Maps</a>
        <a class="nav-btn" href="${wazeUrl}" target="_blank" rel="noopener">Waze</a>
      </div>
    </div>
  `;
  }

  return {
    filterFirmsByType,
    renderNearestMarkers,
    showPlaceCard,
    buildCardHtml
  };
})();
