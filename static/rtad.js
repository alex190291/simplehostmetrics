// static/rtad.js

function fetchRTADData() {
  // Update rtad_lastb table
  fetch("/rtad_lastb")
    .then((response) => response.json())
    .then((data) => {
      // Only use the last 5000 entries
      if (data.length > 5000) {
        data = data.slice(-5000);
      }
      const tbody = document.querySelector("#lastbTable tbody");
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
      // Efficiently update table content
      tbody.innerHTML = "";
      tbody.appendChild(fragment);
    })
    .catch((error) => {
      console.error("Error fetching /rtad_lastb data:", error);
    });

  // Update rtad_proxy table
  fetch("/rtad_proxy")
    .then((response) => response.json())
    .then((data) => {
      // Only use the last 5000 entries
      if (data.length > 5000) {
        data = data.slice(-5000);
      }
      const tbody = document.querySelector("#proxyTable tbody");
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
      tbody.innerHTML = "";
      tbody.appendChild(fragment);
    })
    .catch((error) => {
      console.error("Error fetching /rtad_proxy data:", error);
    });
}

function refreshRTADData() {
  fetchRTADData();
}

// Automatically update every 5 seconds
setInterval(fetchRTADData, 5000);

document.addEventListener("DOMContentLoaded", function () {
  fetchRTADData();
});
