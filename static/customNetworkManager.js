// static/customNetworkManager.js

(() => {
  const modalOverlay = document.getElementById("customGraphModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const addInterfaceBtn = document.getElementById("addInterfaceBtn");
  const saveGraphConfigBtn = document.getElementById("saveGraphConfigBtn");
  const cancelGraphConfigBtn = document.getElementById("cancelGraphConfigBtn");
  const customGraphSettingsBtn = document.getElementById(
    "customGraphSettingsBtn",
  );
  const interfacesWrapper = document.getElementById("interfacesWrapper");
  const graphNameInput = document.getElementById("graphName");
  const customGraphDisplay = document.getElementById("customGraphDisplay");

  // We store references to all existing input/output charts here:
  // Example structure: chartRegistry[graphId] = { inputChart: Chart, outputChart: Chart };
  const chartRegistry = {};

  let availableInterfaces = [];

  // How often we poll for new data & refresh charts
  const REFRESH_INTERVAL_MS = 5000;

  // ---------------------------
  // Modal Handling ------------
  // ---------------------------
  customGraphSettingsBtn.addEventListener("click", openCustomGraphModal);
  closeModalBtn.addEventListener("click", closeCustomGraphModal);
  cancelGraphConfigBtn.addEventListener("click", closeCustomGraphModal);

  function openCustomGraphModal() {
    modalOverlay.style.display = "flex";
    interfacesWrapper.innerHTML = "";
    graphNameInput.value = "";

    fetch("/custom_network/available_interfaces")
      .then((r) => r.json())
      .then((data) => {
        availableInterfaces = data;
      })
      .catch((err) =>
        console.error("Error fetching available interfaces:", err),
      );
  }

  function closeCustomGraphModal() {
    modalOverlay.style.display = "none";
  }

  // ---------------------------
  // Add Interface Rows --------
  // ---------------------------
  addInterfaceBtn.addEventListener("click", () => {
    const row = document.createElement("div");
    row.className = "interface-row";

    const dragHandle = document.createElement("div");
    dragHandle.className = "drag-handle";
    dragHandle.textContent = "☰";

    // Always create a <select> for interfaces
    const ifaceSelect = document.createElement("select");
    ifaceSelect.className = "iface-select";
    // Populate with available interfaces
    availableInterfaces.forEach((iface) => {
      const option = document.createElement("option");
      option.value = iface;
      option.text = iface;
      ifaceSelect.appendChild(option);
    });

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.placeholder = "Label";
    labelInput.className = "label-input";

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = "#ffffff";
    colorInput.className = "color-input";

    row.appendChild(dragHandle);
    row.appendChild(ifaceSelect);
    row.appendChild(labelInput);
    row.appendChild(colorInput);

    interfacesWrapper.appendChild(row);
  });

  // ---------------------------
  // Save Graph Config ---------
  // ---------------------------
  saveGraphConfigBtn.addEventListener("click", () => {
    const graphName = graphNameInput.value.trim();
    const rows = interfacesWrapper.querySelectorAll(".interface-row");
    const interfaces = [];

    rows.forEach((row) => {
      const ifaceSelect = row.querySelector(".iface-select");
      const labelEl = row.querySelector(".label-input");
      const colorEl = row.querySelector(".color-input");
      if (ifaceSelect && ifaceSelect.value) {
        interfaces.push({
          iface_name: ifaceSelect.value,
          label: labelEl.value || ifaceSelect.value,
          color: colorEl.value,
        });
      }
    });

    const newGraph = {
      id: Date.now(),
      graph_name: graphName || "Untitled",
      interfaces: interfaces,
    };

    fetch("/custom_network/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ custom_network_graphs: [newGraph] }),
    })
      .then((r) => r.json())
      .then(() => {
        closeCustomGraphModal();
        updateCustomGraphs();
      })
      .catch((err) => console.error("Error saving custom network graph:", err));
  });

  // -------------------------------
  // Update & Render Custom Graphs -
  // -------------------------------
  function updateCustomGraphs() {
    const scrollPos = customGraphDisplay.scrollTop;

    fetch("/custom_network/config")
      .then((r) => r.json())
      .then((graphs) => {
        // If any existing graphs were removed from config, remove their chart references
        for (const storedId in chartRegistry) {
          const stillExists = graphs.some(
            (g) => g.id === parseInt(storedId, 10),
          );
          if (!stillExists) {
            // Destroy existing charts to free resources
            if (chartRegistry[storedId].inputChart) {
              chartRegistry[storedId].inputChart.destroy();
            }
            if (chartRegistry[storedId].outputChart) {
              chartRegistry[storedId].outputChart.destroy();
            }
            delete chartRegistry[storedId];
          }
        }

        // Rebuild the DOM if needed
        rebuildGraphCards(graphs);

        // Now fetch the latest network stats
        const netData =
          window.cachedStats &&
          window.cachedStats.network &&
          window.cachedStats.network.interfaces
            ? window.cachedStats.network.interfaces
            : {};

        // Update each chart
        graphs.forEach((graph) => {
          const graphId = graph.id;
          const inputChart = chartRegistry[graphId]?.inputChart;
          const outputChart = chartRegistry[graphId]?.outputChart;

          if (!inputChart || !outputChart) return; // Something went wrong or not created yet

          // We'll collect labels & datasets for input vs output
          const inputDatasets = [];
          const outputDatasets = [];
          let labels = [];

          graph.interfaces.forEach((iface) => {
            const hist = netData[iface.iface_name] || [];
            if (hist.length) {
              labels = hist.map((h) => h.time);
              const inData = hist.map((h) => h.input);
              const outData = hist.map((h) => h.output);
              inputDatasets.push({
                label: iface.label,
                data: inData,
                borderColor: iface.color,
                backgroundColor: iface.color,
                fill: false,
                tension: 0.3,
                borderWidth: 2,
              });
              outputDatasets.push({
                label: iface.label,
                data: outData,
                borderColor: iface.color,
                backgroundColor: iface.color,
                fill: false,
                tension: 0.3,
                borderWidth: 2,
              });
            }
          });

          // Now update chart data in place for smooth animations
          // (we completely replace the datasets array, then call update())
          inputChart.data.labels = labels;
          inputChart.data.datasets = inputDatasets;
          inputChart.update();

          outputChart.data.labels = labels;
          outputChart.data.datasets = outputDatasets;
          outputChart.update();
        });

        customGraphDisplay.scrollTop = scrollPos;
      })
      .catch((err) =>
        console.error("Error fetching custom network config:", err),
      );
  }

  // Build or rebuild DOM elements for each custom graph card
  function rebuildGraphCards(graphs) {
    // Remove any cards that are no longer in config
    const existingCards =
      customGraphDisplay.querySelectorAll(".custom-graph-card");
    existingCards.forEach((c) => {
      const cardId = c.getAttribute("data-graph-id");
      if (!graphs.some((g) => String(g.id) === cardId)) {
        customGraphDisplay.removeChild(c);
      }
    });

    // For each graph in config, if there's no existing card in DOM, create one
    graphs.forEach((graph) => {
      const existing = customGraphDisplay.querySelector(
        `.custom-graph-card[data-graph-id="${graph.id}"]`,
      );
      if (existing) return; // Card already exists

      // Build new card
      const graphCard = document.createElement("div");
      graphCard.className = "custom-graph-card";
      graphCard.setAttribute("data-graph-id", graph.id);

      const header = document.createElement("div");
      header.className = "custom-graph-header";

      const titleDiv = document.createElement("div");
      titleDiv.textContent = graph.graph_name;
      titleDiv.style.fontWeight = "bold";

      const legendDiv = document.createElement("div");
      legendDiv.style.display = "flex";
      legendDiv.style.gap = "0.5rem";

      graph.interfaces.forEach((iface) => {
        const legendItem = document.createElement("div");
        legendItem.style.display = "flex";
        legendItem.style.alignItems = "center";

        const colorBox = document.createElement("span");
        colorBox.style.width = "16px";
        colorBox.style.height = "16px";
        colorBox.style.backgroundColor = iface.color;
        colorBox.style.display = "inline-block";
        colorBox.style.marginRight = "4px";
        colorBox.style.borderRadius = "3px";

        const legendLabel = document.createElement("span");
        legendLabel.style.fontSize = "0.8rem";
        legendLabel.textContent = iface.label;

        legendItem.appendChild(colorBox);
        legendItem.appendChild(legendLabel);
        legendDiv.appendChild(legendItem);
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "✖";
      deleteBtn.style.background = "transparent";
      deleteBtn.style.border = "none";
      deleteBtn.style.fontSize = "1.2rem";
      deleteBtn.style.color = "var(--text)";
      deleteBtn.style.cursor = "pointer";
      deleteBtn.style.transition = "color 0.3s";
      deleteBtn.addEventListener("mouseover", () => {
        deleteBtn.style.color = "#ff5555";
      });
      deleteBtn.addEventListener("mouseout", () => {
        deleteBtn.style.color = "var(--text)";
      });
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (
          confirm("Are you sure you want to delete this custom network graph?")
        ) {
          fetch(`/custom_network/delete/${graph.id}`, { method: "DELETE" })
            .then((res) => res.json())
            .then((delRes) => {
              if (delRes.status === "success") {
                if (chartRegistry[graph.id]) {
                  // Destroy any chart references
                  if (chartRegistry[graph.id].inputChart) {
                    chartRegistry[graph.id].inputChart.destroy();
                  }
                  if (chartRegistry[graph.id].outputChart) {
                    chartRegistry[graph.id].outputChart.destroy();
                  }
                  delete chartRegistry[graph.id];
                }
                updateCustomGraphs();
              }
            })
            .catch((err) =>
              console.error("Error deleting custom network graph:", err),
            );
        }
      });

      header.appendChild(titleDiv);
      header.appendChild(legendDiv);
      header.appendChild(deleteBtn);

      const body = document.createElement("div");
      body.className = "custom-graph-body";

      // Input chart
      const inputDiv = document.createElement("div");
      inputDiv.style.position = "relative";
      inputDiv.style.flex = "1";
      const inputCanvas = document.createElement("canvas");
      inputCanvas.id = `custom-input-${graph.id}`;
      inputDiv.appendChild(inputCanvas);
      const inOverlay = document.createElement("div");
      inOverlay.textContent = "in";
      inOverlay.style.position = "absolute";
      inOverlay.style.top = "5px";
      inOverlay.style.left = "5px";
      inOverlay.style.fontSize = "1.5rem";
      inOverlay.style.color = "rgba(255,255,255,0.2)";
      inOverlay.style.pointerEvents = "none";
      inputDiv.appendChild(inOverlay);

      // Output chart
      const outputDiv = document.createElement("div");
      outputDiv.style.position = "relative";
      outputDiv.style.flex = "1";
      const outputCanvas = document.createElement("canvas");
      outputCanvas.id = `custom-output-${graph.id}`;
      outputDiv.appendChild(outputCanvas);
      const outOverlay = document.createElement("div");
      outOverlay.textContent = "out";
      outOverlay.style.position = "absolute";
      outOverlay.style.top = "5px";
      outOverlay.style.left = "5px";
      outOverlay.style.fontSize = "1.5rem";
      outOverlay.style.color = "rgba(255,255,255,0.2)";
      outOverlay.style.pointerEvents = "none";
      outputDiv.appendChild(outOverlay);

      body.appendChild(inputDiv);
      body.appendChild(outputDiv);

      graphCard.appendChild(header);
      graphCard.appendChild(body);
      customGraphDisplay.appendChild(graphCard);

      // Create new Chart instances for input & output
      const sharedXAxisConfig = {
        grid: { display: true, color: "rgba(255,255,255,0.1)" },
        ticks: { color: "rgba(255,255,255,0.8)" },
      };

      // For now, start with empty data; we'll fill it on updateCustomGraphs
      const inputChart = new Chart(inputCanvas.getContext("2d"), {
        type: "line",
        data: {
          labels: [],
          datasets: [],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 800, // so data changes animate
          },
          plugins: {
            legend: {
              display: false,
            },
          },
          scales: {
            x: sharedXAxisConfig,
            y: {
              grid: { color: "rgba(255,255,255,0.1)" },
              ticks: { color: "rgba(255,255,255,0.8)" },
            },
          },
        },
      });

      const outputChart = new Chart(outputCanvas.getContext("2d"), {
        type: "line",
        data: {
          labels: [],
          datasets: [],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 800,
          },
          plugins: {
            legend: {
              display: false,
            },
          },
          scales: {
            x: sharedXAxisConfig,
            y: {
              grid: { color: "rgba(255,255,255,0.1)" },
              ticks: { color: "rgba(255,255,255,0.8)" },
            },
          },
        },
      });

      // Store references in the global registry
      chartRegistry[graph.id] = {
        inputChart,
        outputChart,
      };
    });
  }

  // Poll for changes
  setInterval(updateCustomGraphs, REFRESH_INTERVAL_MS);

  // Initial load
  updateCustomGraphs();
})();
