(function () {
  "use strict";

  var mobileQuery = window.matchMedia("(max-width: 820px)");

  function initNavbar(header) {
    var toggleButton = header.querySelector(".navbar-toggle");
    var nav = header.querySelector("nav");

    if (!toggleButton || !nav) {
      return;
    }

    var controlsId = toggleButton.getAttribute("aria-controls");
    if (controlsId && !nav.id) {
      nav.id = controlsId;
    }

    function isExpanded() {
      return toggleButton.getAttribute("aria-expanded") === "true";
    }

    function setExpanded(expanded) {
      var nextState = !!expanded;
      toggleButton.setAttribute("aria-expanded", String(nextState));
      header.classList.toggle("is-mobile-open", nextState);
      nav.classList.toggle("is-open", nextState);
    }

    function closeMenu() {
      setExpanded(false);
    }

    toggleButton.addEventListener("click", function () {
      setExpanded(!isExpanded());
    });

    nav.addEventListener("click", function (event) {
      var link = event.target.closest("a");
      if (!link || !mobileQuery.matches) {
        return;
      }
      closeMenu();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || !isExpanded()) {
        return;
      }
      closeMenu();
      toggleButton.focus();
    });

    document.addEventListener("click", function (event) {
      if (!mobileQuery.matches || !isExpanded()) {
        return;
      }

      if (!header.contains(event.target)) {
        closeMenu();
      }
    });

    mobileQuery.addEventListener("change", function () {
      if (!mobileQuery.matches) {
        closeMenu();
      }
    });

    closeMenu();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var navbars = document.querySelectorAll(".navbar");
    navbars.forEach(initNavbar);
  });
})();
