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
        // Calculate delay based on desired duration (e.g., 2000ms total)
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

    // 3. Start both counters
    // Here 2000 is the total duration in milliseconds (2 seconds)
    animateValue(lawyerElement, lawyerCount, 2000);
    animateValue(firmElement, firmCount, 2000);
})();