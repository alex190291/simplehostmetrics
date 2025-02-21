// static/rtad.js

// Asynchronous function to fetch data from both endpoints concurrently
async function fetchRTADData() {
  try {
    // Fetch both endpoints concurrently
    const [lastbRes, proxyRes] = await Promise.all([
      fetch("/rtad_lastb"),
      fetch("/rtad_proxy"),
    ]);
    const [lastbData, proxyData] = await Promise.all([
      lastbRes.json(),
      proxyRes.json(),
    ]);

    // Update the LastB Login Attempts table
    const lastbTbody = document.querySelector("#lastbTable tbody");
    lastbTbody.innerHTML = "";
    lastbData.forEach((item) => {
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
      lastbTbody.appendChild(row);
    });

    // Update the Proxy Events table with color coding for HTTP events:
    //  - 200: green, 404/403 and other 400s: red, 500: blue.
    const proxyTbody = document.querySelector("#proxyTable tbody");
    proxyTbody.innerHTML = "";
    proxyData.forEach((item) => {
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
      proxyTbody.appendChild(row);
    });
  } catch (error) {
    console.error("Error fetching RTAD data:", error);
  }
}

// Manually triggered refresh
function refreshRTADData() {
  fetchRTADData();
}

// Automatic update every 5 seconds without blocking the UI
setInterval(fetchRTADData, 5000);

// Initial data fetch after DOM is loaded
document.addEventListener("DOMContentLoaded", fetchRTADData);
