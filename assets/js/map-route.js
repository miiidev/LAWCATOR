// Route calculation and display
window.MapRoute = (function () {
  const State = window.MapState;
  const Utils = window.MapUtils;

  async function showRoute(origin, destination, firm, requestId) {
    clearRoute();

    const Route = State.getRoute();
    if (!Route) return;

    try {
      const { routes } = await Route.computeRoutes({
        origin,
        destination,
        travelMode: "DRIVING",
        fields: ["path", "localizedValues", "distanceMeters", "durationMillis"]
      });

      if (!routes || routes.length === 0) return;
      if (requestId !== State.getRouteRequestId()) return;

      const route = routes[0];
      const key = firm?.placeId || `${destination.lat},${destination.lng}`;
      const lv = route.localizedValues;

      const durationText = lv?.duration?.text || lv?.duration || "";
      const distanceText = lv?.distance?.text || lv?.distance || "";
      const fallbackDistance =
        !distanceText && route.distanceMeters
          ? `${(route.distanceMeters / 1000).toFixed(1)} km`
          : "";

      State.getRouteInfoCache().set(key, {
        duration: durationText,
        distance: distanceText || fallbackDistance
      });

      const polylines = route.createPolylines();
      polylines.forEach((poly) => {
        poly.setOptions({
          strokeColor: "#1E88E5",
          strokeOpacity: 0.9,
          strokeWeight: 5
        });
        poly.setMap(State.getMap());
      });

      State.setRoutePolylines(polylines);
    } catch (err) {
      console.error("Route.computeRoutes failed:", err);
    }
  }

  function clearRoute() {
    State.getRoutePolylines().forEach((p) => p.setMap(null));
    State.clearRoutePolylines();
  }

  function invalidateRoute() {
    State.setRouteRequestId(State.getRouteRequestId() + 1);
    clearRoute();
  }

  return {
    showRoute,
    clearRoute,
    invalidateRoute
  };
})();
