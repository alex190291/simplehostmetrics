document.addEventListener("DOMContentLoaded", function () {
  // Tab-Navigation: Schaltet zwischen den einzelnen Tab-Panels
  const tabs = document.querySelectorAll(".tab-item");
  const panels = document.querySelectorAll(".tab-panel");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active");
    });
  });

  // Daten-Container zur Zwischenspeicherung der originalen API-Daten
  const dataStore = {
    auditLog: null,
    accessLists: null,
    certificates: null,
    proxyHosts: null,
  };

  // Funktion zum Rendern von Daten in einem Container (optional: Filterfunktion)
  function renderData(containerId, data, filterText = "") {
    let html = "";
    // Wenn es sich um ein Array handelt, filtern wir die Einträge
    if (Array.isArray(data)) {
      const filtered = data.filter((item) => {
        // Einfache Filterung: Suche in der gesamten JSON-Zeichenkette (case-insensitive)
        return JSON.stringify(item)
          .toLowerCase()
          .includes(filterText.toLowerCase());
      });
      html = `<pre>${JSON.stringify(filtered, null, 2)}</pre>`;
    } else {
      // Bei Objekten einfach anzeigen
      html = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    }
    document.getElementById(containerId).innerHTML = html;
  }

  // Event-Listener für alle Filter-Eingabefelder
  document.querySelectorAll(".filter-input").forEach((input) => {
    input.addEventListener("input", function () {
      const targetId = this.dataset.target;
      const filterText = this.value;
      // Bestimme den entsprechenden Schlüssel im dataStore anhand des Container-IDs
      if (targetId === "auditLogData" && dataStore.auditLog) {
        renderData(targetId, dataStore.auditLog, filterText);
      } else if (targetId === "accessListsData" && dataStore.accessLists) {
        renderData(targetId, dataStore.accessLists, filterText);
      } else if (targetId === "certificatesData" && dataStore.certificates) {
        renderData(targetId, dataStore.certificates, filterText);
      } else if (targetId === "proxyHostsData" && dataStore.proxyHosts) {
        renderData(targetId, dataStore.proxyHosts, filterText);
      }
    });
  });

  // Funktion zum Abrufen und Anzeigen der Daten
  async function refreshNpmData() {
    // API Health (kein Filter, da Objekt)
    try {
      const healthResponse = await fetch("http://npm.ganjagaming.de/api/");
      const healthData = await healthResponse.json();
      renderData("healthData", healthData);
    } catch (err) {
      document.getElementById("healthData").innerHTML =
        "Error loading API Health";
      console.error("Health error:", err);
    }

    // Audit Log
    try {
      const auditResponse = await fetch(
        "http://npm.ganjagaming.de/api/audit-log",
      );
      const auditData = await auditResponse.json();
      dataStore.auditLog = auditData;
      renderData(
        "auditLogData",
        auditData,
        document.querySelector('[data-target="auditLogData"]').value,
      );
    } catch (err) {
      document.getElementById("auditLogData").innerHTML =
        "Error loading Audit Log";
      console.error("Audit Log error:", err);
    }

    // Access Lists
    try {
      const accessResponse = await fetch(
        "http://npm.ganjagaming.de/api/nginx/access-lists?expand=owner",
      );
      const accessData = await accessResponse.json();
      dataStore.accessLists = accessData;
      renderData(
        "accessListsData",
        accessData,
        document.querySelector('[data-target="accessListsData"]').value,
      );
    } catch (err) {
      document.getElementById("accessListsData").innerHTML =
        "Error loading Access Lists";
      console.error("Access Lists error:", err);
    }

    // Certificates
    try {
      const certResponse = await fetch(
        "http://npm.ganjagaming.de/api/nginx/certificates?expand=owner",
      );
      const certData = await certResponse.json();
      dataStore.certificates = certData;
      renderData(
        "certificatesData",
        certData,
        document.querySelector('[data-target="certificatesData"]').value,
      );
    } catch (err) {
      document.getElementById("certificatesData").innerHTML =
        "Error loading Certificates";
      console.error("Certificates error:", err);
    }

    // Proxy Hosts
    try {
      const proxyResponse = await fetch(
        "http://npm.ganjagaming.de/api/nginx/proxy-hosts?expand=access_list,owner,certificate",
      );
      const proxyData = await proxyResponse.json();
      dataStore.proxyHosts = proxyData;
      renderData(
        "proxyHostsData",
        proxyData,
        document.querySelector('[data-target="proxyHostsData"]').value,
      );
    } catch (err) {
      document.getElementById("proxyHostsData").innerHTML =
        "Error loading Proxy Hosts";
      console.error("Proxy Hosts error:", err);
    }
  }

  // Initiales Laden der Daten
  refreshNpmData();
});
