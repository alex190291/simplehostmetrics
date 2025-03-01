// /static/npm/NPMViews.js
import { makeRequest } from "./NPMService.js";
import { showError } from "./NPMUtils.js";


// Import all modal functions
import { populateAddProxyHostForm } from "./modals/ProxyHostModals.js";
import { populateAddRedirectionHostForm } from "./modals/RedirectionHostModals.js";
import { populateAccessListForm } from "./modals/AccessListModals.js";
import { populateCertificateForm } from "./modals/CertificateModals.js";

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
      <button class="btn btn-primary" onclick="npmManager.editProxyHostModal(${host.id})">Edit</button>
      <button class="btn btn-secondary" onclick="npmManager.deleteProxyHost(${host.id})">Delete</button>
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
      <button class="btn btn-primary" onclick="npmManager.editRedirectionHostModal(${host.id})">Edit</button>
      <button class="btn btn-secondary" onclick="npmManager.deleteRedirectionHost(${host.id})">Delete</button>
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
  
  // Calculate number of auth items and clients
  const authItems = list.items ? list.items.length : 0;
  const clients = list.clients ? list.clients.length : 0;
  
  card.innerHTML = `
    <div class="card-header">
      <h3>${list.name}</h3>
    </div>
    <div class="card-content">
      <p>Authorization: ${list.satisfy_any ? "Any" : "All"}</p>
      <p>Pass Auth: ${list.pass_auth ? "Yes" : "No"}</p>
      <p>Auth Items: ${authItems}</p>
      <p>Clients: ${clients}</p>
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
  
  // Only show renew button for Let's Encrypt certificates (not for uploaded ones)
  const renewButton = cert.provider === "letsencrypt" 
    ? `<button class="btn btn-secondary" onclick="npmManager.renewCertificate(${cert.id})">Renew</button>` 
    : '';
    
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
      ${renewButton}
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

/* --- View-Specific Button Bindings --- */
function bindViewButtons() {
  // Proxy Host Button
  const addProxyHostBtn = document.getElementById("addProxyHostBtn");
  if (addProxyHostBtn) {
    addProxyHostBtn.addEventListener("click", () => {
      try {
        populateAddProxyHostForm();
        document.getElementById("addHostModal").style.display = "flex";
      } catch (error) {
        console.error("Error showing proxy host modal:", error);
      }
    });
  }

  // Redirection Host Button
  const addRedirectionHostBtn = document.getElementById("addRedirectionHostBtn");
  if (addRedirectionHostBtn) {
    addRedirectionHostBtn.addEventListener("click", () => {
      try {
        populateAddRedirectionHostForm();
        document.getElementById("redirectionHostModal").style.display = "flex";
      } catch (error) {
        console.error("Error showing redirection host modal:", error);
      }
    });
  }

  // Stream Host Button
  const addStreamHostBtn = document.getElementById("addStreamHostBtn");
  if (addStreamHostBtn) {
    addStreamHostBtn.addEventListener("click", () => {
      try {
        populateStreamHostForm();
        document.getElementById("streamHostModal").style.display = "flex";
      } catch (error) {
        console.error("Error showing stream host modal:", error);
      }
    });
  }

  // Access List Button
  const addAccessListBtn = document.getElementById("addAccessListBtn");
  if (addAccessListBtn) {
    addAccessListBtn.addEventListener("click", () => {
      try {
        populateAccessListForm();
        document.getElementById("accessListModal").style.display = "flex";
      } catch (error) {
        console.error("Error showing access list modal:", error);
      }
    });
  }

  // Certificate Buttons
  const addCertificateBtn = document.getElementById("addCertificateBtn");
  if (addCertificateBtn) {
    // Add a container for certificate action buttons if it doesn't exist already
    let certActionContainer = document.querySelector('.certificate-actions');
    if (!certActionContainer) {
      certActionContainer = document.createElement('div');
      certActionContainer.className = 'certificate-actions action-buttons';
      addCertificateBtn.parentNode.appendChild(certActionContainer);
      
      // Move the Add Certificate button to the container
      certActionContainer.appendChild(addCertificateBtn);
      
      // Create Upload Certificate button
      const uploadCertBtn = document.createElement('button');
      uploadCertBtn.id = "uploadCertificateBtn";
      uploadCertBtn.className = "btn btn-primary";
      uploadCertBtn.innerHTML = "<i class='fas fa-upload'></i> Upload Certificate";
      certActionContainer.appendChild(uploadCertBtn);
      
      // Add event listener to Upload Certificate button
      uploadCertBtn.addEventListener("click", () => {
        try {
          import('./modals/CertificateModals.js').then(module => {
            module.showUploadCertificateModal();
          });
        } catch (error) {
          console.error("Error showing certificate upload modal:", error);
        }
      });
    }

    // Add Certificate button event listener
    addCertificateBtn.addEventListener("click", () => {
      try {
        populateCertificateForm();
        document.getElementById("certificateModal").style.display = "flex";
      } catch (error) {
        console.error("Error showing certificate modal:", error);
      }
    });
  }
}


// Bind view-specific buttons when the document is loaded
document.addEventListener("DOMContentLoaded", bindViewButtons);
