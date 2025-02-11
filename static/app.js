// simplehostmetrics.refac/static/app.js

// ------------------------------------------------
//  Background Hex Animation
// ------------------------------------------------
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}
function generateHexagons(count) {
  const container = document.getElementById("hexagon-container");
  for (let i = 0; i < count; i++) {
    const hex = document.createElement("div");
    hex.classList.add("hexagon");
    const top = randomInt(0, 100);
    const left = randomInt(0, 100);
    const size = randomInt(80, 250);
    const delay = randomFloat(0, 10).toFixed(1);
    hex.style.top = top + "%";
    hex.style.left = left + "%";
    hex.style.width = size + "px";
    hex.style.height = size + "px";
    hex.style.animationDelay = delay + "s";
    container.appendChild(hex);
  }
}
generateHexagons(40);

// ------------------------------------------------
//  Card Expand/Collapse
// ------------------------------------------------
document.querySelectorAll(".card").forEach((card) => {
  card.addEventListener("click", (e) => {
    if (e.target.tagName.toLowerCase() === "button") return;
    const detailView = card.querySelector(".detail-view");
    if (!detailView) return;
    const currentlyHidden =
      detailView.style.display === "" || detailView.style.display === "none";
    detailView.style.display = currentlyHidden ? "block" : "none";
  });
});

// ------------------------------------------------
//  Light/Dark Mode
// ------------------------------------------------
const modeToggle = document.getElementById("modeToggle");
modeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
});

// ------------------------------------------------
//  Charts Setup
// ------------------------------------------------
const sharedXAxisConfig = {
  grid: {
    display: true,
    drawTicks: true,
    tickLength: 5,
    color: "rgba(255,255,255,0.1)",
  },
  ticks: { display: true },
};

// CPU Chart
const cpuCtx = document.getElementById("cpuChart").getContext("2d");
const cpuChart = new Chart(cpuCtx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "CPU",
        data: [],
        borderColor: "rgba(5,112,85,1)",
        backgroundColor: "rgba(45,90,79,0.4)",
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: sharedXAxisConfig,
      y: {
        max: 100,
        grid: { color: "rgba(255,255,255,0.1)" },
      },
    },
  },
});
const cpuOverlay = document.getElementById("cpuOverlay");
const cpuDetailCtx = document.getElementById("cpuDetailChart").getContext("2d");
const cpuDetailChart = new Chart(cpuDetailCtx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "24hr CPU Usage (%)",
        data: [],
        borderColor: "rgba(5,112,85,1)",
        backgroundColor: "rgba(45,90,79,0.2)",
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: sharedXAxisConfig,
      y: {
        max: 100,
        grid: { color: "rgba(255,255,255,0.1)" },
      },
    },
  },
});

// Memory Chart
const memCtx = document.getElementById("memoryChart").getContext("2d");
const memoryBasicChart = new Chart(memCtx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Free",
        data: [],
        borderColor: "#1e8449",
        tension: 0.4,
        fill: false,
        borderWidth: 2,
      },
      {
        label: "Used",
        data: [],
        borderColor: "#922b21",
        tension: 0.4,
        fill: false,
        borderWidth: 2,
      },
      {
        label: "Cached",
        data: [],
        borderColor: "#21618c",
        tension: 0.4,
        fill: false,
        borderWidth: 2,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: sharedXAxisConfig,
      y: {
        grid: { color: "rgba(255,255,255,0.1)" },
      },
    },
  },
});
const memoryOverlay = document.getElementById("memoryOverlay");
const memoryDetailCtx = document
  .getElementById("memoryDetailChart")
  .getContext("2d");
const memoryDetailChart = new Chart(memoryDetailCtx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "24hr RAM Usage",
        data: [],
        borderColor: "#21618c",
        backgroundColor: "rgba(33,97,140,0.2)",
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: sharedXAxisConfig,
      y: {
        grid: { color: "rgba(255,255,255,0.1)" },
      },
    },
  },
});

// Disk Chart
const diskCtx = document.getElementById("diskChart").getContext("2d");
const diskBasicChart = new Chart(diskCtx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Used",
        data: [],
        borderColor: "#922b21",
        tension: 0.4,
        fill: false,
        borderWidth: 2,
      },
      {
        label: "Free",
        data: [],
        borderColor: "#1e8449",
        tension: 0.4,
        fill: false,
        borderWidth: 2,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: sharedXAxisConfig,
      y: {
        grid: { color: "rgba(255,255,255,0.1)" },
      },
    },
  },
});
const diskOverlay = document.getElementById("diskOverlay");
const diskDetailCtx = document
  .getElementById("diskHistoryChart")
  .getContext("2d");
const diskHistoryChart = new Chart(diskDetailCtx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "7-Day Disk Used (GB)",
        data: [],
        borderColor: "#922b21",
        backgroundColor: "rgba(146,43,33,0.2)",
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: sharedXAxisConfig,
      y: { grid: { color: "rgba(255,255,255,0.1)" } },
    },
  },
});

// Network Chart
const netCtx = document.getElementById("networkChart").getContext("2d");
const networkChart = new Chart(netCtx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Input (MiB/s)",
        data: [],
        borderColor: "rgba(5,112,85,1)",
        backgroundColor: "rgba(45,90,79,0.2)",
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
      {
        label: "Output (MiB/s)",
        data: [],
        borderColor: "#ff5555",
        backgroundColor: "rgba(255,85,85,0.2)",
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: sharedXAxisConfig,
      y: { grid: { color: "rgba(255,255,255,0.1)" } },
    },
  },
});

// ------------------------------------------------
//  Stats Polling & Update
// ------------------------------------------------
function updateStats() {
  fetch("/stats")
    .then((r) => r.json())
    .then((data) => {
      window.cachedStats = data;
      const system = data.system || {};

      // CPU
      cpuOverlay.textContent = Math.round(system.cpu || 0) + "%";
      if (system.cpu_history && system.cpu_history.usage) {
        cpuChart.data.labels = system.cpu_history.time;
        cpuChart.data.datasets[0].data = system.cpu_history.usage;
        cpuChart.update();
      }
      if (system.cpu_details && system.cpu_details.history24h) {
        cpuDetailChart.data.labels = system.cpu_details.history24h.map(
          (e) => e.time,
        );
        cpuDetailChart.data.datasets[0].data =
          system.cpu_details.history24h.map((e) => e.usage);
        cpuDetailChart.update();
      }

      // Memory
      if (system.memory_history) {
        memoryBasicChart.data.labels = system.memory_history.time;
        memoryBasicChart.data.datasets[0].data = system.memory_history.free;
        memoryBasicChart.data.datasets[1].data = system.memory_history.used;
        memoryBasicChart.data.datasets[2].data = system.memory_history.cached;
        if (system.memory && system.memory.total) {
          memoryBasicChart.options.scales.y.max = system.memory.total;
        }
        memoryBasicChart.update();
      }
      if (system.memory) {
        memoryOverlay.textContent = (system.memory.used || 0).toFixed(2);
      }
      if (system.memory_details && system.memory_details.history24h) {
        const memDV = document.getElementById("memory-detail-view");
        if (memDV.style.display !== "none" && memDV.offsetParent !== null) {
          memoryDetailChart.data.labels = system.memory_details.history24h.map(
            (e) => e.time,
          );
          memoryDetailChart.data.datasets[0].data =
            system.memory_details.history24h.map((e) => e.usage);
          memoryDetailChart.update();
        }
      }

      // Disk
      if (system.disk_history_basic) {
        diskBasicChart.data.labels = system.disk_history_basic.time;
        diskBasicChart.data.datasets[0].data = system.disk_history_basic.used;
        diskBasicChart.data.datasets[1].data = system.disk_history_basic.free;
        if (system.disk && system.disk.total) {
          diskBasicChart.options.scales.y.max = system.disk.total;
        }
        diskBasicChart.update();
      }
      if (system.disk) {
        diskOverlay.textContent = (system.disk.used || 0).toFixed(2);
      }
      if (system.disk_details && system.disk_details.history) {
        const diskDV = document.getElementById("disk-detail-view");
        if (diskDV.style.display !== "none" && diskDV.offsetParent !== null) {
          diskHistoryChart.data.labels = system.disk_details.history.map(
            (e) => e.time,
          );
          diskHistoryChart.data.datasets[0].data =
            system.disk_details.history.map((e) => e.used);
          diskHistoryChart.update();
        }
      }

      // Network
      if (data.network && data.network.interfaces) {
        const interfaces = data.network.interfaces;
        let mainIface = null;
        Object.keys(interfaces).forEach((k) => {
          if (/^e/.test(k) && !mainIface) mainIface = k;
        });
        if (!mainIface) {
          mainIface = Object.keys(interfaces)[0] || null;
        }
        if (
          mainIface &&
          interfaces[mainIface] &&
          interfaces[mainIface].length
        ) {
          const arr = interfaces[mainIface];
          networkChart.data.labels = arr.map((e) => e.time);
          networkChart.data.datasets[0].data = arr.map((e) => e.input);
          networkChart.data.datasets[1].data = arr.map((e) => e.output);
          networkChart.update();
        }
      }

      // Docker
      const dockerDataEl = document.getElementById("docker-data");
      dockerDataEl.innerHTML = (data.docker || [])
        .map((cont) => {
          let statusClass;
          const lowerStatus = (cont.status || "").toLowerCase();
          if (lowerStatus.includes("update success")) {
            statusClass = "status-green";
          } else if (/^updat/i.test(lowerStatus)) {
            statusClass = "status-yellow";
            if (lowerStatus.includes("failed")) {
              statusClass = "status-red";
            }
          } else if (!cont.up_to_date) {
            statusClass = "status-blue";
          } else if (lowerStatus.includes("running")) {
            statusClass = "status-green";
          } else if (
            lowerStatus.includes("starting") ||
            lowerStatus.includes("created")
          ) {
            statusClass = "status-yellow";
          } else {
            statusClass = "status-red";
          }
          const hrs = Math.floor(cont.uptime / 3600);
          const mins = Math.floor((cont.uptime % 3600) / 60);
          let updateBtn = "";
          if (!cont.up_to_date && !/updating/i.test(cont.status)) {
            updateBtn = `<button class="update-btn" onclick="updateContainer('${cont.name}')">↑ Update</button>`;
          }
          return `
                <tr>
                  <td><div class="status-indicator ${statusClass}"></div></td>
                  <td>${cont.name}</td>
                  <td>${hrs}h ${mins}m</td>
                  <td>${cont.image}</td>
                  <td>${updateBtn}</td>
                </tr>
              `;
        })
        .join("");
    })
    .catch((err) => console.error("Error fetching stats:", err));
}
setInterval(updateStats, 500);
updateStats();

// ------------------------------------------------
//  Docker “Check All” Updates & Container Update Functions
// ------------------------------------------------
let checkAllInterval = null;
function checkAllUpdates() {
  const btn = document.getElementById("checkAllBtn");
  btn.disabled = true;
  btn.innerHTML = `↻ Check for updates <div class="spinner"></div>`;
  fetch("/check_all", { method: "POST" })
    .then((r) => r.json())
    .then((d) => {
      if (d.status !== "already_in_progress") {
        checkAllInterval = setInterval(pollCheckAllStatus, 500);
      } else {
        btn.innerHTML = "↻ Check for updates";
        btn.disabled = false;
      }
    })
    .catch((err) => {
      console.error("Error starting check_all:", err);
      btn.disabled = false;
      btn.innerHTML = "↻ Check for updates";
    });
}
function pollCheckAllStatus() {
  const btn = document.getElementById("checkAllBtn");
  fetch("/check_all_status")
    .then((r) => r.json())
    .then((st) => {
      if (st.in_progress) {
        btn.innerHTML = `Checking... (${st.checked}/${st.total})`;
      } else {
        btn.innerHTML = "↻ Check for updates";
        btn.disabled = false;
        clearInterval(checkAllInterval);
        checkAllInterval = null;
        updateStats();
      }
    })
    .catch((err) => console.error("Error polling check_all status:", err));
}
function updateContainer(containerName) {
  const btn = event.target;
  if (btn.innerHTML.toLowerCase().includes("failed")) {
    btn.style.backgroundColor = "var(--primary)";
  }
  btn.innerHTML = `initializing... <div class="spinner"></div>`;
  btn.disabled = true;
  fetch(`/update/${containerName}`, { method: "POST" })
    .then((r) => r.json())
    .then(() => pollContainerUpdate(containerName, btn))
    .catch((err) => console.error("Error updating container:", err));
}
function pollContainerUpdate(containerName, button) {
  const pollInt = setInterval(() => {
    fetch(`/update_status/${containerName}`)
      .then((r) => r.json())
      .then((st) => {
        if (st.in_progress && !st.error) {
          if (!button.dataset.startedUpdate) {
            button.style.backgroundColor = "yellow";
            button.dataset.startedUpdate = "true";
          }
          button.innerHTML = `${st.phase} <div class="spinner"></div>`;
          return;
        }
        clearInterval(pollInt);
        if (st.error) {
          button.style.backgroundColor = "red";
          button.innerHTML = "Update failed";
          button.disabled = false;
        } else if (st.success) {
          button.style.backgroundColor = "#33cc33";
          button.innerHTML = "Updated successfully";
          button.disabled = true;
          setTimeout(() => {
            button.style.backgroundColor = "var(--primary)";
            button.style.display = "none";
            button.disabled = false;
          }, 10000);
        }
        updateStats();
      })
      .catch((err) => {
        console.error("Error polling update status:", err);
        clearInterval(pollInt);
      });
  }, 1000);
}

// ------------------------------------------------
//  Custom Network Graph Configuration Modal Logic
// ------------------------------------------------
let availableInterfaces = [];
document
  .getElementById("customGraphSettingsBtn")
  .addEventListener("click", function () {
    document.getElementById("customGraphModal").style.display = "flex";
    // Clear previous entries.
    document.getElementById("interfacesContainer").innerHTML = "";
    document.getElementById("graphName").value = "";
    // Fetch available interfaces.
    fetch("/custom_network/available_interfaces")
      .then((r) => r.json())
      .then((data) => {
        availableInterfaces = data;
      })
      .catch((err) =>
        console.error("Error fetching available interfaces:", err),
      );
  });

document
  .getElementById("cancelGraphConfigBtn")
  .addEventListener("click", function () {
    document.getElementById("customGraphModal").style.display = "none";
  });

// Event listener for "Add Interface" button.
document
  .getElementById("addInterfaceBtn")
  .addEventListener("click", function () {
    const container = document.getElementById("interfacesContainer");
    const row = document.createElement("div");
    row.className = "settings-row";
    // Create a drag handle.
    const dragHandle = document.createElement("div");
    dragHandle.className = "drag-handle";
    dragHandle.textContent = "☰";
    // Create a select element for interface names.
    let ifaceSelect;
    if (availableInterfaces && availableInterfaces.length > 0) {
      ifaceSelect = document.createElement("select");
      ifaceSelect.className = "iface-select";
      availableInterfaces.forEach(function (iface) {
        const option = document.createElement("option");
        option.value = iface;
        option.text = iface;
        ifaceSelect.appendChild(option);
      });
    } else {
      // Fallback to text input if available interfaces are not available.
      ifaceSelect = document.createElement("input");
      ifaceSelect.type = "text";
      ifaceSelect.placeholder = "Interface name (e.g., eth0)";
      ifaceSelect.className = "iface-input";
    }
    // Input for label.
    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.placeholder = "Label";
    labelInput.className = "label-input";
    // Color picker input.
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = "#ffffff";
    colorInput.className = "color-input";
    row.appendChild(dragHandle);
    row.appendChild(ifaceSelect);
    row.appendChild(labelInput);
    row.appendChild(colorInput);
    container.appendChild(row);
  });

// Save custom network graph configuration.
document
  .getElementById("saveGraphConfigBtn")
  .addEventListener("click", function () {
    const graphName = document.getElementById("graphName").value;
    const interfaceRows = document.querySelectorAll(
      "#interfacesContainer .settings-row",
    );
    const interfaces = [];
    interfaceRows.forEach((row) => {
      const ifaceField =
        row.querySelector(".iface-select") || row.querySelector(".iface-input");
      const iface = ifaceField.value;
      const label = row.querySelector(".label-input").value;
      const color = row.querySelector(".color-input").value;
      if (iface) {
        interfaces.push({
          iface_name: iface,
          label: label || iface,
          color: color,
        });
      }
    });
    const customGraph = {
      id: Date.now(),
      graph_name: graphName,
      interfaces: interfaces,
    };
    // Hier wird nur der neue Graph übergeben – dank INSERT OR REPLACE werden
    // vorhandene Graphen in der Datenbank nicht gelöscht.
    fetch("/custom_network/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ custom_network_graphs: [customGraph] }),
    })
      .then((r) => r.json())
      .then((data) => {
        console.log("Custom network graph configuration saved:", data);
        document.getElementById("customGraphModal").style.display = "none";
        updateCustomGraphs();
      })
      .catch((err) => console.error("Error saving configuration:", err));
  });

// ------------------------------------------------
//  Custom Graphs Display in Network Card
// ------------------------------------------------
function updateCustomGraphs() {
  // Verwende den Detailbereich der Netzwerkkarte statt eines separaten Containers.
  const container = document.getElementById("network-detail-view");
  // Scrollposition sichern, um einen Sprung zu vermeiden:
  const scrollPos = container.scrollTop;
  container.innerHTML = ""; // Bestehende Graphen entfernen

  fetch("/custom_network/config")
    .then((r) => r.json())
    .then((graphs) => {
      graphs.forEach((graph) => {
        // Erstelle eine Graph-Card
        const graphCard = document.createElement("div");
        graphCard.className = "custom-graph-card";
        graphCard.style.display = "flex";
        graphCard.style.flexDirection = "column";
        graphCard.style.margin = "1rem 0";
        graphCard.style.padding = "0.5rem";
        graphCard.style.background = "var(--glass)";
        graphCard.style.borderRadius = "0.5rem";
        graphCard.style.height = "250px"; // Fixe Höhe

        // Header mit Titel und Legende
        const headerDiv = document.createElement("div");
        headerDiv.className = "custom-graph-header";
        headerDiv.style.display = "flex";
        headerDiv.style.justifyContent = "space-between";
        headerDiv.style.alignItems = "center";
        headerDiv.style.marginBottom = "0.5rem";
        const titleDiv = document.createElement("div");
        titleDiv.className = "graph-label";
        titleDiv.style.fontWeight = "bold";
        titleDiv.textContent = graph.graph_name;
        const legendDiv = document.createElement("div");
        legendDiv.className = "custom-graph-legend";
        legendDiv.style.display = "flex";
        legendDiv.style.gap = "0.5rem";
        graph.interfaces.forEach((iface) => {
          const legendItem = document.createElement("div");
          legendItem.className = "legend-item";
          legendItem.style.display = "inline-flex";
          legendItem.style.alignItems = "center";
          const colorBox = document.createElement("span");
          colorBox.className = "legend-color-box";
          colorBox.style.backgroundColor = iface.color;
          colorBox.style.width = "16px";
          colorBox.style.height = "16px";
          colorBox.style.display = "inline-block";
          colorBox.style.marginRight = "4px";
          colorBox.style.borderRadius = "3px";
          const labelSpan = document.createElement("span");
          labelSpan.style.fontSize = "0.8rem";
          labelSpan.textContent = iface.label;
          legendItem.appendChild(colorBox);
          legendItem.appendChild(labelSpan);
          legendDiv.appendChild(legendItem);
        });
        headerDiv.appendChild(titleDiv);
        headerDiv.appendChild(legendDiv);
        graphCard.appendChild(headerDiv);

        // Body mit zwei Chart-Containern: Input links, Output rechts
        const bodyDiv = document.createElement("div");
        bodyDiv.className = "custom-graph-body";
        bodyDiv.style.display = "flex";
        bodyDiv.style.flex = "1";
        bodyDiv.style.width = "100%";

        // Input Chart Container
        const inputDiv = document.createElement("div");
        inputDiv.className = "custom-graph-input";
        inputDiv.style.flex = "1";
        inputDiv.style.position = "relative"; // Damit Overlay absolut positioniert werden kann
        const inputCanvas = document.createElement("canvas");
        inputCanvas.id = "custom-input-" + graph.id;
        inputDiv.appendChild(inputCanvas);
        // Overlay "in" hinzufügen
        const inputOverlay = document.createElement("div");
        inputOverlay.textContent = "in";
        inputOverlay.style.position = "absolute";
        inputOverlay.style.top = "5px";
        inputOverlay.style.left = "5px";
        inputOverlay.style.fontSize = "1.5rem";
        inputOverlay.style.color = "rgba(255,255,255,0.2)";
        inputOverlay.style.pointerEvents = "none";
        inputDiv.appendChild(inputOverlay);

        // Output Chart Container
        const outputDiv = document.createElement("div");
        outputDiv.className = "custom-graph-output";
        outputDiv.style.flex = "1";
        outputDiv.style.position = "relative";
        const outputCanvas = document.createElement("canvas");
        outputCanvas.id = "custom-output-" + graph.id;
        outputDiv.appendChild(outputCanvas);
        // Overlay "out" hinzufügen
        const outputOverlay = document.createElement("div");
        outputOverlay.textContent = "out";
        outputOverlay.style.position = "absolute";
        outputOverlay.style.top = "5px";
        outputOverlay.style.left = "5px";
        outputOverlay.style.fontSize = "1.5rem";
        outputOverlay.style.color = "rgba(255,255,255,0.2)";
        outputOverlay.style.pointerEvents = "none";
        outputDiv.appendChild(outputOverlay);

        bodyDiv.appendChild(inputDiv);
        bodyDiv.appendChild(outputDiv);
        graphCard.appendChild(bodyDiv);

        container.appendChild(graphCard);

        // Bereite Datensätze vor – anhand der Netzwerkdaten
        const networkData =
          window.cachedStats &&
          window.cachedStats.network &&
          window.cachedStats.network.interfaces;
        const inputDatasets = [];
        const outputDatasets = [];
        let labels = [];
        graph.interfaces.forEach((iface) => {
          if (networkData && networkData[iface.iface_name]) {
            const ifaceData = networkData[iface.iface_name];
            labels = ifaceData.map((e) => e.time);
            const inputData = ifaceData.map((e) => e.input);
            const outputData = ifaceData.map((e) => e.output);
            inputDatasets.push({
              label: iface.label,
              data: inputData,
              borderColor: iface.color,
              backgroundColor: iface.color,
              fill: false,
              tension: 0.4,
              borderWidth: 2,
            });
            outputDatasets.push({
              label: iface.label,
              data: outputData,
              borderColor: iface.color,
              backgroundColor: iface.color,
              fill: false,
              tension: 0.4,
              borderWidth: 2,
            });
          }
        });
        if (inputDatasets.length > 0) {
          new Chart(inputCanvas.getContext("2d"), {
            type: "line",
            data: {
              labels: labels,
              datasets: inputDatasets,
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: sharedXAxisConfig,
                y: { grid: { color: "rgba(255,255,255,0.1)" } },
              },
            },
          });
        }
        if (outputDatasets.length > 0) {
          new Chart(outputCanvas.getContext("2d"), {
            type: "line",
            data: {
              labels: labels,
              datasets: outputDatasets,
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: sharedXAxisConfig,
                y: { grid: { color: "rgba(255,255,255,0.1)" } },
              },
            },
          });
        }
      });
      // Scrollposition wiederherstellen, um den Sprung zu vermeiden:
      container.scrollTop = scrollPos;
    })
    .catch((err) => console.error("Error updating custom graphs:", err));
}
setInterval(updateCustomGraphs, 5000);
updateCustomGraphs();
