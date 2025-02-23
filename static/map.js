// map.js
document.addEventListener("DOMContentLoaded", async function () {
  // Karte initialisieren
  const map = L.map("map", {
    center: [20, 0],
    zoom: 2,
  });

  // OSM-Tiles hinzufügen
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "Map data © OpenStreetMap contributors",
  }).addTo(map);

  // Dark Mode Toggle Button
  const toggleButton = document.getElementById("modeToggle");
  toggleButton.addEventListener("click", () => {
    map.getContainer().classList.toggle("dark-mode");
  });

  // MarkerClusterGroup erstellen – Standardanimation deaktivieren, um Flickern zu vermeiden
  const markers = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 40,
    autoUnspiderfy: true,
    animate: false,
  });

  // Beim Klick auf einen Cluster, der gerade geöffnet ist, diesen schließen
  markers.on("clusterclick", function (a) {
    if (markers._spiderfied === a.layer) {
      markers.unspiderfy();
    }
  });

  // Icons für SSH (login) und Proxy-Events definieren
  const loginIcon = L.divIcon({
    html: '<div style="width:10px;height:10px;border-radius:50%;background-color:#f55;"></div>',
    iconSize: [10, 10],
    className: "minimal-marker",
  });
  const proxyIcon = L.divIcon({
    html: '<div style="width:10px;height:10px;border-radius:50%;background-color:#55f;"></div>',
    iconSize: [10, 10],
    className: "minimal-marker",
  });

  // Popup-Inhalt für Marker erzeugen
  function createPopup(item) {
    const typeLabel =
      item.type === "login" ? "SSH Login Attempt" : "Proxy Event";
    return `
      <b>${typeLabel}</b><br>
      IP: ${item.ip_address || "N/A"}<br>
      Country: ${item.country || "Unknown"}<br>
      City: ${item.city || "Unknown"}<br>
      ${
        item.type === "login"
          ? `User: ${item.user || ""}<br>Reason: ${item.failure_reason || ""}`
          : `Domain: ${item.domain || ""}<br>Error: ${item.error_code || ""}<br>URL: ${item.url || ""}`
      }
      <br>Timestamp: ${new Date(item.timestamp).toLocaleString()}
    `;
  }

  // Funktion zur Erzeugung eines Markers
  function createMarker(item) {
    const icon = item.type === "login" ? loginIcon : proxyIcon;
    const marker = L.marker([item.lat, item.lon], { icon: icon });
    marker.bindPopup(createPopup(item));
    marker.on("mouseover", function () {
      this.openPopup();
    });
    marker.on("mouseout", function () {
      this.closePopup();
    });
    return marker;
  }

  // Globales Mapping, um bereits hinzugefügte Marker zu verfolgen (Schlüssel: timestamp und IP)
  const markerMap = new Map();
  // Schwellenwert (in Millisekunden): Events, die innerhalb dieses Zeitraums eintreffen, werden als "neu" animiert
  const NEW_EVENT_THRESHOLD = 3000;

  // Datenabruf – nur neue Marker werden hinzugefügt
  async function fetchData() {
    // Aktualisierung überspringen, wenn ein Cluster (spiderfied) geöffnet ist
    if (markers._spiderfied) {
      setTimeout(fetchData, 1000);
      return;
    }
    const fetchTime = Date.now();
    try {
      const response = await fetch("/api/attack_map_data");
      const data = await response.json();

      // Array zur Speicherung neu hinzugefügter Marker (für Animation)
      const newMarkersForAnimation = [];

      data.forEach((item) => {
        if (item.lat !== null && item.lon !== null) {
          // Eindeutiger Schlüssel – kann ggf. angepasst werden
          const key = `${item.timestamp}-${item.ip_address}`;
          if (!markerMap.has(key)) {
            const marker = createMarker(item);
            markerMap.set(key, marker);
            markers.addLayer(marker);
            const eventTime = new Date(item.timestamp).getTime();
            if (fetchTime - eventTime < NEW_EVENT_THRESHOLD) {
              newMarkersForAnimation.push(marker);
            }
          }
        }
      });

      // Neue Marker animieren, indem die zugehörigen Cluster hervorgehoben werden
      setTimeout(() => {
        const animatedClusters = new Set();
        newMarkersForAnimation.forEach((marker) => {
          const parent = markers.getVisibleParent(marker);
          if (parent && parent._icon && !animatedClusters.has(parent)) {
            parent._icon.classList.add("animate-cluster");
            animatedClusters.add(parent);
            setTimeout(() => {
              parent._icon.classList.remove("animate-cluster");
            }, 500);
          }
        });
      }, 500);
    } catch (err) {
      console.error("Error loading attack map data:", err);
    }
    setTimeout(fetchData, 1000);
  }

  // MarkerClusterGroup zur Karte hinzufügen und den Datenabruf starten
  map.addLayer(markers);
  fetchData();
});
