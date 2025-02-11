// static/charts.js

// -------------------------------
// Shared X-Axis configuration
// -------------------------------
const sharedXAxisConfig = {
  grid: {
    display: true,
    drawTicks: true,
    tickLength: 5,
    color: "rgba(255,255,255,0.1)",
  },
  ticks: { display: true },
};

// -------------------------------
// CPU Charts
// -------------------------------
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

// -------------------------------
// Memory Charts
// -------------------------------
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

// -------------------------------
// Disk Charts
// -------------------------------
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

// -------------------------------
// Network Chart
// -------------------------------
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
