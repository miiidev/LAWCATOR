(async () => {
    // Select the HTML elements
    const lawyerElement = document.querySelector(".counter-lawyers");
    const firmElement = document.querySelector(".counter-firms");
    
    if (!lawyerElement || !firmElement) return;

    let lawyerCount = 0;
    let firmCount = 0;

    try {
        // 1. Fetch both counts in parallel for better performance
        const [lawyersRes, firmsRes] = await Promise.all([
            fetch('../assets/data/lawyers.json'),
            fetch('../assets/data/firms.json')
        ]);

        const lawyers = await lawyersRes.json();
        const firms = await firmsRes.json();

        lawyerCount = lawyers.length;
        firmCount = firms.length;

    } catch (error) {
        console.error("Error loading stats:", error);
        // Fallback values if files are missing
        lawyerCount = 90;
        firmCount = 25;
    }

    // 2. Reusable function to handle the counting animation
    function animateValue(element, endValue, duration) {
        let startValue = 0;
        const delay = duration / endValue;

        const counter = setInterval(() => {
            startValue++;
            element.textContent = startValue;

            if (startValue >= endValue) {
                clearInterval(counter);
                element.style.color = 'yellow'; // Matches your style
            }
        }, delay);
    }

    function startStatsCounter() {
        animateValue(lawyerElement, lawyerCount, 2000);
        animateValue(firmElement, firmCount, 2000);
    }

    const statsSection = document.querySelector('.stats');
    if (!statsSection) {
        startStatsCounter();
        return;
    }

    let statsAnimated = false;

    const observer = new IntersectionObserver((entries, observerRef) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !statsAnimated) {
                statsAnimated = true;
                startStatsCounter();
                observerRef.disconnect();
            }
        });
    }, {
        threshold: 0.3
    });

    observer.observe(statsSection);
})();