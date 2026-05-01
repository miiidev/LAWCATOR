// Map initialization and viewport operations
window.MapView = (function () {
  const State = window.MapState;
  const Utils = window.MapUtils;
  const getThemeToken = (name, fallback) => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  };

  window.MapTheme = window.MapTheme || {
    getToken: getThemeToken,
    getRouteColor: () => getThemeToken("--theme-route", "#0000ff"),
    getPinBackground: () => getThemeToken("--theme-pin", "#4285F4"),
    getPinBorder: () => getThemeToken("--theme-pin-border", "#4285F4"),
    getPinGlyph: () => getThemeToken("--theme-pin-glyph", "#ffffff")
  };

  async function initMap() {
    await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");
    const { Place } = await google.maps.importLibrary("places");
    const { Route } = await google.maps.importLibrary("routes");

    State.setAdvancedMarkerElement(AdvancedMarkerElement);
    State.setPinElement(PinElement);
    State.setPlace(Place);
    State.setRoute(Route);

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const userLoc = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };

      State.setUserLoc(userLoc);

      const mapEl = document.getElementById("map");
      const mapInstance = new google.maps.Map(mapEl, {
        zoom: 13,
        center: userLoc,
        mapId: "5d0d411188b9e0b219ec6bb7",
        fullscreenControl: false,
        mapTypeControl: false,
        streetViewControl: false
      });

      State.setMap(mapInstance);

      const infoWindow = new google.maps.InfoWindow();
      infoWindow.addListener("closeclick", () => {
        window.MapRoute?.invalidateRoute();
        fitMapToVisibleMarkers();
      });

      State.setInfoWindow(infoWindow);

      const userPin = new PinElement({
        background: window.MapTheme.getPinBackground(),
        borderColor: window.MapTheme.getPinBorder(),
        glyphColor: window.MapTheme.getPinGlyph()
      });

      new AdvancedMarkerElement({
        map: mapInstance,
        position: userLoc,
        title: "You are here",
        content: userPin
      });

      if (!State.getResizeListenerBound()) {
        window.addEventListener("resize", scheduleMapResize);
        window.addEventListener("orientationchange", scheduleMapResize);
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) scheduleMapResize();
        });
        State.setResizeListenerBound(true);
      }

      loadNearestList();
    });
  }

  async function initLawyerMap() {
    await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    const mapEl = document.getElementById("map");
    if (!mapEl || !window.selectedFirmLocation) return;

    const { lat, lng, name } = window.selectedFirmLocation;

    const mapInstance = new google.maps.Map(mapEl, {
      center: { lat, lng },
      zoom: 15,
      mapId: "5d0d411188b9e0b219ec6bb7",
      fullscreenControl: false,
      mapTypeControl: false,
      streetViewControl: false
    });

    State.setMap(mapInstance);

    new AdvancedMarkerElement({
      map: mapInstance,
      position: { lat, lng },
      title: name
    });
  }

  function loadNearestList() {
    fetch("../assets/data/firms.json")
      .then((res) => res.json())
      .then((firms) => {
        State.setAllFirms(firms);
        window.updateMarkersByType({});
      });
  }

  function fitMapToVisibleMarkers() {
    const map = State.getMap();
    if (!map || !google?.maps?.LatLngBounds) return;

    const bounds = new google.maps.LatLngBounds();
    let points = 0;

    const userLoc = State.getUserLoc();
    if (userLoc) {
      bounds.extend(userLoc);
      points += 1;
    }

    const firmMarkers = State.getFirmMarkers();
    firmMarkers.forEach((marker) => {
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
    const map = State.getMap();
    if (!map) return;

    const timer = State.getResizeTimer();
    if (timer) window.clearTimeout(timer);

    const newTimer = window.setTimeout(() => {
      google.maps.event.trigger(map, "resize");
      fitMapToVisibleMarkers();
    }, 120);

    State.setResizeTimer(newTimer);
  }

  return {
    initMap,
    initLawyerMap,
    loadNearestList,
    fitMapToVisibleMarkers,
    scheduleMapResize
  };
})();
