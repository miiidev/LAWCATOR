document.addEventListener("DOMContentLoaded", async () => {
    const mapContainer = document.getElementById("malaysia-map");
    if (!mapContainer) return;

    // 1. Initialize the chart
    const chart = echarts.init(mapContainer);

    try {
        // 2. Fetch the GeoJSON map shapes, firms, and lawyers
        const [mapResponse, firmsResponse, lawyersResponse] = await Promise.all([
            fetch("../assets/data/malaysia.json"),
            fetch("../assets/data/firms.json"),
            fetch("../assets/data/lawyers.json")
        ]);

        const malaysiaGeoJson = await mapResponse.json();
        const firmsData = await firmsResponse.json();
        const lawyersData = await lawyersResponse.json();

        // Register the map with ECharts
        echarts.registerMap("Malaysia", malaysiaGeoJson);

        // 3. Count BOTH Firms and Lawyers by state
        // 🐛 FIX: Declared these objects before trying to use them!
        const stateFirmCounts = {};
        const stateLawyerCounts = {};
        const firmLookup = {};

        firmsData.forEach(firm => {
            const state = firm.state;

            // Save the firm in our lookup dictionary using its firmId
            if (firm.firmId) {
                firmLookup[firm.firmId] = firm;
            }

            // Count the firm for the Firm Map Mode
            if (state) {
                stateFirmCounts[state] = (stateFirmCounts[state] || 0) + 1;
            }
        });

        lawyersData.forEach(lawyer => {
            const firmId = lawyer.firmId;

            // Check if the lawyer has a firmId AND if that firm exists in our lookup
            if (firmId && firmLookup[firmId]) {
                const lawyerState = firmLookup[firmId].state;

                if (lawyerState) {
                    stateLawyerCounts[lawyerState] = (stateLawyerCounts[lawyerState] || 0) + 1;
                }
            }
        });

        // Format data for ECharts
        const lawyerData = Object.keys(stateLawyerCounts).map(stateName => ({
            name: stateName,
            value: stateLawyerCounts[stateName]
        }));

        const firmData = Object.keys(stateFirmCounts).map(stateName => ({
            name: stateName,
            value: stateFirmCounts[stateName]
        }));

        let currentMode = "lawyers"; // Start by showing lawyers by default

        // 4. Configure and render the map
        const option = {
            tooltip: {
                trigger: "item",
                // Matches --theme-bg with some transparency
                backgroundColor: "rgba(11, 11, 11, 0.7)",
                // Matches --theme-border
                borderColor: "rgba(255, 255, 255, 0.18)",
                borderWidth: 1,
                padding: [12, 16],
                extraCssText: "backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5); border-radius: 12px;",
                textStyle: {
                    color: "#f5f5f5", // Matches --theme-text
                    fontFamily: "sans-serif"
                },
                formatter: function (params) {
                    const stateName = params.name;
                    const count = params.value || 0;
                    const label = currentMode === "lawyers" ? "Lawyer" : "Law Firm";
                    return `
        <div style="font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 1px; color: #ffffff; margin-bottom: 4px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
          ${stateName}
        </div>
        <div style="font-family: sans-serif; font-size: 14px; color: #c8c8c8;">
          <strong style="color: #ffffff; font-size: 16px;">${count}</strong> ${label}${count !== 1 ? 's' : ''}
        </div>
      `;
                }
            },

            visualMap: {
                show: false,
                min: 0,
                max: 20,
                inRange: {
                    // Gradient: Very faint glass to solid frosted white for states with higher counts
                    color: ["rgba(255, 255, 255, 0.02)", "rgba(255, 255, 255, 0.35)"]
                }
            },

            series: [
                {
                    name: "Map Data",
                    type: "map",
                    map: "Malaysia",
                    roam: false,
                    itemStyle: {
                        // The base glass layer matches --theme-surface-muted
                        color: "rgba(255, 255, 255, 0.05)",
                        borderColor: "rgba(255, 255, 255, 0.18)", // Matches --theme-border
                        borderWidth: 0.5,
                        shadowBlur: 0,
                        shadowOffsetX: 0,
                        shadowOffsetY: 0
                    },
                    emphasis: {
                        itemStyle: {
                            // Bright white frosted glass on hover
                            areaColor: "rgba(255, 255, 255, 0.25)",
                            shadowColor: "rgba(0, 0, 0, 0.8)", // Deep drop shadow for the 3D lift
                            shadowBlur: 15,
                            shadowOffsetX: 8,
                            shadowOffsetY: 12,
                            borderColor: "#ffffff",
                            borderWidth: 1.5
                        },
                        label: {
                            show: true,
                            color: "#ffffff",
                            textStyle: {
                                fontFamily: "'Bebas Neue', sans-serif",
                                fontSize: 18,
                                backgroundColor: "transparent"
                            }
                        }
                    },
                    data: lawyerData
                }
            ],

            media: [
                {
                    query: { maxWidth: 768 },
                    option: {
                        series: [{
                            roam: true,
                            zoom: 2.2,
                            center: [101.97, 4.21],
                            scaleLimit: { min: 1, max: 10 }
                        }]
                    }
                },
                {
                    query: { minWidth: 769 },
                    option: {
                        series: [{
                            roam: false,
                            zoom: 1.2,
                            center: null
                        }]
                    }
                }
            ]
        };

        chart.setOption(option);

        // 5. 🐛 FIX: Handle Toggle Button Clicks added back in!
        const toggleBtns = document.querySelectorAll('.map-toggle-btn');
        const headerTitle = document.querySelector('.home-map-section h2');

        toggleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active class from all, add to clicked
                toggleBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                // Determine mode and update chart data
                currentMode = e.target.getAttribute('data-type');
                const newData = currentMode === "lawyers" ? lawyerData : firmData;

                // Update the title dynamically
                if (headerTitle) {
                    headerTitle.textContent = currentMode === "lawyers" ? "Lawyers Across Malaysia" : "Law Firms Across Malaysia";
                }

                // Push new data to ECharts
                chart.setOption({
                    series: [{ data: newData }]
                });
            });
        });

        // 6. Map Click Redirect
        chart.on('click', function (params) {
            const stateName = params.name;
            const count = params.value || 0;

            if (count > 0) {
                window.location.href = `find.html?state=${encodeURIComponent(stateName)}`;
            }
        });

        // Make chart responsive
        window.addEventListener("resize", () => chart.resize());

    } catch (error) {
        console.error("Error loading map data:", error);
        mapContainer.innerHTML = "<p>Failed to load the map.</p>";
    }
});