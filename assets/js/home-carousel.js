(async () => {
  const list = document.querySelector('.carousel .card-list');
  if (!list) return;

  try {
    // 1. Fetch both datasets simultaneously
    const [lawyersRes, firmsRes] = await Promise.all([
      fetch('../assets/data/lawyers.json'),
      fetch('../assets/data/firms.json')
    ]);

    const lawyers = await lawyersRes.json();
    const firms = await firmsRes.json();

    // 2. Filter for high-rated lawyers (Rating >= 5.0)
    const topLawyers = lawyers.filter(lawyer => lawyer.rating >= 5.0);

    // 3. Generate HTML with linked firm location
    list.innerHTML = topLawyers.map(lawyer => {
      // CONNECTION LOGIC: Find the firm that matches the lawyer's firmId
      const firm = firms.find(f => f.firmId === lawyer.firmId);
      
      // Get the location string (City, State) or a fallback
      const location = firm ? `${firm.city}, ${firm.state}` : "Location Unavailable";

      return `
        <li class="card-item">
            <a href="lawyer-details.html?id=${lawyer.id}" class="card-link">
              <img src="../assets/images/${lawyer.profile_image}" alt="${lawyer.name}" class="card-image" />
              <div class="card-content">
                <h2 class="lawyer-name">${lawyer.name}</h2>
                <div class="div-carousel-loc">
                  <p class="lawyer-loc">📍 ${location}</p> 
                </div>
                <div class="div-carousel-cat">
                  <p class="lawyer-cat">${lawyer.specialties[0]}</p>
                </div>
                <div class="lawyer-card__rating">
                  <span class="rating-value">${lawyer.rating.toFixed(1)}</span>
                  <span class="stars">★</span>
                </div>
              </div>
            </a>
        </li>
      `;
    }).join('');

  } catch (error) {
    console.error("Error loading carousel data:", error);
    return;
  }

  // --- Carousel Logic (Items, Animation, etc. remains the same) ---
  const items = Array.from(list.children);
  if (items.length < 3) return;

  const wrapper = list.closest('.card-wrapper') || list;
  const prevButton = wrapper.querySelector('.carousel-control--prev');
  const nextButton = wrapper.querySelector('.carousel-control--next');

  let currentIndex = 0;
  const updatePositions = () => {
    const total = items.length;
    items.forEach((item, idx) => {
      item.classList.remove('is-left', 'is-center', 'is-right', 'is-far-left', 'is-far-right', 'is-hidden');
      const offset = (idx - currentIndex + total) % total;
      if (offset === 0) item.classList.add('is-center');
      else if (offset === 1) item.classList.add('is-right');
      else if (offset === total - 1) item.classList.add('is-left');
      else if (offset === 2) item.classList.add('is-far-right');
      else if (offset === total - 2) item.classList.add('is-far-left');
      else item.classList.add('is-hidden');
    });
  };

  const next = () => { currentIndex = (currentIndex + 1) % items.length; updatePositions(); };
  const prev = () => { currentIndex = (currentIndex - 1 + items.length) % items.length; updatePositions(); };

  if (nextButton) nextButton.addEventListener('click', next);
  if (prevButton) prevButton.addEventListener('click', prev);
  
  updatePositions();
})();