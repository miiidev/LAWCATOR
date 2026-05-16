const teamGrid = document.querySelector("#team-grid");

if (teamGrid) {
  // ── Helpers ──────────────────────────────────────────────────────────────

  const imagePathForIndex = (index) => {
    const imageNumber = String((index % 50) + 1).padStart(3, "0");
    return `../assets/images/lawyer_images/lawyer_${imageNumber}.jpg`;
  };

  const makeDetail = (label, value) => {
    if (!value) return null;

    const row = document.createElement("div");
    row.className = "team-detail";

    const lbl = document.createElement("span");
    lbl.className = "team-detail-label";
    lbl.textContent = label;

    const val = label === "Email" ? document.createElement("a") : document.createElement("span");
    if (label === "Email") {
      val.href = `mailto:${value}`;
      val.className = "team-detail-value team-detail-link";
    } else {
      val.className = "team-detail-value";
    }
    val.textContent = value;

    row.append(lbl, val);
    return row;
  };

  // Chevron SVG (down arrow)
  const chevronSVG = () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("points", "6 9 12 15 18 9");
    svg.appendChild(polyline);
    return svg;
  };

  // ── Fetch & render ────────────────────────────────────────────────────────

  fetch("../assets/data/about.json")
    .then((res) => {
      if (!res.ok) throw new Error("Unable to load team data.");
      return res.json();
    })
    .then((team) => {
      teamGrid.innerHTML = "";

      if (!Array.isArray(team) || team.length === 0) {
        const empty = document.createElement("p");
        empty.className = "team-loading";
        empty.textContent = "No team data available.";
        teamGrid.appendChild(empty);
        return;
      }

      team.forEach((member, index) => {
        // Stagger card entrance animation
        const details = document.createElement("details");
        details.className = "team-card";
        details.style.animationDelay = `${index * 0.07}s`;

        // Close other open cards (accordion behaviour)
        // FIX: was querySelector (returns one element) — must be querySelectorAll
        details.addEventListener("toggle", () => {
          if (!details.open) return;
          teamGrid.querySelectorAll("details.team-card[open]").forEach((item) => {
            if (item !== details) item.open = false;
          });
        });

        // ── Summary ───────────────────────────────────────────────────────

        const summary = document.createElement("summary");

        // --- NEW SMOOTH ACCORDION LOGIC ---
        summary.addEventListener("click", (e) => {
          e.preventDefault(); // Stop the native instant toggle

          if (details.classList.contains("is-closing")) return; // Prevent double-clicking issues

          if (details.open) {
            // Start the closing animation
            details.classList.add("is-closing");

            // Wait for the CSS transition to finish (0.40s) before actually closing
            setTimeout(() => {
              details.classList.remove("is-closing");
              details.open = false;
            }, 400);
          } else {
            // Open the clicked card instantly (CSS transitions handle the smooth slide-down)
            details.open = true;

            // Smoothly close any other open cards in the grid
            teamGrid.querySelectorAll("details.team-card[open]").forEach((item) => {
              if (item !== details && !item.classList.contains("is-closing")) {
                item.classList.add("is-closing");
                setTimeout(() => {
                  item.classList.remove("is-closing");
                  item.open = false;
                }, 400);
              }
            });
          }
        });
        // ----------------------------------

        // Avatar wrapper (holds the spinning ring pseudo-elements)
        const photoWrap = document.createElement("div");
        photoWrap.className = "team-photo-wrap";

        const photo = document.createElement("img");
        photo.className = "team-photo";
        photo.src = `../assets/images/members_pfp/${member.image_normal}`;
        photo.alt = member.name ? `Photo of ${member.name}` : `Team member ${index + 1}`;
        photo.loading = "lazy";
        photoWrap.appendChild(photo);

        

        // Meta text block
        const meta = document.createElement("div");
        meta.className = "team-meta";

        const role = document.createElement("span");
        role.className = "team-role";
        role.textContent = member.role || "Role";

        const name = document.createElement("span");
        name.className = "team-name";
        name.textContent = member.name || `Member ${index + 1}`;

        const matric = document.createElement("span");
        matric.className = "team-matric";
        matric.textContent = member["matric number"] || "";

        meta.append(role, name, matric);

        // Chevron badge
        const chevron = document.createElement("span");
        chevron.className = "team-chevron";
        chevron.setAttribute("aria-hidden", "true");
        chevron.appendChild(chevronSVG());

        summary.append(photoWrap, meta, chevron);

        // ── Panel ─────────────────────────────────────────────────────────

        const panel = document.createElement("div");
        panel.className = "team-panel";

        // Inner wrapper required for the grid-template-rows animation trick
        const inner = document.createElement("div");
        inner.className = "team-panel-inner";

        const detailRows = [
          makeDetail("DOB", member["date of birth"]),
          makeDetail("Fun Fact", member["fun fact"]),
          makeDetail("Email", member.email),
          makeDetail("Phone", member["phone number"]),
        ].filter(Boolean);

        if (detailRows.length === 0) {
          const fallback = document.createElement("p");
          fallback.className = "team-panel-fallback";
          fallback.textContent = "More details coming soon.";
          inner.appendChild(fallback);
        } else {
          detailRows.forEach((row) => inner.appendChild(row));
        }

        panel.appendChild(inner);
        details.append(summary, panel);
        teamGrid.appendChild(details);
      });
    })
    .catch(() => {
      teamGrid.innerHTML = "";
      const error = document.createElement("p");
      error.className = "team-loading";
      error.textContent = "Unable to load team data right now.";
      teamGrid.appendChild(error);
    });
}