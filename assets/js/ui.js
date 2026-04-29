// Generic UI helpers: accordion and modal handling
(function () {
  function runWithoutTransition(element, updater) {
    element.style.transition = "none";
    updater();
    element.offsetHeight;
    element.style.transition = "";
  }

  function escapeHtml() { return ''; }

  const Accordion = (function () {
    let items = [];

    function openAccordionItem(item, animate = true) {
      const trigger = item.querySelector(".accordion-trigger");
      const panel = item.querySelector("[data-accordion-panel]");
      if (!trigger || !panel) return;
      item.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
      const targetHeight = panel.scrollHeight;
      if (!animate) {
        runWithoutTransition(panel, () => {
          panel.style.maxHeight = `${targetHeight}px`;
          panel.style.opacity = "1";
          panel.style.transform = "translateY(0)";
        });
        return;
      }
      panel.style.maxHeight = `${targetHeight}px`;
      panel.style.opacity = "1";
      panel.style.transform = "translateY(0)";
    }

    function closeAccordionItem(item, animate = true) {
      const trigger = item.querySelector(".accordion-trigger");
      const panel = item.querySelector("[data-accordion-panel]");
      if (!trigger || !panel) return;
      item.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      if (!animate) {
        runWithoutTransition(panel, () => {
          panel.style.maxHeight = "0px";
          panel.style.opacity = "0";
          panel.style.transform = "translateY(-8px)";
        });
        return;
      }
      panel.style.maxHeight = "0px";
      panel.style.opacity = "0";
      panel.style.transform = "translateY(-8px)";
    }

    function refreshAccordionHeights() {
      items.forEach((item) => {
        if (!item.classList.contains("is-open")) return;
        const panel = item.querySelector("[data-accordion-panel]");
        if (!panel) return;
        panel.style.maxHeight = `${panel.scrollHeight}px`;
      });
    }

    function autoScrollExpandedItem(item) {
      const viewportBottomPadding = 20;
      const rect = item.getBoundingClientRect();
      const overflowBottom = rect.bottom - (window.innerHeight - viewportBottomPadding);
      if (overflowBottom > 0) {
        window.scrollBy({ top: overflowBottom + 12, behavior: "smooth" });
      }
    }

    function scheduleAutoScrollForExpandedItem(item) {
      window.setTimeout(() => { autoScrollExpandedItem(item); }, 80);
      window.setTimeout(() => { autoScrollExpandedItem(item); }, 420);
    }

    function initAccordion() {
      items = Array.from(document.querySelectorAll("[data-accordion-item]"));
      if (!items.length) return;

      const presetOpenItem = items.find((item) => item.classList.contains("is-open"));
      const initialOpenItem = presetOpenItem || items[0];

      items.forEach((item) => {
        const trigger = item.querySelector(".accordion-trigger");
        if (!trigger) return;

        const isInitialOpen = item === initialOpenItem;
        if (isInitialOpen) {
          openAccordionItem(item, false);
        } else {
          closeAccordionItem(item, false);
        }

        trigger.addEventListener("click", () => {
          const isOpen = item.classList.contains("is-open");
          if (isOpen) {
            closeAccordionItem(item);
            return;
          }
          items.forEach((otherItem) => { if (otherItem !== item) closeAccordionItem(otherItem); });
          openAccordionItem(item);
          scheduleAutoScrollForExpandedItem(item);
        });
      });

      window.addEventListener("resize", refreshAccordionHeights);
    }

    return {
      init: initAccordion,
      refresh: refreshAccordionHeights,
      open: openAccordionItem,
      close: closeAccordionItem
    };
  })();

  const Modals = (function () {
    let modalElements = [];
    let modalTriggers = [];
    let activeModal = null;
    let lastModalTrigger = null;

    function getModalById(modalId) {
      return modalElements.find((m) => m.dataset.modalId === modalId) || null;
    }

    function getVisibleModal() {
      return modalElements.find((modal) => !modal.hidden && modal.classList.contains("is-visible")) || null;
    }

    function getModalFocusableElements(modal) {
      return Array.from(modal.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"))
        .filter((element) => !element.hasAttribute("disabled") && !element.getAttribute("aria-hidden"));
    }

    function focusIntoModal(modal) {
      const preferredTarget = modal.querySelector("[data-modal-initial-focus]");
      const focusables = getModalFocusableElements(modal);
      const focusTarget = preferredTarget || focusables[0] || modal;
      window.setTimeout(() => { if (typeof focusTarget.focus === "function") focusTarget.focus(); }, 20);
    }

    function closeModal(modal, options = {}) {
      if (!modal) return;
      const shouldRestoreFocus = options.restoreFocus !== false;
      const skipAnimation = options.skipAnimation === true;
      modal.classList.remove("is-visible");
      if (activeModal === modal) activeModal = null;

      const finishClose = () => {
        modal.hidden = true;
        if (!getVisibleModal()) document.body.classList.remove("modal-open");
        if (shouldRestoreFocus && lastModalTrigger && typeof lastModalTrigger.focus === "function") {
          lastModalTrigger.focus();
        }
      };

      if (skipAnimation) {
        finishClose();
        return;
      }

      window.setTimeout(finishClose, 220);
    }

    function closeAllModals(options = {}) {
      modalElements.forEach((modal) => { if (!modal.hidden) closeModal(modal, options); });
    }

    function openModal(modalId, triggerElement) {
      const modal = getModalById(modalId);
      if (!modal) return;
      if (activeModal && activeModal !== modal) {
        closeAllModals({ restoreFocus: false, skipAnimation: true });
      }
      lastModalTrigger = triggerElement || document.activeElement;
      modal.hidden = false;
      window.requestAnimationFrame(() => { modal.classList.add("is-visible"); });
      document.body.classList.add("modal-open");
      activeModal = modal;
      focusIntoModal(modal);
    }

    function trapModalTabKey(event) {
      if (event.key !== "Tab" || !activeModal) return;
      const focusables = getModalFocusableElements(activeModal);
      if (!focusables.length) { event.preventDefault(); return; }
      const firstElement = focusables[0];
      const lastElement = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    function initModals() {
      modalElements = Array.from(document.querySelectorAll('.lawyer-modal[data-modal-id]'));
      modalTriggers = Array.from(document.querySelectorAll('[data-modal-open]'));
      if (!modalElements.length) return;

      modalTriggers.forEach((trigger) => {
        trigger.addEventListener('click', () => { openModal(trigger.dataset.modalOpen, trigger); });
      });

      modalElements.forEach((modal) => {
        modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(modal); });
        const closeButton = modal.querySelector('[data-modal-close]');
        if (closeButton) closeButton.addEventListener('click', () => closeModal(modal));
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && getVisibleModal()) { closeAllModals(); return; }
        trapModalTabKey(event);
      });

      return {
        openModal,
        closeModal,
        closeAllModals,
        getModalById,
        getVisibleModal,
        trapModalTabKey
      };
    }

    return {
      init: initModals,
      open: openModal,
      close: closeModal,
      closeAll: closeAllModals,
      getModalById,
      getVisibleModal,
      trapModalTabKey
    };
  })();

  window.UI = {
    accordion: Accordion,
    modals: Modals
  };
})();
