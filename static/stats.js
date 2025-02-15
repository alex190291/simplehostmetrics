// simplehostmetrics.refac/static/stats.js

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

// Updated polling interval from 500ms to 1000ms
setInterval(updateStats, 1000);
updateStats();
