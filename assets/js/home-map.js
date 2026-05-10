document.addEventListener("DOMContentLoaded", async () => {
    const mapContainer = document.getElementById("malaysia-map");
    if (!mapContainer) return;

    // 1. Initialize the chart
    const chart = echarts.init(mapContainer);

    try {
        // 2. Fetch the GeoJSON map shapes and your firm data
        const [mapResponse, firmsResponse] = await Promise.all([
            fetch("../assets/data/malaysia.json"), // Your downloaded GeoJSON
            fetch("../assets/data/firms.json")     // Your existing firm data
        ]);

        const malaysiaGeoJson = await mapResponse.json();
        const firmsData = await firmsResponse.json();

        // Register the map with ECharts
        echarts.registerMap("Malaysia", malaysiaGeoJson);

        // 3. Count firms by state
        const stateCounts = {};
        firmsData.forEach(firm => {
            const state = firm.state;
            if (state) {
                stateCounts[state] = (stateCounts[state] || 0) + 1;
            }
        });

        // Format for ECharts: [{ name: "Selangor", value: 42 }, ...]
        const mapData = Object.keys(stateCounts).map(stateName => ({
            name: stateName,
            value: stateCounts[stateName]
        }));

        // 4. Configure and render the map
        const option = {
            // 1. Dark Glassmorphism Tooltip
            tooltip: {
                trigger: "item",
                backgroundColor: "rgba(15, 23, 42, 0.6)", // Dark semi-transparent background
                borderColor: "rgba(255, 255, 255, 0.15)", // Thin, faint white border
                borderWidth: 1,
                padding: [12, 16],
                // INJECT PURE CSS FOR THE GLASS BLUR EFFECT
                extraCssText: "backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5); border-radius: 12px;",
                textStyle: {
                    color: "#ffffff",
                    fontFamily: "sans-serif"
                },
                formatter: function (params) {
                    const stateName = params.name;
                    const firmCount = params.value || 0;
                    return `
        <div style="font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 1px; color: #ffffff; margin-bottom: 4px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
          ${stateName}
        </div>
        <div style="font-family: sans-serif; font-size: 14px; color: #cbd5e1;">
          <strong style="color: #38bdf8;">${firmCount}</strong> Law Firm${firmCount !== 1 ? 's' : ''}
        </div>
      `;
                }
            },

            // 2. Dark Theme Visual Map (Gradient)
            visualMap: {
                show: false,
                min: 0,
                max: 20, // Adjust based on your max firms per state
                text: ["High", "Low"],
                realtime: false,
                calculable: true,
                orient: "horizontal",
                left: "center",
                bottom: 10,
                textStyle: {
                    color: "#94a3b8", // Light gray text for the legend
                    fontFamily: "sans-serif"
                },
                inRange: {
                    // From dark glassy blue to bright neon/cyan blue
                    color: ["rgba(30, 41, 59, 0.7)", "#0ea5e9"]
                }
            },

            // 3. Glassy Map Appearance
            series: [
                {
                    name: "Law Firms",
                    type: "map",
                    map: "Malaysia",
                    roam: false,

                    // Default state appearance (The "Glass" layer)
                    itemStyle: {
                        color: "rgba(30, 41, 59, 0.8)",
                        borderColor: "rgba(255, 255, 255, 0.4)",
                        borderWidth: 0.5,
                        // Ensure absolutely no shadow here so it looks flat
                        shadowBlur: 0,
                        shadowOffsetX: 0,
                        shadowOffsetY: 0
                    },

                    // Hover effect (The "Glow")
                    emphasis: {
                        itemStyle: {
                            areaColor: "rgba(56, 189, 248, 0.8)", // Bright cyan glass on hover
                            shadowColor: "rgba(0, 0, 0, 0.7)", // Very dark shadow
                            shadowBlur: 15,                    // Softly blurred
                            shadowOffsetX: 8,                  // Pushed to the right
                            shadowOffsetY: 12,                 // Pushed down to simulate height

                            borderColor: "#ffffff",
                            borderWidth: 2
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
                    data: mapData
                }
            ],

            media: [
                // 1. MOBILE SETTINGS (Zoom to Peninsular Malaysia)
                {
                    query: {
                        maxWidth: 768
                    },
                    option: {
                        series: [
                            {
                                roam: true,
                                zoom: 2.2,  // You can increase this to zoom in even closer
                                // 👉 Pan the camera to Peninsular Malaysia
                                center: [101.97, 4.21],
                                scaleLimit: {
                                    min: 1,
                                    max: 10
                                }
                            }
                        ]
                    }
                },
                // 2. DESKTOP SETTINGS (Reset to Whole Country)
                {
                    query: {
                        minWidth: 769
                    },
                    option: {
                        series: [
                            {
                                roam: false,
                                zoom: 1.2,
                                // 👉 Remove the specific center to show all of Malaysia again
                                center: null
                            }
                        ]
                    }
                }
            ]
        };

        chart.setOption(option);

        chart.on('click', function (params) {
            const stateName = params.name;
            const firmCount = params.value || 0;

            // Only redirect if there are actually firms in that state
            if (firmCount > 0) {
                // Redirect to your find page and pass the state in the URL
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