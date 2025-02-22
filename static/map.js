// map.js
document.addEventListener("DOMContentLoaded", function () {
  // Initialize Leaflet map
  const map = L.map("map").setView([20, 0], 2);

  // Example of using any open tile provider. Alternatively, place local tile server or other source
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(map);

  // Fetch combined data from our /api/attack_map_data endpoint
  fetch("/api/attack_map_data")
    .then((response) => response.json())
    .then((data) => {
      data.forEach((item) => {
        // Only add marker if lat/lon is not None
        if (item.lat !== null && item.lon !== null) {
          const marker = L.marker([item.lat, item.lon]).addTo(map);
          const typeLabel =
            item.type === "login" ? "SSH Login Attempt" : "Proxy Event";
          const popupContent = `
            <b>${typeLabel}</b><br />
            IP: ${item.ip_address || "N/A"}<br />
            Country: ${item.country || "Unknown"}<br />
            ${item.type === "login" ? `User: ${item.user || ""}<br />Reason: ${item.failure_reason || ""}` : ""}
            ${item.type === "proxy" ? `Domain: ${item.domain || ""}<br />Error: ${item.error_code || ""}<br />URL: ${item.url || ""}` : ""}
            <br />
            Timestamp: ${new Date(item.timestamp * 1000).toLocaleString()}
          `;
          marker.bindPopup(popupContent);
        }
      });
    })
    .catch((err) => console.error("Error loading attack map data:", err));
});
