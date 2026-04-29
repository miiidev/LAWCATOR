// Orchestrator: wire together map module parts
// Dependencies: map-state.js, map-utils.js, map-view.js, map-route.js, map-markers.js

function updateMarkersByType(filters) {
  const userLoc = window.MapState.getUserLoc();
  const allFirms = window.MapState.getAllFirms();

  if (!allFirms.length || !userLoc) return 0;

  const active = filters || {};
  const selectedTypes = Array.isArray(active.types) ? active.types : [];
  const scope = active.scope === "all" ? "all" : "nearest";

  // Get filtered list from markers module
  let list = window.MapMarkers.filterFirmsByType(active);

  // Calculate distances and sort
  const withDistance = list.map((f) => ({
    ...f,
    distance: window.MapUtils.haversine(userLoc, { lat: f.lat, lng: f.lng })
  }));

  withDistance.sort((a, b) => a.distance - b.distance);

  // Apply scope limit
  const resultLimit =
    scope === "all"
      ? withDistance.length
      : selectedTypes.length
        ? 1
        : window.MapState.getMaxNearest();
  const visibleList = withDistance.slice(0, resultLimit);

  // Render markers
  window.MapMarkers.renderNearestMarkers(visibleList);
  return visibleList.length;
}

// Export global API
window.initMap = window.MapView.initMap;
window.initLawyerMap = window.MapView.initLawyerMap;
window.updateMarkersByType = updateMarkersByType;
window.requestMapResize = window.MapView.scheduleMapResize;