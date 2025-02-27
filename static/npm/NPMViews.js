// /static/npm/NPMViews.js
import { makeRequest } from "./NPMService.js";
import { showError } from "./NPMUtils.js";

// Import modal functions from the different modal files
import { populateAddHostForm } from "./modals/ProxyHostModals.js";
import { showCreateRedirectionHostModal } from "./modals/RedirectionHostModals.js";
import { showCreateCertificateModal } from "./modals/CertificateModals.js";

const API_BASE = "/npm-api";

// Proxy Hosts
export async function loadProxyHosts() {
  try {
    const hosts = await makeRequest(API_BASE, "/nginx/proxy-hosts");
    const grid = document.getElementById("proxyHostsGrid");
    grid.innerHTML = "";
    hosts.forEach((host) => {
      grid.appendChild(createProxyHostCard(host));
    });
  } catch (error) {
    showError("Failed to load proxy hosts");
  }
}

export function createProxyHostCard(host) {
  const card = document.createElement("div");
  card.className = "host-card glass-card";
  const disableAction = host.enabled
    ? `npmManager.disableProxyHost(${host.id})`
    : `npmManager.enableProxyHost(${host.id})`;
  const disableLabel = host.enabled ? "Disable" : "Enable";
  card.innerHTML = `
    <div class="card-header">
      <h3>${host.domain_names[0]}</h3>
      <div class="status-indicator ${host.enabled ? "active" : "inactive"}"></div>
    </div>
    <div class="card-content">
      <p>Forward: ${host.forward_host}:${host.forward_port}</p>
      <p>SSL: ${host.ssl_forced ? "Forced" : "Optional"}</p>
      <p>Cache: ${host.caching_enabled ? "Enabled" : "Disabled"}</p>
    </div>
    <div class="card-actions">
      <button class="btn btn-primary" onclick="npmManager.editHost(${host.id})">Edit</button>
      <button class="btn btn-secondary" onclick="npmManager.deleteHost(${host.id})">Delete</button>
      <button class="btn btn-secondary" onclick="${disableAction}">
        ${disableLabel}
      </button>
    </div>
  `;
  return card;
}

// Redirection Hosts
export async function loadRedirectionHosts() {
  try {
    const hosts = await makeRequest(API_BASE, "/nginx/redirection-hosts");
    const grid = document.getElementById("redirectionHostsGrid");
    grid.innerHTML = "";
    hosts.forEach((host) => {
      grid.appendChild(createRedirectionHostCard(host));
    });
  } catch (error) {
    showError("Failed to load redirection hosts");
  }
}

export function createRedirectionHostCard(host) {
  const card = document.createElement("div");
  card.className = "host-card glass-card";
  const disableAction = host.enabled
    ? `npmManager.disableRedirectionHost(${host.id})`
    : `npmManager.enableRedirectionHost(${host.id})`;
  const disableLabel = host.enabled ? "Disable" : "Enable";
  card.innerHTML = `
    <div class="card-header">
      <h3>${host.domain_names[0]}</h3>
      <div class="status-indicator ${host.enabled ? "active" : "inactive"}"></div>
    </div>
    <div class="card-content">
      <p>Redirect HTTP Code: ${host.forward_http_code}</p>
      <p>Forward Domain: ${host.forward_domain_name}</p>
      <p>Preserve Path: ${host.preserve_path ? "Yes" : "No"}</p>
    </div>
    <div class="card-actions">
      <button class="btn btn-primary" onclick="npmManager.editRedirectionHost(${host.id})">Edit</button>
      <button class="btn btn-secondary" onclick="npmManager.deleteRedirectionHost(${host.id})">Delete</button>
      <button class="btn btn-secondary" onclick="${disableAction}">
        ${disableLabel}
      </button>
    </div>
  `;
  return card;
}

// Streams
export async function loadStreamHosts() {
  try {
    const streams = await makeRequest(API_BASE, "/nginx/streams");
    const grid = document.getElementById("streamHostsGrid");
    grid.innerHTML = "";
    streams.forEach((stream) => {
      grid.appendChild(createStreamCard(stream));
    });
  } catch (error) {
    showError("Failed to load streams");
  }
}

export function createStreamCard(stream) {
  const card = document.createElement("div");
  card.className = "stream-card glass-card";
  const disableAction = stream.enabled
    ? `npmManager.disableStream(${stream.id})`
    : `npmManager.enableStream(${stream.id})`;
  const disableLabel = stream.enabled ? "Disable" : "Enable";
  card.innerHTML = `
    <div class="card-header">
      <h3>Stream on port ${stream.incoming_port}</h3>
      <div class="status-indicator ${stream.enabled ? "active" : "inactive"}"></div>
    </div>
    <div class="card-content">
      <p>Forward: ${stream.forwarding_host}:${stream.forwarding_port}</p>
      <p>TCP: ${stream.tcp_forwarding ? "Yes" : "No"}, UDP: ${stream.udp_forwarding ? "Yes" : "No"}</p>
    </div>
    <div class="card-actions">
      <button class="btn btn-primary" onclick="npmManager.editStream(${stream.id})">Edit</button>
      <button class="btn btn-secondary" onclick="npmManager.deleteStream(${stream.id})">Delete</button>
      <button class="btn btn-secondary" onclick="${disableAction}">
        ${disableLabel}
      </button>
    </div>
  `;
  return card;
}

// Access Lists
export async function loadAccessLists() {
  try {
    const lists = await makeRequest(API_BASE, "/nginx/access-lists");
    const grid = document.getElementById("accessListsGrid");
    grid.innerHTML = "";
    lists.forEach((list) => {
      grid.appendChild(createAccessListCard(list));
    });
  } catch (error) {
    showError("Failed to load access lists");
  }
}

export function createAccessListCard(list) {
  const card = document.createElement("div");
  card.className = "access-list-card glass-card";
  card.innerHTML = `
    <div class="card-header">
      <h3>${list.name}</h3>
    </div>
    <div class="card-content">
      <p>Authorization: ${list.satisfy_any ? "Any" : "All"}</p>
      <p>Pass Auth: ${list.pass_auth ? "Yes" : "No"}</p>
      <p>Clients: ${list.clients ? list.clients.length : 0}</p>
    </div>
    <div class="card-actions">
      <button class="btn btn-primary" onclick="npmManager.editAccessList(${list.id})">Edit</button>
      <button class="btn btn-secondary" onclick="npmManager.deleteAccessList(${list.id})">Delete</button>
    </div>
  `;
  return card;
}

// Certificates
export async function loadCertificates() {
  try {
    const certs = await makeRequest(API_BASE, "/nginx/certificates");
    updateCertificateStats(certs);
    const grid = document.getElementById("certificatesGrid");
    grid.innerHTML = "";
    certs.forEach((cert) => {
      grid.appendChild(createCertificateCard(cert));
    });
  } catch (error) {
    showError("Failed to load certificates");
  }
}

export function updateCertificateStats(certs) {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const statsObj = certs.reduce(
    (acc, cert) => {
      const expiryDate = new Date(cert.expires_on);
      if (expiryDate < now) acc.expired++;
      else if (expiryDate < thirtyDaysFromNow) acc.expiringSoon++;
      else acc.valid++;
      return acc;
    },
    { valid: 0, expiringSoon: 0, expired: 0 },
  );
  document.getElementById("validCertsCount").textContent = statsObj.valid;
  document.getElementById("expiringSoonCount").textContent =
    statsObj.expiringSoon;
  document.getElementById("expiredCount").textContent = statsObj.expired;
}

export function createCertificateCard(cert) {
  const card = document.createElement("div");
  card.className = "cert-card glass-card";
  const expiryDate = new Date(cert.expires_on);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
  card.innerHTML = `
    <div class="card-header">
      <h3>${cert.nice_name}</h3>
      <div class="expiry-indicator ${getExpiryClass(daysUntilExpiry)}">
        ${daysUntilExpiry > 0 ? `${daysUntilExpiry} days left` : "Expired"}
      </div>
    </div>
    <div class="card-content">
      <p>Domains: ${cert.domain_names.join(", ")}</p>
      <p>Provider: ${cert.provider}</p>
      <p>Expires: ${expiryDate.toLocaleDateString()}</p>
    </div>
    <div class="card-actions">
      <button class="btn btn-secondary" onclick="npmManager.renewCertificate(${cert.id})">Renew</button>
      <button class="btn btn-secondary" onclick="npmManager.deleteCertificate(${cert.id})">Delete</button>
      <button class="btn btn-secondary" onclick="npmManager.downloadCertificate(${cert.id})">Download</button>
    </div>
  `;
  return card;
}

function getExpiryClass(daysUntilExpiry) {
  if (daysUntilExpiry <= 0) return "expired";
  if (daysUntilExpiry <= 30) return "warning";
  return "valid";
}

// Audit Log
export async function loadAuditLog() {
  try {
    const logs = await makeRequest(API_BASE, "/audit-log");
    const tbody = document.querySelector("#auditLogTable tbody");
    tbody.innerHTML = "";
    logs.forEach((log) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${new Date(log.created_on).toLocaleString()}</td>
        <td>${log.user_id}</td>
        <td>${log.action}</td>
        <td>${JSON.stringify(log.meta)}</td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    showError("Failed to load audit log");
  }
}

// Settings
export async function loadSettings() {
  try {
    const settings = await makeRequest(API_BASE, "/settings");
    const container = document.getElementById("settingsContainer");
    container.innerHTML = "";
    settings.forEach((setting) => {
      container.appendChild(createSettingCard(setting));
    });
  } catch (error) {
    showError("Failed to load settings");
  }
}

export function createSettingCard(setting) {
  const card = document.createElement("div");
  card.className = "setting-card glass-card";
  card.innerHTML = `
    <div class="card-header">
      <h3>${setting.name}</h3>
    </div>
    <div class="card-content">
      <p>ID: ${setting.id}</p>
      <p>Description: ${setting.description}</p>
      <p>Value: ${setting.value}</p>
    </div>
    <div class="card-actions">
      <button class="btn btn-primary" onclick="npmManager.editSetting('${setting.id}')">Edit</button>
    </div>
  `;
  return card;
}

// Dead Hosts
export async function loadDeadHosts() {
  try {
    const hosts = await makeRequest(API_BASE, "/nginx/dead-hosts");
    const grid = document.getElementById("deadHostsGrid");
    grid.innerHTML = "";
    hosts.forEach((host) => {
      grid.appendChild(createDeadHostCard(host));
    });
  } catch (error) {
    showError("Failed to load dead hosts");
  }
}

export function createDeadHostCard(host) {
  const card = document.createElement("div");
  card.className = "host-card glass-card";
  const disableAction = host.enabled
    ? `npmManager.disableDeadHost(${host.id})`
    : `npmManager.enableDeadHost(${host.id})`;
  const disableLabel = host.enabled ? "Disable" : "Enable";
  card.innerHTML = `
    <div class="card-header">
      <h3>${host.domain_names[0]}</h3>
      <div class="status-indicator ${host.enabled ? "active" : "inactive"}"></div>
    </div>
    <div class="card-content">
      <p>Certificate ID: ${host.certificate_id || "N/A"}</p>
    </div>
    <div class="card-actions">
      <button class="btn btn-primary" onclick="npmManager.updateDeadHost(${host.id})">Edit</button>
      <button class="btn btn-secondary" onclick="npmManager.deleteDeadHost(${host.id})">Delete</button>
      <button class="btn btn-secondary" onclick="${disableAction}">
        ${disableLabel}
      </button>
    </div>
  `;
  return card;
}

// Reports
export async function loadReports() {
  try {
    const report = await makeRequest(API_BASE, "/reports/hosts");
    const container = document.getElementById("reportsContainer");
    container.innerHTML = `
      <div class="report-card glass-card">
        <h3>Host Statistics</h3>
        <p>Proxy Hosts: ${report.proxy}</p>
        <p>Redirection Hosts: ${report.redirection}</p>
        <p>Streams: ${report.stream}</p>
        <p>Dead Hosts: ${report.dead}</p>
      </div>
    `;
  } catch (error) {
    showError("Failed to load reports");
  }
}

// Users
export async function loadUsers() {
  try {
    const users = await makeRequest(API_BASE, "/users");
    const grid = document.getElementById("usersGrid");
    grid.innerHTML = "";
    users.forEach((user) => {
      grid.appendChild(createUserCard(user));
    });
  } catch (error) {
    showError("Failed to load users");
  }
}

export function createUserCard(user) {
  const card = document.createElement("div");
  card.className = "user-card glass-card";
  card.innerHTML = `
    <div class="card-header">
      <h3>${user.name}</h3>
    </div>
    <div class="card-content">
      <p>Nickname: ${user.nickname}</p>
      <p>Email: ${user.email}</p>
    </div>
    <div class="card-actions">
      <button class="btn btn-primary" onclick="npmManager.updateUser(${user.id})">Edit</button>
      <button class="btn btn-secondary" onclick="npmManager.deleteUser(${user.id})">Delete</button>
      <button class="btn btn-secondary" onclick="npmManager.loginAsUser(${user.id})">Login As</button>
    </div>
  `;
  return card;
}

/* --- Add New Button Binding --- */
export function bindAddNewButton() {
  const addNewBtn = document.getElementById("addNewBtn");
  if (!addNewBtn) {
    console.error("Add New button not found");
    return;
  }

  addNewBtn.addEventListener("click", async () => {
    // Determine the active view by its id
    const activeView = document.querySelector(".content-view.active")?.id;
    if (!activeView) {
      console.error("No active view detected.");
      return;
    }

    try {
      switch (activeView) {
        case "proxyView":
          // For Proxy Hosts: populate the form and show the modal
          populateAddHostForm();
          document.getElementById("addHostModal").style.display = "block";
          break;
        case "redirectionView":
          // For Redirection Hosts: show the redirection host modal
          await showCreateRedirectionHostModal();
          break;
        case "streamView":
          // For Streams: implement or log a message (functionality can be added later)
          console.log("Stream host add functionality is not implemented yet.");
          break;
        case "accessView":
          // For Access Lists: implement or log a message (functionality can be added later)
          console.log("Access list add functionality is not implemented yet.");
          break;
        case "certificatesView":
          // For Certificates: show the certificate creation modal
          await showCreateCertificateModal();
          break;
        default:
          console.warn("No add action defined for active view:", activeView);
      }
    } catch (error) {
      console.error("Error processing Add New action:", error);
    }
  });
}

// Automatically bind the Add New button when the document is loaded
document.addEventListener("DOMContentLoaded", bindAddNewButton);
