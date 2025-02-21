// static/rtad.js

// Funktion zum Abrufen und Anzeigen der RTAD-Daten
function fetchRTADData() {
  // Daten für /rtad_lastb abrufen und Tabelle aktualisieren
  fetch("/rtad_lastb")
    .then((response) => response.json())
    .then((data) => {
      const tbody = document.querySelector("#lastbTable tbody");
      tbody.innerHTML = "";
      data.forEach((item) => {
        // Konvertierung des UNIX-Zeitstempels in ein lesbares Datum
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
        tbody.appendChild(row);
      });
    })
    .catch((error) => {
      console.error("Error fetching /rtad_lastb data:", error);
    });

  // Daten für /rtad_proxy abrufen und Tabelle aktualisieren
  fetch("/rtad_proxy")
    .then((response) => response.json())
    .then((data) => {
      const tbody = document.querySelector("#proxyTable tbody");
      tbody.innerHTML = "";
      data.forEach((item) => {
        const date = new Date(item.timestamp * 1000);
        const formattedDate = date.toLocaleString();
        // Fehlercode-Farbzuweisung:
        // - 200 => grün (status-green)
        // - 404, 403 und andere 400er => rot (status-red)
        // - 500 => blau (status-blue)
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
        tbody.appendChild(row);
      });
    })
    .catch((error) => {
      console.error("Error fetching /rtad_proxy data:", error);
    });
}

// Manuelle Aktualisierung
function refreshRTADData() {
  fetchRTADData();
}

// Automatische Aktualisierung alle 5 Sekunden
setInterval(fetchRTADData, 5000);

// Initialer Datenabruf, sobald das DOM geladen wurde
document.addEventListener("DOMContentLoaded", function () {
  fetchRTADData();
});
