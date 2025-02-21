// static/rtad.js

let lastbLastId = null;
let proxyLastId = null;

function fetchRTADData() {
  // Update rtad_lastb table
  let lastbUrl = "/rtad_lastb";
  if (lastbLastId !== null) {
    lastbUrl += "?last_id=" + lastbLastId;
  }
  fetch(lastbUrl)
    .then((response) => response.json())
    .then((data) => {
      if (data.length === 0) return;
      // Sortiere die Daten nach ID in aufsteigender Reihenfolge
      data.sort((a, b) => a.id - b.id);
      const tbody = document.querySelector("#lastbTable tbody");
      // Bei initialem Laden wird der Inhalt ersetzt
      if (lastbLastId === null) {
        tbody.innerHTML = "";
      }
      const fragment = document.createDocumentFragment();
      data.forEach((item) => {
        const date = new Date(item.timestamp * 1000);
        const formattedDate = date.toLocaleString();
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${item.id}</td>
          <td>${item.ip_address}</td>
          <td>${formattedDate}</td>
          <td>${item.user}</td>
          <td>${item.failure_reason}</td>
        `;
        fragment.appendChild(row);
      });
      tbody.appendChild(fragment);
      // Aktualisiere lastbLastId zum höchsten empfangenen ID-Wert
      lastbLastId = data[data.length - 1].id;
    })
    .catch((error) => {
      console.error("Error fetching /rtad_lastb data:", error);
    });

  // Update rtad_proxy table
  let proxyUrl = "/rtad_proxy";
  if (proxyLastId !== null) {
    proxyUrl += "?last_id=" + proxyLastId;
  }
  fetch(proxyUrl)
    .then((response) => response.json())
    .then((data) => {
      if (data.length === 0) return;
      // Sortiere die Daten nach ID in aufsteigender Reihenfolge
      data.sort((a, b) => a.id - b.id);
      const tbody = document.querySelector("#proxyTable tbody");
      if (proxyLastId === null) {
        tbody.innerHTML = "";
      }
      const fragment = document.createDocumentFragment();
      data.forEach((item) => {
        const date = new Date(item.timestamp * 1000);
        const formattedDate = date.toLocaleString();
        let errorClass = "";
        if (item.error_code === 200) {
          errorClass = "status-green";
        } else if (item.error_code === 500) {
          errorClass = "status-blue";
        } else if (
          item.error_code === 404 ||
          item.error_code === 403 ||
          (item.error_code >= 400 && item.error_code < 500)
        ) {
          errorClass = "status-red";
        }
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${item.id}</td>
          <td>${item.domain}</td>
          <td>${item.ip_address}</td>
          <td>${formattedDate}</td>
          <td>${item.proxy_type}</td>
          <td class="${errorClass}">${item.error_code}</td>
          <td>${item.url}</td>
        `;
        fragment.appendChild(row);
      });
      tbody.appendChild(fragment);
      proxyLastId = data[data.length - 1].id;
    })
    .catch((error) => {
      console.error("Error fetching /rtad_proxy data:", error);
    });
}

function refreshRTADData() {
  fetchRTADData();
}

// Automatisches Update alle 5 Sekunden
setInterval(fetchRTADData, 5000);

document.addEventListener("DOMContentLoaded", function () {
  fetchRTADData();
});
