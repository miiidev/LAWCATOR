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
        const delay = Math.max(duration / endValue, 20);

        const counter = setInterval(() => {
            startValue++;
            element.textContent = startValue;

            if (startValue >= endValue) {
                clearInterval(counter);
                element.style.color = 'yellow'; // Matches your style
            }
        }, delay);
    }

    // 3. Start counters only when stats section enters the viewport
    const statsSection = document.querySelector('.stats');
    let countersStarted = false;

    if (statsSection) {
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !countersStarted) {
                    countersStarted = true;
                    animateValue(lawyerElement, lawyerCount, 2000);
                    animateValue(firmElement, firmCount, 2000);
                    obs.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.25
        });

        observer.observe(statsSection);
    }
})();