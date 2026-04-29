// Shared state for map module
window.MapState = (function () {
  let map = null;
  let userLoc = null;
  let firmMarkers = [];
  let infoWindow = null;
  let routePolylines = [];
  let routeRequestId = 0;
  let allFirms = [];
  const placeDetailsCache = new Map();
  const routeInfoCache = new Map();
  let resizeListenerBound = false;
  let resizeTimer = null;

  // Google Maps API libraries
  let AdvancedMarkerElement = null;
  let PinElement = null;
  let Place = null;
  let Route = null;

  const MAX_NEAREST = 5;

  return {
    // Getters
    getMap: () => map,
    getUserLoc: () => userLoc,
    getFirmMarkers: () => firmMarkers,
    getInfoWindow: () => infoWindow,
    getRoutePolylines: () => routePolylines,
    getRouteRequestId: () => routeRequestId,
    getAllFirms: () => allFirms,
    getPlaceDetailsCache: () => placeDetailsCache,
    getRouteInfoCache: () => routeInfoCache,
    getResizeListenerBound: () => resizeListenerBound,
    getResizeTimer: () => resizeTimer,
    getAdvancedMarkerElement: () => AdvancedMarkerElement,
    getPinElement: () => PinElement,
    getPlace: () => Place,
    getRoute: () => Route,
    getMaxNearest: () => MAX_NEAREST,

    // Setters
    setMap: (m) => (map = m),
    setUserLoc: (loc) => (userLoc = loc),
    setFirmMarkers: (markers) => (firmMarkers = markers),
    setInfoWindow: (iw) => (infoWindow = iw),
    setRoutePolylines: (polylines) => (routePolylines = polylines),
    setRouteRequestId: (id) => (routeRequestId = id),
    setAllFirms: (firms) => (allFirms = firms),
    setResizeListenerBound: (bound) => (resizeListenerBound = bound),
    setResizeTimer: (timer) => (resizeTimer = timer),
    setAdvancedMarkerElement: (el) => (AdvancedMarkerElement = el),
    setPinElement: (el) => (PinElement = el),
    setPlace: (p) => (Place = p),
    setRoute: (r) => (Route = r),

    // Mutations
    incrementRouteRequestId: () => ++routeRequestId,
    addFirmMarker: (marker) => firmMarkers.push(marker),
    clearFirmMarkers: () => (firmMarkers = []),
    clearRoutePolylines: () => (routePolylines = [])
  };
})();
