// simplehostmetrics.refac/static/customNetwork.js

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

// -------------------------------
// Custom Graphs Display in Network Card with Delete Button
// -------------------------------
function updateCustomGraphs() {
  // Use the network detail view container instead of a separate container.
  const container = document.getElementById("network-detail-view");
  // Save scroll position to avoid jumps:
  const scrollPos = container.scrollTop;
  container.innerHTML = ""; // Remove existing graphs

  fetch("/custom_network/config")
    .then((r) => r.json())
    .then((graphs) => {
      graphs.forEach((graph) => {
        // Create a graph card
        const graphCard = document.createElement("div");
        graphCard.className = "custom-graph-card";
        graphCard.style.display = "flex";
        graphCard.style.flexDirection = "column";
        graphCard.style.margin = "1rem 0";
        graphCard.style.padding = "0.5rem";
        graphCard.style.background = "var(--glass)";
        graphCard.style.borderRadius = "0.5rem";
        graphCard.style.height = "250px"; // Fixed height

        // Header with title, legend, and delete button
        const headerDiv = document.createElement("div");
        headerDiv.className = "custom-graph-header";
        headerDiv.style.display = "flex";
        headerDiv.style.justifyContent = "space-between";
        headerDiv.style.alignItems = "center";
        headerDiv.style.marginBottom = "0.5rem";

        // Title element
        const titleDiv = document.createElement("div");
        titleDiv.className = "graph-label";
        titleDiv.style.fontWeight = "bold";
        titleDiv.textContent = graph.graph_name;

        // Legend for the interfaces
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

        // Create a delete button for this graph
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "delete-btn";
        deleteBtn.addEventListener("click", function (e) {
          e.stopPropagation(); // Prevent toggling the detail view
          if (
            confirm(
              "Are you sure you want to delete this custom network graph?",
            )
          ) {
            fetch(`/custom_network/delete/${graph.id}`, { method: "DELETE" })
              .then((r) => r.json())
              .then((res) => {
                if (res.status === "success") {
                  updateCustomGraphs(); // Refresh the list after deletion
                }
              })
              .catch((err) =>
                console.error("Error deleting custom network graph:", err),
              );
          }
        });

        // Append title, legend, and delete button to header
        headerDiv.appendChild(titleDiv);
        headerDiv.appendChild(legendDiv);
        headerDiv.appendChild(deleteBtn);
        graphCard.appendChild(headerDiv);

        // Body with two chart containers: one for Input and one for Output
        const bodyDiv = document.createElement("div");
        bodyDiv.className = "custom-graph-body";
        bodyDiv.style.display = "flex";
        bodyDiv.style.flex = "1";
        bodyDiv.style.width = "100%";

        // Input Chart Container
        const inputDiv = document.createElement("div");
        inputDiv.className = "custom-graph-input";
        inputDiv.style.flex = "1";
        inputDiv.style.position = "relative"; // For absolute overlay
        const inputCanvas = document.createElement("canvas");
        inputCanvas.id = "custom-input-" + graph.id;
        inputDiv.appendChild(inputCanvas);
        // Add overlay "in"
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
        // Add overlay "out"
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

        // Prepare datasets for the charts using the network data
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
      // Restore scroll position to prevent jump:
      container.scrollTop = scrollPos;
    })
    .catch((err) => console.error("Error updating custom graphs:", err));
}

setInterval(updateCustomGraphs, 5000);
updateCustomGraphs();
