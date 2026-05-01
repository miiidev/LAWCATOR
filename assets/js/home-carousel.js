(() => {
  const list = document.querySelector('.carousel .card-list');
  if (!list) {
    return;
  }

  const items = Array.from(list.children);
  if (items.length < 3) {
    return;
  }

  const wrapper = list.closest('.card-wrapper') || list;
  const prevButton = wrapper.querySelector('.carousel-control--prev');
  const nextButton = wrapper.querySelector('.carousel-control--next');

  let currentIndex = 0;
  let timerId = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const updatePositions = () => {
    const total = items.length;

    items.forEach((item, idx) => {
      item.classList.remove(
        'is-left',
        'is-center',
        'is-right',
        'is-far-left',
        'is-far-right',
        'is-hidden'
      );

      const offset = (idx - currentIndex + total) % total;

      if (offset === 0) {
        item.classList.add('is-center');
      } else if (offset === 1) {
        item.classList.add('is-right');
      } else if (offset === total - 1) {
        item.classList.add('is-left');
      } else if (offset === 2) {
        item.classList.add('is-far-right');
      } else if (offset === total - 2) {
        item.classList.add('is-far-left');
      } else {
        item.classList.add('is-hidden');
      }
    });
  };

  const next = () => {
    currentIndex = (currentIndex + 1) % items.length;
    updatePositions();
  };

  const prev = () => {
    currentIndex = (currentIndex - 1 + items.length) % items.length;
    updatePositions();
  };

  const start = () => {
    if (reducedMotion) {
      return;
    }

    stop();
    timerId = window.setInterval(next, 3500);
  };

  const stop = () => {
    if (!timerId) {
      return;
    }

    window.clearInterval(timerId);
    timerId = null;
  };

  wrapper.addEventListener('mouseenter', stop);
  wrapper.addEventListener('mouseleave', start);
  wrapper.addEventListener('focusin', stop);
  wrapper.addEventListener('focusout', start);

  if (prevButton) {
    prevButton.addEventListener('click', () => {
      stop();
      prev();
      start();
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      stop();
      next();
      start();
    });
  }

  updatePositions();
  start();
})();
