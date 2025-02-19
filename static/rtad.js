// simplehostmetrics.refac/static/rtad.js

let lastUpdateTimestamp = Date.now();
let attackData = {};

function fetchAttackEvents() {
  fetch("/rtad/data")
    .then((response) => response.json())
    .then((data) => {
      updateAttackTable(data.events);
      updateSecuritySummary(data.summary);
      updateGraph(data.graph);
    });
}

function updateAttackTable(events) {
  const table = document.getElementById("attackTable");
  table.innerHTML = ""; // Clear existing rows

  events.forEach((event) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${event.ip}</td>
            <td>${event.action}</td>
            <td>${new Date(event.timestamp * 1000).toLocaleString()}</td>
            <td>${event.port}</td>
        `;
    table.appendChild(row);
  });
}

function updateSecuritySummary(summary) {
  const summaryDiv = document.getElementById("summary");
  summaryDiv.innerHTML = ""; // Clear existing summary

  summary.forEach((item) => {
    const summaryItem = document.createElement("div");
    summaryItem.innerHTML = `Port: ${item.port} - Attacks: ${item.count}`;
    summaryDiv.appendChild(summaryItem);
  });
}

function updateGraph(graphData) {
  const ctx = document.getElementById("attackGraph").getContext("2d");

  const labels = Object.keys(graphData);
  const data = Object.values(graphData);

  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Attacks per Port",
          data: data,
          fill: false,
          borderColor: "rgba(75, 192, 192, 1)",
          tension: 0.1,
        },
      ],
    },
    options: {
      scales: {
        x: {
          type: "category",
          labels: labels,
        },
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

setInterval(fetchAttackEvents, 5000); // Update every 5 seconds
